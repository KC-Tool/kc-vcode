import React, { useMemo } from 'react'
import type { FileDiff, DiffHunk, DiffLine } from '../../../preload/index'

interface Props {
  diff: FileDiff | null
  loading?: boolean
  emptyText?: string
  maxHeight?: number
}

export default function FileDiffView({ diff, loading, emptyText, maxHeight = 360 }: Props) {
  const stats = useMemo(() => {
    if (!diff) return { add: 0, del: 0 }
    let add = 0, del = 0
    for (const h of diff.hunks) {
      for (const l of h.lines) {
        if (l.type === 'add') add++
        else if (l.type === 'del') del++
      }
    }
    return { add, del }
  }, [diff])

  if (loading) {
    return <div className="fdv-empty">Loading diff…</div>
  }
  if (!diff) {
    return <div className="fdv-empty">{emptyText || 'No diff'}</div>
  }
  if (diff.isBinary) {
    return <div className="fdv-empty">Binary file differs</div>
  }
  if (diff.hunks.length === 0) {
    return <div className="fdv-empty">No changes</div>
  }

  return (
    <div className="fdv" style={{ maxHeight, overflow: 'auto' }}>
      <div className="fdv-stats">
        <span className="fdv-stat-add">+{stats.add}</span>
        <span className="fdv-stat-del">−{stats.del}</span>
      </div>
      {diff.hunks.map((h, hi) => <HunkRow key={hi} hunk={h} />)}
    </div>
  )
}

function HunkRow({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="fdv-hunk">
      <div className="fdv-hunk-header">
        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
      </div>
      {hunk.lines.map((l, i) => <DiffLineRow key={i} line={l} />)}
    </div>
  )
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const cls =
    line.type === 'add' ? 'fdv-line fdv-line--add'
    : line.type === 'del' ? 'fdv-line fdv-line--del'
    : 'fdv-line fdv-line--ctx'
  const sign = line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '
  return (
    <div className={cls}>
      <span className="fdv-line-num fdv-line-num--old">{line.oldLine ?? ''}</span>
      <span className="fdv-line-num fdv-line-num--new">{line.newLine ?? ''}</span>
      <span className="fdv-line-sign">{sign}</span>
      <span className="fdv-line-content">{line.content || ' '}</span>
    </div>
  )
}