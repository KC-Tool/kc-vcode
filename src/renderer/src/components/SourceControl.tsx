import React, { useState, useEffect, useCallback } from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import GitDiffViewer from './GitDiffViewer'

interface GitFile { path: string; status: string; staged: boolean }
interface GitStatus { branch: string; files: GitFile[]; ahead: number; behind: number }
interface GitLogEntry { hash: string; message: string; author: string; date: string }

interface Props {
  dirPath: string | null
  onRefresh: () => void
}

const STATUS_ICONS: Record<string, string> = {
  modified: 'M', added: 'A', deleted: 'D', renamed: 'R', copied: 'C', untracked: '?'
}

export default function SourceControl({ dirPath, onRefresh }: Props) {
  const { openFile } = useEditorContext()
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [commitMsg, setCommitMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [showBranches, setShowBranches] = useState(false)
  const [newBranch, setNewBranch] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [log, setLog] = useState<GitLogEntry[]>([])
  const [output, setOutput] = useState('')
  const [diffFile, setDiffFile] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!dirPath) return
    const s = await window.electronAPI.gitStatus(dirPath)
    setStatus(s)
    const b = await window.electronAPI.gitBranches(dirPath)
    setBranches(b)
  }, [dirPath])

  useEffect(() => { refresh() }, [refresh])

  const showOutput = (msg: string) => { setOutput(msg); setTimeout(() => setOutput(''), 5000) }

  const handleStage = async (p: string) => { if (!dirPath) return; await window.electronAPI.gitStage(dirPath, p); refresh() }
  const handleUnstage = async (p: string) => { if (!dirPath) return; await window.electronAPI.gitUnstage(dirPath, p); refresh() }
  const handleDiscard = async (p: string) => {
    if (!dirPath) return
    if (!confirm(`Discard changes to ${p}?`)) return
    await window.electronAPI.gitDiscard(dirPath, p)
    refresh()
  }

  const handleCommit = async () => {
    if (!dirPath || !commitMsg.trim()) return
    setLoading(true)
    const r = await window.electronAPI.gitCommit(dirPath, commitMsg.trim())
    setCommitMsg('')
    setLoading(false)
    showOutput(r || 'Committed')
    refresh()
  }

  const handlePush = async () => {
    if (!dirPath) return
    setLoading(true)
    const r = await window.electronAPI.gitPush(dirPath)
    setLoading(false)
    showOutput(r || 'Pushed')
    refresh()
  }

  const handlePull = async () => {
    if (!dirPath) return
    setLoading(true)
    const r = await window.electronAPI.gitPull(dirPath)
    setLoading(false)
    showOutput(r || 'Pulled')
    refresh()
  }

  const handleStash = async () => {
    if (!dirPath) return
    const r = await window.electronAPI.gitStash(dirPath)
    showOutput(r || 'Stashed')
    refresh()
  }

  const handleStashPop = async () => {
    if (!dirPath) return
    const r = await window.electronAPI.gitStashPop(dirPath)
    showOutput(r || 'Stash popped')
    refresh()
  }

  const handleCheckout = async (branch: string) => {
    if (!dirPath) return
    setLoading(true)
    const r = await window.electronAPI.gitCheckout(dirPath, branch)
    setLoading(false)
    showOutput(r || `Switched to ${branch}`)
    setShowBranches(false)
    refresh()
  }

  const handleCreateBranch = async () => {
    if (!dirPath || !newBranch.trim()) return
    const r = await window.electronAPI.gitCreateBranch(dirPath, newBranch.trim())
    setNewBranch('')
    showOutput(r || `Created ${newBranch}`)
    refresh()
  }

  const handleShowLog = async () => {
    if (!dirPath) return
    const l = await window.electronAPI.gitLog(dirPath, 30)
    setLog(l)
    setShowLog(!showLog)
  }

  const handleFileClick = async (filePath: string) => {
    if (!dirPath) return
    const fullPath = dirPath + '/' + filePath
    const res = await window.electronAPI.openFile(fullPath)
    if ('content' in res) openFile(fullPath, filePath.split('/').pop() || filePath, res.content, res.language)
  }

  if (!dirPath) {
    return (
      <div className="sidebar">
        <div className="sidebar-header"><span>SOURCE CONTROL</span></div>
        <div className="sidebar-empty"><div className="sidebar-empty-text">No folder opened</div></div>
      </div>
    )
  }

  const staged = status?.files.filter(f => f.staged) || []
  const unstaged = status?.files.filter(f => !f.staged) || []

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span>SOURCE CONTROL</span>
        <button className="sidebar-header-btn" onClick={refresh} title="Refresh">↻</button>
      </div>

      {/* commit input */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
        <input
          className="sidebar-input" type="text"
          placeholder="Message (Ctrl+Enter)"
          value={commitMsg}
          onChange={e => setCommitMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommit() }}
        />
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <button className="sidebar-empty-btn" style={{ flex: 1, fontSize: 11 }}
            onClick={handleCommit} disabled={loading || !commitMsg.trim() || staged.length === 0}>
            Commit{staged.length > 0 ? ` (${staged.length})` : ''}
          </button>
        </div>
      </div>

      {/* actions bar */}
      <div style={{ display: 'flex', gap: 2, padding: '4px 8px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <button className="git-action-bar-btn" onClick={handlePush} title="Push">↑ Push</button>
        <button className="git-action-bar-btn" onClick={handlePull} title="Pull">↓ Pull</button>
        <button className="git-action-bar-btn" onClick={handleStash} title="Stash">Stash</button>
        <button className="git-action-bar-btn" onClick={handleStashPop} title="Stash Pop">Pop</button>
        <button className="git-action-bar-btn" onClick={handleShowLog} title="Log">Log</button>
      </div>

      {/* branch selector */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-color)' }}>
        <div className="git-branch-selector" onClick={() => setShowBranches(!showBranches)}>
          <span>{status?.branch || 'HEAD'}</span>
          <span style={{ fontSize: 10 }}>{showBranches ? '▾' : '▸'}</span>
        </div>
        {showBranches && (
          <div style={{ marginTop: 4 }}>
            {branches.map(b => (
              <div key={b} className={`git-branch-item${b === status?.branch ? ' git-branch-item--active' : ''}`}
                onClick={() => handleCheckout(b)}>
                {b === status?.branch ? '● ' : '  '}{b}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input className="sidebar-input" style={{ flex: 1, fontSize: 11 }}
                placeholder="new branch…" value={newBranch}
                onChange={e => setNewBranch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateBranch() }} />
              <button className="git-action-bar-btn" onClick={handleCreateBranch} style={{ fontSize: 10 }}>+</button>
            </div>
          </div>
        )}
      </div>

      {/* output */}
      {output && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--fg-accent)', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
          {output}
        </div>
      )}

      {/* git log */}
      {showLog && (
        <div style={{ maxHeight: 200, overflow: 'auto', borderBottom: '1px solid var(--border-color)' }}>
          {log.map(entry => (
            <div key={entry.hash} className="git-log-entry" title={entry.hash}>
              <div className="git-log-msg">{entry.message}</div>
              <div className="git-log-meta">{entry.author} · {entry.date}</div>
            </div>
          ))}
          {log.length === 0 && <div style={{ padding: 8, fontSize: 11, color: 'var(--fg-muted)' }}>No commits</div>}
        </div>
      )}

      {/* file list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {staged.length > 0 && (
          <div className="git-section">
            <div className="git-section-header"><span>Staged Changes</span><span className="git-count">{staged.length}</span></div>
            {staged.map(f => <GitFileItem key={f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onDiscard={handleDiscard} onClick={handleFileClick} onDiff={setDiffFile} />)}
          </div>
        )}
        {unstaged.length > 0 && (
          <div className="git-section">
            <div className="git-section-header"><span>Changes</span><span className="git-count">{unstaged.length}</span></div>
            {unstaged.map(f => <GitFileItem key={f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onDiscard={handleDiscard} onClick={handleFileClick} onDiff={setDiffFile} />)}
          </div>
        )}
        {status && status.files.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>No changes</div>
        )}
      </div>

      {diffFile && dirPath && (
        <GitDiffViewer dirPath={dirPath} filePath={diffFile} onClose={() => setDiffFile(null)} />
      )}
    </div>
  )
}

function GitFileItem({ file, onStage, onUnstage, onDiscard, onClick, onDiff }: {
  file: GitFile; onStage: (p: string) => void; onUnstage: (p: string) => void
  onDiscard: (p: string) => void; onClick: (p: string) => void; onDiff: (p: string) => void
}) {
  const icon = STATUS_ICONS[file.status] || '?'
  const color = file.status === 'deleted' ? 'var(--fg-danger)' : file.status === 'added' ? 'var(--fg-success)' : file.status === 'untracked' ? 'var(--fg-warn)' : 'var(--fg-secondary)'
  return (
    <div className="git-file-item">
      <span className="git-file-icon" style={{ color }}>{icon}</span>
      <span className="git-file-name" onClick={() => onClick(file.path)} title={file.path}>{file.path.split('/').pop()}</span>
      <span className="git-file-actions">
        {file.status !== 'untracked' && file.status !== 'added' && (
          <button className="git-action-btn" onClick={() => onDiff(file.path)} title="View Diff">◐</button>
        )}
        {file.staged
          ? <button className="git-action-btn" onClick={() => onUnstage(file.path)} title="Unstage">−</button>
          : <button className="git-action-btn" onClick={() => onStage(file.path)} title="Stage">+</button>}
        {!file.staged && file.status !== 'untracked' && (
          <button className="git-action-btn" onClick={() => onDiscard(file.path)} title="Discard">↺</button>
        )}
      </span>
    </div>
  )
}
