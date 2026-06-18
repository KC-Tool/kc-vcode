import React from 'react'
import { useEditorContext } from '../contexts/EditorContext'

interface StatusBarProps {
  onToggleTerminal: () => void
}

export default function StatusBar({ onToggleTerminal }: StatusBarProps) {
  const { state, setTheme } = useEditorContext()
  const activeFile = state.activeTabId ? state.files[state.activeTabId] : null

  const toggleTheme = () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="status-bar">
      <div className="status-bar-section">
        <span className="status-item clickable" onClick={onToggleTerminal} title="Errors and Warnings">
          0 Errors 0 Warnings
        </span>
        {activeFile && (
          <>
            <span className="status-separator" />
            <span className="status-item">
              Ln {activeFile.cursorLine || 1}, Col {activeFile.cursorColumn || 1}
            </span>
          </>
        )}
      </div>
      <div className="status-bar-section">
        {activeFile && (
          <>
            <span className="status-item">{activeFile.language}</span>
            <span className="status-separator" />
            <span className="status-item">Spaces: 2</span>
            <span className="status-separator" />
            <span className="status-item">UTF-8</span>
            <span className="status-separator" />
            <span className="status-item">LF</span>
          </>
        )}
        <span className="status-separator" />
        <span className="status-item clickable" onClick={toggleTheme} title="Toggle Theme">
          {state.theme === 'dark' ? 'Dark' : 'Light'}
        </span>
        <span className="status-separator" />
        <span className="status-item clickable" onClick={onToggleTerminal} title="Toggle Terminal (Ctrl+`)">
          Terminal
        </span>
        <span className="status-separator" />
        <span className="status-item">kc-vcode</span>
      </div>
    </div>
  )
}
