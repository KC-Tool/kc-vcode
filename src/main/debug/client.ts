import { ChildProcess, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import net from 'node:net'

export interface Breakpoint {
  file: string
  line: number
  enabled: boolean
  condition?: string
  id?: number
}

export interface StackFrame {
  id: number
  name: string
  file: string
  line: number
  column: number
}

export interface Variable {
  name: string
  value: string
  type: string
}

interface DAPMessage {
  seq: number
  type: 'request' | 'response' | 'event'
  command?: string
  event?: string
  arguments?: any
  body?: any
  request_seq?: number
  success?: boolean
  message?: string
}

export class DebugClient extends EventEmitter {
  private process: ChildProcess | null = null
  private socket: net.Socket | null = null
  private seq = 0
  private pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private buffer = ''
  private _sessionId: string | null = null
  private _breakpoints: Breakpoint[] = []

  get sessionId() { return this._sessionId }
  get breakpoints() { return this._breakpoints }

  async startNode(filePath: string, cwd: string): Promise<void> {
    const debugPort = await this.findFreePort()

    // spawn node with --inspect-brk
    this.process = spawn('node', ['--inspect-brk', filePath], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, NODE_OPTIONS: `--inspect-brk=${debugPort}` }
    })

    this.process.on('exit', (code) => {
      this.emit('terminated', code)
      this.cleanup()
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      // extract websocket URL from stderr
      const match = text.match(/Debugger listening on ws:\/\/([^\s]+)/)
      if (match) {
        this.connectWebSocket(match[0].replace('Debugger listening on ', ''), debugPort)
      }
    })

    this._sessionId = `node-${Date.now()}`
    this.emit('started', this._sessionId)
  }

  private connectWebSocket(_url: string, port: number): void {
    // Simple DAP over TCP (Chrome DevTools Protocol)
    this.socket = net.createConnection({ port }, () => {
      this.sendInitialize()
    })

    this.socket.on('data', (data) => {
      this.buffer += data.toString()
      this.processBuffer()
    })

    this.socket.on('close', () => {
      this.emit('stopped', { reason: 'disconnect' })
      this.cleanup()
    })

    this.socket.on('error', (err) => {
      this.emit('error', err)
    })
  }

  private processBuffer(): void {
    const headerEnd = this.buffer.indexOf('\r\n\r\n')
    if (headerEnd === -1) return

    const header = this.buffer.slice(0, headerEnd)
    const contentLengthMatch = header.match(/Content-Length: (\d+)/)
    if (!contentLengthMatch) return

    const contentLength = parseInt(contentLengthMatch[1])
    const bodyStart = headerEnd + 4
    if (this.buffer.length < bodyStart + contentLength) return

    const body = this.buffer.slice(bodyStart, bodyStart + contentLength)
    this.buffer = this.buffer.slice(bodyStart + contentLength)

    try {
      const msg: DAPMessage = JSON.parse(body)
      this.handleMessage(msg)
    } catch {
      // skip malformed messages
    }
  }

  private handleMessage(msg: DAPMessage): void {
    if (msg.type === 'response') {
      const pending = this.pendingRequests.get(msg.request_seq!)
      if (pending) {
        this.pendingRequests.delete(msg.request_seq!)
        if (msg.success) pending.resolve(msg.body)
        else pending.reject(new Error(msg.message || 'DAP request failed'))
      }
    } else if (msg.type === 'event') {
      switch (msg.event) {
        case 'stopped':
          this.emit('stopped', msg.body)
          break
        case 'terminated':
          this.emit('terminated', msg.body)
          this.cleanup()
          break
        case 'exited':
          this.emit('exited', msg.body)
          break
      }
    }
  }

  private sendRequest(command: string, args?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const seq = ++this.seq
      this.pendingRequests.set(seq, { resolve, reject })

      const msg = JSON.stringify({ seq, type: 'request', command, arguments: args })
      const header = `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n`
      this.socket?.write(header + msg)

      // timeout after 10s
      setTimeout(() => {
        if (this.pendingRequests.has(seq)) {
          this.pendingRequests.delete(seq)
          reject(new Error(`DAP request '${command}' timed out`))
        }
      }, 10000)
    })
  }

  private sendInitialize(): void {
    this.sendRequest('initialize', {
      clientID: 'kc-vcode',
      clientName: 'kc-vcode',
      adapterID: 'node',
      locale: 'en',
      supportsProgressReporting: true
    }).then(() => {
      this.sendRequest('configurationDone')
      this.emit('ready')
    }).catch(() => {})
  }

  async setBreakpoints(file: string, lines: number[]): Promise<number[]> {
    const result = await this.sendRequest('setBreakpoints', {
      source: { path: file },
      breakpoints: lines.map(line => ({ line }))
    })
    return (result?.breakpoints || []).map((bp: any) => bp.id)
  }

  async continue(): Promise<void> {
    await this.sendRequest('continue', { threadId: 1 })
  }

  async pause(): Promise<void> {
    await this.sendRequest('pause', { threadId: 1 })
  }

  async next(): Promise<void> {
    await this.sendRequest('next', { threadId: 1 })
  }

  async stepIn(): Promise<void> {
    await this.sendRequest('stepIn', { threadId: 1 })
  }

  async stepOut(): Promise<void> {
    await this.sendRequest('stepOut', { threadId: 1 })
  }

  async getStackTrace(): Promise<StackFrame[]> {
    const result = await this.sendRequest('stackTrace', { threadId: 1 })
    return (result?.stackFrames || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      file: f.source?.path || '',
      line: f.line,
      column: f.column
    }))
  }

  async getScopes(frameId: number): Promise<{ name: string; variablesReference: number }[]> {
    const result = await this.sendRequest('scopes', { frameId })
    return (result?.scopes || []).map((s: any) => ({
      name: s.name,
      variablesReference: s.variablesReference
    }))
  }

  async getVariables(variablesReference: number): Promise<Variable[]> {
    const result = await this.sendRequest('variables', { variablesReference })
    return (result?.variables || []).map((v: any) => ({
      name: v.name,
      value: v.value,
      type: v.type
    }))
  }

  async evaluate(expression: string, frameId?: number): Promise<string> {
    const args: any = { expression }
    if (frameId !== undefined) args.frameId = frameId
    const result = await this.sendRequest('evaluate', args)
    return result?.result || ''
  }

  async restart(): Promise<void> {
    await this.sendRequest('restart', {})
  }

  async disconnect(): Promise<void> {
    try {
      await this.sendRequest('disconnect', { restart: false })
    } catch {
      // ignore
    }
    this.cleanup()
  }

  private cleanup(): void {
    this.socket?.destroy()
    this.socket = null
    if (this.process && !this.process.killed) {
      this.process.kill()
    }
    this.process = null
    this._sessionId = null
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Debug session ended'))
    }
    this.pendingRequests.clear()
  }

  private findFreePort(): Promise<number> {
    return new Promise((resolve) => {
      const server = net.createServer()
      server.listen(0, () => {
        const port = (server.address() as net.AddressInfo).port
        server.close(() => resolve(port))
      })
    })
  }
}