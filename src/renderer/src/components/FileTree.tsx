import React, { useState, useCallback } from 'react'
import { FileNode } from '../../../preload/index'
import { IconForFile, IconForFolder } from '../utils/fileIcons'
import ContextMenu, { ContextMenuItem } from './ContextMenu'
import { useEditorContext } from '../contexts/EditorContext'

interface FileTreeProps {
  tree: FileNode[]
  onFileClick: (node: FileNode) => void
  directoryPath?: string | null
  depth?: number
}

interface MenuState {
  x: number
  y: number
  node: FileNode
}

function FileTreeItem({ node, onFileClick, directoryPath, depth = 0, onContextMenu }: {
  node: FileNode
  onFileClick: (node: FileNode) => void
  directoryPath?: string | null
  depth: number
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isDir = node.type === 'directory'

  const handleClick = useCallback(() => {
    if (isDir) setExpanded(!expanded)
    else onFileClick(node)
  }, [isDir, expanded, node, onFileClick])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, node)
  }, [node, onContextMenu])

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
          <span className={`file-tree-arrow${expanded ? ' file-tree-arrow--expanded' : ''}`}>&#9654;</span>
        ) : (
          <span className="file-tree-icon"><IconForFile name={node.name} /></span>
        )}
        <span className="file-tree-name">{node.name}</span>
      </div>
      {isDir && (
        <div className={`file-tree-children${expanded ? ' file-tree-children--open' : ''}`}>
          {node.children && (
            <FileTreeItems nodes={node.children} onFileClick={onFileClick} directoryPath={directoryPath} depth={depth + 1} onContextMenu={onContextMenu} />
          )}
        </div>
      )}
    </div>
  )
}

function FileTreeItems({ nodes, onFileClick, directoryPath, depth, onContextMenu }: {
  nodes: FileNode[]
  onFileClick: (node: FileNode) => void
  directoryPath?: string | null
  depth: number
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
}) {
  return (
    <div>
      {nodes.map(node => (
        <FileTreeItem
          key={node.path}
          node={node}
          onFileClick={onFileClick}
          directoryPath={directoryPath}
          depth={depth}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  )
}

export default function FileTree({ tree, onFileClick, directoryPath, depth = 0 }: FileTreeProps) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const { openFile, state, directoryPath: ctxDirPath } = useEditorContext()

  const dirPath = directoryPath ?? ctxDirPath

  const closeMenu = useCallback(() => setMenu(null), [])

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    setMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const buildMenuItems = useCallback((): ContextMenuItem[] => {
    if (!menu) return []
    const { node } = menu
    const isFile = node.type === 'file'
    const isDir = node.type === 'directory'
    const relativePath = dirPath ? node.path.replace(dirPath, '').replace(/^[/\\]/, '') : node.name

    return [
      // Open
      isFile && {
        label: 'Open to the Side',
        shortcut: 'Ctrl+\\',
        action: () => onFileClick(node)
      },
      isFile && {
        label: 'Open in Browser',
        action: () => {
          if (node.language === 'html' || node.name.endsWith('.html')) {
            window.electronAPI.openExternal('file://' + node.path)
          }
        },
        disabled: !(node.language === 'html' || node.name.endsWith('.html'))
      },
      isFile && { label: 'Open With...', disabled: true },
      { divider: true },
      // Reveal & Terminal
      {
        label: 'Reveal in File Explorer',
        shortcut: 'Shift+Alt+R',
        action: () => window.electronAPI.revealInFolder(node.path)
      },
      isDir && {
        label: 'Open in Integrated Terminal',
        action: () => {
          window.electronAPI.createTerminal(node.path)
        }
      },
      { divider: true },
      // Compare
      isFile && { label: 'Select for Compare', disabled: true },
      { divider: true },
      // Clipboard
      {
        label: 'Cut',
        shortcut: 'Ctrl+X',
        disabled: true
      },
      {
        label: 'Copy',
        shortcut: 'Ctrl+C',
        disabled: true
      },
      {
        label: 'Copy Path',
        shortcut: 'Shift+Alt+C',
        action: () => window.electronAPI.clipboardWriteText(node.path)
      },
      {
        label: 'Copy Relative Path',
        shortcut: 'Ctrl+M Ctrl+Shift+C',
        action: () => window.electronAPI.clipboardWriteText(relativePath)
      },
      { divider: true },
      // Rename & Delete
      {
        label: 'Rename...',
        shortcut: 'F2',
        action: () => {
          const newName = window.prompt('Rename to:', node.name)
          if (newName && newName !== node.name) {
            window.electronAPI.renameFile(node.path, newName).then(result => {
              if ('error' in result && result.error) {
                window.alert(result.error)
              }
            })
          }
        }
      },
      {
        label: 'Delete',
        shortcut: 'Delete',
        danger: true,
        action: () => {
          if (window.confirm(`Are you sure you want to delete '${node.name}'?`)) {
            window.electronAPI.deleteFile(node.path).then(result => {
              if ('error' in result && result.error) {
                window.alert(result.error)
              }
            })
          }
        }
      }
    ].filter(Boolean) as ContextMenuItem[]
  }, [menu, dirPath, onFileClick])

  return (
    <div className="file-tree">
      <FileTreeItems nodes={tree} onFileClick={onFileClick} directoryPath={dirPath} depth={depth} onContextMenu={handleContextMenu} />
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenuItems()}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}