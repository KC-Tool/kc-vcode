import { BrowserWindow } from 'electron'
import path from 'node:path'
import { createMenu } from './menu'
import { destroyPty } from './terminal'
import { getCurrentDir, stopWatching } from './fileTree'
import { setMainWin, getMainWin } from './mainWindow'

export function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    show: false,
    icon: path.join(__dirname, '../../resources/icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true
    }
  })

  setMainWin(win)

  win.on('ready-to-show', () => getMainWin()?.show())
  win.on('closed', () => {
    destroyPty()
    const dir = getCurrentDir()
    if (dir) stopWatching(dir)
    setMainWin(null)
  })

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(path.join(__dirname, '../renderer/index.html'))
}