import React, { useRef, useEffect, useState } from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useSettings } from '../contexts/SettingsContext'
import { IconForFile } from '../utils/fileIcons'

interface ContextMenu {
  tabId: string
  x: number
  y: number
}

export default function TabBar() {
  const { state, setActiveTab, closeTab, closeAllTabs } = useEditorContext()
  const { confirm } = useConfirm()
  const { settings } = useSettings()
  const prevTabCount = useRef(state.tabs.length)
  const [entering, setEntering] = useState<string | null>(null)
  const [closing, setClosing] = useState<string | null>(null)
  const [ctx, setCtx] = useState<ContextMenu | null>(null)
  const blur = settings.appearance.tabBlur

  useEffect(() => {
    if (state.tabs.length > prevTabCount.current && state.activeTabId) {
      setEntering(state.activeTabId)
      const t = setTimeout(() => setEntering(null), 250)
      prevTabCount.current = state.tabs.length
      return () => clearTimeout(t)
    }
    prevTabCount.current = state.tabs.length
  }, [state.tabs.length, state.activeTabId])

  useEffect(() => {
    if (ctx) {
      const close = () => setCtx(null)
      document.addEventListener('click', close)
      document.addEventListener('contextmenu', close)
      return () => {
        document.removeEventListener('click', close)
        document.removeEventListener('contextmenu', close)
      }
    }
  }, [ctx])

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
        setTimeout(() => { setClosing(null); closeTab(tabId) }, 200)
      })
      return
    }
    setClosing(tabId)
    setTimeout(() => { setClosing(null); closeTab(tabId) }, 200)
  }

  const closeOthers = (tabId: string) => {
    state.tabs.forEach(t => { if (t.id !== tabId) closeTab(t.id) })
  }

  const closeAll = () => { closeAllTabs() }

  const closeRight = (tabId: string) => {
    const idx = state.tabs.findIndex(t => t.id === tabId)
    if (idx === -1) return
    state.tabs.slice(idx + 1).forEach(t => closeTab(t.id))
  }

  const closeLeft = (tabId: string) => {
    const idx = state.tabs.findIndex(t => t.id === tabId)
    if (idx <= 0) return
    state.tabs.slice(0, idx).forEach(t => closeTab(t.id))
  }

  const closeSaved = () => {
    state.tabs.filter(t => !t.isDirty).forEach(t => closeTab(t.id))
  }

  const copyPath = (tabId: string) => { navigator.clipboard.writeText(tabId) }

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setCtx({ tabId, x: e.clientX, y: e.clientY })
  }

  const tab = ctx ? state.tabs.find(t => t.id === ctx.tabId) : null

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
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              title={tab.id}
              style={!isActive && blur > 0 ? { backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)` } : undefined}
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

      {ctx && tab && (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ctx-menu-item" onClick={() => { handleClose(ctx.tabId); setCtx(null) }}>Close</div>
          <div className="ctx-menu-item" onClick={() => { closeOthers(ctx.tabId); setCtx(null) }}>Close Others</div>
          <div className="ctx-menu-item" onClick={() => { closeRight(ctx.tabId); setCtx(null) }}>Close Right</div>
          <div className="ctx-menu-item" onClick={() => { closeLeft(ctx.tabId); setCtx(null) }}>Close Left</div>
          <div className="ctx-menu-item" onClick={() => { closeSaved(); setCtx(null) }}>Close Saved</div>
          <div className="ctx-menu-item" onClick={() => { closeAll(); setCtx(null) }}>Close All</div>
          <div className="ctx-menu-sep" />
          <div className="ctx-menu-item" onClick={() => { copyPath(ctx.tabId); setCtx(null) }}>Copy Path</div>
          <div className="ctx-menu-item" onClick={() => { navigator.clipboard.writeText(tab.path || ctx.tabId); setCtx(null) }}>Copy Relative Path</div>
        </div>
      )}
    </div>
  )
}