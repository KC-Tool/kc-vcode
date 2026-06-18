import * as pty from 'node-pty'

let proc: pty.IPty | null = null

const SHELL = process.platform === 'win32' ? 'powershell.exe' : 'bash'
const SHELL_ARGS: string[] = process.platform === 'win32' ? ['-NoLogo'] : ['--login']

export function createPty(cwd: string, onData: (data: string) => void): { pid: number } {
  destroyPty()

  proc = pty.spawn(SHELL, SHELL_ARGS, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: cwd || process.env.USERPROFILE || process.cwd(),
    env: process.env as Record<string, string>,
    useConpty: process.platform === 'win32'
  })

  proc.onData((d) => onData(d))
  proc.onExit(({ exitCode }) => {
    if (proc) onData(`\r\n\x1b[90m[process exited with code ${exitCode}]\x1b[0m\r\n`)
    proc = null
  })

  return { pid: proc.pid }
}

export function writeToPty(data: string): void {
  if (!proc) return
  try {
    proc.write(data)
  } catch {
    // pty already closed
  }
}

export function resizePty(cols: number, rows: number): void {
  if (!proc) return
  try {
    proc.resize(Math.max(2, cols | 0), Math.max(2, rows | 0))
  } catch {
    // resize can throw if pty is mid-close, ignore
  }
}

export function destroyPty(): void {
  if (!proc) return
  try {
    proc.kill()
  } catch {
    // already dead
  }
  proc = null
}