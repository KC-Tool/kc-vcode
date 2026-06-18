import { spawn as cpSpawn, ChildProcess } from 'node:child_process'
import * as pty from 'node-pty'

let proc: ReturnType<typeof pty.spawn> | null = null
let fallback: ChildProcess | null = null

const SHELL = process.platform === 'win32' ? 'powershell.exe' : 'bash'
const SHELL_ARGS: string[] = process.platform === 'win32' ? ['-NoLogo'] : ['--login']

export function createPty(cwd: string, onData: (data: string) => void): { pid: number } {
  destroyPty()
  const realCwd = cwd || process.env.USERPROFILE || process.cwd()

  try {
    proc = pty.spawn(SHELL, SHELL_ARGS, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: realCwd,
      env: process.env as Record<string, string>,
      useConpty: process.platform === 'win32'
    })
    proc.onData((d: string) => onData(d))
    proc.onExit(({ exitCode }: { exitCode: number }) => {
      if (proc) onData(`\r\n\x1b[90m[process exited with code ${exitCode}]\x1b[0m\r\n`)
      proc = null
    })
    return { pid: proc.pid }
  } catch {
    fallback = cpSpawn(SHELL, SHELL_ARGS, { cwd: realCwd, env: process.env as Record<string, string> })
    fallback.stdout?.on('data', (d: Buffer) => onData(d.toString()))
    fallback.stderr?.on('data', (d: Buffer) => onData(d.toString()))
    fallback.on('exit', (code) => {
      onData(`\r\n\x1b[90m[process exited with code ${code}]\x1b[0m\r\n`)
      fallback = null
    })
    return { pid: fallback.pid || 0 }
  }
}

export function writeToPty(data: string): void {
  if (proc) { try { proc.write(data) } catch {} }
  else if (fallback) { try { fallback.stdin?.write(data) } catch {} }
}

export function resizePty(cols: number, rows: number): void {
  if (!proc) return
  try { proc.resize(Math.max(2, cols | 0), Math.max(2, rows | 0)) } catch {}
}

export function destroyPty(): void {
  if (proc) { try { proc.kill() } catch {} proc = null }
  if (fallback) { try { fallback.kill() } catch {} fallback = null }
}