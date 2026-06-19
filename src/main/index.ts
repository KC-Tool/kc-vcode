import { app, BrowserWindow, ipcMain, dialog, Menu, shell, clipboard } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { startWatching, stopWatching } from './watcher'
import * as git from './git'
import { createPty, writeToPty, resizePty, destroyPty } from './terminal'

let mainWin: BrowserWindow | null = null
let currentDir: string | null = null

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  language?: string
}

function getLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript',
    '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.json': 'json', '.md': 'markdown',
    '.css': 'css', '.scss': 'scss', '.less': 'less',
    '.html': 'html', '.htm': 'html', '.py': 'python',
    '.rs': 'rust', '.go': 'go', '.yaml': 'yaml', '.yml': 'yaml',
    '.xml': 'xml', '.sh': 'shell', '.bash': 'shell',
    '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql',
    '.php': 'php', '.rb': 'ruby', '.c': 'c', '.cpp': 'cpp',
    '.h': 'cpp', '.hpp': 'cpp', '.java': 'java', '.swift': 'swift',
    '.kt': 'kotlin', '.dart': 'dart', '.vue': 'html',
    '.svelte': 'html', '.astro': 'html', '.toml': 'ini',
    '.ini': 'ini', '.cfg': 'ini', '.env': 'dotenv',
    '.gitignore': 'ignore', '.dockerignore': 'ignore'
  }
  return map[ext] || 'plaintext'
}

async function readDirRecursive(dirPath: string, depth = 0): Promise<FileNode[]> {
  if (depth > 8) return []
  const result: FileNode[] = []

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    const ignore = new Set(['node_modules', '.git', '.svn', 'out', 'dist', 'target'])

    for (const entry of entries) {
      if (ignore.has(entry.name)) continue
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        const children = await readDirRecursive(fullPath, depth + 1)
        result.push({ name: entry.name, path: fullPath, type: 'directory', children })
      } else {
        result.push({ name: entry.name, path: fullPath, type: 'file', language: getLanguage(fullPath) })
      }
    }
  } catch {
    // permission denied
  }

  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return result
}

