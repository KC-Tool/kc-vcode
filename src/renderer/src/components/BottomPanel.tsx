import React, { useState } from 'react'
import ProblemsPanel from './ProblemsPanel'
import TerminalPanel from './Terminal'
import { useEditorContext } from '../contexts/EditorContext'

type BottomTab = 'problems' | 'terminal'

interface Props {
  cwd?: string
  visible: boolean
  theme: 'dark' | 'light'
  onClose: () => void
}

export default function BottomPanel({ cwd, visible, theme, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<BottomTab>('terminal')
  const { state } = useEditorContext()
  const errCount = state.markers.filter(m => m.severity === 'error').length
  const warnCount = state.markers.filter(m => m.severity === 'warning').length

  if (!visible) return null

  return (
    <div className="bp-panel">
      <div className="bp-header">
        <div className="bp-tabs">
          <div
            className={`bp-tab${activeTab === 'problems' ? ' bp-tab--active' : ''}`}
            onClick={() => setActiveTab('problems')}
          >
            Problems
            {(errCount + warnCount) > 0 && (
              <span className="bp-badge">{errCount + warnCount}</span>
            )}
          </div>
          <div
            className={`bp-tab${activeTab === 'terminal' ? ' bp-tab--active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            Terminal
          </div>
        </div>
        <div className="bp-actions">
          <button className="bp-action" onClick={onClose} title="Close Panel">×</button>
        </div>
      </div>
      <div className="bp-body">
        {activeTab === 'problems' && <ProblemsPanel />}
        {activeTab === 'terminal' && <TerminalPanel cwd={cwd} visible={true} theme={theme} />}
      </div>
    </div>
  )
}