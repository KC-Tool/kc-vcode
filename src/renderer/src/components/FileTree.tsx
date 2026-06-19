import React, { useState, useCallback, useContext, useEffect, useRef } from 'react'
import { FileNode } from '../../../preload/index'
import { IconForFile, IconForFolder } from '../utils/fileIcons'
import { useEditorContext } from '../contexts/EditorContext'

interface FileTreeProps {
  tree: FileNode[]
  onFileClick: (node: FileNode) => void
  depth?: number
  directoryPath?: string | null
  onRefresh?: () => void
}

interface ContextMenuState {
  x: number
  y: number
  node: FileNode
}

function FileTreeItem({ node, onFileClick, depth = 0, directoryPath, onRefresh }: {
  node: FileNode; onFileClick: (node: FileNode) => void; depth: number
  directoryPath?: string | null; onRefresh?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(node.name)
  const { openFile } = useEditorContext()
  const isDir = node.type === 'directory'

  const handleClick = useCallback(() => {
    if (isDir) setExpanded(!expanded)
    else onFileClick(node)
  }, [isDir, expanded, node, onFileClick])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('file-tree-context-menu', {
      detail: { x: e.clientX, y: e.clientY, node } as ContextMenuState
    }))
  }, [node])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ filePath: string }>
      if (ce.detail.filePath === node.path) {
        setRenaming(true)
      }
    }
    window.addEventListener('file-tree-rename', handler)
    return () => window.removeEventListener('file-tree-rename', handler)
  }, [node.path])

  const handleRenameKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = newName.trim()
      if (trimmed && trimmed !== node.name) {
        await window.electronAPI.renameFile({ filePath: node.path, newName: trimmed })
        onRefresh?.()
      }
      setRenaming(false)
    } else if (e.key === 'Escape') {
      setRenaming(false)
    }
  }, [newName, node, onRefresh])

  return (
    <div>
      <div
        className="file-tree-item"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={node.path}
      >
        {isDir ? (
          <span className={`file-tree-arrow${expanded ? ' file-tree-arrow--expanded' : ''}`}>▶</span>
        ) : (
          <span className="file-tree-icon"><IconForFile name={node.name} /></span>
        )}
        <span className="file-tree-name">
          {renaming ? (
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={() => setRenaming(false)}
              onKeyDown={handleRenameKeyDown}
              onClick={e => e.stopPropagation()}
            />
          ) : node.name}
        </span>
      </div>
      {isDir && (
        <div className={`file-tree-children${expanded ? ' file-tree-children--open' : ''}`}>
          {node.children && (
            <FileTreeItem
              node={node}
              onFileClick={onFileClick}
              depth={depth + 1}
              directoryPath={directoryPath}
              onRefresh={onRefresh}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function FileTree({ tree, onFileClick, depth = 0, directoryPath, onRefresh }: FileTreeProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ContextMenuState>
      setMenu(ce.detail)
    }
    window.addEventListener('file-tree-context-menu', handler)
    return () => window.removeEventListener('file-tree-context-menu', handler)
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null)
    }
    if (menu) {
      document.addEventListener('mousedown', close)
      return () => document.removeEventListener('mousedown', close)
    }
  }, [menu])

  const execute = useCallback(async (action: string, node: FileNode) => {
    const api = window.electronAPI
    switch (action) {
      case 'open':
        onFileClick(node)
        break
      case 'open-browser':
        const res = await api.openFile(node.path)
        if ('content' in res) {
          openFile(node.path, node.name, res.content, res.language)
        }
        break
      case 'reveal':
        api.revealInExplorer(node.path)
        break
      case 'terminal':
        api.createTerminal(node.path)
        break
      case 'copy':
        navigator.clipboard.writeText(node.path)
        break
      case 'copy-path':
        api.copyFilePath(node.path)
        break
      case 'copy-relative':
        if (directoryPath) api.copyFileRelativePath({ filePath: node.path, cwd: directoryPath })
        break
      case 'rename':
        window.dispatchEvent(new CustomEvent('file-tree-rename', { detail: node.path }))
        break
      case 'delete':
        await api.deleteFile(node.path)
        onRefresh?.()
        break
    }
    setMenu(null)
  }, [directoryPath, onFileClick, onRefresh])

  return (
    <div className="file-tree">
      {tree.map(node => (
        <FileTreeItem
          key={node.path}
          node={node}
          depth={depth}
          onFileClick={onFileClick}
          directoryPath={directoryPath}
          onRefresh={onRefresh}
        />
      ))}
      {menu && (
        <div
          ref={menuRef}
          className="ctx-menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <div className="ctx-menu-item" onClick={() => execute('open', menu.node)}>Open to the Side</div>
          <div className="ctx-menu-item" onClick={() => execute('open-browser', menu.node)}>Open in Browser</div>
          <div className="ctx-menu-sep" />
          <div className="ctx-menu-item" onClick={() => execute('reveal', menu.node)}>Reveal in File Explorer</div>
          <div className="ctx-menu-item" onClick={() => execute('terminal', menu.node)}>Open in Integrated Terminal</div>
          <div className="ctx-menu-sep" />
          <div className="ctx-menu-item" onClick={() => execute('copy', menu.node)}>Copy</div>
          <div className="ctx-menu-item" onClick={() => execute('copy-path', menu.node)}>Copy Path</div>
          {directoryPath && (
            <div className="ctx-menu-item" onClick={() => execute('copy-relative', menu.node)}>Copy Relative Path</div>
          )}
          <div className="ctx-menu-sep" />
          <div className="ctx-menu-item" onClick={() => execute('rename', menu.node)}>Rename...</div>
          <div className="ctx-menu-item" onClick={() => execute('delete', menu.node)}>Delete</div>
        </div>
      )}
    </div>
  )
}