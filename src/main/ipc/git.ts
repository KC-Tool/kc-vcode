import { ipcMain } from 'electron'
import * as git from '../git'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function registerGitIpc(): void {
  ipcMain.handle('git:state', (_, cwd: string) => git.getStatus(cwd))

  ipcMain.handle('git:log', (_, cwd: string, count?: number, branch?: string) =>
    git.getCommitLog(cwd, count, branch))

  ipcMain.handle('git:commit', (_, cwd: string, message: string, opts?: { amend?: boolean; signOff?: boolean; noVerify?: boolean; allowEmpty?: boolean }) =>
    git.commit(cwd, message, opts || {}))

  ipcMain.handle('git:diffWorking', (_, cwd: string, file: string) =>
    git.getWorkingDiff(cwd, file))

  ipcMain.handle('git:diffStaged', (_, cwd: string, file: string) =>
    git.getStagedDiff(cwd, file))

  ipcMain.handle('git:diffWorkingAll', (_, cwd: string) =>
    git.getAllWorkingDiff(cwd))

  ipcMain.handle('git:diffStagedAll', (_, cwd: string) =>
    git.getAllStagedDiff(cwd))

  ipcMain.handle('git:diffCommit', (_, cwd: string, hash: string) =>
    git.getCommitDiff(cwd, hash))

  ipcMain.handle('git:fileAtCommit', (_, cwd: string, hash: string, file: string) =>
    git.getFileAtCommit(cwd, hash, file))

  ipcMain.handle('git:stage', (_, cwd: string, paths: string[]) => git.stage(cwd, paths))
  ipcMain.handle('git:stageAll', (_, cwd: string) => git.stageAll(cwd))
  ipcMain.handle('git:unstage', (_, cwd: string, paths: string[]) => git.unstage(cwd, paths))
  ipcMain.handle('git:unstageAll', (_, cwd: string) => git.unstageAll(cwd))
  ipcMain.handle('git:discard', (_, cwd: string, paths: string[]) => git.discard(cwd, paths))
  ipcMain.handle('git:discardUntracked', (_, cwd: string, paths: string[]) => git.discardUntracked(cwd, paths))

  ipcMain.handle('git:branches', (_, cwd: string) => git.getBranches(cwd))
  ipcMain.handle('git:checkout', (_, cwd: string, target: string, create?: boolean) =>
    git.checkout(cwd, target, { create }))
  ipcMain.handle('git:createBranch', (_, cwd: string, name: string, startPoint?: string) =>
    git.createBranch(cwd, name, startPoint))
  ipcMain.handle('git:deleteBranch', (_, cwd: string, name: string, force?: boolean) =>
    git.deleteBranch(cwd, name, force))

  ipcMain.handle('git:remotes', (_, cwd: string) => git.getRemotes(cwd))
  ipcMain.handle('git:addRemote', (_, cwd: string, name: string, url: string) =>
    git.addRemote(cwd, name, url))
  ipcMain.handle('git:removeRemote', (_, cwd: string, name: string) =>
    git.removeRemote(cwd, name))

  ipcMain.handle('git:push', (_, cwd: string, opts?: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean; forceWithLease?: boolean; tags?: boolean }) =>
    git.push(cwd, opts || {}))
  ipcMain.handle('git:pull', (_, cwd: string, opts?: { remote?: string; branch?: string; rebase?: boolean; ffOnly?: boolean }) =>
    git.pull(cwd, opts || {}))
  ipcMain.handle('git:fetch', (_, cwd: string, opts?: { remote?: string; prune?: boolean; all?: boolean }) =>
    git.fetch(cwd, opts || {}))

  ipcMain.handle('git:stashList', (_, cwd: string) => git.getStashList(cwd))
  ipcMain.handle('git:stashSave', (_, cwd: string, message?: string, includeUntracked?: boolean) =>
    git.stashSave(cwd, message, includeUntracked))
  ipcMain.handle('git:stashPop', (_, cwd: string, index?: number) => git.stashPop(cwd, index))
  ipcMain.handle('git:stashApply', (_, cwd: string, index?: number) => git.stashApply(cwd, index))
  ipcMain.handle('git:stashDrop', (_, cwd: string, index?: number) => git.stashDrop(cwd, index))

  ipcMain.handle('git:blame', (_, cwd: string, file: string) => git.blame(cwd, file))

  ipcMain.handle('git:user', (_, cwd: string) => git.getUser(cwd))
  ipcMain.handle('git:setUser', (_, cwd: string, name: string, email: string) =>
    git.setUser(cwd, name, email))

  ipcMain.handle('git:init', (_, cwd: string) => git.init(cwd))
  ipcMain.handle('git:isRepo', (_, cwd: string) => git.isRepo(cwd).catch(() => false))
  ipcMain.handle('git:raw', (_, cwd: string, args: string[]) => git.raw(cwd, args))
  ipcMain.handle('git:findRoot', (_, filePath: string) => git.findGitRoot(filePath))
}