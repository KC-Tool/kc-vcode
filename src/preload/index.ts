import { contextBridge, ipcRenderer } from 'electron'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  language?: string
}

export interface GitUser {
  name: string
  email: string
}

export interface GitFileChange {
  path: string
  oldPath?: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflicted' | 'type-changed'
  staged: boolean
}

export interface GitStatus {
  initialized: boolean
  branch: string
  upstream?: string
  ahead: number
  behind: number
  staged: GitFileChange[]
  unstaged: GitFileChange[]
  untracked: GitFileChange[]
  conflicts: GitFileChange[]
  user?: GitUser
}

export interface GitLogEntry {
  hash: string
  shortHash: string
  message: string
  body: string
  author: string
  authorEmail: string
  date: string
  parents: string[]
  refs: string[]
}

export interface DiffLine {
  type: 'add' | 'del' | 'context'
  content: string
  oldLine?: number
  newLine?: number
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface FileDiff {
  file: string
  oldPath?: string
  isBinary: boolean
  hunks: DiffHunk[]
}

export interface GitRemote {
  name: string
  fetchUrl: string
  pushUrl: string
}

export interface GitBranch {
  name: string
  current: boolean
  remote?: string
  isHead: boolean
}

export interface GitStash {
  index: number
  ref: string
  message: string
  branch?: string
}

export interface GitBlameLine {
  line: number
  hash: string
  shortHash: string
  author: string
  date: string
  content: string
}

export interface CommitResult {
  hash: string
  shortHash: string
  branch: string
  summary: string
}

export interface ElectronAPI {
  openDirectory: () => Promise<{
    rootName: string
    rootPath: string
    tree: FileNode[]
  } | null>
  openFilePicker: () => Promise<{
    path: string
    name: string
    content: string
    language: string
  } | null>
  openFile: (filePath: string) => Promise<{ content: string; language: string } | { error: string }>
  saveFile: (data: { path: string; content: string }) => Promise<{ success: boolean } | { error: string }>
  readDir: (dirPath: string) => Promise<{ tree: FileNode[] } | { error: string }>
  setTitle: (title: string) => void
  onDirectoryOpened: (callback: (data: { rootName: string; rootPath: string; tree: FileNode[] }) => void) => void
  onDirectoryRefreshed: (callback: () => void) => void
  onFileOpenedByMenu: (callback: (data: { path: string; name: string; content: string; language: string }) => void) => void
  onRequestSave: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
  createTerminal: (cwd?: string) => Promise<{ pid: number }>
  terminalInput: (data: string) => void
  terminalResize: (cols: number, rows: number) => void
  onTerminalData: (cb: (data: string) => void) => void
  refreshDir: (dirPath: string) => Promise<{ tree: FileNode[] } | { error: string }>
  loadSettings: () => Promise<Record<string, unknown> | null>
  saveSettings: (data: Record<string, unknown>) => Promise<boolean>
  createFile: (dirPath: string, name: string) => Promise<{ success?: boolean; path?: string; error?: string }>
  createFolder: (dirPath: string, name: string) => Promise<{ success?: boolean; path?: string; error?: string }>
  revealInFolder: (filePath: string) => Promise<void>
  openExternal: (url: string) => Promise<void>
  deleteFile: (filePath: string) => Promise<{ success?: boolean; error?: string }>
  renameFile: (oldPath: string, newName: string) => Promise<{ success?: boolean; newPath?: string; error?: string }>
  moveFile: (sourcePath: string, targetPath: string) => Promise<{ success?: boolean; error?: string }>
  clipboardWriteText: (text: string) => Promise<void>
  gitState: (cwd: string) => Promise<GitStatus>
  gitLog: (cwd: string, count?: number, branch?: string) => Promise<GitLogEntry[]>
  gitCommit: (cwd: string, message: string, opts?: { amend?: boolean; signOff?: boolean; noVerify?: boolean; allowEmpty?: boolean }) => Promise<CommitResult>
  gitDiffWorking: (cwd: string, file: string) => Promise<FileDiff>
  gitDiffStaged: (cwd: string, file: string) => Promise<FileDiff>
  gitDiffWorkingAll: (cwd: string) => Promise<FileDiff[]>
  gitDiffStagedAll: (cwd: string) => Promise<FileDiff[]>
  gitDiffCommit: (cwd: string, hash: string) => Promise<FileDiff[]>
  gitFileAtCommit: (cwd: string, hash: string, file: string) => Promise<string | null>
  gitStage: (cwd: string, paths: string[]) => Promise<void>
  gitStageAll: (cwd: string) => Promise<void>
  gitUnstage: (cwd: string, paths: string[]) => Promise<void>
  gitUnstageAll: (cwd: string) => Promise<void>
  gitDiscard: (cwd: string, paths: string[]) => Promise<void>
  gitDiscardUntracked: (cwd: string, paths: string[]) => Promise<void>
  gitBranches: (cwd: string) => Promise<{ current: string; local: GitBranch[]; remote: GitBranch[] }>
  gitCheckout: (cwd: string, target: string, create?: boolean) => Promise<string>
  gitCreateBranch: (cwd: string, name: string, startPoint?: string) => Promise<string>
  gitDeleteBranch: (cwd: string, name: string, force?: boolean) => Promise<string>
  gitRemotes: (cwd: string) => Promise<GitRemote[]>
  gitAddRemote: (cwd: string, name: string, url: string) => Promise<void>
  gitRemoveRemote: (cwd: string, name: string) => Promise<void>
  gitPush: (cwd: string, opts?: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean; forceWithLease?: boolean; tags?: boolean }) => Promise<string>
  gitPull: (cwd: string, opts?: { remote?: string; branch?: string; rebase?: boolean; ffOnly?: boolean }) => Promise<string>
  gitFetch: (cwd: string, opts?: { remote?: string; prune?: boolean; all?: boolean }) => Promise<string>
  gitStashList: (cwd: string) => Promise<GitStash[]>
  gitStashSave: (cwd: string, message?: string, includeUntracked?: boolean) => Promise<string>
  gitStashPop: (cwd: string, index?: number) => Promise<string>
  gitStashApply: (cwd: string, index?: number) => Promise<string>
  gitStashDrop: (cwd: string, index?: number) => Promise<string>
  gitBlame: (cwd: string, file: string) => Promise<GitBlameLine[]>
  gitUser: (cwd: string) => Promise<GitUser | undefined>
  gitSetUser: (cwd: string, name: string, email: string) => Promise<void>
  gitInit: (cwd: string) => Promise<void>
  gitIsRepo: (cwd: string) => Promise<boolean>
  gitRaw: (cwd: string, args: string[]) => Promise<string>
  gitFindRoot: (filePath: string) => Promise<string | null>
  onViewSourceControl: (cb: () => void) => void
  onGitMenuCommit: (cb: () => void) => void
  onGitMenuPush: (cb: () => void) => void
  onGitMenuPull: (cb: () => void) => void
  onGitMenuFetch: (cb: () => void) => void
  onGitMenuInit: (cb: () => void) => void
  lspHover: (params: { filePath: string; content: string; line: number; column: number }) => Promise<any>
  lspDefinition: (params: { filePath: string; content: string; line: number; column: number }) => Promise<any>
  lspReferences: (params: { filePath: string; content: string; line: number; column: number }) => Promise<any>
  lspCodeActions: (params: { filePath: string; content: string; line: number; column: number }) => Promise<any>
  lspDiagnostics: (params: { filePath: string; content: string }) => Promise<any>
  debugStart: (params: { filePath: string; cwd: string }) => Promise<any>
  debugStop: () => Promise<any>
  debugContinue: () => Promise<any>
  debugPause: () => Promise<any>
  debugNext: () => Promise<any>
  debugStepIn: () => Promise<any>
  debugStepOut: () => Promise<any>
  debugSetBreakpoints: (params: { file: string; lines: number[] }) => Promise<any>
  debugStackTrace: () => Promise<any>
  debugScopes: (params: { frameId: number }) => Promise<any>
  debugVariables: (params: { variablesReference: number }) => Promise<any>
  debugEvaluate: (params: { expression: string; frameId?: number }) => Promise<any>
  onDebugStopped: (cb: (body: any) => void) => void
  onDebugTerminated: (cb: () => void) => void
  onDebugExited: (cb: (body: any) => void) => void
  removeAllDebugListeners: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

const electronAPI = {
  openDirectory: (): Promise<{
    rootName: string
    rootPath: string
    tree: FileNode[]
  } | null> => ipcRenderer.invoke('dialog:openDirectory'),

  openFilePicker: (): Promise<{
    path: string; name: string; content: string; language: string
  } | null> => ipcRenderer.invoke('dialog:openFile'),

  openFile: (filePath: string): Promise<{ content: string; language: string } | { error: string }> =>
    ipcRenderer.invoke('file:open', filePath),

  saveFile: (data: { path: string; content: string }): Promise<{ success: boolean } | { error: string }> =>
    ipcRenderer.invoke('file:save', data),

  readDir: (dirPath: string): Promise<{ tree: FileNode[] } | { error: string }> =>
    ipcRenderer.invoke('file:readDir', dirPath),

  setTitle: (title: string): void => {
    ipcRenderer.invoke('window:setTitle', title)
  },

  onDirectoryOpened: (callback: (data: { rootName: string; rootPath: string; tree: FileNode[] }) => void): void => {
    ipcRenderer.on('directory:opened', (_, data) => callback(data))
  },

  onDirectoryRefreshed: (callback: () => void): void => {
    ipcRenderer.on('directory:refreshed', () => callback())
  },

  onFileOpenedByMenu: (callback: (data: { path: string; name: string; content: string; language: string }) => void): void => {
    ipcRenderer.on('file:opened', (_, data) => callback(data))
  },

  onRequestSave: (callback: () => void): void => {
    ipcRenderer.on('file:requestSave', () => callback())
  },

  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel)
  },

  createTerminal: (cwd?: string): Promise<{ pid: number }> =>
    ipcRenderer.invoke('terminal:create', { cwd }),

  terminalInput: (data: string): void => {
    ipcRenderer.invoke('terminal:input', data)
  },

  terminalResize: (cols: number, rows: number): void => {
    ipcRenderer.invoke('terminal:resize', cols, rows)
  },

  onTerminalData: (cb: (data: string) => void): void => {
    ipcRenderer.on('terminal:data', (_, data) => cb(data))
  },

  refreshDir: (dirPath: string): Promise<{ tree: FileNode[] } | { error: string }> =>
    ipcRenderer.invoke('file:refreshDir', dirPath),

  loadSettings: (): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('settings:load'),

  saveSettings: (data: Record<string, unknown>): Promise<boolean> =>
    ipcRenderer.invoke('settings:save', data),

  createFile: (dirPath: string, name: string): Promise<{ success?: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('file:create', { dirPath, name }),

  createFolder: (dirPath: string, name: string): Promise<{ success?: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('folder:create', { dirPath, name }),

  revealInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('shell:revealInFolder', filePath),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:openExternal', url),

  deleteFile: (filePath: string): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('file:delete', filePath),

  renameFile: (oldPath: string, newName: string): Promise<{ success?: boolean; newPath?: string; error?: string }> =>
    ipcRenderer.invoke('file:rename', { oldPath, newName }),

  moveFile: (sourcePath: string, targetPath: string): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('file:move', { sourcePath, targetPath }),

  clipboardWriteText: (text: string): Promise<void> =>
    ipcRenderer.invoke('clipboard:writeText', text),

  gitState: (cwd: string) => ipcRenderer.invoke('git:state', cwd),
  gitLog: (cwd: string, count?: number, branch?: string) => ipcRenderer.invoke('git:log', cwd, count, branch),
  gitCommit: (cwd: string, message: string, opts?: { amend?: boolean; signOff?: boolean; noVerify?: boolean; allowEmpty?: boolean }) =>
    ipcRenderer.invoke('git:commit', cwd, message, opts),
  gitDiffWorking: (cwd: string, file: string) => ipcRenderer.invoke('git:diffWorking', cwd, file),
  gitDiffStaged: (cwd: string, file: string) => ipcRenderer.invoke('git:diffStaged', cwd, file),
  gitDiffWorkingAll: (cwd: string) => ipcRenderer.invoke('git:diffWorkingAll', cwd),
  gitDiffStagedAll: (cwd: string) => ipcRenderer.invoke('git:diffStagedAll', cwd),
  gitDiffCommit: (cwd: string, hash: string) => ipcRenderer.invoke('git:diffCommit', cwd, hash),
  gitFileAtCommit: (cwd: string, hash: string, file: string) => ipcRenderer.invoke('git:fileAtCommit', cwd, hash, file),
  gitStage: (cwd: string, paths: string[]) => ipcRenderer.invoke('git:stage', cwd, paths),
  gitStageAll: (cwd: string) => ipcRenderer.invoke('git:stageAll', cwd),
  gitUnstage: (cwd: string, paths: string[]) => ipcRenderer.invoke('git:unstage', cwd, paths),
  gitUnstageAll: (cwd: string) => ipcRenderer.invoke('git:unstageAll', cwd),
  gitDiscard: (cwd: string, paths: string[]) => ipcRenderer.invoke('git:discard', cwd, paths),
  gitDiscardUntracked: (cwd: string, paths: string[]) => ipcRenderer.invoke('git:discardUntracked', cwd, paths),
  gitBranches: (cwd: string) => ipcRenderer.invoke('git:branches', cwd),
  gitCheckout: (cwd: string, target: string, create?: boolean) => ipcRenderer.invoke('git:checkout', cwd, target, create),
  gitCreateBranch: (cwd: string, name: string, startPoint?: string) => ipcRenderer.invoke('git:createBranch', cwd, name, startPoint),
  gitDeleteBranch: (cwd: string, name: string, force?: boolean) => ipcRenderer.invoke('git:deleteBranch', cwd, name, force),
  gitRemotes: (cwd: string) => ipcRenderer.invoke('git:remotes', cwd),
  gitAddRemote: (cwd: string, name: string, url: string) => ipcRenderer.invoke('git:addRemote', cwd, name, url),
  gitRemoveRemote: (cwd: string, name: string) => ipcRenderer.invoke('git:removeRemote', cwd, name),
  gitPush: (cwd: string, opts?: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean; forceWithLease?: boolean; tags?: boolean }) =>
    ipcRenderer.invoke('git:push', cwd, opts),
  gitPull: (cwd: string, opts?: { remote?: string; branch?: string; rebase?: boolean; ffOnly?: boolean }) =>
    ipcRenderer.invoke('git:pull', cwd, opts),
  gitFetch: (cwd: string, opts?: { remote?: string; prune?: boolean; all?: boolean }) =>
    ipcRenderer.invoke('git:fetch', cwd, opts),
  gitStashList: (cwd: string) => ipcRenderer.invoke('git:stashList', cwd),
  gitStashSave: (cwd: string, message?: string, includeUntracked?: boolean) => ipcRenderer.invoke('git:stashSave', cwd, message, includeUntracked),
  gitStashPop: (cwd: string, index?: number) => ipcRenderer.invoke('git:stashPop', cwd, index),
  gitStashApply: (cwd: string, index?: number) => ipcRenderer.invoke('git:stashApply', cwd, index),
  gitStashDrop: (cwd: string, index?: number) => ipcRenderer.invoke('git:stashDrop', cwd, index),
  gitBlame: (cwd: string, file: string) => ipcRenderer.invoke('git:blame', cwd, file),
  gitUser: (cwd: string) => ipcRenderer.invoke('git:user', cwd),
  gitSetUser: (cwd: string, name: string, email: string) => ipcRenderer.invoke('git:setUser', cwd, name, email),
  gitInit: (cwd: string) => ipcRenderer.invoke('git:init', cwd),
  gitIsRepo: (cwd: string) => ipcRenderer.invoke('git:isRepo', cwd),
  gitRaw: (cwd: string, args: string[]) => ipcRenderer.invoke('git:raw', cwd, args),
  gitFindRoot: (filePath: string) => ipcRenderer.invoke('git:findRoot', filePath),

  onViewSourceControl: (cb: () => void) => { ipcRenderer.on('view:sourceControl', () => cb()) },
  onGitMenuCommit: (cb: () => void) => { ipcRenderer.on('git:menu:commit', () => cb()) },
  onGitMenuPush: (cb: () => void) => { ipcRenderer.on('git:menu:push', () => cb()) },
  onGitMenuPull: (cb: () => void) => { ipcRenderer.on('git:menu:pull', () => cb()) },
  onGitMenuFetch: (cb: () => void) => { ipcRenderer.on('git:menu:fetch', () => cb()) },
  onGitMenuInit: (cb: () => void) => { ipcRenderer.on('git:menu:init', () => cb()) },

  lspHover: (params: { filePath: string; content: string; line: number; column: number }) =>
    ipcRenderer.invoke('lsp:hover', params),
  lspDefinition: (params: { filePath: string; content: string; line: number; column: number }) =>
    ipcRenderer.invoke('lsp:definition', params),
  lspReferences: (params: { filePath: string; content: string; line: number; column: number }) =>
    ipcRenderer.invoke('lsp:references', params),
  lspCodeActions: (params: { filePath: string; content: string; line: number; column: number }) =>
    ipcRenderer.invoke('lsp:codeActions', params),
  lspDiagnostics: (params: { filePath: string; content: string }) =>
    ipcRenderer.invoke('lsp:diagnostics', params),

  debugStart: (params: { filePath: string; cwd: string }) =>
    ipcRenderer.invoke('debug:start', params),
  debugStop: () =>
    ipcRenderer.invoke('debug:stop'),
  debugContinue: () =>
    ipcRenderer.invoke('debug:continue'),
  debugPause: () =>
    ipcRenderer.invoke('debug:pause'),
  debugNext: () =>
    ipcRenderer.invoke('debug:next'),
  debugStepIn: () =>
    ipcRenderer.invoke('debug:stepIn'),
  debugStepOut: () =>
    ipcRenderer.invoke('debug:stepOut'),
  debugSetBreakpoints: (params: { file: string; lines: number[] }) =>
    ipcRenderer.invoke('debug:setBreakpoints', params),
  debugStackTrace: () =>
    ipcRenderer.invoke('debug:stackTrace'),
  debugScopes: (params: { frameId: number }) =>
    ipcRenderer.invoke('debug:scopes', params),
  debugVariables: (params: { variablesReference: number }) =>
    ipcRenderer.invoke('debug:variables', params),
  debugEvaluate: (params: { expression: string; frameId?: number }) =>
    ipcRenderer.invoke('debug:evaluate', params),
  onDebugStopped: (cb: (body: any) => void) => {
    ipcRenderer.on('debug:stopped', (_, body) => cb(body))
  },
  onDebugTerminated: (cb: () => void) => {
    ipcRenderer.on('debug:terminated', () => cb())
  },
  onDebugExited: (cb: (body: any) => void) => {
    ipcRenderer.on('debug:exited', (_, body) => cb(body))
  },
  removeAllDebugListeners: () => {
    ipcRenderer.removeAllListeners('debug:stopped')
    ipcRenderer.removeAllListeners('debug:terminated')
    ipcRenderer.removeAllListeners('debug:exited')
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)