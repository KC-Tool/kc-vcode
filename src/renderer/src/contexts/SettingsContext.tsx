import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface Settings {
  editor: {
    fontSize: number
    tabSize: number
    wordWrap: 'off' | 'on'
    minimap: boolean
    lineNumbers: boolean
    smoothScrolling: boolean
    cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'line'
    fontFamily: string
  }
  appearance: {
    theme: 'dark' | 'light'
    fontSize: number
    tabBlur: number
    sidebarWidth: number
  }
  terminal: {
    fontSize: number
    cursorBlink: boolean
    scrollback: number
  }
  files: {
    autoSave: boolean
    encoding: string
    trimTrailingWhitespace: boolean
    insertFinalNewline: boolean
  }
}

const defaults: Settings = {
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace"
  },
  appearance: {
    theme: 'dark',
    fontSize: 13,
    tabBlur: 0,
    sidebarWidth: 260
  },
  terminal: {
    fontSize: 13,
    cursorBlink: true,
    scrollback: 3000
  },
  files: {
    autoSave: false,
    encoding: 'utf-8',
    trimTrailingWhitespace: false,
    insertFinalNewline: true
  }
}

interface SettingsContextType {
  settings: Settings
  update: <K extends keyof Settings>(category: K, key: keyof Settings[K], value: any) => void
  loaded: boolean
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loaded, setLoaded] = useState(false)

  // load from disk on mount
  useEffect(() => {
    window.electronAPI.loadSettings().then(saved => {
      if (saved) {
        setSettings(prev => ({
          editor: { ...prev.editor, ...(saved.editor as object || {}) },
          appearance: { ...prev.appearance, ...(saved.appearance as object || {}) },
          terminal: { ...prev.terminal, ...(saved.terminal as object || {}) },
          files: { ...prev.files, ...(saved.files as object || {}) }
        }))
      }
      setLoaded(true)
    })
  }, [])

  // save on every change (debounced)
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => {
      window.electronAPI.saveSettings(settings as unknown as Record<string, unknown>)
    }, 500)
    return () => clearTimeout(t)
  }, [settings, loaded])

  const update = useCallback(<K extends keyof Settings>(category: K, key: keyof Settings[K], value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], [key]: value }
    }))
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, update, loaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
