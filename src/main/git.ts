import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

async function git(cwd: string, cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`git ${cmd}`, { cwd, timeout: 10000 })
    return stdout.trim()
  } catch {
    return ''
  }
}

export interface GitStatus {
  branch: string
  files: { path: string; status: string; staged: boolean }[]
  ahead: number
  behind: number
}

export interface GitLogEntry {
  hash: string
  message: string
  author: string
  date: string
}

export async function getStatus(cwd: string): Promise<GitStatus> {
  const branch = await git(cwd, 'rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached"')
  const raw = await git(cwd, 'status --porcelain -u')
  const files = raw.split('\n').filter(Boolean).map(line => {
    const staged = line[0] !== ' ' && line[0] !== '?'
    const unstaged = line[1] !== ' '
    const filePath = line.substring(3)
    let status = 'modified'
    if (line[0] === '?' && line[1] === '?') status = 'untracked'
    else if (line[0] === 'A') status = 'added'
    else if (line[0] === 'D' || line[1] === 'D') status = 'deleted'
    else if (line[0] === 'R') status = 'renamed'
    else if (line[0] === 'C') status = 'copied'
    return { path: filePath, status, staged }
  })

  const aheadStr = await git(cwd, 'rev-list --count @{u}..HEAD 2>/dev/null')
  const behindStr = await git(cwd, 'rev-list --count HEAD..@{u} 2>/dev/null')

  return {
    branch,
    files,
    ahead: parseInt(aheadStr) || 0,
    behind: parseInt(behindStr) || 0
  }
}

export async function getDiff(cwd: string, filePath?: string): Promise<string> {
  const fileArg = filePath ? ` -- "${filePath}"` : ''
  return git(cwd, `diff${fileArg}`)
}

export async function getLog(cwd: string, count = 20): Promise<GitLogEntry[]> {
  const raw = await git(cwd, `log --pretty=format:"%H|%s|%an|%ai" -n ${count}`)
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map(line => {
    const [hash, message, author, date] = line.split('|')
    return { hash: hash || '', message: message || '', author: author || '', date: date || '' }
  })
}

export async function stageFile(cwd: string, filePath: string): Promise<void> {
  await git(cwd, `add "${filePath}"`)
}

export async function unstageFile(cwd: string, filePath: string): Promise<void> {
  await git(cwd, `reset HEAD "${filePath}"`)
}

export async function commit(cwd: string, message: string): Promise<string> {
  return git(cwd, `commit -m "${message.replace(/"/g, '\\"')}"`)
}

export async function discardFile(cwd: string, filePath: string): Promise<void> {
  await git(cwd, `checkout -- "${filePath}"`)
}

export async function getBranches(cwd: string): Promise<string[]> {
  const raw = await git(cwd, 'branch --format=%(refname:short)')
  return raw.split('\n').filter(Boolean)
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  return git(cwd, 'rev-parse --abbrev-ref HEAD') || 'HEAD'
}

export async function push(cwd: string): Promise<string> {
  return git(cwd, 'push')
}

export async function pull(cwd: string): Promise<string> {
  return git(cwd, 'pull')
}

export async function stash(cwd: string): Promise<string> {
  return git(cwd, 'stash')
}

export async function stashPop(cwd: string): Promise<string> {
  return git(cwd, 'stash pop')
}

export async function checkout(cwd: string, branch: string): Promise<string> {
  return git(cwd, `checkout "${branch}"`)
}

export async function createBranch(cwd: string, name: string): Promise<string> {
  return git(cwd, `checkout -b "${name}"`)
}

export async function getDiffStat(cwd: string): Promise<{ file: string; additions: number; deletions: number }[]> {
  const raw = await git(cwd, 'diff --numstat')
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map(line => {
    const [add, del, file] = line.split('\t')
    return { file, additions: parseInt(add) || 0, deletions: parseInt(del) || 0 }
  })
}

export async function getBlame(cwd: string, filePath: string): Promise<{ line: number; author: string; date: string; content: string }[]> {
  const raw = await git(cwd, `blame --porcelain "${filePath}"`)
  if (!raw) return []
  const lines = raw.split('\n')
  const result: { line: number; author: string; date: string; content: string }[] = []
  let i = 0
  let lineNum = 1
  while (i < lines.length) {
    const line = lines[i]
    if (/^[0-9a-f]{40}/.test(line)) {
      const hash = line.split(' ')[0]
      let author = ''
      let date = ''
      i++
      while (i < lines.length && !lines[i].match(/^[0-9a-f]{40}/)) {
        if (lines[i].startsWith('author ')) author = lines[i].substring(7)
        if (lines[i].startsWith('author-time ')) {
          const ts = parseInt(lines[i].substring(12))
          date = new Date(ts * 1000).toISOString().split('T')[0]
        }
        if (lines[i].startsWith('\t')) {
          result.push({ line: lineNum++, author, date, content: lines[i].substring(1) })
        }
        i++
      }
    } else {
      i++
    }
  }
  return result
}
