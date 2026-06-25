import { registerFileIpc } from './file'
import { registerDialogIpc } from './dialog'
import { registerSettingsIpc } from './settings'
import { registerGitIpc } from './git'
import { registerTerminalIpc } from './terminal'
import { registerLspIpc } from './lsp'
import { registerDebugIpc } from './debug'
import { registerShellIpc } from './shell'

export function registerAllIpc(): void {
  registerFileIpc()
  registerDialogIpc()
  registerSettingsIpc()
  registerGitIpc()
  registerTerminalIpc()
  registerLspIpc()
  registerDebugIpc()
  registerShellIpc()
}