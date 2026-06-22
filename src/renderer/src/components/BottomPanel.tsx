import React, { useState, useRef } from 'react'
import ProblemsPanel from './ProblemsPanel'
import TerminalPanel from './Terminal'
import DebugToolbar from './DebugToolbar'
import { useEditorContext } from '../contexts/EditorContext'

type BottomTab = 'problems' | 'terminal' | 'debug'

interface TermTab {
  id: number
  label: string
}

interface Props {
  cwd?: string
  visible: boolean
  theme: 'dark' | 'light'
  onClose: () => void
  onOpenFile: (path: string) => void
}

export default function BottomPanel({ cwd, visible, theme, onClose, onOpenFile }: Props) {
  const [activeTab, setActiveTab] = useState<BottomTab>('terminal')
  const [termTabs, setTermTabs] = useState<TermTab[]>([{ id: 0, label: 'Terminal 1' }])
  const [activeTermTab, setActiveTermTab] = useState(0)
  const nextIdRef = useRef(1)
  const { state } = useEditorContext()
  const markers = state?.markers || []
  const errCount = markers.filter(m => m.severity === 'error').length
  const warnCount = markers.filter(m => m.severity === 'warning').length

  if (!visible) return null

  const handleAddTerm = () => {
    const id = nextIdRef.current++
    setTermTabs(prev => [...prev, { id, label: `Terminal ${id + 1}` }])
    setActiveTermTab(id)
  }

  const handleCloseTerm = (tabId: number) => {
    if (termTabs.length <= 1) return
    const idx = termTabs.findIndex(t => t.id === tabId)
    const newTabs = termTabs.filter(t => t.id !== tabId)
    setTermTabs(newTabs)
    if (activeTermTab === tabId) {
      setActiveTermTab(newTabs[Math.min(idx, newTabs.length - 1)].id)
    }
  }

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
          <div
            className={`bp-tab${activeTab === 'debug' ? ' bp-tab--active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            Debug
          </div>
        </div>
        <div className="bp-actions">
          {activeTab === 'terminal' && (
            <div className="bp-term-tabs">
              {termTabs.map(tab => (
                <span
                  key={tab.id}
                  className={`bp-term-tab${tab.id === activeTermTab ? ' bp-term-tab--active' : ''}`}
                  onClick={() => setActiveTermTab(tab.id)}
                >
                  <span className="bp-term-tab-icon">⬛</span>
                  {tab.label}
                  {termTabs.length > 1 && (
                    <span
                      className="bp-term-tab-close"
                      onClick={(e) => { e.stopPropagation(); handleCloseTerm(tab.id) }}
                    >×</span>
                  )}
                </span>
              ))}
              <button className="bp-term-tab-add" onClick={handleAddTerm} title="New Terminal">+</button>
            </div>
          )}
          <button className="bp-action" onClick={onClose} title="Close Panel">×</button>
        </div>
      </div>
      <div className="bp-body">
        {activeTab === 'problems' && <ProblemsPanel />}
        {activeTab === 'terminal' && <TerminalPanel cwd={cwd} visible={true} theme={theme} />}
        {activeTab === 'debug' && <DebugToolbar onOpenFile={onOpenFile} />}
      </div>
    </div>
  )
}
