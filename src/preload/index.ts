import { contextBridge, ipcRenderer } from 'electron'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  language?: string
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
  clipboardWriteText: (text: string) => Promise<void>
  gitStatus: (cwd: string) => Promise<any>
  gitDiff: (cwd: string, filePath?: string) => Promise<string>
  gitLog: (cwd: string, count?: number) => Promise<any[]>
  gitStage: (cwd: string, filePath: string) => Promise<void>
  gitUnstage: (cwd: string, filePath: string) => Promise<void>
  gitCommit: (cwd: string, message: string) => Promise<string>
  gitDiscard: (cwd: string, filePath: string) => Promise<void>
  gitBranches: (cwd: string) => Promise<string[]>
  gitPush: (cwd: string) => Promise<string>
  gitPull: (cwd: string) => Promise<string>
  gitStash: (cwd: string) => Promise<string>
  gitStashPop: (cwd: string) => Promise<string>
  gitCheckout: (cwd: string, branch: string) => Promise<string>
  gitCreateBranch: (cwd: string, name: string) => Promise<string>
  gitDiffStat: (cwd: string) => Promise<any[]>
  gitBlame: (cwd: string, filePath: string) => Promise<any[]>
  llmConfigure: (config: { provider: string; apiKey: string; model: string; baseUrl?: string }) => Promise<void>
  llmChat: (params: { messages: Array<{ role: string; content: string }>; context?: any }) => Promise<any>
  llmChatStream: (params: { messages: Array<{ role: string; content: string }>; context?: any }) => Promise<any>
  llmComplete: (params: { prompt: string; language?: string }) => Promise<any>
  llmEdit: (params: { instruction: string; fileContent: string; language: string; filePath: string }) => Promise<any>
  llmGetConfig: () => Promise<{ provider: string; model: string; hasApiKey: boolean } | null>
  onLlmChatChunk: (cb: (chunk: { type: string; content: string }) => void) => void
  removeAllLlmListeners: () => void
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

  // terminal
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

  clipboardWriteText: (text: string): Promise<void> =>
    ipcRenderer.invoke('clipboard:writeText', text),

  gitStatus: (cwd: string) => ipcRenderer.invoke('git:status', cwd),
  gitDiff: (cwd: string, filePath?: string) => ipcRenderer.invoke('git:diff', cwd, filePath),
  gitLog: (cwd: string, count?: number) => ipcRenderer.invoke('git:log', cwd, count),
  gitStage: (cwd: string, filePath: string) => ipcRenderer.invoke('git:stage', cwd, filePath),
  gitUnstage: (cwd: string, filePath: string) => ipcRenderer.invoke('git:unstage', cwd, filePath),
  gitCommit: (cwd: string, message: string) => ipcRenderer.invoke('git:commit', cwd, message),
  gitDiscard: (cwd: string, filePath: string) => ipcRenderer.invoke('git:discard', cwd, filePath),
  gitBranches: (cwd: string) => ipcRenderer.invoke('git:branches', cwd),
  gitPush: (cwd: string) => ipcRenderer.invoke('git:push', cwd),
  gitPull: (cwd: string) => ipcRenderer.invoke('git:pull', cwd),
  gitStash: (cwd: string) => ipcRenderer.invoke('git:stash', cwd),
  gitStashPop: (cwd: string) => ipcRenderer.invoke('git:stashPop', cwd),
  gitCheckout: (cwd: string, branch: string) => ipcRenderer.invoke('git:checkout', cwd, branch),
  gitCreateBranch: (cwd: string, name: string) => ipcRenderer.invoke('git:createBranch', cwd, name),
  gitDiffStat: (cwd: string) => ipcRenderer.invoke('git:diffStat', cwd),
  gitBlame: (cwd: string, filePath: string) => ipcRenderer.invoke('git:blame', cwd, filePath),

  // LLM
  llmConfigure: (config: { provider: string; apiKey: string; model: string; baseUrl?: string }) =>
    ipcRenderer.invoke('llm:configure', config),
  llmChat: (params: { messages: Array<{ role: string; content: string }>; context?: any }) =>
    ipcRenderer.invoke('llm:chat', params),
  llmChatStream: (params: { messages: Array<{ role: string; content: string }>; context?: any }) =>
    ipcRenderer.invoke('llm:chatStream', params),
  llmComplete: (params: { prompt: string; language?: string }) =>
    ipcRenderer.invoke('llm:complete', params),
  llmGetConfig: () =>
    ipcRenderer.invoke('llm:getConfig'),
  onLlmChatChunk: (cb: (chunk: { type: string; content: string }) => void) => {
    ipcRenderer.on('llm:chatChunk', (_, chunk) => cb(chunk))
  },
  removeAllLlmListeners: () => {
    ipcRenderer.removeAllListeners('llm:chatChunk')
  },
  llmEdit: (params: { instruction: string; fileContent: string; language: string; filePath: string }) =>
    ipcRenderer.invoke('llm:edit', params),

  // LSP
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

  // Debug
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
