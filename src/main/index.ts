import { app, BrowserWindow } from 'electron'
import { createMenu } from './menu'
import { createWindow } from './window'
import { registerAllIpc } from './ipc'
import { startWatching, stopWatching } from './watcher'

app.whenReady().then(() => {
  registerAllIpc()
  createWindow()
  createMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})