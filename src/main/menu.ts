import { Menu } from 'electron'
import { dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { openFolder, getLanguage } from './fileTree'
import { getMainWin } from './mainWindow'

export function createMenu(): void {
  const mainWin = getMainWin()

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
            if (!result.canceled && result.filePaths[0]) {
              openFolder(result.filePaths[0], mainWin)
            }
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
        { role: 'toggleMenuBar' },
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
      label: 'Git',
      submenu: [
        {
          label: 'Show Source Control',
          accelerator: 'CmdOrCtrl+Shift+G',
          click: () => mainWin?.webContents.send('view:sourceControl')
        },
        { type: 'separator' },
        {
          label: 'Commit',
          accelerator: 'CmdOrCtrl+Enter',
          click: () => mainWin?.webContents.send('git:menu:commit')
        },
        {
          label: 'Push',
          accelerator: 'CmdOrCtrl+Shift+K',
          click: () => mainWin?.webContents.send('git:menu:push')
        },
        {
          label: 'Pull',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => mainWin?.webContents.send('git:menu:pull')
        },
        {
          label: 'Fetch',
          click: () => mainWin?.webContents.send('git:menu:fetch')
        },
        { type: 'separator' },
        {
          label: 'Init Repository',
          click: () => mainWin?.webContents.send('git:menu:init')
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
              require('electron').dialog.showMessageBox(mainWin, {
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