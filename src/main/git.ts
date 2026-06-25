import path from 'node:path'
import fs from 'node:fs'
import { EventEmitter } from 'node:events'
import simpleGit, { SimpleGit, StatusResult, LogResult, BranchSummary, DiffResult } from 'simple-git'

// ---- types exposed to renderer ----

export interface GitUser {
  name: string
  email: string
}

export interface GitFileChange {
  path: string
  oldPath?: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflicted' | 'type-changed'
  staged: boolean
}

export interface GitStatus {
  initialized: boolean
  branch: string
  upstream?: string
  ahead: number
  behind: number
  staged: GitFileChange[]
  unstaged: GitFileChange[]
  untracked: GitFileChange[]
  conflicts: GitFileChange[]
  user?: GitUser
}

export interface GitLogEntry {
  hash: string
  shortHash: string
  message: string
  body: string
  author: string
  authorEmail: string
  date: string
  parents: string[]
  refs: string[]
}

export interface DiffLine {
  type: 'add' | 'del' | 'context'
  content: string
  oldLine?: number
  newLine?: number
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface FileDiff {
  file: string
  oldPath?: string
  isBinary: boolean
  hunks: DiffHunk[]
}

export interface GitRemote {
  name: string
  fetchUrl: string
  pushUrl: string
}

export interface GitBranch {
  name: string
  current: boolean
  remote?: string
  isHead: boolean
}

export interface GitStash {
  index: number
  ref: string
  message: string
  branch?: string
}

export interface GitBlameLine {
  line: number
  hash: string
  shortHash: string
  author: string
  date: string
  content: string
}

export interface CommitResult {
  hash: string
  shortHash: string
  branch: string
  summary: string
}

// ---- internal ----

const gitCache = new Map<string, SimpleGit>()

function g(cwd: string): SimpleGit {
  let inst = gitCache.get(cwd)
  if (!inst) {
    inst = simpleGit({
      baseDir: path.resolve(cwd),
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false
    })
    gitCache.set(cwd, inst)
  }
  return inst
}

export function dropGit(cwd: string): void {
  gitCache.delete(cwd)
}

export function clearGitCache(): void {
  gitCache.clear()
}

async function isRepo(cwd: string): Promise<boolean> {
  try {
    const out = await g(cwd).raw(['rev-parse', '--is-inside-work-tree'])
    return out.trim() === 'true'
  } catch {
    return false
  }
}

function classify(f: StatusResult['files'][number], staged: boolean): GitFileChange {
  const idx = f.index
  const wd = f.working_dir
  // 工作区冲突
  if (wd === 'U' || (idx === 'U' && wd === 'U') || wd === 'A' && idx === 'A' && f.path.endsWith('.git')) {
    // 跳过 .git 这种
  }
  if (wd === 'UU' || wd === 'AA' || wd === 'DD' || wd === 'AU' || wd === 'UA' || wd === 'DU' || wd === 'UD') {
    return { path: f.path, status: 'conflicted', staged: false }
  }
  if (idx === 'R') {
    return { path: f.path, oldPath: f.from, status: 'renamed', staged }
  }
  if (idx === 'C') {
    return { path: f.path, oldPath: f.from, status: 'copied', staged }
  }
  if (idx === 'A') return { path: f.path, status: 'added', staged: true }
  if (idx === 'T') return { path: f.path, status: 'type-changed', staged: true }
  if (idx === 'D') return { path: f.path, status: 'deleted', staged: true }
  if (wd === 'D') return { path: f.path, status: 'deleted', staged: false }
  if (idx === 'M') return { path: f.path, status: 'modified', staged: true }
  if (wd === 'M') return { path: f.path, status: 'modified', staged: false }
  if (wd === 'T') return { path: f.path, status: 'type-changed', staged: false }
  if (idx === '?' && wd === '?') return { path: f.path, status: 'untracked', staged: false }
  return { path: f.path, status: 'modified', staged }
}

function safeNum(n: number | undefined | null): number {
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0
}

// ---- repo state ----

export async function getStatus(cwd: string): Promise<GitStatus> {
  if (!(await isRepo(cwd))) {
    return { initialized: false, branch: '', ahead: 0, behind: 0, staged: [], unstaged: [], untracked: [], conflicts: [] }
  }

  const s = await g(cwd).status()
  const user = await getUser(cwd).catch(() => undefined)
  const upstream = s.tracking ? s.tracking : undefined

  const staged: GitFileChange[] = []
  const unstaged: GitFileChange[] = []
  const untracked: GitFileChange[] = []
  const conflicts: GitFileChange[] = []

  for (const f of s.files) {
    const c = classify(f, true)
    if (c.status === 'conflicted') {
      conflicts.push(c)
      continue
    }
    if (c.status === 'untracked') {
      untracked.push(c)
      continue
    }
    if (c.staged) staged.push(c)
    else if (c.status === 'modified' || c.status === 'deleted' || c.status === 'type-changed') unstaged.push(c)
    else if (c.status === 'added' || c.status === 'renamed' || c.status === 'copied') {
      // 部分索引(例如 intent-to-add) - 视为未跟踪
      untracked.push(c)
    }
  }

  return {
    initialized: true,
    branch: s.current || 'detached',
    upstream,
    ahead: safeNum(s.ahead),
    behind: safeNum(s.behind),
    staged,
    unstaged,
    untracked,
    conflicts,
    user
  }
}

export async function getUser(cwd: string): Promise<GitUser | undefined> {
  try {
    const name = (await g(cwd).raw(['config', 'user.name'])).trim()
    const email = (await g(cwd).raw(['config', 'user.email'])).trim()
    if (!name && !email) return undefined
    return { name, email }
  } catch {
    return undefined
  }
}

export async function setUser(cwd: string, name: string, email: string): Promise<void> {
  await g(cwd).raw(['config', 'user.name', name])
  await g(cwd).raw(['config', 'user.email', email])
}

export async function init(cwd: string): Promise<void> {
  await g(cwd).raw(['init'])
  // 默认分支名 main
  try { await g(cwd).raw(['symbolic-ref', 'HEAD', 'refs/heads/main']) } catch { /* 已存在或不可写 */ }
}

// ---- staging ----

export async function stage(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await g(cwd).add(paths)
}

export async function unstage(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await g(cwd).reset(['HEAD', '--', ...paths])
}

export async function discard(cwd: string, paths: string[]): Promise<void> {
  for (const p of paths) {
    await g(cwd).raw(['checkout', '--', p])
  }
}

export async function discardUntracked(cwd: string, paths: string[]): Promise<void> {
  for (const p of paths) {
    await g(cwd).raw(['clean', '-f', '--', p])
  }
}

export async function stageAll(cwd: string): Promise<void> {
  await g(cwd).add('.')
}

export async function unstageAll(cwd: string): Promise<void> {
  await g(cwd).raw(['reset', 'HEAD'])
}

// ---- diff (structured) ----

function parseUnifiedDiff(raw: string): FileDiff[] {
  const result: FileDiff[] = []
  if (!raw) return result

  const lines = raw.split('\n')
  let i = 0
  let cur: FileDiff | null = null

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('diff --git ')) {
      // 上一个文件结束
      if (cur) result.push(cur)
      const m = line.match(/^diff --git a\/(.+) b\/(.+)$/)
      cur = { file: m ? m[2] : '', isBinary: false, hunks: [] }
      i++
      continue
    }

