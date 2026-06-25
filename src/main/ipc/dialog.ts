import { ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { readDirRecursive, openFolder, getLanguage } from '../fileTree'
import { getMainWin } from '../mainWindow'

export function registerDialogIpc(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    const mainWin = getMainWin()
    if (!mainWin) return null
    const result = await dialog.showOpenDialog(mainWin, { properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths[0]) return null
    const dirPath = result.filePaths[0]
    openFolder(dirPath, mainWin)
    return { rootName: path.basename(dirPath), rootPath: dirPath, tree: readDirRecursive(dirPath) }
  })

  ipcMain.handle('dialog:openFile', async () => {
    const mainWin = getMainWin()
    if (!mainWin) return null
    const result = await dialog.showOpenDialog(mainWin, {
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }]
    })
    if (result.canceled || !result.filePaths[0]) return null
    const filePath = result.filePaths[0]
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { path: filePath, name: path.basename(filePath), content, language: getLanguage(filePath) }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}