import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'

export interface Tab {
  id: string
  name: string
  language: string
  isDirty: boolean
  isSettings?: boolean
}

export interface FileData {
  path: string
  content: string
  originalContent: string
  language: string
  cursorLine?: number
  cursorColumn?: number
}

interface EditorState {
  tabs: Tab[]
  activeTabId: string | null
  files: Record<string, FileData>
  directoryPath: string | null
  directoryName: string | null
  theme: 'dark' | 'light'
}

type Action =
  | { type: 'OPEN_FILE'; payload: { path: string; name: string; content: string; language: string } }
  | { type: 'CLOSE_TAB'; payload: { tabId: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: { tabId: string } }
  | { type: 'UPDATE_CONTENT'; payload: { path: string; content: string } }
  | { type: 'MARK_SAVED'; payload: { path: string } }
  | { type: 'SET_DIRECTORY'; payload: { path: string; name: string } }
  | { type: 'CLOSE_ALL_TABS' }
  | { type: 'SET_CURSOR'; payload: { path: string; line: number; column: number } }
  | { type: 'SET_THEME'; payload: { theme: 'dark' | 'light' } }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'REORDER_TABS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'RESTORE'; payload: EditorState }

const MAX_TABS = 20
const STORAGE_KEY = 'kc-edit-theme'
const SAVE_DEBOUNCE_MS = 1000

let saveTimer: ReturnType<typeof setTimeout> | null = null

function loadSavedTheme(): 'dark' | 'light' {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function persistTheme(theme: 'dark' | 'light'): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, SAVE_DEBOUNCE_MS)
}

function evictIfFull(tabs: Tab[], files: Record<string, FileData>): { tabs: Tab[]; files: Record<string, FileData> } {
  if (tabs.length < MAX_TABS) return { tabs, files }
  const cleanIdx = tabs.findIndex(t => !t.isDirty)
  if (cleanIdx >= 0) {
    const evicted = tabs[cleanIdx]
    const next = { ...files }
    delete next[evicted.id]
    return { tabs: tabs.filter(t => t.id !== evicted.id), files: next }
  }
  const evicted = tabs[0]
  const next = { ...files }
  delete next[evicted.id]
  return { tabs: tabs.slice(1), files: next }
}

function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'RESTORE':
      return action.payload

    case 'OPEN_FILE': {
      const { path, name, content, language } = action.payload
      if (state.tabs.some(t => t.id === path)) {
        return { ...state, activeTabId: path }
      }
      const slot = evictIfFull(state.tabs, state.files)
      return {
        ...state,
        tabs: [...slot.tabs, { id: path, name, language, isDirty: false }],
        activeTabId: path,
        files: { ...slot.files, [path]: { path, content, originalContent: content, language } }
      }
    }

    case 'CLOSE_TAB': {
      const idx = state.tabs.findIndex(t => t.id === action.payload.tabId)
      if (idx === -1) return state
      const tabs = state.tabs.filter(t => t.id !== action.payload.tabId)
      const files = { ...state.files }
      delete files[action.payload.tabId]
      const activeTabId = state.activeTabId === action.payload.tabId
        ? (tabs.length > 0 ? tabs[Math.min(idx, tabs.length - 1)].id : null)
        : state.activeTabId
      return { ...state, tabs, activeTabId, files }
    }

    case 'SET_ACTIVE_TAB':
      if (!state.tabs.some(t => t.id === action.payload.tabId)) return state
      return { ...state, activeTabId: action.payload.tabId }

    case 'UPDATE_CONTENT': {
      const file = state.files[action.payload.path]
      if (!file) return state
      const tabs = state.tabs.map(t =>
        t.id === action.payload.path
          ? { ...t, isDirty: action.payload.content !== file.originalContent }
          : t
      )
      return {
        ...state,
        tabs,
        files: { ...state.files, [action.payload.path]: { ...file, content: action.payload.content } }
      }
    }

    case 'MARK_SAVED': {
      const file = state.files[action.payload.path]
      if (!file) return state
      const tabs = state.tabs.map(t => (t.id === action.payload.path ? { ...t, isDirty: false } : t))
      return {
        ...state,
        tabs,
        files: { ...state.files, [action.payload.path]: { ...file, originalContent: file.content } }
      }
    }

    case 'SET_DIRECTORY':
      return { ...state, directoryPath: action.payload.path, directoryName: action.payload.name }

    case 'CLOSE_ALL_TABS':
      return { ...state, tabs: [], activeTabId: null, files: {} }

    case 'SET_CURSOR': {
      const file = state.files[action.payload.path]
      if (!file) return state
      return {
        ...state,
        files: {
          ...state.files,
          [action.payload.path]: { ...file, cursorLine: action.payload.line, cursorColumn: action.payload.column }
        }
      }
    }

    case 'SET_THEME':
      return { ...state, theme: action.payload.theme }

    case 'OPEN_SETTINGS': {
      const settingsTab: Tab = { id: '__settings__', name: 'Settings', language: 'settings', isDirty: false, isSettings: true }
      const existing = state.tabs.find(t => t.isSettings)
      if (existing) return { ...state, activeTabId: existing.id }
      return { ...state, tabs: [...state.tabs, settingsTab], activeTabId: settingsTab.id }
    }

    case 'REORDER_TABS': {
      const tabs = [...state.tabs]
      const [moved] = tabs.splice(action.payload.fromIndex, 1)
      tabs.splice(action.payload.toIndex, 0, moved)
      return { ...state, tabs }
    }

    default:
      return state
  }
}

