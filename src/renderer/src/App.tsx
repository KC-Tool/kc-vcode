import React, { useEffect, useCallback, useState, useRef } from 'react'
import { EditorProvider, useEditorContext } from './contexts/EditorContext'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import EditorPane from './components/Editor'
import StatusBar from './components/StatusBar'
import WelcomePage from './components/WelcomePage'
import TerminalPanel from './components/Terminal'
import CommandPalette from './components/CommandPalette'
import GoToLine from './components/GoToLine'
import { FileNode } from '../../preload/index'
import './assets/styles/global.css'

function AppContent() {
  const { state, openFile, setDirectory, closeTab, setTheme, openSettings } = useEditorContext()
  const { settings, loaded } = useSettings()
  const [tree, setTree] = useState<FileNode[]>([])
  const [termVisible, setTermVisible] = useState(false)
  const [paletteVisible, setPaletteVisible] = useState(false)
  const [paletteMode, setPaletteMode] = useState<'command' | 'file'>('command')
  const [goToLineVisible, setGoToLineVisible] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const dirPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (loaded && settings.appearance.theme !== state.theme) {
      setTheme(settings.appearance.theme)
    }
  }, [loaded, settings.appearance.theme, state.theme, setTheme])

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
    }
  }, [setDirectory])

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
    return () => {
      window.electronAPI.removeAllListeners('directory:opened')
      window.electronAPI.removeAllListeners('file:opened')
      window.electronAPI.removeAllListeners('directory:refreshed')
    }
  }, [openFile, setDirectory, refreshTree])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Command Palette: Ctrl+Shift+P
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault()
      setPaletteMode('command')
      setPaletteVisible(v => !v)
      return
    }
    // Quick Open: Ctrl+P
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
      e.preventDefault()
      setPaletteMode('file')
      setPaletteVisible(v => !v)
      return
    }
    // Go to Line: Ctrl+G
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault()
      setGoToLineVisible(true)
      return
    }
    // Zen Mode: Ctrl+Shift+F11
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F11') {
      e.preventDefault()
      setZenMode(v => !v)
      return
    }
    // Terminal: Ctrl+`
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
      e.preventDefault()
      setTermVisible(v => !v)
      return
    }
    // Settings: Ctrl+,
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault()
      openSettings()
      return
    }
    // Close tab: Ctrl+W
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault()
      if (state.activeTabId) {
        const tab = state.tabs.find(t => t.id === state.activeTabId)
        if (tab?.isDirty && !confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return
        closeTab(state.activeTabId)
      }
    }
  }, [state.activeTabId, state.tabs, closeTab, openSettings])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  const hasTabs = state.tabs.length > 0

  return (
    <div className={`app-layout${zenMode ? ' app-layout--zen' : ''}`}>
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
          {hasTabs ? <EditorPane /> : <WelcomePage onOpenFolder={handleOpenFolder} />}
          <TerminalPanel cwd={dirPathRef.current || undefined} visible={termVisible} theme={state.theme} />
        </div>
      </div>
      <StatusBar onToggleTerminal={() => setTermVisible(v => !v)} />
      <CommandPalette
        visible={paletteVisible}
        mode={paletteMode}
        onClose={() => setPaletteVisible(false)}
        tree={tree}
        onOpenFolder={handleOpenFolder}
        onToggleTerminal={() => setTermVisible(v => !v)}
      />
      <GoToLine
        visible={goToLineVisible}
        onClose={() => setGoToLineVisible(false)}
        onGo={(line) => {
          // dispatch to editor
          document.dispatchEvent(new CustomEvent('editor:goToLine', { detail: line }))
        }}
        maxLine={9999}
      />
    </div>
  )
}

export default function App() {
  return (
    <EditorProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </EditorProvider>
  )
}
