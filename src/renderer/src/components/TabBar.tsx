import React, { useRef, useEffect, useState } from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { IconForFile } from '../utils/fileIcons'

export default function TabBar() {
  const { state, setActiveTab, closeTab } = useEditorContext()
  const { confirm } = useConfirm()
  const prevTabCount = useRef(state.tabs.length)
  const [entering, setEntering] = useState<string | null>(null)
  const [closing, setClosing] = useState<string | null>(null)

  useEffect(() => {
    if (state.tabs.length > prevTabCount.current && state.activeTabId) {
      setEntering(state.activeTabId)
      const t = setTimeout(() => setEntering(null), 250)
      prevTabCount.current = state.tabs.length
      return () => clearTimeout(t)
    }
    prevTabCount.current = state.tabs.length
  }, [state.tabs.length, state.activeTabId])

  const handleClose = (tabId: string) => {
    const tab = state.tabs.find(t => t.id === tabId)
    if (!tab) return
    if (tab.isDirty) {
      confirm({
        title: 'Unsaved Changes',
        message: `"${tab.name}" has unsaved changes. Close anyway?`,
        okText: 'Close',
        danger: true
      }).then(ok => {
        if (!ok) return
        setClosing(tabId)
        setTimeout(() => {
          setClosing(null)
          closeTab(tabId)
        }, 200)
      })
      return
    }
    setClosing(tabId)
    setTimeout(() => {
      setClosing(null)
      closeTab(tabId)
    }, 200)
  }

  return (
    <div className="tab-bar">
      <div className="tab-bar-inner">
        {state.tabs.map(tab => {
          const isActive = tab.id === state.activeTabId
          const cls = [
            'tab-item',
            isActive ? 'tab-item--active' : 'tab-item--inactive',
            tab.id === entering && 'tab-item--enter',
            tab.id === closing && 'tab-item--closing'
          ].filter(Boolean).join(' ')

          return (
            <div
              key={tab.id}
              className={cls}
              onClick={() => setActiveTab(tab.id)}
              title={tab.id}
            >
              <span className="tab-icon">
                {tab.isSettings
                  ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>
                  : <IconForFile name={tab.name} size={14} />}
              </span>
              <span className="tab-name">{tab.name}</span>
              {tab.isDirty && <span className="tab-dirty" />}
              <span
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); handleClose(tab.id) }}
              >
                ×
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
