import React, { createContext, useContext, useReducer, useCallback } from 'react'

export interface MarkerData {
  file: string
  line: number
  column: number
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
}

// ---------- markers slice ----------
type MarkersState = MarkerData[]
type MarkersAction = { type: 'SET_MARKERS'; payload: MarkerData[] }

function markersReducer(state: MarkersState, action: MarkersAction): MarkersState {
  switch (action.type) {
    case 'SET_MARKERS':
      return action.payload
    default:
      return state
  }
}

// ---------- zoom slice ----------
type ZoomState = number
type ZoomAction = { type: 'SET_ZOOM'; payload: number }

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3

function clampZoom(n: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, n))
}

function zoomReducer(state: ZoomState, action: ZoomAction): ZoomState {
  switch (action.type) {
    case 'SET_ZOOM':
      return clampZoom(action.payload)
    default:
      return state
  }
}

// ---------- splitView slice ----------
interface SplitState {
  splitView: boolean
  splitTabId: string | null
}
type SplitAction =
  | { type: 'OPEN_SPLIT'; payload: { tabId: string } }
  | { type: 'CLOSE_SPLIT' }
  | { type: 'SET_SPLIT_TAB'; payload: string | null }

function splitReducer(state: SplitState, action: SplitAction): SplitState {
  switch (action.type) {
    case 'OPEN_SPLIT':
      return { splitView: true, splitTabId: action.payload.tabId }
    case 'CLOSE_SPLIT':
      return { splitView: false, splitTabId: null }
    case 'SET_SPLIT_TAB':
      return { ...state, splitTabId: action.payload }
    default:
      return state
  }
}

// ---------- provider ----------
interface EditorUIContextType {
  markers: MarkerData[]
  zoomLevel: number
  splitView: boolean
  splitTabId: string | null
  setMarkers: (markers: MarkerData[]) => void
  setZoom: (level: number) => void
  toggleSplitView: (currentTabId: string | null) => void
  setSplitTab: (tabId: string | null) => void
}

const EditorUIContext = createContext<EditorUIContextType | null>(null)

export function EditorUIProvider({ children }: { children: React.ReactNode }) {
  const [markers, dispatchMarkers] = useReducer(markersReducer, [])
  const [zoomLevel, dispatchZoom] = useReducer(zoomReducer, 1)
  const [split, dispatchSplit] = useReducer(splitReducer, { splitView: false, splitTabId: null })

  const setMarkers = useCallback((m: MarkerData[]) => dispatchMarkers({ type: 'SET_MARKERS', payload: m }), [])
  const setZoom = useCallback((level: number) => dispatchZoom({ type: 'SET_ZOOM', payload: level }), [])

  const toggleSplitView = useCallback((currentTabId: string | null) => {
    if (split.splitView) {
      dispatchSplit({ type: 'CLOSE_SPLIT' })
    } else if (currentTabId) {
      dispatchSplit({ type: 'OPEN_SPLIT', payload: { tabId: currentTabId } })
    }
  }, [split.splitView])

  const setSplitTab = useCallback((tabId: string | null) => {
    dispatchSplit({ type: 'SET_SPLIT_TAB', payload: tabId })
  }, [])

  return (
    <EditorUIContext.Provider value={{
      markers,
      zoomLevel,
      splitView: split.splitView,
      splitTabId: split.splitTabId,
      setMarkers, setZoom, toggleSplitView, setSplitTab
    }}>
      {children}
    </EditorUIContext.Provider>
  )
}

export function useEditorUI(): EditorUIContextType {
  const ctx = useContext(EditorUIContext)
  if (!ctx) throw new Error('useEditorUI must be used within EditorUIProvider')
  return ctx
}