import { ipcMain } from 'electron'
import { createPty, writeToPty, resizePty } from '../terminal'
import { getMainWin } from '../mainWindow'

export function registerTerminalIpc(): void {
  ipcMain.handle('terminal:create', (_, opts?: { cwd?: string }) => {
    return createPty(opts?.cwd || process.env.USERPROFILE || process.cwd(), (data) => {
      getMainWin()?.webContents.send('terminal:data', data)
    })
  })

  ipcMain.handle('terminal:input', (_, data: string) => {
    writeToPty(data)
  })

  ipcMain.handle('terminal:resize', (_, cols: number, rows: number) => {
    resizePty(cols, rows)
  })
}