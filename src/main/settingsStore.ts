import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const settingsDir = path.join(os.homedir(), 'kc-vcode')
const settingsFile = path.join(settingsDir, 'settings.json')

export function loadSettings(): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
    if (!fs.existsSync(settingsFile)) return null
    return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
  } catch {
    return null
  }
}

export function saveSettings(data: Record<string, unknown>): boolean {
  try {
    if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
    fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}