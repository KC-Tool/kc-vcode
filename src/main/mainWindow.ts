import { BrowserWindow } from 'electron'

let mainWin: BrowserWindow | null = null

export function getMainWin(): BrowserWindow | null {
  return mainWin
}

export function setMainWin(win: BrowserWindow | null): void {
  mainWin = win
}