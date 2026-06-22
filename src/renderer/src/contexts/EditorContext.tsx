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

export interface MarkerData {
  file: string
  line: number
  column: number
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
}

interface EditorState {
  tabs: Tab[]
  activeTabId: string | null
  files: Record<string, FileData>
  directoryPath: string | null
  directoryName: string | null
  theme: 'dark' | 'light'
  markers: MarkerData[]
  zoomLevel: number
  splitView: boolean
  splitTabId: string | null
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
  | { type: 'SET_MARKERS'; payload: MarkerData[] }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'TOGGLE_SPLIT_VIEW' }
  | { type: 'SET_SPLIT_TAB'; payload: string | null }
  | { type: 'REORDER_TABS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'RESTORE'; payload: EditorState }

const MAX_TABS = 20
const STORAGE_KEY = 'kc-edit-state'
const SAVE_DEBOUNCE_MS = 2000

let saveTimer: ReturnType<typeof setTimeout> | null = null

function loadSavedState(): EditorState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    const theme = saved.theme || 'dark'
    return { tabs: [], activeTabId: null, files: {}, directoryPath: null, directoryName: null, theme, zoomLevel: 1, splitView: false, splitTabId: null }
  } catch {
    return null
  }
}

function saveState(state: EditorState): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const lite: any = { theme: state.theme, zoomLevel: state.zoomLevel }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lite))
    } catch {
      // localStorage full or blocked
    }
  }, SAVE_DEBOUNCE_MS)
}

function editorReducer(state: EditorState, action: Action): EditorState {
  let next: EditorState

  switch (action.type) {
    case 'RESTORE':
      return action.payload

    case 'OPEN_FILE': {
      const { path, name, content, language } = action.payload
      const exists = state.tabs.find(t => t.id === path)
      if (exists) {
        next = { ...state, activeTabId: path }
        break
      }
      // enforce max tabs — evict oldest non-dirty tab
      let tabs = [...state.tabs]
      if (tabs.length >= MAX_TABS) {
        const evict = tabs.findLast(t => !t.isDirty)
        if (evict) {
          tabs = tabs.filter(t => t.id !== evict.id)
          const files = { ...state.files }
          delete files[evict.id]
          state = { ...state, tabs, files }
        } else {
          // all dirty — just drop oldest
          tabs = tabs.slice(1)
          const files = { ...state.files }
          delete files[state.tabs[0].id]
          state = { ...state, tabs, files }
        }
      }
      const tab: Tab = { id: path, name, language, isDirty: false }
      const file: FileData = { path, content, originalContent: content, language }
      next = {
        ...state,
        tabs: [...state.tabs, tab],
        activeTabId: path,
        files: { ...state.files, [path]: file }
      }
      break
    }

    case 'CLOSE_TAB': {
      const { tabId } = action.payload
      const idx = state.tabs.findIndex(t => t.id === tabId)
      if (idx === -1) return state
      const newTabs = state.tabs.filter(t => t.id !== tabId)
      const files = { ...state.files }
      delete files[tabId]
      let newActive = state.activeTabId
      if (state.activeTabId === tabId) {
        newActive = newTabs.length > 0
          ? newTabs[Math.min(idx, newTabs.length - 1)].id
          : null
      }
      next = { ...state, tabs: newTabs, activeTabId: newActive, files }
      break
    }

    case 'SET_ACTIVE_TAB':
      if (!state.tabs.find(t => t.id === action.payload.tabId)) return state
      next = { ...state, activeTabId: action.payload.tabId }
      break

    case 'UPDATE_CONTENT': {
      const { path, content } = action.payload
      const file = state.files[path]
      if (!file) return state
      const updated = { ...file, content }
      const tabs = state.tabs.map(t =>
        t.id === path ? { ...t, isDirty: content !== file.originalContent } : t
      )
      next = { ...state, tabs, files: { ...state.files, [path]: updated } }
      break
    }

    case 'MARK_SAVED': {
      const { path } = action.payload
      const file = state.files[path]
      if (!file) return state
      const updated = { ...file, originalContent: file.content }
      const tabs = state.tabs.map(t =>
        t.id === path ? { ...t, isDirty: false } : t
      )
      next = { ...state, tabs, files: { ...state.files, [path]: updated } }
      break
    }

    case 'SET_DIRECTORY':
      next = { ...state, directoryPath: action.payload.path, directoryName: action.payload.name }
      break

    case 'CLOSE_ALL_TABS':
      next = { ...state, tabs: [], activeTabId: null, files: {} }
      break

    case 'SET_CURSOR': {
      const file = state.files[action.payload.path]
      if (!file) return state
      const updated = { ...file, cursorLine: action.payload.line, cursorColumn: action.payload.column }
      next = { ...state, files: { ...state.files, [action.payload.path]: updated } }
      break
    }

    case 'SET_THEME':
      next = { ...state, theme: action.payload.theme }
      break

    case 'OPEN_SETTINGS': {
      const exists = state.tabs.find(t => t.isSettings)
      if (exists) {
        next = { ...state, activeTabId: exists.id }
        break
      }
      const settingsTab: Tab = { id: '__settings__', name: 'Settings', language: 'settings', isDirty: false, isSettings: true }
      next = { ...state, tabs: [...state.tabs, settingsTab], activeTabId: '__settings__' }
      break
    }

    case 'SET_MARKERS':
      return { ...state, markers: action.payload }

    case 'SET_ZOOM':
      return { ...state, zoomLevel: Math.max(0.5, Math.min(3, action.payload)) }

    case 'TOGGLE_SPLIT_VIEW':
      return { ...state, splitView: !state.splitView, splitTabId: !state.splitView ? state.activeTabId : null }

    case 'SET_SPLIT_TAB':
      return { ...state, splitTabId: action.payload }

    case 'REORDER_TABS': {
      const { fromIndex, toIndex } = action.payload
      const tabs = [...state.tabs]
      const [moved] = tabs.splice(fromIndex, 1)
      tabs.splice(toIndex, 0, moved)
      return { ...state, tabs }
    }

    default:
      return state
  }

  return next
}

