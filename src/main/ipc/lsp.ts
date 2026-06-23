import { ipcMain } from 'electron'
import * as lsp from '../lsp'

export function registerLspIpc(): void {
  ipcMain.handle('lsp:hover', (_, params: { filePath: string; content: string; line: number; column: number }) => {
    return lsp.getHover(params.filePath, params.content, params.line, params.column)
  })

  ipcMain.handle('lsp:definition', (_, params: { filePath: string; content: string; line: number; column: number }) => {
    return lsp.getDefinition(params.filePath, params.content, params.line, params.column)
  })

  ipcMain.handle('lsp:references', (_, params: { filePath: string; content: string; line: number; column: number }) => {
    return lsp.getReferences(params.filePath, params.content, params.line, params.column)
  })

  ipcMain.handle('lsp:codeActions', (_, params: { filePath: string; content: string; line: number; column: number }) => {
    return lsp.getCodeActions(params.filePath, params.content, params.line, params.column)
  })

  ipcMain.handle('lsp:diagnostics', (_, params: { filePath: string; content: string }) => {
    return lsp.getDiagnostics(params.filePath, params.content)
  })
}