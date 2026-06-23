import { ipcMain } from 'electron'
import { shell, clipboard } from 'electron'
import { getMainWin } from './mainWindow'

export function registerShellIpc(): void {
  ipcMain.handle('shell:revealInFolder', (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('shell:openExternal', (_, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('clipboard:writeText', (_, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('window:setTitle', (_, title: string) => {
    getMainWin()?.setTitle(title)
  })
}