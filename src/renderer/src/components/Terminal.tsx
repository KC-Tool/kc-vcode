import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TermTab {
  id: number
  label: string
  cwd?: string
}

interface TerminalProps {
  cwd?: string
  visible: boolean
  theme: 'dark' | 'light'
}

const darkTheme = {
  background: '#1a1a1a', foreground: '#e0e0e0', cursor: '#e0e0e0',
  selectionBackground: '#264f78', black: '#333', red: '#f44747', green: '#6a9955',
  yellow: '#cca700', blue: '#4fc1ff', magenta: '#c586c0', cyan: '#4ec9b0', white: '#e0e0e0',
  brightBlack: '#666', brightRed: '#f44747', brightGreen: '#6a9955',
  brightYellow: '#cca700', brightBlue: '#4fc1ff', brightMagenta: '#c586c0',
  brightCyan: '#4ec9b0', brightWhite: '#ffffff'
}

const lightTheme = {
  background: '#ffffff', foreground: '#1e1e1e', cursor: '#1e1e1e',
  selectionBackground: '#cce5ff', black: '#333', red: '#d32f2f', green: '#388a34',
  yellow: '#bf8803', blue: '#0066cc', magenta: '#7b1fa2', cyan: '#00897b', white: '#1e1e1e',
  brightBlack: '#666', brightRed: '#d32f2f', brightGreen: '#388a34',
  brightYellow: '#bf8803', brightBlue: '#0066cc', brightMagenta: '#7b1fa2',
  brightCyan: '#00897b', brightWhite: '#000000'
}

export default function TerminalPanel({ cwd, visible, theme }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const [tabs, setTabs] = useState<TermTab[]>([{ id: 0, label: 'Terminal 1', cwd }])
  const [activeTabId, setActiveTabId] = useState(0)
  const nextIdRef = useRef(1)
  const termsMap = useRef<Map<number, { term: XTerm; fit: FitAddon }>>(new Map())

  const teardown = useCallback(() => {
    termsMap.current.forEach(({ term }) => term.dispose())
    termsMap.current.clear()
    termRef.current = null
    fitRef.current = null
  }, [])

  const createTerminal = useCallback((tabCwd?: string) => {
    if (!containerRef.current) return
    const term = new XTerm({
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      fontSize: 13,
      theme: theme === 'dark' ? darkTheme : lightTheme,
      cursorBlink: true,
      scrollback: 3000
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    termRef.current = term
    fitRef.current = fitAddon

    const onDataHandler = (data: string) => window.electronAPI.terminalInput(data)
    const onTermDataHandler = (data: string) => term.write(data)

    term.onData(onDataHandler)
    window.electronAPI.onTerminalData(onTermDataHandler)
    window.electronAPI.createTerminal(tabCwd || cwd)

    setTimeout(() => { fitAddon.fit(); term.focus() }, 300)

    const onResize = () => {
      fitAddon.fit()
      window.electronAPI.terminalResize(term.cols, term.rows)
    }
    window.addEventListener('resize', onResize)

    return { term, fit: fitAddon, onResize, onTermDataHandler }
  }, [cwd, theme])

  useEffect(() => {
    if (!visible || !containerRef.current) {
      if (!visible) teardown()
      return
    }

    const result = createTerminal()
    if (!result) return

    const { onResize, onTermDataHandler } = result

    return () => {
      window.removeEventListener('resize', onResize)
      window.electronAPI.removeAllListeners('terminal:data')
      teardown()
    }
  }, [visible, cwd])

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = theme === 'dark' ? darkTheme : lightTheme
    }
  }, [theme])

  const handleAddTab = () => {
    const id = nextIdRef.current++
    const newTab: TermTab = { id, label: `Terminal ${id + 1}`, cwd }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(id)
  }

  const handleCloseTab = (tabId: number) => {
    if (tabs.length <= 1) return
    const idx = tabs.findIndex(t => t.id === tabId)
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      const newActive = newTabs[Math.min(idx, newTabs.length - 1)]
      setActiveTabId(newActive.id)
    }
  }

  const handleSwitchTab = (tabId: number) => {
    if (tabId === activeTabId) return
    setActiveTabId(tabId)
    setTimeout(() => {
      if (fitRef.current) fitRef.current.fit()
      termRef.current?.focus()
    }, 50)
  }

  return (
    <div className={`terminal-panel${visible ? ' terminal-panel--open' : ''}`}>
      <div className="terminal-header">
        <div className="terminal-tabs">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`terminal-tab${tab.id === activeTabId ? ' terminal-tab--active' : ''}`}
              onClick={() => handleSwitchTab(tab.id)}
            >
              <span>{tab.label}</span>
              {tabs.length > 1 && (
                <span
                  className="terminal-tab-close"
                  onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id) }}
                >
                  ×
                </span>
              )}
            </div>
          ))}
          <button className="terminal-tab-add" onClick={handleAddTab} title="New Terminal">+</button>
        </div>
      </div>
      <div className="terminal-body" ref={containerRef} />
    </div>
  )
}
