import { ipcMain } from 'electron'
import { BrowserWindow } from 'electron'
import { DebugClient } from '../debug'
import { getMainWin } from './mainWindow'

export function registerDebugIpc(): void {
  let debugClient: DebugClient | null = null

  ipcMain.handle('debug:start', async (_, params: { filePath: string; cwd: string }) => {
    const mainWin = getMainWin()
    if (debugClient) await debugClient.disconnect()
    debugClient = new DebugClient()

    debugClient.on('stopped', (body) => {
      mainWin?.webContents.send('debug:stopped', body)
    })
    debugClient.on('terminated', () => {
      mainWin?.webContents.send('debug:terminated')
      debugClient = null
    })
    debugClient.on('exited', (body) => {
      mainWin?.webContents.send('debug:exited', body)
    })

    await debugClient.startNode(params.filePath, params.cwd)
    return { sessionId: debugClient.sessionId }
  })

  ipcMain.handle('debug:stop', async () => {
    if (debugClient) {
      await debugClient.disconnect()
      debugClient = null
    }
    return { success: true }
  })

  ipcMain.handle('debug:continue', async () => {
    if (debugClient) await debugClient.continue()
  })

  ipcMain.handle('debug:pause', async () => {
    if (debugClient) await debugClient.pause()
  })

  ipcMain.handle('debug:next', async () => {
    if (debugClient) await debugClient.next()
  })

  ipcMain.handle('debug:stepIn', async () => {
    if (debugClient) await debugClient.stepIn()
  })

  ipcMain.handle('debug:stepOut', async () => {
    if (debugClient) await debugClient.stepOut()
  })

  ipcMain.handle('debug:setBreakpoints', async (_, params: { file: string; lines: number[] }) => {
    if (debugClient) return debugClient.setBreakpoints(params.file, params.lines)
    return []
  })

  ipcMain.handle('debug:stackTrace', async () => {
    if (debugClient) return debugClient.getStackTrace()
    return []
  })

  ipcMain.handle('debug:scopes', async (_, params: { frameId: number }) => {
    if (debugClient) return debugClient.getScopes(params.frameId)
    return []
  })

  ipcMain.handle('debug:variables', async (_, params: { variablesReference: number }) => {
    if (debugClient) return debugClient.getVariables(params.variablesReference)
    return []
  })

  ipcMain.handle('debug:evaluate', async (_, params: { expression: string; frameId?: number }) => {
    if (debugClient) return debugClient.evaluate(params.expression, params.frameId)
    return ''
  })
}