    if (!cur) { i++; continue }

    if (line.startsWith('Binary files ')) {
      cur.isBinary = true
      i++
      continue
    }

    if (line.startsWith('new file mode ')) { i++; continue }
    if (line.startsWith('deleted file mode ')) { i++; continue }
    if (line.startsWith('old mode ') || line.startsWith('new mode ')) { i++; continue }
    if (line.startsWith('similarity index ')) { i++; continue }
    if (line.startsWith('dissimilarity index ')) { i++; continue }
    if (line.startsWith('rename from ')) { cur.oldPath = line.slice('rename from '.length); i++; continue }
    if (line.startsWith('rename to ')) { i++; continue }
    if (line.startsWith('copy from ')) { cur.oldPath = line.slice('copy from '.length); i++; continue }
    if (line.startsWith('copy to ')) { i++; continue }
    if (line.startsWith('index ')) { i++; continue }
    if (line === '--- ' || line === '---') { i++; continue }
    if (line === '+++ ' || line === '+++') { i++; continue }
    if (line.startsWith('GIT binary patch')) { cur.isBinary = true; i++; continue }

    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (hunkMatch) {
      const hunk: DiffHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1,
        newStart: parseInt(hunkMatch[3], 10),
        newLines: hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1,
        lines: []
      }
      let oldLine = hunk.oldStart
      let newLine = hunk.newStart
      i++
      let consumed = 0
      const totalOld = hunk.oldLines
      const totalNew = hunk.newLines
      while (i < lines.length && consumed < totalOld + totalNew) {
        const l = lines[i]
        if (l.startsWith('\\ No newline at end of file')) { i++; continue }
        if (l.startsWith('diff --git ') || l.startsWith('@@')) break
        if (l.startsWith('+')) {
          hunk.lines.push({ type: 'add', content: l.slice(1), newLine: newLine++ })
          consumed++
        } else if (l.startsWith('-')) {
          hunk.lines.push({ type: 'del', content: l.slice(1), oldLine: oldLine++ })
          consumed++
        } else if (l.startsWith(' ')) {
          hunk.lines.push({ type: 'context', content: l.slice(1), oldLine: oldLine++, newLine: newLine++ })
          consumed++
        } else {
          break
        }
        i++
      }
      cur.hunks.push(hunk)
      continue
    }

    i++
  }

  if (cur) result.push(cur)
  return result
}

