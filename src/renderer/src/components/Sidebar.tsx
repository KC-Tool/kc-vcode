import React, { useCallback, useState, useRef, useEffect } from 'react'
import FileTree from './FileTree'
import SearchPanel from './SearchPanel'
import SourceControl from './SourceControl'
import ProblemsPanel from './ProblemsPanel'
import AiChat from './AiChat'
import ActivityBar, { ActivityView } from './ActivityBar'
import { FileNode } from '../../../preload/index'
import { useEditorContext } from '../contexts/EditorContext'
import { IconForFolder } from '../utils/fileIcons'

interface SidebarProps {
  tree: FileNode[]
  onOpenFolder: () => void
  onRefresh: () => void
  onOpenSettings: () => void
  dirPath: string | null
}

export default function Sidebar({ tree, onOpenFolder, onRefresh, onOpenSettings, dirPath }: SidebarProps) {
  const { state, openFile } = useEditorContext()
  const [view, setView] = useState<ActivityView>('explorer')
  const [menuOpen, setMenuOpen] = useState(false)
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  const handleFileClick = useCallback(async (node: FileNode) => {
    if (node.type !== 'file') return
    const result = await window.electronAPI.openFile(node.path)
    if ('error' in result) { console.error(result.error); return }
    openFile(node.path, node.name, result.content, result.language)
  }, [openFile])

  const submitCreate = useCallback(async () => {
    if (!newName.trim() || !dirPath || !creating) return
    const res = creating === 'file'
      ? await window.electronAPI.createFile(dirPath, newName.trim())
      : await window.electronAPI.createFolder(dirPath, newName.trim())
    if ('error' in res) { alert(res.error); return }
    setCreating(null)
    setNewName('')
    onRefresh()
  }, [newName, dirPath, creating, onRefresh])

  const startCreate = (type: 'file' | 'folder') => {
    setMenuOpen(false)
    setCreating(type)
    setNewName('')
  }

  return (
    <div className="sidebar-wrap">
      <ActivityBar active={view} onSelect={setView} onOpenSettings={onOpenSettings} />
      <div className="sidebar">
        {view === 'explorer' && (
          <>
            <div className="sidebar-header" style={{ position: 'relative' }}>
              <span>EXPLORER</span>
              <div ref={menuRef}>
                <button className="sidebar-header-btn" onClick={() => setMenuOpen(v => !v)} title="Actions">+</button>
                {menuOpen && (
                  <div className="sidebar-dropdown">
                    <div className="sidebar-dropdown-item" onClick={() => startCreate('file')}>New File</div>
                    <div className="sidebar-dropdown-item" onClick={() => startCreate('folder')}>New Folder</div>
                    <div className="sidebar-dropdown-sep" />
                    <div className="sidebar-dropdown-item" onClick={() => { setMenuOpen(false); onOpenFolder() }}>Open Folder…</div>
                  </div>
                )}
              </div>
            </div>
            {creating && (
              <div className="sidebar-create-input">
                <input
                  ref={inputRef}
                  className="sidebar-input"
                  type="text"
                  placeholder={creating === 'file' ? 'file name' : 'folder name'}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitCreate()
                    if (e.key === 'Escape') { setCreating(null); setNewName('') }
                  }}
                  onBlur={() => { setCreating(null); setNewName('') }}
                />
              </div>
            )}
            {tree.length === 0 ? (
              <div className="sidebar-empty">
                <div className="sidebar-empty-icon"><IconForFolder size={32} /></div>
                <div className="sidebar-empty-text">No folder opened</div>
                <button className="sidebar-empty-btn" onClick={onOpenFolder}>Open Folder</button>
              </div>
            ) : (
              <div className="sidebar-tree-wrap">
                <FileTree tree={tree} onFileClick={handleFileClick} />
              </div>
            )}
          </>
        )}
        {view === 'search' && (
          <>
            <div className="sidebar-header"><span>SEARCH</span></div>
            <SearchPanel tree={tree} />
          </>
        )}
        {view === 'source-control' && (
          <SourceControl dirPath={dirPath} onRefresh={onRefresh} />
        )}
        {view === 'problems' && (
          <ProblemsPanel />
        )}
        {view === 'ai-chat' && (
          <AiChat />
        )}
      </div>
    </div>
  )
}