async function openFolder(dirPath: string): Promise<void> {
  currentDir = dirPath
  const tree = await readDirRecursive(dirPath)
  const rootName = path.basename(dirPath)
  mainWin?.webContents.send('directory:opened', { rootName, rootPath: dirPath, tree })
  if (mainWin) startWatching(dirPath, mainWin)
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWin?.webContents.send('file:new')
        },
        { type: 'separator' },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (!mainWin) return
            const result = await dialog.showOpenDialog(mainWin, {
              properties: ['openFile'],
              filters: [{ name: 'All Files', extensions: ['*'] }]
            })
            if (!result.canceled && result.filePaths[0]) {
              const filePath = result.filePaths[0]
              const content = fs.readFileSync(filePath, 'utf-8')
              mainWin.webContents.send('file:opened', {
                path: filePath, name: path.basename(filePath),
                content, language: getLanguage(filePath)
              })
            }
          }
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+K CmdOrCtrl+O',
          click: async () => {
            if (!mainWin) return
            const result = await dialog.showOpenDialog(mainWin, { properties: ['openDirectory'] })
            if (!result.canceled && result.filePaths[0]) openFolder(result.filePaths[0])
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWin?.webContents.send('file:requestSave')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWin?.webContents.send('file:requestSave')
        },
        { type: 'separator' },
        {
          label: 'Close Editor',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWin?.webContents.send('file:close')
        },
        {
          label: 'Close Folder',
          click: () => mainWin?.webContents.send('folder:close')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWin?.webContents.send('editor:find')
        },
        {
          label: 'Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWin?.webContents.send('editor:replace')
        }
      ]
    },
    {
      label: 'Selection',
      submenu: [
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Add Cursor Above',
          accelerator: 'Alt+CmdOrCtrl+Up',
          click: () => mainWin?.webContents.send('editor:addCursorUp')
        },
        {
          label: 'Add Cursor Below',
          accelerator: 'Alt+CmdOrCtrl+Down',
          click: () => mainWin?.webContents.send('editor:addCursorDown')
        },
        { type: 'separator' },
        {
          label: 'Copy Line Up',
          accelerator: 'Shift+Alt+Up',
          click: () => mainWin?.webContents.send('editor:copyLineUp')
        },
        {
          label: 'Copy Line Down',
          accelerator: 'Shift+Alt+Down',
          click: () => mainWin?.webContents.send('editor:copyLineDown')
        },
        {
          label: 'Move Line Up',
          accelerator: 'Alt+Up',
          click: () => mainWin?.webContents.send('editor:moveLineUp')
        },
        {
          label: 'Move Line Down',
          accelerator: 'Alt+Down',
          click: () => mainWin?.webContents.send('editor:moveLineDown')
        },
        { type: 'separator' },
        {
          label: 'Duplicate Selection',
          accelerator: 'Shift+Alt+Down',
          click: () => mainWin?.webContents.send('editor:duplicateSelection')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Command Palette...',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWin?.webContents.send('view:commandPalette')
        },
        {
          label: 'Open View...',
          click: () => mainWin?.webContents.send('view:openView')
        },
        { type: 'separator' },
        {
          label: 'Explorer',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWin?.webContents.send('view:explorer')
        },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWin?.webContents.send('view:search')
        },
        {
          label: 'Terminal',
          accelerator: 'CmdOrCtrl+`',
          click: () => mainWin?.webContents.send('view:terminal')
        },
        { type: 'separator' },
        {
          label: 'Appearance',
          submenu: [
            {
              label: 'Zoom In',
              accelerator: 'CmdOrCtrl+=',
              click: () => mainWin?.webContents.send('view:zoomIn')
            },
            {
              label: 'Zoom Out',
              accelerator: 'CmdOrCtrl+-',
              click: () => mainWin?.webContents.send('view:zoomOut')
            },
            {
              label: 'Reset Zoom',
              accelerator: 'CmdOrCtrl+0',
              click: () => mainWin?.webContents.send('view:zoomReset')
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Toggle Menu Bar',
          accelerator: 'Alt',
          role: 'toggleMenuBar'
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' },
        { role: 'reload' },
        { role: 'forceReload' }
      ]
    },
    {
      label: 'Go',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => mainWin?.webContents.send('editor:goBack')
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => mainWin?.webContents.send('editor:goForward')
        },
        { type: 'separator' },
        {
          label: 'Go to Line...',
          accelerator: 'CmdOrCtrl+G',
          click: () => mainWin?.webContents.send('editor:goToLine')
        },
        {
          label: 'Go to Definition',
          accelerator: 'F12',
          click: () => mainWin?.webContents.send('editor:goToDefinition')
        },
        {
          label: 'Peek Definition',
          accelerator: 'Alt+F12',
          click: () => mainWin?.webContents.send('editor:peekDefinition')
        },
        { type: 'separator' },
        {
          label: 'Go to File...',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWin?.webContents.send('view:quickOpen')
        },
        {
          label: 'Go to Symbol...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWin?.webContents.send('editor:goToSymbol')
        }
      ]
    },
    {
      label: 'Terminal',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+Shift+`',
          click: () => mainWin?.webContents.send('terminal:new')
        },
        {
          label: 'Toggle Terminal',
          accelerator: 'CmdOrCtrl+`',
          click: () => mainWin?.webContents.send('view:terminal')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Welcome',
          click: () => mainWin?.webContents.send('help:welcome')
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: () => require('electron').shell.openExternal('https://github.com/nicepkg/kc-vcode')
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          role: 'toggleDevTools'
        },
        { type: 'separator' },
        {
          label: 'About kc-vcode',
          click: () => {
            if (mainWin) {
              dialog.showMessageBox(mainWin, {
                type: 'info',
                title: 'About kc-vcode',
                message: 'kc-vcode v1.0.0',
                detail: 'A lightweight VSCode-like desktop code editor.\nBuilt with Electron + React + Monaco Editor.'
              })
            }
          }
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  mainWin = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    show: false,
    icon: path.join(__dirname, '../../resources/icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true
    }
  })

  mainWin.on('ready-to-show', () => mainWin?.show())
  mainWin.on('closed', () => {
    destroyPty()
    if (currentDir) stopWatching(currentDir)
    mainWin = null
  })

  if (process.env.ELECTRON_RENDERER_URL) mainWin.loadURL(process.env.ELECTRON_RENDERER_URL)
  else mainWin.loadFile(path.join(__dirname, '../renderer/index.html'))
}