export async function getWorkingDiff(cwd: string, file: string): Promise<FileDiff> {
  // unstaged 变更(working tree vs index)
  const raw = await g(cwd).raw(['diff', '--no-color', '--no-ext-diff', '--', file])
  const parsed = parseUnifiedDiff(raw)
  return parsed[0] || { file, isBinary: false, hunks: [] }
}

export async function getStagedDiff(cwd: string, file: string): Promise<FileDiff> {
  const raw = await g(cwd).raw(['diff', '--no-color', '--no-ext-diff', '--cached', '--', file])
  const parsed = parseUnifiedDiff(raw)
  return parsed[0] || { file, isBinary: false, hunks: [] }
}

export async function getAllWorkingDiff(cwd: string): Promise<FileDiff[]> {
  const raw = await g(cwd).raw(['diff', '--no-color', '--no-ext-diff'])
  return parseUnifiedDiff(raw)
}

export async function getAllStagedDiff(cwd: string): Promise<FileDiff[]> {
  const raw = await g(cwd).raw(['diff', '--no-color', '--no-ext-diff', '--cached'])
  return parseUnifiedDiff(raw)
}

export async function getCommitDiff(cwd: string, hash: string): Promise<FileDiff[]> {
  const raw = await g(cwd).raw(['show', '--no-color', '--no-ext-diff', hash])
  // show 第一个 hunk 之前是 commit meta,过滤掉
  const cut = raw.indexOf('\ndiff --git ')
  const body = cut === -1 ? '' : raw.slice(cut + 1)
  return parseUnifiedDiff('d' + body)
}

export async function getFileAtCommit(cwd: string, hash: string, file: string): Promise<string | null> {
  try {
    const out = await g(cwd).raw(['show', `${hash}:${file}`])
    return out
  } catch {
    return null
  }
}

// ---- log ----

export async function getCommitLog(cwd: string, count = 50, branch?: string): Promise<GitLogEntry[]> {
  if (!(await isRepo(cwd))) return []
  const range = branch ? branch : 'HEAD'
  const log: LogResult<{ hash: string; short: string; subject: string; body: string; author: string; email: string; date: string; parents: string; refs: string }> = await g(cwd).log({
    n: count,
    from: range,
    format: {
      hash: '%H',
      short: '%h',
      subject: '%s',
      body: '%b',
      author: '%an',
      email: '%ae',
      date: '%ai',
      parents: '%P',
      refs: '%D'
    }
  })
  const all = (log.all || []) as ReadonlyArray<{ hash: string; short: string; subject: string; body: string; author: string; email: string; date: string; parents: string; refs: string }>
  return all.map(e => ({
    hash: e.hash,
    shortHash: e.short,
    message: e.subject,
    body: e.body,
    author: e.author,
    authorEmail: e.email,
    date: e.date,
    parents: e.parents.split(' ').filter(Boolean),
    refs: e.refs.split(', ').filter(Boolean)
  }))
}

export async function getCommit(cwd: string, hash: string): Promise<GitLogEntry | null> {
  const list = await getCommitLog(cwd, 1, hash)
  return list[0] || null
}

// ---- branches / remotes / stash ----

