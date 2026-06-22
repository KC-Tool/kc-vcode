import React, { useCallback } from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import { IconForFile } from '../utils/fileIcons'

export default function Breadcrumbs() {
  const { state } = useEditorContext()
  const activeFile = state.activeTabId ? state.files[state.activeTabId] : null

  if (!activeFile) return null

  const parts = activeFile.path.replace(/\\/g, '/').split('/')
  const fileName = parts.pop() || ''

  const handleBreadcrumbClick = useCallback((index: number) => {
    const pathUpTo = parts.slice(0, index + 1).join('/')
    window.electronAPI.revealInFolder(pathUpTo)
  }, [parts])

  return (
    <div className="breadcrumbs">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          <span
            className="breadcrumb-item"
            onClick={() => handleBreadcrumbClick(i)}
            title={parts.slice(0, i + 1).join('/')}
          >
            {part}
          </span>
        </React.Fragment>
      ))}
      <span className="breadcrumb-sep">›</span>
      <span className="breadcrumb-item breadcrumb-item--file">
        <IconForFile name={fileName} size={12} />
        {' '}{fileName}
      </span>
    </div>
  )
}
