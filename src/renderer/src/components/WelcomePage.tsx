import React from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import logoSvg from '../assets/icon.svg'

interface WelcomePageProps {
  onOpenFolder: () => void
  onOpenShortcuts?: () => void
}

export default function WelcomePage({ onOpenFolder, onOpenShortcuts }: WelcomePageProps) {
  const { openFile } = useEditorContext()

  const handleOpenFile = async () => {
    const result = await window.electronAPI.openFilePicker()
    if (!result) return
    if ('error' in result) {
      console.error('Open file failed:', result.error)
      return
    }
    openFile(result.path, result.name, result.content, result.language)
  }

  return (
    <div className="welcome">
      <img src={logoSvg} alt="kc-vcode" className="welcome-logo-img" />
      <h1 className="welcome-title">kc-vcode</h1>
      <p className="welcome-subtitle">Lightweight Code Editor</p>
      <div className="welcome-actions">
        <button className="welcome-btn" onClick={onOpenFolder}>
          <span className="welcome-btn-icon">Open Folder…</span>
        </button>
        <button className="welcome-btn" onClick={handleOpenFile}>
          <span className="welcome-btn-icon">Open File…</span>
        </button>
      </div>
      <div className="welcome-shortcuts">
        <div className="shortcut-row">
          <span className="shortcut-key">Ctrl</span>
          <span className="shortcut-key">O</span>
          <span className="shortcut-label">Open File</span>
        </div>
        <div className="shortcut-row">
          <span className="shortcut-key">Ctrl</span>
          <span className="shortcut-key">K</span>
          <span className="shortcut-key">Ctrl</span>
          <span className="shortcut-key">O</span>
          <span className="shortcut-label">Open Folder</span>
        </div>
        <div className="shortcut-row">
          <span className="shortcut-key">Ctrl</span>
          <span className="shortcut-key">S</span>
          <span className="shortcut-label">Save</span>
        </div>
        <div className="shortcut-row">
          <span className="shortcut-key">Ctrl</span>
          <span className="shortcut-key">Shift</span>
          <span className="shortcut-key">P</span>
          <span className="shortcut-label">Command Palette</span>
        </div>
        <div className="shortcut-row">
          <span className="shortcut-key">Ctrl</span>
          <span className="shortcut-key">Shift</span>
          <span className="shortcut-key">K</span>
          <span className="shortcut-label">All Shortcuts</span>
        </div>
      </div>
    </div>
  )
}
