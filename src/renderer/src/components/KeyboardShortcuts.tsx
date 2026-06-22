import React, { useState, useMemo, useEffect, useRef } from 'react'

interface Shortcut {
  keys: string[]
  label: string
  category: string
}

const ALL_SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', 'S'], label: 'Save File', category: 'File' },
  { keys: ['Ctrl', 'W'], label: 'Close Tab', category: 'File' },
  { keys: ['Ctrl', 'K', 'Ctrl', 'O'], label: 'Open Folder', category: 'File' },
  { keys: ['Ctrl', 'N'], label: 'New File', category: 'File' },
  { keys: ['Ctrl', 'Shift', 'P'], label: 'Command Palette', category: 'Navigation' },
  { keys: ['Ctrl', 'P'], label: 'Quick Open File', category: 'Navigation' },
  { keys: ['Ctrl', 'G'], label: 'Go to Line', category: 'Navigation' },
  { keys: ['Alt', '←'], label: 'Navigate Back', category: 'Navigation' },
  { keys: ['Alt', '→'], label: 'Navigate Forward', category: 'Navigation' },
  { keys: ['Ctrl', '`'], label: 'Toggle Terminal', category: 'View' },
  { keys: ['Ctrl', '\\'], label: 'Split Editor', category: 'View' },
  { keys: ['Ctrl', 'Shift', 'F11'], label: 'Zen Mode', category: 'View' },
  { keys: ['Ctrl', '='], label: 'Zoom In', category: 'View' },
  { keys: ['Ctrl', '-'], label: 'Zoom Out', category: 'View' },
  { keys: ['Ctrl', '0'], label: 'Reset Zoom', category: 'View' },
  { keys: ['Ctrl', 'Shift', 'K'], label: 'Keyboard Shortcuts', category: 'View' },
  { keys: ['Ctrl', ','], label: 'Open Settings', category: 'Preferences' },
  { keys: ['Ctrl', 'Shift', 'F'], label: 'Search in Files', category: 'Search' },
  { keys: ['Ctrl', 'H'], label: 'Search and Replace', category: 'Search' },
  { keys: ['Ctrl', 'D'], label: 'Select Next Occurrence', category: 'Editor' },
  { keys: ['Ctrl', '/'], label: 'Toggle Line Comment', category: 'Editor' },
  { keys: ['Ctrl', 'Shift', 'K'], label: 'Delete Line', category: 'Editor' },
  { keys: ['Alt', '↑'], label: 'Move Line Up', category: 'Editor' },
  { keys: ['Alt', '↓'], label: 'Move Line Down', category: 'Editor' },
  { keys: ['Ctrl', 'Enter'], label: 'Insert Line Below', category: 'Editor' },
  { keys: ['F2'], label: 'Rename Symbol', category: 'Editor' },
  { keys: ['F12'], label: 'Go to Definition', category: 'Editor' },
  { keys: ['Ctrl', 'Space'], label: 'Trigger Suggest', category: 'Editor' },
  { keys: ['Tab'], label: 'Accept Suggestion / Emmet', category: 'Editor' },
  { keys: ['F5'], label: 'Start Debugging', category: 'Debug' },
  { keys: ['F10'], label: 'Step Over', category: 'Debug' },
  { keys: ['F11'], label: 'Step Into', category: 'Debug' },
  { keys: ['Shift', 'F11'], label: 'Step Out', category: 'Debug' },
  { keys: ['F9'], label: 'Toggle Breakpoint', category: 'Debug' },
  { keys: ['Ctrl', 'Enter'], label: 'Git Commit', category: 'Git' },
  { keys: ['Escape'], label: 'Close / Cancel', category: 'General' },
]

interface Props {
  visible: boolean
  onClose: () => void
}

export default function KeyboardShortcuts({ visible, onClose }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible, onClose])

  const categories = useMemo(() => {
    const q = query.toLowerCase()
    const filtered = q
      ? ALL_SHORTCUTS.filter(s =>
          s.label.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.keys.join(' ').toLowerCase().includes(q)
        )
      : ALL_SHORTCUTS

    const map = new Map<string, Shortcut[]>()
    for (const s of filtered) {
      const list = map.get(s.category) || []
      list.push(s)
      map.set(s.category, list)
    }
    return Array.from(map.entries())
  }, [query])

  if (!visible) return null

  return (
    <div className="kbd-overlay" onClick={onClose}>
      <div className="kbd-panel" onClick={e => e.stopPropagation()}>
        <div className="kbd-header">
          <span className="kbd-title">Keyboard Shortcuts</span>
          <button className="kbd-close" onClick={onClose}>×</button>
        </div>
        <div className="kbd-search">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search shortcuts…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="kbd-body">
          {categories.map(([cat, shortcuts]) => (
            <div key={cat} className="kbd-category">
              <div className="kbd-category-title">{cat}</div>
              {shortcuts.map((s, i) => (
                <div key={i} className="kbd-row">
                  <span>{s.label}</span>
                  <span className="kbd-keys">
                    {s.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        <span className="kbd-key">{k}</span>
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
          {categories.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: 32 }}>
              No shortcuts match "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
