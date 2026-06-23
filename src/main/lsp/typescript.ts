import * as ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'

interface HoverResult {
  kind: string
  text: string
}

interface DefinitionResult {
  file: string
  line: number
  column: number
}

interface ReferenceResult {
  file: string
  line: number
  column: number
  text: string
}

interface CodeAction {
  title: string
  description: string
  changes: { file: string; start: number; end: number; newText: string }[]
}

const MAX_CACHED_FILES = 200
const MAX_CACHED_SERVICES = 32

type FileEntry = { version: number; content: string }
type ServiceEntry = { service: ts.LanguageService; content: string; lastUsed: number }

const fileCache = new Map<string, FileEntry>()
const serviceCache = new Map<string, ServiceEntry>()

function touchFile(name: string, content: string, version: number): FileEntry {
  // 顺手驱逐老条目，避免依赖文件永久占内存
  if (fileCache.size >= MAX_CACHED_FILES) {
    const oldest = fileCache.keys().next().value
    if (oldest) fileCache.delete(oldest)
  }
  const entry: FileEntry = { version, content }
  fileCache.set(name, entry)
  return entry
}

function disposeService(entry: ServiceEntry | undefined): void {
  if (!entry) return
  try { entry.service.dispose() } catch { /* noop */ }
}

function getDefaultCompilerOptions(): ts.CompilerOptions {
  return {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    allowJs: true,
    checkJs: false,
    noEmit: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    declaration: true,
    declarationMap: true,
    sourceMap: true
  }
}

function evictOldestService(): void {
  if (serviceCache.size < MAX_CACHED_SERVICES) return
  let oldestKey: string | null = null
  let oldestTime = Infinity
  for (const [k, v] of serviceCache) {
    if (v.lastUsed < oldestTime) {
      oldestTime = v.lastUsed
      oldestKey = k
    }
  }
  if (oldestKey) {
    disposeService(serviceCache.get(oldestKey))
    serviceCache.delete(oldestKey)
  }
}

function getOrCreateService(fileName: string, content: string): ts.LanguageService {
  const now = Date.now()
  const existing = serviceCache.get(fileName)

  if (existing && existing.content === content) {
    existing.lastUsed = now
    return existing.service
  }

  // 内容变了：先 dispose 老的，避免旧 service 永久占内存
  disposeService(existing)
  serviceCache.delete(fileName)

  // 文件版本号自增
  const prev = fileCache.get(fileName)
  const nextVersion = (prev?.version || 0) + 1
  touchFile(fileName, content, nextVersion)

  const compilerOptions = getDefaultCompilerOptions()
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [fileName],
    getScriptVersion: (name) => String(fileCache.get(name)?.version || 0),
    getScriptSnapshot: (name) => {
      const cached = fileCache.get(name)
      if (cached) return ts.ScriptSnapshot.fromString(cached.content)
      try {
        const fileContent = fs.readFileSync(name, 'utf-8')
        touchFile(name, fileContent, 1)
        return ts.ScriptSnapshot.fromString(fileContent)
      } catch {
        return undefined
      }
    },
    getCurrentDirectory: () => path.dirname(fileName),
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
    fileExists: (name) => fileCache.has(name) || fs.existsSync(name),
    readFile: (name) => {
      const cached = fileCache.get(name)
      if (cached) return cached.content
      try { return fs.readFileSync(name, 'utf-8') } catch { return undefined }
    },
    readDirectory: ts.sys.readDirectory,
    getDirectories: ts.sys.getDirectories,
    directoryExists: ts.sys.directoryExists
  }

  evictOldestService()
  const service = ts.createLanguageService(host, ts.createDocumentRegistry())
  serviceCache.set(fileName, { service, content, lastUsed: now })
  return service
}

function getPos(content: string, line: number, column: number): number {
  return content.split('\n').slice(0, line - 1).join('\n').length + column - 1
}

function lineColFromOffset(content: string, offset: number): { line: number; column: number } {
  const lines = content.split('\n')
  let chars = 0
  for (let i = 0; i < lines.length; i++) {
    chars += lines[i].length + 1
    if (chars > offset) {
      return { line: i + 1, column: offset - (chars - lines[i].length - 1) + 1 }
    }
  }
  return { line: 1, column: 1 }
}