export async function getBranches(cwd: string): Promise<{ current: string; local: GitBranch[]; remote: GitBranch[] }> {
  if (!(await isRepo(cwd))) return { current: '', local: [], remote: [] }
  const b: BranchSummary = await g(cwd).branch(['-a', '--no-color'])
  const local: GitBranch[] = []
  const remote: GitBranch[] = []
  for (const name of Object.keys(b.branch)) {
    const br = b.branch[name]
    const isRemote = name.startsWith('remotes/')
    const cleanName = isRemote ? name.replace(/^remotes\//, '') : name
    const item: GitBranch = {
      name: cleanName,
      current: br.current,
      isHead: br.current
    }
    if (isRemote) {
      const m = cleanName.match(/^(.+?)\/(.+)$/)
      if (m) { item.remote = m[1]; item.name = m[2] }
      remote.push(item)
    } else {
      local.push(item)
    }
  }
  return { current: b.current, local, remote }
}

export async function getRemotes(cwd: string): Promise<GitRemote[]> {
  if (!(await isRepo(cwd))) return []
  const out = await g(cwd).raw(['remote', '-v'])
  const map = new Map<string, GitRemote>()
  for (const line of out.split('\n')) {
    const m = line.match(/^(\S+)\s+(\S+)\s+\(fetch\)$/)
    if (!m) continue
    const name = m[1]
    const url = m[2]
    const existing = map.get(name) || { name, fetchUrl: url, pushUrl: url }
    existing.fetchUrl = url
    map.set(name, existing)
  }
  for (const line of out.split('\n')) {
    const m = line.match(/^(\S+)\s+(\S+)\s+\(push\)$/)
    if (!m) continue
    const name = m[1]
    const url = m[2]
    const existing = map.get(name) || { name, fetchUrl: url, pushUrl: url }
    existing.pushUrl = url
    map.set(name, existing)
  }
  return Array.from(map.values())
}

export async function getStashList(cwd: string): Promise<GitStash[]> {
  if (!(await isRepo(cwd))) return []
  try {
    const out = await g(cwd).raw(['stash', 'list', '--no-color'])
    if (!out.trim()) return []
    const list: GitStash[] = []
    let idx = 0
    for (const line of out.split('\n')) {
      const m = line.match(/^stash@\{(\d+)\}:?(.*)$/)
      if (!m) continue
      const tail = (m[2] || '').trim()
      const onBranch = tail.match(/^On\s+([^:]+):\s*(.*)$/)
      list.push({
        index: idx++,
        ref: `stash@{${m[1]}}`,
        message: onBranch ? onBranch[2] : tail,
        branch: onBranch ? onBranch[1] : undefined
      })
    }
    return list
  } catch {
    return []
  }
}

// ---- commit / push / pull / fetch ----

export async function commit(cwd: string, message: string, opts: { amend?: boolean; signOff?: boolean; noVerify?: boolean; allowEmpty?: boolean } = {}): Promise<CommitResult> {
  const args: string[] = ['commit']
  // GPG 签名:项目偏好,没配就让它炸
  args.push('-S')
  if (opts.amend) args.push('--amend')
  if (opts.signOff) args.push('--signoff')
  if (opts.noVerify) args.push('--no-verify')
  if (opts.allowEmpty) args.push('--allow-empty')
  args.push('-m', message)
  const out = await g(cwd).raw(args)
  // 输出尾部通常包含 [branch hash] Message
  const m = out.match(/\[[\w\/\-]+\s+([0-9a-f]+)\][^\n]*$/)
  const hash = m ? m[1] : ''
  const status = await getStatus(cwd)
  return {
    hash,
    shortHash: hash.slice(0, 7),
    branch: status.branch,
    summary: message.split('\n')[0]
  }
}

export async function push(cwd: string, opts: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean; forceWithLease?: boolean; tags?: boolean } = {}): Promise<string> {
  const args: string[] = ['push']
  if (opts.setUpstream) args.push('-u')
  if (opts.forceWithLease) args.push('--force-with-lease')
  else if (opts.force) args.push('--force')
  if (opts.tags) args.push('--tags')
  if (opts.remote) args.push(opts.remote)
  if (opts.branch) args.push(opts.branch)
  return g(cwd).raw(args)
}

export async function pull(cwd: string, opts: { remote?: string; branch?: string; rebase?: boolean; ffOnly?: boolean } = {}): Promise<string> {
  const args: string[] = ['pull']
  if (opts.rebase) args.push('--rebase')
  if (opts.ffOnly) args.push('--ff-only')
  if (opts.remote) args.push(opts.remote)
  if (opts.branch) args.push(opts.branch)
  return g(cwd).raw(args)
}