const saved = loadSavedState()
const initialState: EditorState = saved || {
  tabs: [],
  activeTabId: null,
  files: {},
  directoryPath: null,
  directoryName: null,
  theme: 'dark',
  markers: [],
  zoomLevel: 1,
  splitView: false,
  splitTabId: null
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
  setMarkers: (markers: MarkerData[]) => void
  setZoom: (level: number) => void
  toggleSplitView: () => void
  setSplitTab: (tabId: string | null) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
}

const EditorContext = createContext<EditorContextType | null>(null)

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  // persist on every state change (debounced)
  useEffect(() => { saveState(state) }, [state])

  // flush pending save on unload
  useEffect(() => {
    const flush = () => {
      if (saveTimer) {
        clearTimeout(saveTimer)
        try {
          const lite: any = { theme: state.theme, zoomLevel: state.zoomLevel }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lite))
        } catch {}
      }
    }
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [state.theme, state.zoomLevel])

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

  const setMarkers = useCallback((markers: MarkerData[]) => {
    dispatch({ type: 'SET_MARKERS', payload: markers })
  }, [])

  const setZoom = useCallback((level: number) => {
    dispatch({ type: 'SET_ZOOM', payload: level })
  }, [])

  const toggleSplitView = useCallback(() => {
    dispatch({ type: 'TOGGLE_SPLIT_VIEW' })
  }, [])

  const setSplitTab = useCallback((tabId: string | null) => {
    dispatch({ type: 'SET_SPLIT_TAB', payload: tabId })
  }, [])

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_TABS', payload: { fromIndex, toIndex } })
  }, [])

  return (
    <EditorContext.Provider value={{
      state, openFile, closeTab, setActiveTab,
      updateContent, markSaved, setDirectory, closeAllTabs, setCursor, setTheme, openSettings, setMarkers,
      setZoom, toggleSplitView, setSplitTab, reorderTabs
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
