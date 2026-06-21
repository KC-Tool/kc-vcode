import fs from 'node:fs'
import path from 'node:path'
import { FileNode } from '../preload/index'

export interface CodeContext {
  currentFile?: { path: string; content: string; language: string; cursorLine: number }
  selectedText?: string
  openFiles?: { path: string; name: string }[]
  treeSummary?: string
}

const MAX_CONTEXT_LENGTH = 8000

export function buildContextForChat(ctx: CodeContext): string {
  const parts: string[] = []

  if (ctx.currentFile) {
    const { path: filePath, content, language, cursorLine } = ctx.currentFile
    const lines = content.split('\n')
    const start = Math.max(0, cursorLine - 20)
    const end = Math.min(lines.length, cursorLine + 20)
    const surroundingCode = lines.slice(start, end).join('\n')

    parts.push(`Current file: ${path.basename(filePath)} (${language})`)
    parts.push(`Cursor at line ${cursorLine}`)
    parts.push(`\`\`\`${language}\n${surroundingCode}\n\`\`\``)
  }

  if (ctx.selectedText) {
    parts.push(`\nSelected text:\n\`\`\`\n${ctx.selectedText}\n\`\`\``)
  }

  if (ctx.openFiles?.length) {
    const fileNames = ctx.openFiles.map(f => f.name).join(', ')
    parts.push(`\nOpen files: ${fileNames}`)
  }

  if (ctx.treeSummary) {
    parts.push(`\nProject structure:\n${ctx.treeSummary}`)
  }

  const result = parts.join('\n')
  return result.length > MAX_CONTEXT_LENGTH ? result.slice(0, MAX_CONTEXT_LENGTH) + '\n... (truncated)' : result
}

export function buildContextForCompletion(
  filePath: string,
  content: string,
  language: string,
  cursorLine: number,
  cursorColumn: number
): string {
  const lines = content.split('\n')
  const start = Math.max(0, cursorLine - 30)
  const end = Math.min(lines.length, cursorLine + 10)

  const before = lines.slice(start, cursorLine).join('\n')
  const after = lines.slice(cursorLine, end).join('\n')

  return `File: ${path.basename(filePath)} (${language})\nCursor at line ${cursorLine}, column ${cursorColumn}\n\n${before}\n${after}`
}

export function summarizeTree(nodes: FileNode[], maxDepth = 2, depth = 0): string {
  if (depth > maxDepth) return ''
  const lines: string[] = []
  for (const node of nodes.slice(0, 30)) {
    const indent = '  '.repeat(depth)
    if (node.type === 'directory') {
      lines.push(`${indent}${node.name}/`)
      if (node.children) {
        lines.push(summarizeTree(node.children, maxDepth, depth + 1))
      }
    } else {
      lines.push(`${indent}${node.name}`)
    }
  }
  return lines.filter(Boolean).join('\n')
}