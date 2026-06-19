import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow } from 'electron'

interface WatcherEntry {
  watchers: fs.FSWatcher[]
  timer: ReturnType<typeof setTimeout> | null
}

const watchers = new Map<string, WatcherEntry>()

function debounce(cb: () => void, ms: number): ReturnType<typeof setTimeout> {
  return setTimeout(cb, ms)
}

function startWatch(dirPath: string, win: BrowserWindow): fs.FSWatcher[] {
  const ignore = new Set(['node_modules', '.git', '.svn', 'out', 'dist', 'target'])
  const result: fs.FSWatcher[] = []

  try {
    const watcher = fs.watch(dirPath, { recursive: true }, () => {
      const existing = watchers.get(dirPath)
      if (existing?.timer) clearTimeout(existing.timer)
      if (existing) {
        existing.timer = debounce(() => {
          if (!win.isDestroyed()) {
            win.webContents.send('directory:refreshed')
          }
        }, 300)
      }
    })
    result.push(watcher)
  } catch {
    // permission denied, skip
  }

  return result
}

export function startWatching(dirPath: string, win: BrowserWindow): void {
  stopWatching(dirPath)
  const ws = startWatch(dirPath, win)
  watchers.set(dirPath, { watchers: ws, timer: null })
}

export function stopWatching(dirPath: string): void {
  const entry = watchers.get(dirPath)
  if (!entry) return
  if (entry.timer) clearTimeout(entry.timer)
  for (const w of entry.watchers) w.close()
  watchers.delete(dirPath)
}