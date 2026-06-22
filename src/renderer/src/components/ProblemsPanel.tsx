import React from 'react'
import { useEditorContext } from '../contexts/EditorContext'

const SEV_ICON: Record<string, string> = { error: '✕', warning: '▲', info: '●', hint: '○' }
const SEV_CLASS: Record<string, string> = { error: 'pm-error', warning: 'pm-warn', info: 'pm-info', hint: 'pm-hint' }

function ProblemsPanelInner() {
  const { state, setActiveTab } = useEditorContext()
  const markers = state?.markers ?? []
  const errCount = markers.filter(m => m.severity === 'error').length
  const warnCount = markers.filter(m => m.severity === 'warning').length

  if (!markers.length) {
    return <div className="pm-empty">No problems detected in the workspace.</div>
  }

  const grouped: Record<string, typeof markers> = {}
  for (const m of markers) {
    const key = m.file
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  }

  return (
    <div className="pm-panel">
      <div className="pm-summary">
        {errCount > 0 && <span className="pm-summary-item pm-error">{SEV_ICON.error} {errCount}</span>}
        {warnCount > 0 && <span className="pm-summary-item pm-warn">{SEV_ICON.warning} {warnCount}</span>}
      </div>
      <div className="pm-list">
        {Object.entries(grouped).map(([file, items]) => (
          <div key={file} className="pm-file-group">
            <div className="pm-file-header">
              <span className="pm-file-name">{file.split('/').pop() || file}</span>
            </div>
            {items.map((m, i) => (
              <div
                key={i}
                className={`pm-item ${SEV_CLASS[m.severity]}`}
                onClick={() => {
                  const tab = state.tabs.find(t => t.id === m.file)
                  if (tab) setActiveTab(tab.id)
                }}
              >
                <span className="pm-icon">{SEV_ICON[m.severity]}</span>
                <span className="pm-msg">{m.message}</span>
                <span className="pm-pos">Ln {m.line}, Col {m.column}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

class ProblemsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return <div className="pm-empty">Failed to load problems.</div>
    }
    return this.props.children
  }
}

export default function ProblemsPanel() {
  return (
    <ProblemsErrorBoundary>
      <ProblemsPanelInner />
    </ProblemsErrorBoundary>
  )
}