function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    if (!mainWin) return null
    const result = await dialog.showOpenDialog(mainWin, { properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths[0]) return null
    const dirPath = result.filePaths[0]
    const tree = await readDirRecursive(dirPath)
    if (currentDir) stopWatching(currentDir)
    currentDir = dirPath
    startWatching(dirPath, mainWin)
    return { rootName: path.basename(dirPath), rootPath: dirPath, tree }
  })

  ipcMain.handle('dialog:openFile', async () => {
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

  ipcMain.handle('file:open', async (_, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { content, language: getLanguage(filePath) }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:save', async (_, data: { path: string; content: string }) => {
    try {
      fs.writeFileSync(data.path, data.content, 'utf-8')
      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:readDir', async (_, dirPath: string) => {
    try {
      if (currentDir && dirPath !== currentDir) {
        stopWatching(currentDir)
        currentDir = dirPath
        if (mainWin) startWatching(dirPath, mainWin)
      }
      return { tree: await readDirRecursive(dirPath) }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:refreshDir', async (_, dirPath: string) => {
    try {
      return { tree: await readDirRecursive(dirPath) }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('window:setTitle', (_, title: string) => mainWin?.setTitle(title))

  // terminal
  ipcMain.handle('terminal:create', (_, opts?: { cwd?: string }) => {
    return createPty(opts?.cwd || currentDir || process.env.USERPROFILE || process.cwd(), (data) => {
      mainWin?.webContents.send('terminal:data', data)
    })
  })

  ipcMain.handle('terminal:input', (_, data: string) => writeToPty(data))
  ipcMain.handle('terminal:resize', (_, cols: number, rows: number) => resizePty(cols, rows))

  // settings
  const settingsDir = path.join(os.homedir(), 'kc-vcode')
  const settingsFile = path.join(settingsDir, 'settings.json')

  ipcMain.handle('settings:load', () => {
    try {
      if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
      if (!fs.existsSync(settingsFile)) return null
      return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
    } catch {
      return null
    }
  })

  ipcMain.handle('settings:save', (_, data: Record<string, unknown>) => {
    try {
      if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true })
      fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2), 'utf-8')
      return true
    } catch {
      return false
    }
  })

  // file/folder creation
  ipcMain.handle('file:create', (_, data: { dirPath: string; name: string }) => {
    try {
      const fp = path.join(data.dirPath, data.name)
      if (fs.existsSync(fp)) return { error: 'File already exists' }
      fs.writeFileSync(fp, '', 'utf-8')
      return { success: true, path: fp, name: data.name }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('folder:create', (_, data: { dirPath: string; name: string }) => {
    try {
      const fp = path.join(data.dirPath, data.name)
      if (fs.existsSync(fp)) return { error: 'Folder already exists' }
      fs.mkdirSync(fp, { recursive: true })
      return { success: true, path: fp, name: data.name }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:delete', (_, filePath: string) => {
    try {
      fs.unlinkSync(filePath)
      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:rename', (_, data: { filePath: string; newName: string }) => {
    try {
      const dir = path.dirname(data.filePath)
      const newPath = path.join(dir, data.newName)
      if (fs.existsSync(newPath)) return { error: 'Target already exists' }
      fs.renameSync(data.filePath, newPath)
      return { success: true, path: newPath }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:copyPath', (_, filePath: string) => {
    clipboard.writeText(filePath)
    return { success: true }
  })

  ipcMain.handle('file:copyRelativePath', (_, data: { filePath: string; cwd: string }) => {
    const rel = path.relative(data.cwd, data.filePath)
    clipboard.writeText(rel)
    return { success: true }
  })

  ipcMain.handle('file:revealInExplorer', (_, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // git
  ipcMain.handle('git:status', (_, cwd: string) => git.getStatus(cwd))
  ipcMain.handle('git:diff', (_, cwd: string, filePath?: string) => git.getDiff(cwd, filePath))
  ipcMain.handle('git:log', (_, cwd: string, count?: number) => git.getLog(cwd, count))
  ipcMain.handle('git:stage', (_, cwd: string, filePath: string) => git.stageFile(cwd, filePath))
  ipcMain.handle('git:unstage', (_, cwd: string, filePath: string) => git.unstageFile(cwd, filePath))
  ipcMain.handle('git:commit', (_, cwd: string, message: string) => git.commit(cwd, message))
  ipcMain.handle('git:discard', (_, cwd: string, filePath: string) => git.discardFile(cwd, filePath))
  ipcMain.handle('git:branches', (_, cwd: string) => git.getBranches(cwd))
  ipcMain.handle('git:push', (_, cwd: string) => git.push(cwd))
  ipcMain.handle('git:pull', (_, cwd: string) => git.pull(cwd))
  ipcMain.handle('git:stash', (_, cwd: string) => git.stash(cwd))
  ipcMain.handle('git:stashPop', (_, cwd: string) => git.stashPop(cwd))
  ipcMain.handle('git:checkout', (_, cwd: string, branch: string) => git.checkout(cwd, branch))
  ipcMain.handle('git:createBranch', (_, cwd: string, name: string) => git.createBranch(cwd, name))
  ipcMain.handle('git:diffStat', (_, cwd: string) => git.getDiffStat(cwd))
  ipcMain.handle('git:blame', (_, cwd: string, filePath: string) => git.getBlame(cwd, filePath))
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