export async function fetch(cwd: string, opts: { remote?: string; prune?: boolean; all?: boolean } = {}): Promise<string> {
  const args: string[] = ['fetch']
  if (opts.all) args.push('--all')
  if (opts.prune) args.push('--prune')
  if (opts.remote) args.push(opts.remote)
  return g(cwd).raw(args)
}

// ---- branch ops ----

export async function checkout(cwd: string, target: string, opts: { create?: boolean } = {}): Promise<string> {
  if (opts.create) return g(cwd).raw(['checkout', '-b', target])
  return g(cwd).raw(['checkout', target])
}

export async function createBranch(cwd: string, name: string, startPoint?: string): Promise<string> {
  const args = ['checkout', '-b', name]
  if (startPoint) args.push(startPoint)
  return g(cwd).raw(args)
}

export async function deleteBranch(cwd: string, name: string, force = false): Promise<string> {
  return g(cwd).raw(['branch', force ? '-D' : '-d', name])
}

// ---- stash ops ----

export async function stashSave(cwd: string, message?: string, includeUntracked = false): Promise<string> {
  const args = ['stash', 'push']
  if (includeUntracked) args.push('-u')
  if (message) args.push('-m', message)
  return g(cwd).raw(args)
}

export async function stashPop(cwd: string, index = 0): Promise<string> {
  return g(cwd).raw(['stash', 'pop', `stash@{${index}}`])
}

export async function stashApply(cwd: string, index = 0): Promise<string> {
  return g(cwd).raw(['stash', 'apply', `stash@{${index}}`])
}

export async function stashDrop(cwd: string, index = 0): Promise<string> {
  return g(cwd).raw(['stash', 'drop', `stash@{${index}}`])
}

// ---- remote ops ----

export async function addRemote(cwd: string, name: string, url: string): Promise<void> {
  await g(cwd).addRemote(name, url)
}

export async function removeRemote(cwd: string, name: string): Promise<void> {
  await g(cwd).removeRemote(name)
}

// ---- blame ----

export async function blame(cwd: string, file: string): Promise<GitBlameLine[]> {
  if (!(await isRepo(cwd))) return []
  try {
    const out = await g(cwd).raw(['blame', '--line-porcelain', '--', file])
    if (!out) return []
    const lines = out.split('\n')
    const result: GitBlameLine[] = []
    let cur: { hash: string; author: string; date: string; lineNum: number; content?: string } | null = null
    let lineNum = 0
    for (const line of lines) {
      const headerMatch = line.match(/^([0-9a-f]{40}) (\d+) (\d+)(?:\s+\d+)?$/)
      if (headerMatch) {
        if (cur && cur.content !== undefined) {
          result.push({
            line: lineNum,
            hash: cur.hash,
            shortHash: cur.hash.slice(0, 7),
            author: cur.author,
            date: cur.date,
            content: cur.content
          })
        }
        cur = { hash: headerMatch[1], author: '', date: '', lineNum: parseInt(headerMatch[3], 10) }
        lineNum = cur.lineNum
        continue
      }
      if (!cur) continue
      if (line.startsWith('author ')) cur.author = line.slice(7)
      else if (line.startsWith('author-time ')) {
        const ts = parseInt(line.slice(12), 10)
        if (!Number.isNaN(ts)) cur.date = new Date(ts * 1000).toISOString().split('T')[0]
      } else if (line.startsWith('\t')) {
        cur.content = line.slice(1)
        result.push({
          line: lineNum,
          hash: cur.hash,
          shortHash: cur.hash.slice(0, 7),
          author: cur.author,
          date: cur.date,
          content: cur.content
        })
        cur.content = undefined
        lineNum++
      }
    }
    return result
  } catch {
    return []
  }
}

// ---- find repo root ----

export function findGitRoot(filePath: string): string | null {
  let dir = path.dirname(path.resolve(filePath))
  const root = path.parse(dir).root
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

// ---- event emitter for fs changes ----

class GitWatcher extends EventEmitter {}

const watcher = new GitWatcher()

export function onGitChange(handler: (cwd: string) => void): void {
  watcher.on('change', handler)
}

export function offGitChange(handler: (cwd: string) => void): void {
  watcher.off('change', handler)
}

export function emitGitChange(cwd: string): void {
  watcher.emit('change', cwd)
}

// ---- low level (escape hatch) ----

export async function raw(cwd: string, args: string[]): Promise<string> {
  return g(cwd).raw(args)
}