import React, { useRef, useEffect, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

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

  const teardown = useCallback(() => {
    termRef.current?.dispose()
    termRef.current = null
    fitRef.current = null
  }, [])

  useEffect(() => {
    if (!visible || !containerRef.current) {
      if (!visible) teardown()
      return
    }

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
    window.electronAPI.createTerminal(cwd)

    setTimeout(() => { fitAddon.fit(); term.focus() }, 300)

    const onResize = () => {
      fitAddon.fit()
      window.electronAPI.terminalResize(term.cols, term.rows)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      teardown()
    }
  }, [visible, cwd])

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = theme === 'dark' ? darkTheme : lightTheme
    }
  }, [theme])

  return (
    <div className={`terminal-panel${visible ? ' terminal-panel--open' : ''}`}>
      <div className="terminal-header">
        <span className="terminal-header-title">Terminal</span>
      </div>
      <div className="terminal-body" ref={containerRef} />
    </div>
  )
}