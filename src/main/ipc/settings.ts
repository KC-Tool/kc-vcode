import { ipcMain } from 'electron'
import { loadSettings, saveSettings } from '../settingsStore'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:load', () => {
    return loadSettings()
  })

  ipcMain.handle('settings:save', (_, data: Record<string, unknown>) => {
    return saveSettings(data)
  })
}