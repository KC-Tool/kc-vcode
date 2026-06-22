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
  const [termTabs, setTermTabs] = useState<TermTab[]>([{ id: 0, label: 'powershell' }])
  const [activeTermTab, setActiveTermTab] = useState(0)
  const nextIdRef = useRef(1)
  const { state } = useEditorContext()
  const markers = state?.markers || []
  const errCount = markers.filter(m => m.severity === 'error').length
  const warnCount = markers.filter(m => m.severity === 'warning').length

  if (!visible) return null

  const handleAddTerm = () => {
    const id = nextIdRef.current++
    setTermTabs(prev => [...prev, { id, label: `powershell` }])
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

  const handleKillTerm = () => {
    if (termTabs.length <= 1) return
    handleCloseTerm(activeTermTab)
  }

  return (
    <div className="bp-panel">
      <div className="bp-header">
        <div className="bp-tabs">
          <div
            className={`bp-tab${activeTab === 'problems' ? ' bp-tab--active' : ''}`}
            onClick={() => setActiveTab('problems')}
          >
            PROBLEMS
            {(errCount + warnCount) > 0 && (
              <span className="bp-badge">{errCount + warnCount}</span>
            )}
          </div>
          <div
            className={`bp-tab${activeTab === 'terminal' ? ' bp-tab--active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            TERMINAL
          </div>
          <div
            className={`bp-tab${activeTab === 'debug' ? ' bp-tab--active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            DEBUG CONSOLE
          </div>
        </div>
        <div className="bp-right">
          {activeTab === 'terminal' && (
            <>
              <div className="bp-term-tabs">
                {termTabs.map(tab => (
                  <span
                    key={tab.id}
                    className={`bp-term-tab${tab.id === activeTermTab ? ' bp-term-tab--active' : ''}`}
                    onClick={() => setActiveTermTab(tab.id)}
                  >
                    <span className="bp-term-tab-dot" />
                    {tab.label}
                    {termTabs.length > 1 && (
                      <span
                        className="bp-term-tab-close"
                        onClick={(e) => { e.stopPropagation(); handleCloseTerm(tab.id) }}
                      >×</span>
                    )}
                  </span>
                ))}
              </div>
              <div className="bp-term-actions">
                <button className="bp-icon-btn" onClick={handleAddTerm} title="New Terminal">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="2" y="2" width="12" height="12" rx="1"/>
                    <line x1="5" y1="8" x2="11" y2="8"/>
                    <line x1="8" y1="5" x2="8" y2="11"/>
                  </svg>
                </button>
                <button className="bp-icon-btn" onClick={handleKillTerm} title="Kill Terminal" disabled={termTabs.length <= 1}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="2" y="4" width="12" height="9" rx="1"/>
                    <line x1="5" y1="4" x2="5" y2="2"/>
                    <line x1="11" y1="4" x2="11" y2="2"/>
                  </svg>
                </button>
                <button className="bp-icon-btn" title="More Actions">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="4" cy="8" r="1.2"/>
                    <circle cx="8" cy="8" r="1.2"/>
                    <circle cx="12" cy="8" r="1.2"/>
                  </svg>
                </button>
              </div>
            </>
          )}
          <button className="bp-icon-btn" onClick={onClose} title="Close Panel">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <line x1="4" y1="4" x2="12" y2="12"/>
              <line x1="12" y1="4" x2="4" y2="12"/>
            </svg>
          </button>
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
