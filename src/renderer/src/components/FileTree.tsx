import React, { useState, useCallback, useRef, useEffect } from 'react'
import { FileNode } from '../../../preload/index'
import { IconForFile, IconForFolder } from '../utils/fileIcons'
import ContextMenu, { ContextMenuItem } from './ContextMenu'
import { useEditorContext } from '../contexts/EditorContext'
import { useConfirm } from '../contexts/ConfirmContext'

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

function RenameInput({ name, onConfirm, onCancel }: { name: string; onConfirm: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(name)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = useCallback(() => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) onConfirm(trimmed)
    else onCancel()
  }, [value, name, onConfirm, onCancel])

  return (
    <input
      ref={ref}
      className="sidebar-input"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') onCancel()
      }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}
      style={{ marginLeft: 0, height: 18, fontSize: 12 }}
    />
  )
}

function FileTreeItem({ node, onFileClick, directoryPath, depth = 0, onContextMenu, renaming, onRenameConfirm, onRenameCancel }: {
  node: FileNode
  onFileClick: (node: FileNode) => void
  directoryPath?: string | null
  depth: number
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
  renaming: boolean
  onRenameConfirm: (newName: string) => void
  onRenameCancel: () => void
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
          <span className={`file-tree-arrow${expanded ? ' file-tree-arrow--expanded' : ''}`}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M2.5 1.5L5.5 4L2.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <span className="file-tree-icon"><IconForFile name={node.name} /></span>
        )}
        {renaming ? (
          <RenameInput name={node.name} onConfirm={onRenameConfirm} onCancel={onRenameCancel} />
        ) : (
          <span className="file-tree-name">{node.name}</span>
        )}
      </div>
      {isDir && (
        <div className={`file-tree-children${expanded ? ' file-tree-children--open' : ''}`}>
          {node.children && (
            <FileTreeItems nodes={node.children} onFileClick={onFileClick} directoryPath={directoryPath} depth={depth + 1} onContextMenu={onContextMenu} renamingPath={null} onRenameConfirm={onRenameConfirm} onRenameCancel={onRenameCancel} />
          )}
        </div>
      )}
    </div>
  )
}

function FileTreeItems({ nodes, onFileClick, directoryPath, depth, onContextMenu, renamingPath, onRenameConfirm, onRenameCancel }: {
  nodes: FileNode[]
  onFileClick: (node: FileNode) => void
  directoryPath?: string | null
  depth: number
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
  renamingPath: string | null
  onRenameConfirm: (newName: string) => void
  onRenameCancel: () => void
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
          renaming={renamingPath === node.path}
          onRenameConfirm={onRenameConfirm}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </div>
  )
}

export default function FileTree({ tree, onFileClick, directoryPath, depth = 0 }: FileTreeProps) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const { directoryPath: ctxDirPath } = useEditorContext()
  const { confirm } = useConfirm()

  const dirPath = directoryPath ?? ctxDirPath

  const closeMenu = useCallback(() => setMenu(null), [])

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    setMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const handleRenameConfirm = useCallback(async (newName: string) => {
    if (!renamingPath) return
    const result = await window.electronAPI.renameFile(renamingPath, newName)
    if ('error' in result && result.error) {
      await confirm({ title: 'Rename failed', message: result.error, okText: 'OK' })
    }
    setRenamingPath(null)
  }, [renamingPath, confirm])

  const handleRenameCancel = useCallback(() => {
    setRenamingPath(null)
  }, [])

  const buildMenuItems = useCallback((): ContextMenuItem[] => {
    if (!menu) return []
    const { node } = menu
    const isFile = node.type === 'file'
    const isDir = node.type === 'directory'
    const relativePath = dirPath ? node.path.replace(dirPath, '').replace(/^[/\\]/, '') : node.name

    return [
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
      isFile && { label: 'Select for Compare', disabled: true },
      { divider: true },
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
      {
        label: 'Rename...',
        shortcut: 'F2',
        action: () => {
          setRenamingPath(node.path)
        }
      },
      {
        label: 'Delete',
        shortcut: 'Delete',
        danger: true,
        action: async () => {
          const ok = await confirm({
            title: 'Delete',
            message: `Are you sure you want to delete '${node.name}'?`,
            okText: 'Delete',
            danger: true
          })
          if (ok) {
            const result = await window.electronAPI.deleteFile(node.path)
            if ('error' in result && result.error) {
              await confirm({ title: 'Delete failed', message: result.error, okText: 'OK' })
            }
          }
        }
      }
    ].filter(Boolean) as ContextMenuItem[]
  }, [menu, dirPath, onFileClick, confirm])

  return (
    <div className="file-tree">
      <FileTreeItems nodes={tree} onFileClick={onFileClick} directoryPath={dirPath} depth={depth} onContextMenu={handleContextMenu} renamingPath={renamingPath} onRenameConfirm={handleRenameConfirm} onRenameCancel={handleRenameCancel} />
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