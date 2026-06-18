import React from 'react'
import { useEditorContext } from '../contexts/EditorContext'

interface StatusBarProps {
  onToggleTerminal: () => void
}

export default function StatusBar({ onToggleTerminal }: StatusBarProps) {
  const { state, setTheme } = useEditorContext()
  const activeFile = state.activeTabId ? state.files[state.activeTabId] : null

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-item status-branch" title="Current Branch">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 11a2 2 0 00-2 2H4a2 2 0 00-2 2v1h2v-1a1 1 0 011-1h6a1 1 0 011 1v1h2v-1a2 2 0 00-2-2zM6.5 3a3 3 0 11-1 5.83V11a1 1 0 102 0V8.83A3 3 0 016.5 3z"/>
          </svg>
          <span>{state.directoryName || 'main'}</span>
        </span>
      </div>
      <div className="status-bar-center" />
      <div className="status-bar-right">
        {activeFile && (
          <>
            <span className="status-item">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 4L4 12M4 4l8 8"/>
              </svg>
              <span>0</span>
            </span>
            <span className="status-item">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 3h12M2 8h8M2 13h10"/>
              </svg>
              <span>0</span>
            </span>
            <span className="status-separator" />
            <span className="status-item">Ln {activeFile.cursorLine || 1}, Col {activeFile.cursorColumn || 1}</span>
            <span className="status-separator" />
            <span className="status-item">{activeFile.language || 'plaintext'}</span>
            <span className="status-separator" />
            <span className="status-item">UTF-8</span>
            <span className="status-separator" />
            <span className="status-item">LF</span>
            <span className="status-separator" />
          </>
        )}
        <span className="status-item clickable" onClick={() => setTheme(state.theme === 'dark' ? 'light' : 'dark')}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            {state.theme === 'dark' ? (
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12V3a5 5 0 010 10z"/>
            ) : (
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1V2a6 6 0 000 12v-1z"/>
            )}
          </svg>
        </span>
        <span className="status-separator" />
        <span className="status-item clickable" onClick={onToggleTerminal}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="2" width="14" height="12" rx="1.5"/>
            <path d="M3 6l3 3-3 3M8 11h5"/>
          </svg>
        </span>
        <span className="status-separator" />
        <span className="status-item">kc-vcode v1.0</span>
      </div>
    </div>
  )