import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { readDirRecursive, getCurrentDir, switchDir, getLanguage } from '../fileTree'
import { findGitRoot, stageAndCommit } from '../git'

export function registerFileIpc(): void {
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

      // 顺手签个 commit，不阻塞保存结果
      const repoRoot = findGitRoot(data.path)
      if (repoRoot) {
        try {
          await stageAndCommit(repoRoot, data.path)
        } catch (gitErr) {
          // GPG 没配 / 在 merge 状态 / 别的都别砸了保存
          console.warn('[auto-commit]', data.path, gitErr)
        }
      }

      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:readDir', async (_, dirPath: string) => {
    try {
      return { tree: readDirRecursive(dirPath) }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:refreshDir', (_, dirPath: string) => {
    try {
      return { tree: readDirRecursive(dirPath) }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

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

  ipcMain.handle('file:delete', async (_, filePath: string) => {
    try {
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true })
      } else {
        fs.unlinkSync(filePath)
      }
      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:rename', async (_, data: { oldPath: string; newName: string }) => {
    try {
      const dir = path.dirname(data.oldPath)
      const newPath = path.join(dir, data.newName)
      if (fs.existsSync(newPath)) return { error: 'A file or folder with that name already exists' }
      fs.renameSync(data.oldPath, newPath)
      return { success: true, newPath }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('file:move', async (_, data: { sourcePath: string; targetPath: string }) => {
    try {
      if (fs.existsSync(data.targetPath)) return { error: 'Target already exists' }
      fs.renameSync(data.sourcePath, data.targetPath)
      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}