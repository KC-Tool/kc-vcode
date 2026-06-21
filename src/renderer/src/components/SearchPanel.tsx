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
  const [replaceText, setReplaceText] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const { openFile } = useEditorContext()

  const collectFiles = useCallback((nodes: FileNode[]): FileNode[] => {
    const files: FileNode[] = []
    for (const n of nodes) {
      if (n.type === 'file') files.push(n)
      if (n.children) files.push(...collectFiles(n.children))
    }
    return files
  }, [])

  const buildMatcher = useCallback((): ((line: string) => boolean) | null => {
    if (!query) return null
    if (useRegex) {
      try {
        const flags = caseSensitive ? 'g' : 'gi'
        const re = new RegExp(query, flags)
        return (line: string) => re.test(line)
      } catch {
        return null
      }
    }
    const q = caseSensitive ? query : query.toLowerCase()
    return (line: string) => {
      const target = caseSensitive ? line : line.toLowerCase()
      if (wholeWord) {
        return new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(target)
      }
      return target.includes(q)
    }
  }, [query, caseSensitive, useRegex, wholeWord])

  const doSearch = useCallback(async () => {
    if (!query.trim() || tree.length === 0) { setResults([]); return }
    const matchFn = buildMatcher()
    if (!matchFn) { setResults([]); return }

    setSearching(true)
    const files = collectFiles(tree)
    const found: SearchResult[] = []

    for (const f of files) {
      if (found.length > 500) break
      try {
        const res = await window.electronAPI.openFile(f.path)
        if ('error' in res) continue
        const lines = res.content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (matchFn(lines[i])) {
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
  }, [query, tree, collectFiles, buildMatcher])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }

  const openResult = async (r: SearchResult) => {
    const res = await window.electronAPI.openFile(r.filePath)
    if ('error' in res) return
    openFile(r.filePath, r.file, res.content, res.language)
  }

  const replaceAll = useCallback(async () => {
    if (!query || results.length === 0) return
    let count = 0
    for (const r of results) {
      const res = await window.electronAPI.openFile(r.filePath)
      if ('error' in res) continue
      let content = res.content
      if (useRegex) {
        try {
          const flags = caseSensitive ? 'g' : 'gi'
          content = content.replace(new RegExp(query, flags), replaceText)
        } catch { continue }
      } else {
        const searchVal = caseSensitive ? query : query.toLowerCase()
        const originalLines = content.split('\n')
        const replacedLines = originalLines.map(line => {
          if (caseSensitive) {
            return line.split(query).join(replaceText)
          }
          const lower = line.toLowerCase()
          const idx = lower.indexOf(searchVal)
          if (idx === -1) return line
          return line.slice(0, idx) + replaceText + line.slice(idx + query.length)
        })
        content = replacedLines.join('\n')
      }
      await window.electronAPI.saveFile({ path: r.filePath, content })
      count++
    }
    if (count > 0) doSearch()
  }, [query, replaceText, results, caseSensitive, useRegex, doSearch])

  return (
    <div className="search-panel">
      <div className="search-input-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Search files and code..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="search-btn" onClick={doSearch} disabled={searching}>
          {searching ? '...' : '\u2192'}
        </button>
      </div>
      <div className="search-options">
        <label className="search-option">
          <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
          <span>Aa</span>
        </label>
        <label className="search-option">
          <input type="checkbox" checked={wholeWord} onChange={e => setWholeWord(e.target.checked)} />
          <span>Ab</span>
        </label>
        <label className="search-option">
          <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} />
          <span>.*</span>
        </label>
        <label className="search-option" onClick={() => setShowReplace(v => !v)} style={{ cursor: 'pointer' }}>
          <span>{showReplace ? '\u25B2' : '\u25BC'} Replace</span>
        </label>
        <span className="search-count">
          {results.length > 0 ? `${results.length} results` : ''}
        </span>
      </div>
      {showReplace && (
        <div className="search-input-wrap">
          <input
            className="search-input"
            type="text"
            placeholder="Replace..."
            value={replaceText}
            onChange={e => setReplaceText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') replaceAll() }}
          />
          <button className="search-btn" onClick={replaceAll} disabled={results.length === 0} title="Replace all in files">
            All
          </button>
        </div>
      )}
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