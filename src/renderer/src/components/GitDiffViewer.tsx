import React, { useState, useEffect } from 'react'

interface Props {
  dirPath: string
  filePath: string
  onClose: () => void
}

interface DiffLine {
  type: 'added' | 'removed' | 'context'
  content: string
  oldNum?: number
  newNum?: number
}

function parseDiff(raw: string): DiffLine[] {
  const lines = raw.split('\n')
  const result: DiffLine[] = []
  let oldNum = 0
  let newNum = 0

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)/)
      const match2 = line.match(/\+(\d+)/)
      oldNum = match ? parseInt(match[1]) : 0
      newNum = match2 ? parseInt(match2[1]) : 0
      continue
    }
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff') || line.startsWith('index')) continue

    if (line.startsWith('+')) {
      result.push({ type: 'added', content: line.slice(1), newNum: newNum++ })
    } else if (line.startsWith('-')) {
      result.push({ type: 'removed', content: line.slice(1), oldNum: oldNum++ })
    } else {
      result.push({ type: 'context', content: line.startsWith(' ') ? line.slice(1) : line, oldNum: oldNum++, newNum: newNum++ })
    }
  }
  return result
}

export default function GitDiffViewer({ dirPath, filePath, onClose }: Props) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.gitDiff(dirPath, filePath).then((raw: string) => {
      setDiffLines(parseDiff(raw))
      setLoading(false)
    })
  }, [dirPath, filePath])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const added = diffLines.filter(l => l.type === 'added').length
  const removed = diffLines.filter(l => l.type === 'removed').length

  return (
    <div className="git-diff-overlay" onClick={onClose}>
      <div className="git-diff-panel" onClick={e => e.stopPropagation()}>
        <div className="git-diff-header">
          <span className="git-diff-filename">{filePath}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-success)' }}>+{added}</span>
            <span style={{ fontSize: 12, color: 'var(--fg-danger)' }}>-{removed}</span>
            <button className="kbd-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="git-diff-body">
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)' }}>Loading diff…</div>
          )}
          {!loading && diffLines.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)' }}>No changes</div>
          )}
          {diffLines.map((line, i) => {
            const cls = line.type === 'added' ? 'diff-line--added' : line.type === 'removed' ? 'diff-line--removed' : 'diff-line--context'
            return (
              <div key={i} className={`diff-line ${cls}`}>
                <span className="diff-line-num">{line.oldNum || ''}</span>
                <span className="diff-line-num">{line.newNum || ''}</span>
                <span className="diff-line-content">
                  {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.content}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
