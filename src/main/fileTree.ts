import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow } from 'electron'
import { startWatching, stopWatching } from './watcher'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  language?: string
}

export function getLanguage(filePath: string): string {
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

export function readDirRecursive(dirPath: string, depth = 0): FileNode[] {
  if (depth > 8) return []
  const result: FileNode[] = []

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const ignore = new Set(['node_modules', '.git', '.svn', 'out', 'dist', 'target'])

    for (const entry of entries) {
      if (ignore.has(entry.name)) continue
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        const children = readDirRecursive(fullPath, depth + 1)
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

let currentDir: string | null = null

export function openFolder(dirPath: string, win: BrowserWindow): void {
  currentDir = dirPath
  const tree = readDirRecursive(dirPath)
  const rootName = path.basename(dirPath)
  win.webContents.send('directory:opened', { rootName, rootPath: dirPath, tree })
  startWatching(dirPath, win)
}

export function switchDir(dirPath: string, win: BrowserWindow): void {
  if (currentDir) stopWatching(currentDir)
  currentDir = dirPath
  startWatching(dirPath, win)
}

export function getCurrentDir(): string | null {
  return currentDir
}

export function setCurrentDir(dir: string | null): void {
  currentDir = dir
}