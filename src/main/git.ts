import path from 'node:path'
import simpleGit, { SimpleGit, StatusResult, LogResult, BranchSummary } from 'simple-git'

const gitCache = new Map<string, SimpleGit>()

function g(cwd: string): SimpleGit {
  let inst = gitCache.get(cwd)
  if (!inst) {
    inst = simpleGit({
      baseDir: path.resolve(cwd),
      binary: 'git',
      maxConcurrentProcesses: 6
    })
    gitCache.set(cwd, inst)
  }
  return inst
}

function dropGit(cwd: string): void {
  gitCache.delete(cwd)
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

function mapFile(f: StatusResult['files'][number]): { status: string; staged: boolean } {
  const idx = f.index
  const wd = f.working_dir
  if (idx === '?' && wd === '?') return { status: 'untracked', staged: false }
  if (idx === 'R') return { status: 'renamed', staged: true }
  if (idx === 'C') return { status: 'copied', staged: true }
  if (idx === 'A') return { status: 'added', staged: true }
  if (idx === 'D' || wd === 'D') return { status: 'deleted', staged: idx === 'D' }
  const staged = !!idx && idx !== ' ' && idx !== '?'
  return { status: 'modified', staged }
}

export async function getStatus(cwd: string): Promise<GitStatus> {
  const s = await g(cwd).status()
  return {
    branch: s.current || 'detached',
    files: s.files.map(f => ({ path: f.path, ...mapFile(f) })),
    ahead: s.ahead || 0,
    behind: s.behind || 0
  }
}

export async function getDiff(cwd: string, filePath?: string): Promise<string> {
  return filePath
    ? g(cwd).raw(['diff', '--', filePath])
    : g(cwd).raw(['diff'])
}

interface LogFields {
  hash: string
  message: string
  author: string
  date: string
}

export async function getLog(cwd: string, count = 20): Promise<GitLogEntry[]> {
  const log: LogResult<LogFields> = await g(cwd).log({
    n: count,
    format: { hash: '%H', message: '%s', author: '%an', date: '%ai' }
  })
  const all = (log.all || []) as ReadonlyArray<LogFields>
  return all.map(e => ({
    hash: e.hash || '',
    message: e.message || '',
    author: e.author || '',
    date: e.date || ''
  }))
}

export async function stageFile(cwd: string, filePath: string): Promise<void> {
  await g(cwd).add(filePath)
}

export async function unstageFile(cwd: string, filePath: string): Promise<void> {
  await g(cwd).reset(['HEAD', '--', filePath])
}

export async function commit(cwd: string, message: string): Promise<string> {
  const res = await g(cwd).commit(message)
  return res.commit || ''
}

export async function discardFile(cwd: string, filePath: string): Promise<void> {
  await g(cwd).checkout(filePath)
}

export async function getBranches(cwd: string): Promise<string[]> {
  const b: BranchSummary = await g(cwd).branch()
  return b.all
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  const b = await g(cwd).branch()
  return b.current || 'HEAD'
}

export async function push(cwd: string): Promise<string> {
  return g(cwd).raw(['push'])
}

export async function pull(cwd: string): Promise<string> {
  return g(cwd).raw(['pull'])
}

export async function stash(cwd: string): Promise<string> {
  return g(cwd).raw(['stash'])
}

export async function stashPop(cwd: string): Promise<string> {
  return g(cwd).raw(['stash', 'pop'])
}

export async function checkout(cwd: string, branch: string): Promise<string> {
  return g(cwd).raw(['checkout', branch])
}

export async function createBranch(cwd: string, name: string): Promise<string> {
  return g(cwd).raw(['checkout', '-b', name])
}

export async function getDiffStat(cwd: string): Promise<{ file: string; additions: number; deletions: number }[]> {
  const out = await g(cwd).raw(['diff', '--numstat'])
  if (!out) return []
  return out.split('\n').filter(Boolean).map(line => {
    const [add, del, file] = line.split('\t')
    return { file, additions: parseInt(add) || 0, deletions: parseInt(del) || 0 }
  })
}

export async function getBlame(cwd: string, filePath: string): Promise<{ line: number; author: string; date: string; content: string }[]> {
  const out = await g(cwd).raw(['blame', '--porcelain', '--', filePath])
  if (!out) return []
  const lines = out.split('\n')
  const result: { line: number; author: string; date: string; content: string }[] = []
  let i = 0
  let lineNum = 1
  while (i < lines.length) {
    const line = lines[i]
    if (/^[0-9a-f]{40}/.test(line)) {
      i++
      let author = ''
      let date = ''
      while (i < lines.length && !/^[0-9a-f]{40}/.test(lines[i])) {
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

export function clearGitCache(): void {
  for (const cwd of gitCache.keys()) dropGit(cwd)
}