import React, { useState, useEffect, useCallback, useRef } from 'react'
import type {
  GitStatus, GitFileChange, GitLogEntry, FileDiff,
  GitStash, GitRemote, GitBranch
} from '../../../preload/index'
import { useEditorContext } from '../contexts/EditorContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FileDiffView from './GitDiffViewer'

interface Props {
  dirPath: string | null
  onRefresh: () => void
}

type Tab = 'changes' | 'history' | 'stash' | 'branches' | 'remotes'

const STATUS_ICON: Record<GitFileChange['status'], string> = {
  added: 'A', modified: 'M', deleted: 'D', renamed: 'R',
  copied: 'C', untracked: 'U', conflicted: '!', 'type-changed': 'T'
}

const STATUS_COLOR: Record<GitFileChange['status'], string> = {
  added: 'var(--fg-success)',
  modified: 'var(--fg-warn)',
  deleted: 'var(--fg-danger)',
  renamed: 'var(--fg-accent)',
  copied: 'var(--fg-accent)',
  untracked: 'var(--fg-muted)',
  conflicted: 'var(--fg-danger)',
  'type-changed': 'var(--fg-warn)'
}

export default function SourceControl({ dirPath, onRefresh }: Props) {
  const { openFile: openTab } = useEditorContext()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const [tab, setTab] = useState<Tab>('changes')
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [log, setLog] = useState<GitLogEntry[]>([])
  const [stashes, setStashes] = useState<GitStash[]>([])
  const [remotes, setRemotes] = useState<GitRemote[]>([])
  const [branches, setBranches] = useState<{ current: string; local: GitBranch[]; remote: GitBranch[] } | null>(null)
  const [commitMsg, setCommitMsg] = useState('')
  const [amend, setAmend] = useState(false)
  const [signOff, setSignOff] = useState(false)
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const [fileDiff, setFileDiff] = useState<FileDiff | null>(null)
  const [fileDiffLoading, setFileDiffLoading] = useState(false)
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [commitDiff, setCommitDiff] = useState<FileDiff[] | null>(null)
  const [commitDiffLoading, setCommitDiffLoading] = useState(false)
  const [showBranchInput, setShowBranchInput] = useState(false)
  const [newBranch, setNewBranch] = useState('')
  const [newRemote, setNewRemote] = useState({ name: '', url: '' })
  const [busy, setBusy] = useState(false)
  const commitRef = useRef<HTMLTextAreaElement>(null)
  const doCommitRef = useRef<() => void>(() => {})
  const pushRef = useRef<() => void>(() => {})
  const pullRef = useRef<() => void>(() => {})
  const fetchRef = useRef<() => void>(() => {})
  const initRef = useRef<() => void>(() => {})

  const refresh = useCallback(async () => {
    if (!dirPath) return
    setBusy(true)
    try {
      const [s, l] = await Promise.all([
        window.electronAPI.gitState(dirPath),
        window.electronAPI.gitLog(dirPath, 50)
      ])
      setStatus(s)
      setLog(l)
    } catch (e) {
      toast('error', `git: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [dirPath, toast])

  const refreshExtra = useCallback(async () => {
    if (!dirPath) return
    try {
      const [st, r, b] = await Promise.all([
        window.electronAPI.gitStashList(dirPath),
        window.electronAPI.gitRemotes(dirPath),
        window.electronAPI.gitBranches(dirPath)
      ])
      setStashes(st); setRemotes(r); setBranches(b)
    } catch (e) {
      toast('error', `git: ${(e as Error).message}`)
    }
  }, [dirPath, toast])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    if (tab === 'stash' || tab === 'branches' || tab === 'remotes') refreshExtra()
  }, [tab, refreshExtra])

  useEffect(() => {
    const onCommit = () => {
      setTab('changes')
      setTimeout(() => {
        if (!commitMsg.trim()) {
          commitRef.current?.focus()
        } else {
          doCommitRef.current()
        }
      }, 30)
    }
    const onPush = () => { setTab('changes'); setTimeout(() => pushRef.current(), 30) }
    const onPull = () => { setTab('changes'); setTimeout(() => pullRef.current(), 30) }
    const onFetch = () => { setTab('changes'); setTimeout(() => fetchRef.current(), 30) }
    const onInit = () => { setTab('changes'); setTimeout(() => initRef.current(), 30) }
    document.addEventListener('git:menu:commit', onCommit)
    document.addEventListener('git:menu:push', onPush)
    document.addEventListener('git:menu:pull', onPull)
    document.addEventListener('git:menu:fetch', onFetch)
    document.addEventListener('git:menu:init', onInit)
    return () => {
      document.removeEventListener('git:menu:commit', onCommit)
      document.removeEventListener('git:menu:push', onPush)
      document.removeEventListener('git:menu:pull', onPull)
      document.removeEventListener('git:menu:fetch', onFetch)
      document.removeEventListener('git:menu:init', onInit)
    }
  }, [])

  const run = useCallback(async <T,>(fn: () => Promise<T>, okMsg?: string): Promise<T | null> => {
    try {
      const r = await fn()
      if (okMsg) toast('success', okMsg)
      await refresh()
      return r
    } catch (e) {
      toast('error', (e as Error).message)
      return null
    }
  }, [refresh, toast])

  const loadFileDiff = useCallback(async (file: GitFileChange) => {
    if (!dirPath) return
    if (expandedFile === file.path) {
      setExpandedFile(null); setFileDiff(null); return
    }
    setExpandedFile(file.path)
    setFileDiff(null)
    setFileDiffLoading(true)
    try {
      const d = file.staged
        ? await window.electronAPI.gitDiffStaged(dirPath, file.path)
        : await window.electronAPI.gitDiffWorking(dirPath, file.path)
      setFileDiff(d)
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setFileDiffLoading(false)
    }
  }, [dirPath, expandedFile, toast])

  const loadCommitDiff = useCallback(async (hash: string) => {
    if (!dirPath) return
    if (expandedCommit === hash) {
      setExpandedCommit(null); setCommitDiff(null); return
    }
    setExpandedCommit(hash)
    setCommitDiff(null)
    setCommitDiffLoading(true)
    try {
      const d = await window.electronAPI.gitDiffCommit(dirPath, hash)
      setCommitDiff(d)
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setCommitDiffLoading(false)
    }
  }, [dirPath, expandedCommit, toast])

  // ---- empty states ----

  if (!dirPath) {
    return (
      <div className="sidebar">
        <div className="sidebar-header"><span>SOURCE CONTROL</span></div>
        <div className="sidebar-empty"><div className="sidebar-empty-text">No folder opened</div></div>
      </div>
    )
  }

  if (status && !status.initialized) {
    return (
      <div className="sidebar">
        <div className="sidebar-header"><span>SOURCE CONTROL</span></div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>未初始化 git 仓库</div>
          <button className="sidebar-empty-btn" onClick={doInit}>
            Init Repository
          </button>
        </div>
      </div>
    )
  }

  if (!status) return null

  // ---- action handlers ----

  const stage = (paths: string[]) => run(() => window.electronAPI.gitStage(dirPath!, paths), `已 stage ${paths.length} 个`)
  const stageAll = () => run(() => window.electronAPI.gitStageAll(dirPath!), '已 stage 全部')
  const unstage = (paths: string[]) => run(() => window.electronAPI.gitUnstage(dirPath!, paths), `已 unstage ${paths.length} 个`)
  const unstageAll = () => run(() => window.electronAPI.gitUnstageAll(dirPath!), '已 unstage 全部')
  const discardChanges = async (paths: string[]) => {
    const ok = await confirm({ title: '放弃修改', message: `放弃 ${paths.length} 个文件的工作区修改?`, okText: '放弃', danger: true })
    if (ok) run(() => window.electronAPI.gitDiscard(dirPath!, paths), '已放弃')
  }
  const deleteUntracked = async (paths: string[]) => {
    const ok = await confirm({ title: '删除文件', message: `永久删除 ${paths.length} 个未跟踪文件?`, okText: '删除', danger: true })
    if (ok) run(() => window.electronAPI.gitDiscardUntracked(dirPath!, paths), '已删除')
  }

  const doCommit = async () => {
    const msg = commitMsg.trim()
    if (amend) {
      if (!msg && !log[0]) { toast('warning', '没有可 amend 的 commit'); return }
      const finalMsg = msg || log[0].message
      const r = await run(() => window.electronAPI.gitCommit(dirPath!, finalMsg, { amend, signOff }), '已 amend')
      if (r) { setCommitMsg(''); setAmend(false) }
    } else {
      if (!msg) { toast('warning', '提交信息不能为空'); return }
      if (status.staged.length === 0) {
        toast('warning', '没有 staged 的变更,先 stage 文件再提交')
        return
      }
      const r = await run(() => window.electronAPI.gitCommit(dirPath!, msg, { signOff }), '已提交')
      if (r) setCommitMsg('')
    }
  }

  const pushOpts = (overrides: Partial<{ remote: string; branch: string; setUpstream: boolean; force: boolean; forceWithLease: boolean; tags: boolean }> = {}) =>
    run(() => window.electronAPI.gitPush(dirPath!, overrides), '已 push')

  const pullOpts = (opts: { rebase?: boolean; remote?: string; branch?: string } = {}) =>
    run(() => window.electronAPI.gitPull(dirPath!, opts), '已 pull')

  const fetchAll = () => run(() => window.electronAPI.gitFetch(dirPath!, { all: true }), '已 fetch')
  const doInit = () => run(() => window.electronAPI.gitInit(dirPath!), '已初始化')

  useEffect(() => {
    doCommitRef.current = doCommit
    pushRef.current = () => pushOpts()
    pullRef.current = () => pullOpts()
    fetchRef.current = fetchAll
    initRef.current = doInit
  })

  const checkoutBranch = (target: string) => run(() => window.electronAPI.gitCheckout(dirPath!, target), `已切换到 ${target}`)
  const checkoutRemote = async (remote: string, branch: string) => {
    const local = branch.replace(/^remotes\//, '').replace(/^[^/]+\//, '')
    run(() => window.electronAPI.gitCreateBranch(dirPath!, local, `${remote}/${branch}`), `已基于 ${remote}/${branch} 创建 ${local}`)
  }

  const createBranch = () => {
    const name = newBranch.trim()
    if (!name) return
    run(() => window.electronAPI.gitCreateBranch(dirPath!, name), `已创建 ${name}`)
      .then(r => { if (r) { setNewBranch(''); setShowBranchInput(false) } })
  }

  const deleteBranch = async (name: string) => {
    const ok = await confirm({ title: '删除分支', message: `删除分支 ${name}?`, okText: '删除', danger: true })
    if (ok) run(() => window.electronAPI.gitDeleteBranch(dirPath!, name, true), `已删除 ${name}`)
  }

  const stashSave = (includeUntracked: boolean) => {
    const msg = commitMsg.trim() || undefined
    run(() => window.electronAPI.gitStashSave(dirPath!, msg, includeUntracked), '已 stash')
      .then(r => { if (r) setCommitMsg('') })
  }
  const stashPop = (i: number) => run(() => window.electronAPI.gitStashPop(dirPath!, i), '已 pop stash')
  const stashApply = (i: number) => run(() => window.electronAPI.gitStashApply(dirPath!, i), '已 apply stash')
  const stashDrop = async (i: number) => {
    const ok = await confirm({ title: '删除 stash', message: `删除 stash ${i}?`, okText: '删除', danger: true })
    if (ok) run(() => window.electronAPI.gitStashDrop(dirPath!, i), '已删除')
  }

  const addRemote = () => {
    const name = newRemote.name.trim(), url = newRemote.url.trim()
    if (!name || !url) return
    run(() => window.electronAPI.gitAddRemote(dirPath!, name, url), '已添加 remote')
      .then(r => { if (r) setNewRemote({ name: '', url: '' }) })
  }
  const removeRemote = async (name: string) => {
    const ok = await confirm({ title: '删除 remote', message: `删除 remote ${name}?`, okText: '删除', danger: true })
    if (ok) run(() => window.electronAPI.gitRemoveRemote(dirPath!, name), '已删除')
  }

  const openInEditor = async (filePath: string) => {
    if (!dirPath) return
    const full = /^[A-Za-z]:[\\\/]/.test(filePath) || filePath.startsWith('/') || filePath.startsWith('\\')
      ? filePath
      : `${dirPath}/${filePath}`.replace(/\\/g, '/')
    const res = await window.electronAPI.openFile(full)
    if ('error' in res) { toast('error', res.error); return }
    openTab(full, full.split(/[/\\]/).pop() || full, res.content, res.language)
  }

  // ---- subcomponents ----

  const FileRow = ({ file }: { file: GitFileChange }) => {
    const isOpen = expandedFile === file.path
    return (
      <div className="git-file-row">
        <div
          className={`git-file-item${isOpen ? ' git-file-item--expanded' : ''}`}
          onClick={() => loadFileDiff(file)}
          title={file.path}
        >
          <span className="git-file-icon" style={{ color: STATUS_COLOR[file.status] }}>{STATUS_ICON[file.status]}</span>
          <span className="git-file-name">{file.oldPath ? `${file.oldPath} → ${file.path}` : file.path}</span>
          <span className="git-file-actions" onClick={e => e.stopPropagation()}>
            {file.status !== 'untracked' && file.status !== 'conflicted' && (
              <button className="git-action-btn" onClick={() => openInEditor(file.path)} title="Open">⤴</button>
            )}
            {file.staged ? (
              <button className="git-action-btn" onClick={() => unstage([file.path])} title="Unstage">−</button>
            ) : file.status === 'untracked' ? (
              <>
                <button className="git-action-btn" onClick={() => stage([file.path])} title="Stage">+</button>
                <button className="git-action-btn git-action-btn--danger" onClick={() => deleteUntracked([file.path])} title="Delete">×</button>
              </>
            ) : file.status === 'conflicted' ? (
              <button className="git-action-btn" onClick={() => openInEditor(file.path)} title="Resolve">✎</button>
            ) : (
              <>
                <button className="git-action-btn" onClick={() => stage([file.path])} title="Stage">+</button>
                <button className="git-action-btn git-action-btn--danger" onClick={() => discardChanges([file.path])} title="Discard">↺</button>
              </>
            )}
          </span>
        </div>
        {isOpen && (
          <div className="git-file-diff">
            <FileDiffView diff={fileDiff} loading={fileDiffLoading} maxHeight={320} />
          </div>
        )}
      </div>
    )
  }

  const Section = ({
    title, count, files, actions, danger
  }: { title: string; count: number; files: GitFileChange[]; actions?: React.ReactNode; danger?: boolean }) => {
    if (files.length === 0) return null
    return (
      <div className="git-section">
        <div className="git-section-header" style={danger ? { color: 'var(--fg-danger)' } : undefined}>
          <span>{title}</span>
          <span className="git-count">{count}</span>
          <span className="git-section-actions">{actions}</span>
        </div>
        {files.map(f => <FileRow key={f.path} file={f} />)}
      </div>
    )
  }

  const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length + status.conflicts.length

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span>SOURCE CONTROL</span>
        <button className="sidebar-header-btn" onClick={refresh} title="Refresh" disabled={busy}>↻</button>
      </div>

      <div className="git-branch-bar">
        <div className="git-branch-selector" onClick={() => setTab('branches')} title="Switch branch">
          <span className="git-branch-icon">⎇</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.branch}</span>
          {status.upstream && <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>↔ {status.upstream}</span>}
          {(status.ahead > 0 || status.behind > 0) && (
            <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>
              {status.ahead > 0 ? `↑${status.ahead}` : ''}{status.behind > 0 ? ` ↓${status.behind}` : ''}
            </span>
          )}
        </div>
        <div className="git-sync-actions">
          <button className="git-action-bar-btn" onClick={fetchAll} title="Fetch all">⟲</button>
          <button className="git-action-bar-btn" onClick={() => pullOpts()} title="Pull" disabled={!status.upstream}>↓</button>
          <button className="git-action-bar-btn" onClick={() => pushOpts()} title="Push" disabled={!status.upstream}>↑</button>
          <button className="git-action-bar-btn" onClick={() => pushOpts({ setUpstream: true })} title="Publish Branch" disabled={!!status.upstream}>⇧</button>
        </div>
      </div>

      {status.user && (!status.user.name || !status.user.email) && (
        <div className="git-user-warn">
          ⚠ 未设置 git user
          <button className="git-link-btn" onClick={() => setTab('remotes') /* 这里应该弹设置,但没设置页;先提示 */}>Configure</button>
        </div>
      )}

      <div className="git-tabs">
        <div className={`git-tab${tab === 'changes' ? ' git-tab--active' : ''}`} onClick={() => setTab('changes')}>
          Changes{totalChanges > 0 ? ` ${totalChanges}` : ''}
        </div>
        <div className={`git-tab${tab === 'history' ? ' git-tab--active' : ''}`} onClick={() => setTab('history')}>History</div>
        <div className={`git-tab${tab === 'stash' ? ' git-tab--active' : ''}`} onClick={() => setTab('stash')}>
          Stash{stashes.length > 0 ? ` ${stashes.length}` : ''}
        </div>
        <div className={`git-tab${tab === 'branches' ? ' git-tab--active' : ''}`} onClick={() => setTab('branches')}>Branches</div>
        <div className={`git-tab${tab === 'remotes' ? ' git-tab--active' : ''}`} onClick={() => setTab('remotes')}>Remotes</div>
      </div>

      <div className="git-body">
        {tab === 'changes' && (
          <>
            <div className="git-commit-box">
              <textarea
                ref={commitRef}
                className="git-commit-msg"
                rows={3}
                placeholder={amend ? 'Amend last commit' : 'Message (Ctrl+Enter to commit)'}
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doCommit() } }}
              />
              <div className="git-commit-options">
                <label className="git-check">
                  <input type="checkbox" checked={signOff} onChange={e => setSignOff(e.target.checked)} />
                  <span>Sign off</span>
                </label>
                <label className="git-check">
                  <input type="checkbox" checked={amend} onChange={e => setAmend(e.target.checked)} disabled={log.length === 0} />
                  <span>Amend</span>
                </label>
              </div>
              <button
                className="git-commit-btn"
                onClick={doCommit}
                disabled={amend ? (!commitMsg.trim() && !log[0]) : (!commitMsg.trim() || status.staged.length === 0)}
              >
                {amend ? 'Amend Commit' : 'Commit'}
              </button>
            </div>

            <Section
              title="Conflicts" count={status.conflicts.length} danger
              files={status.conflicts}
            />
            <Section
              title="Staged Changes" count={status.staged.length}
              files={status.staged}
              actions={status.staged.length > 0 && <button className="git-action-bar-btn" onClick={unstageAll}>− All</button>}
            />
            <Section
              title="Changes" count={status.unstaged.length}
              files={status.unstaged}
              actions={
                <>
                  {status.unstaged.length > 0 && (
                    <>
                      <button className="git-action-bar-btn" onClick={() => stage(status.unstaged.map(f => f.path))}>+ All</button>
                      <button className="git-action-bar-btn" onClick={() => discardChanges(status.unstaged.map(f => f.path))}>↺ All</button>
                    </>
                  )}
                </>
              }
            />
            <Section
              title="Untracked" count={status.untracked.length}
              files={status.untracked}
              actions={
                <>
                  {status.untracked.length > 0 && (
                    <>
                      <button className="git-action-bar-btn" onClick={stageAll}>+ All</button>
                      <button className="git-action-bar-btn" onClick={() => deleteUntracked(status.untracked.map(f => f.path))}>× All</button>
                    </>
                  )}
                </>
              }
            />
            {totalChanges === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>工作区干净 ✨</div>
            )}
          </>
        )}

        {tab === 'history' && (
          <div className="git-history">
            {log.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>No commits</div>}
            {log.map(c => {
              const isOpen = expandedCommit === c.hash
              return (
                <div key={c.hash} className={`git-log-entry${isOpen ? ' git-log-entry--expanded' : ''}`}>
                  <div className="git-log-row" onClick={() => loadCommitDiff(c.hash)}>
                    <div className="git-log-msg">{c.message}</div>
                    <div className="git-log-meta">
                      <span className="git-log-hash">{c.shortHash}</span>
                      <span>{c.author}</span>
                      <span>{c.date.split('T')[0]}</span>
                      {c.refs.length > 0 && <span style={{ color: 'var(--fg-accent)' }}>{c.refs.join(', ')}</span>}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="git-log-diff">
                      {commitDiffLoading ? <div className="fdv-empty">Loading…</div>
                        : !commitDiff || commitDiff.length === 0 ? <div className="fdv-empty">No changes</div>
                        : commitDiff.map((f, i) => (
                          <div key={i} className="git-log-diff-file">
                            <div className="git-log-diff-name">{f.file}</div>
                            <FileDiffView diff={f} maxHeight={260} />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'stash' && (
          <div className="git-stash">
            <div className="git-stash-actions">
              <button className="git-action-bar-btn" onClick={() => stashSave(false)}>+ Stash</button>
              <button className="git-action-bar-btn" onClick={() => stashSave(true)}>+ incl. untracked</button>
            </div>
            {stashes.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>No stashes</div>
            ) : stashes.map(s => (
              <div key={s.ref} className="git-stash-item">
                <div className="git-stash-msg">{s.message}</div>
                <div className="git-stash-meta">
                  {s.branch && <span>{s.branch}</span>}
                  <span>{s.ref}</span>
                </div>
                <div className="git-stash-buttons">
                  <button className="git-action-bar-btn" onClick={() => stashPop(s.index)}>Pop</button>
                  <button className="git-action-bar-btn" onClick={() => stashApply(s.index)}>Apply</button>
                  <button className="git-action-bar-btn" onClick={() => stashDrop(s.index)}>Drop</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'branches' && (
          <div className="git-branches">
            <div className="git-branch-create">
              {showBranchInput ? (
                <>
                  <input
                    className="sidebar-input"
                    placeholder="new branch…"
                    value={newBranch}
                    onChange={e => setNewBranch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createBranch(); if (e.key === 'Escape') setShowBranchInput(false) }}
                    autoFocus
                  />
                  <button className="git-action-bar-btn" onClick={createBranch}>+</button>
                  <button className="git-action-bar-btn" onClick={() => setShowBranchInput(false)}>×</button>
                </>
              ) : (
                <button className="git-action-bar-btn" onClick={() => setShowBranchInput(true)}>+ New Branch from HEAD</button>
              )}
            </div>
            {branches && branches.local.length > 0 && (
              <div className="git-section">
                <div className="git-section-header"><span>Local</span><span className="git-count">{branches.local.length}</span></div>
                {branches.local.map(b => (
                  <div
                    key={b.name}
                    className={`git-branch-item${b.current ? ' git-branch-item--active' : ''}`}
                    onClick={() => !b.current && checkoutBranch(b.name)}
                  >
                    <span style={{ width: 12, color: b.current ? 'var(--fg-success)' : 'var(--fg-muted)' }}>{b.current ? '●' : '○'}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                    {!b.current && (
                      <button className="git-action-btn" onClick={e => { e.stopPropagation(); deleteBranch(b.name) }} title="Delete">×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {branches && branches.remote.length > 0 && (
              <div className="git-section">
                <div className="git-section-header"><span>Remote</span><span className="git-count">{branches.remote.length}</span></div>
                {branches.remote.map(b => (
                  <div
                    key={`${b.remote}/${b.name}`}
                    className="git-branch-item"
                    onClick={() => b.remote && checkoutRemote(b.remote, b.name)}
                  >
                    <span style={{ width: 12, color: 'var(--fg-accent)' }}>↗</span>
                    <span style={{ flex: 1, fontSize: 11 }}>{b.remote}/{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'remotes' && (
          <div className="git-remotes">
            <div className="git-remote-add">
              <input
                className="sidebar-input"
                placeholder="name (e.g. origin)"
                value={newRemote.name}
                onChange={e => setNewRemote({ ...newRemote, name: e.target.value })}
              />
              <input
                className="sidebar-input"
                placeholder="url"
                value={newRemote.url}
                onChange={e => setNewRemote({ ...newRemote, url: e.target.value })}
              />
              <button className="git-action-bar-btn" onClick={addRemote}>+ Add</button>
            </div>
            {remotes.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>No remotes</div>
            ) : remotes.map(r => (
              <div key={r.name} className="git-remote-item">
                <div className="git-remote-name">{r.name}</div>
                <div className="git-remote-url" title={r.pushUrl}>{r.pushUrl}</div>
                <div className="git-remote-buttons">
                  <button className="git-action-bar-btn" onClick={() => navigator.clipboard.writeText(r.pushUrl)}>Copy</button>
                  <button className="git-action-bar-btn" onClick={() => removeRemote(r.name)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}