export function getHover(filePath: string, content: string, line: number, column: number): HoverResult | null {
  try {
    const fileName = filePath.replace(/\\/g, '/')
    const service = getOrCreateService(fileName, content)
    const pos = getPos(content, line, column)
    const quickInfo = service.getQuickInfoAtPosition(fileName, pos)
    if (!quickInfo) return null

    const displayParts = quickInfo.displayParts
    const text = displayParts ? displayParts.map(p => p.text).join('') : ''

    const kind = ts.ScriptElementKind[quickInfo.kind] || 'unknown'
    return { kind, text }
  } catch {
    return null
  }
}

export function getDefinition(filePath: string, content: string, line: number, column: number): DefinitionResult | null {
  try {
    const fileName = filePath.replace(/\\/g, '/')
    const service = getOrCreateService(fileName, content)
    const pos = getPos(content, line, column)
    const defs = service.getDefinitionAtPosition(fileName, pos)
    if (!defs || defs.length === 0) return null

    const def = defs[0]
    const defContent = fileCache.get(def.fileName)?.content
    if (!defContent) return null

    const { line: defLine, column: defCol } = lineColFromOffset(defContent, def.textSpan.start)
    return { file: def.fileName, line: defLine, column: defCol }
  } catch {
    return null
  }
}

export function getReferences(filePath: string, content: string, line: number, column: number): ReferenceResult[] {
  try {
    const fileName = filePath.replace(/\\/g, '/')
    const service = getOrCreateService(fileName, content)
    const pos = getPos(content, line, column)
    const refs = service.getReferencesAtPosition(fileName, pos)
    if (!refs) return []

    return refs.map(ref => {
      const refContent = fileCache.get(ref.fileName)?.content || ''
      const { line: refLine, column: refCol } = lineColFromOffset(refContent, ref.textSpan.start)
      const text = refContent.split('\n')[refLine - 1]?.trim() || ''
      return { file: ref.fileName, line: refLine, column: refCol, text }
    })
  } catch {
    return []
  }
}

export function getCodeActions(filePath: string, content: string, line: number, column: number): CodeAction[] {
  try {
    const fileName = filePath.replace(/\\/g, '/')
    const service = getOrCreateService(fileName, content)
    const pos = getPos(content, line, column)
    const diagnostics = [
      ...(service.getSemanticDiagnostics(fileName) || []),
      ...(service.getSyntacticDiagnostics(fileName) || [])
    ]

    const actions: CodeAction[] = []
    for (const diag of diagnostics) {
      if (diag.start === undefined || diag.length === undefined) continue
      if (diag.start > pos || diag.start + diag.length < pos) continue

      const fixes = service.getCodeFixesAtPosition(fileName, diag.start, diag.start + diag.length, [diag.code], {}, {})
      for (const fix of fixes) {
        actions.push({
          title: fix.description,
          description: fix.changes[0]?.fileName || '',
          changes: fix.changes.flatMap(c =>
            c.textChanges.map(t => ({
              file: c.fileName,
              start: t.span.start,
              end: t.span.start + t.span.length,
              newText: t.newText
            }))
          )
        })
      }
    }
    return actions
  } catch {
    return []
  }
}

export function getDiagnostics(filePath: string, content: string): Array<{
  line: number
  column: number
  endLine: number
  endColumn: number
  message: string
  severity: 'error' | 'warning' | 'info'
  code: number
}> {
  try {
    const fileName = filePath.replace(/\\/g, '/')
    const service = getOrCreateService(fileName, content)
    const diags = [
      ...service.getSemanticDiagnostics(fileName),
      ...service.getSyntacticDiagnostics(fileName)
    ]

    return diags.map(d => {
      const start = d.start || 0
      const { line: startLine, column: startCol } = lineColFromOffset(content, start)
      const end = start + (d.length || 0)
      const { line: endLine, column: endCol } = lineColFromOffset(content, end)

      return {
        line: startLine,
        column: startCol,
        endLine,
        endColumn: endCol,
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
        severity: d.category === ts.DiagnosticCategory.Error ? 'error'
          : d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'info',
        code: d.code
      }
    })
  } catch {
    return []
  }
}

export function clearLspCache(): void {
  for (const entry of serviceCache.values()) disposeService(entry)
  serviceCache.clear()
  fileCache.clear()
}

export function dropLspFile(filePath: string): void {
  const fileName = filePath.replace(/\\/g, '/')
  disposeService(serviceCache.get(fileName))
  serviceCache.delete(fileName)
  fileCache.delete(fileName)
}