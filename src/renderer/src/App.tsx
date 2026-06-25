import React, { useEffect, useCallback, useState, useRef } from 'react'
import { EditorProvider, useEditorContext } from './contexts/EditorContext'
import { EditorUIProvider, useEditorUI } from './contexts/EditorUIContext'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'
import { ConfirmProvider, useConfirm } from './contexts/ConfirmContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import EditorPane from './components/Editor'
import StatusBar from './components/StatusBar'
import WelcomePage from './components/WelcomePage'
import BottomPanel from './components/BottomPanel'
import CommandPalette from './components/CommandPalette'
import GoToLine from './components/GoToLine'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import ToastContainer from './components/ToastContainer'
import { FileNode } from '../../preload/index'
import './assets/styles/global.css'

function AppContent() {
  const { state, openFile, setDirectory, closeTab, setTheme, openSettings } = useEditorContext()
  const { zoomLevel, setZoom, splitView, splitTabId, toggleSplitView, setSplitTab } = useEditorUI()
  const { settings, loaded } = useSettings()
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const [tree, setTree] = useState<FileNode[]>([])
  const [termVisible, setTermVisible] = useState(false)
  const [paletteVisible, setPaletteVisible] = useState(false)
  const [paletteMode, setPaletteMode] = useState<'command' | 'file'>('command')
  const [goToLineVisible, setGoToLineVisible] = useState(false)
  const [kbdVisible, setKbdVisible] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [zoomIndicator, setZoomIndicator] = useState<string | null>(null)
  const dirPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (loaded && settings.appearance.theme !== state.theme) {
      setTheme(settings.appearance.theme)
    }
  }, [loaded, settings.appearance.theme, state.theme, setTheme])

  useEffect(() => {
    if (loaded) {
      document.documentElement.style.setProperty('--sidebar-width', settings.appearance.sidebarWidth + 'px')
    }
  }, [loaded, settings.appearance.sidebarWidth])

  const refreshTree = useCallback(async () => {
    if (!dirPathRef.current) return
    const res = await window.electronAPI.refreshDir(dirPathRef.current)
    if ('tree' in res) setTree(res.tree)
  }, [])

  const handleOpenFolder = useCallback(async () => {
    const result = await window.electronAPI.openDirectory()
    if (result) {
      dirPathRef.current = result.rootPath
      setTree(result.tree)
      setDirectory(result.rootPath, result.rootName)
      window.electronAPI.setTitle(`${result.rootName} - kc-vcode`)
      toast('success', `Opened folder: ${result.rootName}`)
    }
  }, [setDirectory, toast])

  useEffect(() => {
    window.electronAPI.onDirectoryOpened((data) => {
      dirPathRef.current = data.rootPath
      setTree(data.tree)
      setDirectory(data.rootPath, data.rootName)
      window.electronAPI.setTitle(`${data.rootName} - kc-vcode`)
    })
    window.electronAPI.onFileOpenedByMenu((data) => {
      openFile(data.path, data.name, data.content, data.language)
    })
    window.electronAPI.onDirectoryRefreshed(() => refreshTree())

    window.electronAPI.onViewSourceControl(() => {
      document.dispatchEvent(new CustomEvent('app:switchView', { detail: 'source-control' }))
    })
    window.electronAPI.onGitMenuCommit(() => {
      document.dispatchEvent(new CustomEvent('app:switchView', { detail: 'source-control' }))
      document.dispatchEvent(new CustomEvent('git:menu:commit'))
    })
    window.electronAPI.onGitMenuPush(() => {
      document.dispatchEvent(new CustomEvent('app:switchView', { detail: 'source-control' }))
      document.dispatchEvent(new CustomEvent('git:menu:push'))
    })
    window.electronAPI.onGitMenuPull(() => {
      document.dispatchEvent(new CustomEvent('app:switchView', { detail: 'source-control' }))
      document.dispatchEvent(new CustomEvent('git:menu:pull'))
    })
    window.electronAPI.onGitMenuFetch(() => {
      document.dispatchEvent(new CustomEvent('app:switchView', { detail: 'source-control' }))
      document.dispatchEvent(new CustomEvent('git:menu:fetch'))
    })
    window.electronAPI.onGitMenuInit(() => {
      document.dispatchEvent(new CustomEvent('app:switchView', { detail: 'source-control' }))
      document.dispatchEvent(new CustomEvent('git:menu:init'))
    })

    return () => {
      window.electronAPI.removeAllListeners('directory:opened')
      window.electronAPI.removeAllListeners('file:opened')
      window.electronAPI.removeAllListeners('directory:refreshed')
      window.electronAPI.removeAllListeners('view:sourceControl')
      window.electronAPI.removeAllListeners('git:menu:commit')
      window.electronAPI.removeAllListeners('git:menu:push')
      window.electronAPI.removeAllListeners('git:menu:pull')
      window.electronAPI.removeAllListeners('git:menu:fetch')
      window.electronAPI.removeAllListeners('git:menu:init')
    }
  }, [openFile, setDirectory, refreshTree])

  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.round((zoomLevel + delta) * 10) / 10
    setZoom(newZoom)
    setZoomIndicator(`${Math.round(newZoom * 100)}%`)
    setTimeout(() => setZoomIndicator(null), 1200)
  }, [zoomLevel, setZoom])

  const handleOpenShortcuts = useCallback(() => setKbdVisible(true), [])
  const handleCloseTerm = useCallback(() => setTermVisible(false), [])
  const handleToggleTerm = useCallback(() => setTermVisible(v => !v), [])

  const handleBottomOpenFile = useCallback(async (filePath: string) => {
    const res = await window.electronAPI.openFile(filePath)
    if ('error' in res) return
    openFile(filePath, filePath.split(/[/\\]/).pop() || '', res.content, res.language)
  }, [openFile])

  const handleZoomReset = useCallback(() => {
    setZoom(1)
    setZoomIndicator('100%')
    setTimeout(() => setZoomIndicator(null), 1200)
  }, [setZoom])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return

    if (e.shiftKey && e.key === 'P') {
      e.preventDefault()
      setPaletteMode('command')
      setPaletteVisible(v => !v)
      return
    }
    if (!e.shiftKey && e.key === 'p') {
      e.preventDefault()
      setPaletteMode('file')
      setPaletteVisible(v => !v)
      return
    }
    if (e.key === 'g') {
      e.preventDefault()
      setGoToLineVisible(true)
      return
    }
    if (e.shiftKey && e.key === 'F11') {
      e.preventDefault()
      setZenMode(v => !v)
      return
    }
    if (e.shiftKey && (e.key === 'K' || e.key === 'k')) {
      e.preventDefault()
      setKbdVisible(v => !v)
      return
    }
    if (e.key === '`') {
      e.preventDefault()
      setTermVisible(v => !v)
      return
    }
    if (e.key === ',') {
      e.preventDefault()
      openSettings()
      return
    }
    if (e.key === '\\') {
      e.preventDefault()
      toggleSplitView(state.activeTabId)
      toast('info', splitView ? 'Split view closed' : 'Split view opened')
      return
    }
    if (e.key === '=' || e.key === '+') {
      e.preventDefault()
      handleZoom(0.1)
      return
    }
    if (e.key === '-') {
      e.preventDefault()
      handleZoom(-0.1)
      return
    }
    if (e.key === '0') {
      e.preventDefault()
      handleZoomReset()
      return
    }
    if (e.key === 'w' && state.activeTabId) {
      e.preventDefault()
      const tab = state.tabs.find(t => t.id === state.activeTabId)
      if (!tab) return
      if (tab.isDirty) {
        confirm({
          title: 'Unsaved Changes',
          message: `"${tab.name}" has unsaved changes. Close anyway?`,
          okText: 'Close',
          danger: true
        }).then(ok => { if (ok) closeTab(state.activeTabId!) })
        return
      }
      closeTab(state.activeTabId)
    }
  }, [state.activeTabId, state.tabs, splitView, closeTab, openSettings, confirm, toggleSplitView, handleZoom, handleZoomReset, toast])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) {
      setDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      if (file.type === '' || file.name) {
        const filePath = (file as any).path || file.name
        try {
          const res = await window.electronAPI.openFile(filePath)
          if ('content' in res) {
            openFile(filePath, file.name, res.content, res.language)
            toast('success', `Opened: ${file.name}`)
          }
        } catch {
          toast('error', `Failed to open: ${file.name}`)
        }
      }
    }
  }, [openFile, toast])

  const hasTabs = state.tabs.length > 0

  const splitFile = splitView && splitTabId ? state.files[splitTabId] : null

  return (
    <div
      className={`app-layout${zenMode ? ' app-layout--zen' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={zoomLevel !== 1 ? { fontSize: `${zoomLevel * 100}%` } : undefined}
    >
      <div className="app-middle">
        <Sidebar
          tree={tree}
          onOpenFolder={handleOpenFolder}
          onRefresh={refreshTree}
          onOpenSettings={openSettings}
          dirPath={dirPathRef.current}
        />
        <div className="editor-area">
          {hasTabs && <TabBar />}
          {hasTabs ? (
            splitView ? (
              <div className="editor-split">
                <div className="editor-split-body">
                  <div className="editor-split-pane">
                    <EditorPane />
                  </div>
                  <div className="editor-split-divider" />
                  <div className="editor-split-pane">
                    <div className="split-tab-bar">
                      {state.tabs.map(tab => (
                        <div
                          key={tab.id}
                          className={`split-tab${tab.id === splitTabId ? ' split-tab--active' : ''}`}
                          onClick={() => setSplitTab(tab.id)}
                        >
                          {tab.name}
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      {splitFile && (
                        <EditorPane key={`split-${splitTabId}`} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EditorPane />
            )
          ) : (
            <WelcomePage onOpenFolder={handleOpenFolder} onOpenShortcuts={handleOpenShortcuts} />
          )}
          <BottomPanel cwd={dirPathRef.current || undefined} visible={termVisible} theme={state.theme} onClose={handleCloseTerm} onOpenFile={handleBottomOpenFile} />
        </div>
      </div>
      <StatusBar onToggleTerminal={handleToggleTerm} onOpenShortcuts={handleOpenShortcuts} />
      <CommandPalette
        visible={paletteVisible}
        mode={paletteMode}
        onClose={() => setPaletteVisible(false)}
        tree={tree}
        onOpenFolder={handleOpenFolder}
        onToggleTerminal={handleToggleTerm}
      />
      <GoToLine
        visible={goToLineVisible}
        onClose={() => setGoToLineVisible(false)}
        onGo={(line) => {
          document.dispatchEvent(new CustomEvent('editor:goToLine', { detail: line }))
        }}
        maxLine={9999}
      />
      <KeyboardShortcuts visible={kbdVisible} onClose={() => setKbdVisible(false)} />
      <ToastContainer />

      {dragOver && (
        <div className="drop-overlay">
          <div className="drop-overlay-text">Drop files to open</div>
        </div>
      )}

      {zoomIndicator && (
        <div className="zoom-indicator">{zoomIndicator}</div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <EditorProvider>
      <EditorUIProvider>
        <SettingsProvider>
          <ConfirmProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </ConfirmProvider>
        </SettingsProvider>
      </EditorUIProvider>
    </EditorProvider>
  )
}