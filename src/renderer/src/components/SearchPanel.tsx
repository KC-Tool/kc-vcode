import React, { useState, useCallback } from 'react'
import { FileNode } from '../../../preload/index'
import { useEditorContext } from '../contexts/EditorContext'
import { IconForFile } from '../utils/fileIcons'

interface Props {
  tree: FileNode[]
}

interface SearchResult {
  file: string
  filePath: string
  line: number
  text: string
}

export default function SearchPanel({ tree }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const { openFile } = useEditorContext()

  const collectFiles = useCallback((nodes: FileNode[]): FileNode[] => {
    const files: FileNode[] = []
    for (const n of nodes) {
      if (n.type === 'file') files.push(n)
      if (n.children) files.push(...collectFiles(n.children))
    }
    return files
  }, [])

  const doSearch = useCallback(async () => {
    if (!query.trim() || tree.length === 0) { setResults([]); return }
    setSearching(true)
    const files = collectFiles(tree)
    const found: SearchResult[] = []
    const q = caseSensitive ? query : query.toLowerCase()

    for (const f of files) {
      if (found.length > 500) break
      try {
        const res = await window.electronAPI.openFile(f.path)
        if ('error' in res) continue
        const lines = res.content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = caseSensitive ? lines[i] : lines[i].toLowerCase()
          if (line.includes(q)) {
            found.push({ file: f.name, filePath: f.path, line: i + 1, text: lines[i].trim() })
            if (found.length > 500) break
          }
        }
      } catch {
        // skip unreadable files
      }
    }
    setResults(found)
    setSearching(false)
  }, [query, tree, caseSensitive, collectFiles])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }

  const openResult = async (r: SearchResult) => {
    const res = await window.electronAPI.openFile(r.filePath)
    if ('error' in res) return
    openFile(r.filePath, r.file, res.content, res.language)
  }

  return (
    <div className="search-panel">
      <div className="search-input-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Search files and code…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="search-btn" onClick={doSearch} disabled={searching}>
          {searching ? '…' : '→'}
        </button>
      </div>
      <div className="search-options">
        <label className="search-option">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={e => setCaseSensitive(e.target.checked)}
          />
          <span>Aa</span>
        </label>
        <span className="search-count">
          {results.length > 0 ? `${results.length} results` : ''}
        </span>
      </div>
      <div className="search-results">
        {results.map((r, i) => (
          <div key={i} className="search-result" onClick={() => openResult(r)}>
            <div className="search-result-file">
              <span className="search-result-icon"><IconForFile name={r.file} size={14} /></span>
              <span>{r.file}</span>
              <span className="search-result-line">:{r.line}</span>
            </div>
            <div className="search-result-text">{r.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
