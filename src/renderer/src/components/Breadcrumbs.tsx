import React from 'react'
import { useEditorContext } from '../contexts/EditorContext'

export default function Breadcrumbs() {
  const { state } = useEditorContext()
  const activeFile = state.activeTabId ? state.files[state.activeTabId] : null

  if (!activeFile) return null

  const parts = activeFile.path.replace(/\\/g, '/').split('/')
  const fileName = parts.pop() || ''

  return (
    <div className="breadcrumbs">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          <span className="breadcrumb-item">{part}</span>
        </React.Fragment>
      ))}
      <span className="breadcrumb-sep">›</span>
      <span className="breadcrumb-item breadcrumb-item--file">{fileName}</span>
    </div>
  )
}
