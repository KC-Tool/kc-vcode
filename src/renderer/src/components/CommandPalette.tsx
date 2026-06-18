import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useEditorContext } from '../contexts/EditorContext'
import { FileNode } from '../../../preload/index'

interface Props {
  visible: boolean
  mode: 'command' | 'file'
  onClose: () => void
  tree: FileNode[]
  onOpenFolder: () => void
  onToggleTerminal: () => void
}

interface Command {
  id: string
  label: string
  category: string
  shortcut?: string
  action: () => void
}

function collectFiles(nodes: FileNode[]): { name: string; path: string }[] {
  const files: { name: string; path: string }[] = []
  for (const n of nodes) {
    if (n.type === 'file') files.push({ name: n.name, path: n.path })
    if (n.children) files.push(...collectFiles(n.children))
  }
  return files
}

export default function CommandPalette({ visible, mode, onClose, tree, onOpenFolder, onToggleTerminal }: Props) {
  const { state, openFile, setActiveTab, closeTab, closeAllTabs, openSettings, setTheme } = useEditorContext()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const files = useMemo(() => collectFiles(tree), [tree])

  const commands: Command[] = useMemo(() => [
    { id: 'file.openFolder', label: 'Open Folder…', category: 'File', action: () => { onOpenFolder(); onClose() } },
    { id: 'file.save', label: 'Save', category: 'File', shortcut: 'Ctrl+S', action: () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true })); onClose() } },
    { id: 'file.close', label: 'Close Editor', category: 'File', shortcut: 'Ctrl+W', action: () => { if (state.activeTabId) closeTab(state.activeTabId); onClose() } },
    { id: 'file.closeAll', label: 'Close All Editors', category: 'File', action: () => { closeAllTabs(); onClose() } },
    { id: 'view.terminal', label: 'Toggle Terminal', category: 'View', shortcut: 'Ctrl+`', action: () => { onToggleTerminal(); onClose() } },
    { id: 'view.explorer', label: 'Show Explorer', category: 'View', action: onClose },
    { id: 'view.search', label: 'Show Search', category: 'View', action: onClose },
    { id: 'editor.settings', label: 'Open Settings', category: 'Preferences', shortcut: 'Ctrl+,', action: () => { openSettings(); onClose() } },
    { id: 'editor.theme', label: 'Toggle Theme (Dark/Light)', category: 'Preferences', action: () => { setTheme(state.theme === 'dark' ? 'light' : 'dark'); onClose() } },
    { id: 'editor.fontSize+', label: 'Increase Font Size', category: 'View', action: onClose },
    { id: 'editor.fontSize-', label: 'Decrease Font Size', category: 'View', action: onClose },
    { id: 'editor.wordwrap', label: 'Toggle Word Wrap', category: 'View', shortcut: 'Alt+Z', action: onClose },
    { id: 'editor.minimap', label: 'Toggle Minimap', category: 'View', action: onClose },
    { id: 'editor.linenumbers', label: 'Toggle Line Numbers', category: 'View', action: onClose },
    { id: 'window.newWindow', label: 'New Window', category: 'Window', action: onClose },
    { id: 'help.about', label: 'About kc-vcode', category: 'Help', action: onClose },
  ], [state, closeTab, closeAllTabs, openSettings, setTheme, onClose, onOpenFolder, onToggleTerminal])

  const items = useMemo(() => {
    if (mode === 'file') {
      return files.map(f => ({
        id: f.path,
        label: f.name,
        path: f.path,
        category: ''
      }))
    }
    return commands.map(c => ({
      id: c.id,
      label: c.label,
      category: c.category,
      shortcut: c.shortcut
    }))
  }, [mode, files, commands])

  const filtered = useMemo(() => {
    if (!query) return items
    const q = query.toLowerCase()
    return items.filter(item => {
      const text = `${item.category} ${item.label} ${('path' in item) ? item.path : ''}`.toLowerCase()
      return text.includes(q)
    })
  }, [query, items])

  useEffect(() => {
    if (visible) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [visible])

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selected] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [selected])

  const execute = useCallback((idx: number) => {
    const item = filtered[idx]
    if (!item) return
    if (mode === 'file' && 'path' in item) {
      // open file by reading it
      window.electronAPI.openFile(item.path).then(res => {
        if ('content' in res) {
          openFile(item.path, item.label, res.content, res.language)
        }
      })
    } else {
      const cmd = commands.find(c => c.id === item.id)
      cmd?.action()
    }
    onClose()
  }, [filtered, mode, openFile, commands, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); return }
    if (e.key === 'Enter') { e.preventDefault(); execute(selected); return }
  }

  if (!visible) return null

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          type="text"
          placeholder={mode === 'file' ? 'Search files by name…' : 'Type a command…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="palette-list" ref={listRef}>
          {filtered.length === 0 && (
            <div className="palette-empty">No results</div>
          )}
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className={`palette-item${i === selected ? ' palette-item--selected' : ''}`}
              onClick={() => execute(i)}
              onMouseEnter={() => setSelected(i)}
            >
              <span className="palette-item-label">{item.label}</span>
              {'category' in item && item.category && (
                <span className="palette-item-category">{item.category}</span>
              )}
              {'shortcut' in item && item.shortcut && (
                <span className="palette-item-shortcut">{item.shortcut}</span>
              )}
              {'path' in item && (
                <span className="palette-item-path">{item.path}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