const initialState: EditorState = {
  tabs: [],
  activeTabId: null,
  files: {},
  directoryPath: null,
  directoryName: null,
  theme: loadSavedTheme()
}

interface EditorContextType {
  state: EditorState
  openFile: (path: string, name: string, content: string, language: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateContent: (path: string, content: string) => void
  markSaved: (path: string) => void
  setDirectory: (path: string, name: string) => void
  closeAllTabs: () => void
  setCursor: (path: string, line: number, column: number) => void
  setTheme: (theme: 'dark' | 'light') => void
  openSettings: () => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
}

const EditorContext = createContext<EditorContextType | null>(null)

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  useEffect(() => {
    persistTheme(state.theme)
  }, [state.theme])

  useEffect(() => {
    const flush = () => {
      if (saveTimer) {
        clearTimeout(saveTimer)
        try { localStorage.setItem(STORAGE_KEY, state.theme) } catch {}
      }
    }
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [state.theme])

  const openFile = useCallback((path: string, name: string, content: string, language: string) => {
    dispatch({ type: 'OPEN_FILE', payload: { path, name, content, language } })
  }, [])

  const closeTab = useCallback((tabId: string) => {
    dispatch({ type: 'CLOSE_TAB', payload: { tabId } })
  }, [])

  const setActiveTab = useCallback((tabId: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: { tabId } })
  }, [])

  const updateContent = useCallback((path: string, content: string) => {
    dispatch({ type: 'UPDATE_CONTENT', payload: { path, content } })
  }, [])

  const markSaved = useCallback((path: string) => {
    dispatch({ type: 'MARK_SAVED', payload: { path } })
  }, [])

  const setDirectory = useCallback((path: string, name: string) => {
    dispatch({ type: 'SET_DIRECTORY', payload: { path, name } })
  }, [])

  const closeAllTabs = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL_TABS' })
  }, [])

  const setCursor = useCallback((path: string, line: number, column: number) => {
    dispatch({ type: 'SET_CURSOR', payload: { path, line, column } })
  }, [])

  const setTheme = useCallback((theme: 'dark' | 'light') => {
    dispatch({ type: 'SET_THEME', payload: { theme } })
  }, [])

  const openSettings = useCallback(() => {
    dispatch({ type: 'OPEN_SETTINGS' })
  }, [])

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_TABS', payload: { fromIndex, toIndex } })
  }, [])

  return (
    <EditorContext.Provider value={{
      state, openFile, closeTab, setActiveTab,
      updateContent, markSaved, setDirectory, closeAllTabs, setCursor, setTheme, openSettings, reorderTabs
    }}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditorContext(): EditorContextType {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditorContext must be used within EditorProvider')
  return ctx
}