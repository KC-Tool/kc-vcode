import { ipcMain } from 'electron'
import * as git from '../git'

export function registerGitIpc(): void {
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