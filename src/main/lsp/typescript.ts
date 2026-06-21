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

const fileCache = new Map<string, { version: number; content: string }>()

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

function createLanguageService(filePath: string, content: string): {
  service: ts.LanguageService
  fileName: string
} {
  const fileName = filePath.replace(/\\/g, '/')
  const version = (fileCache.get(fileName)?.version || 0) + 1
  fileCache.set(fileName, { version, content })

  const compilerOptions = getDefaultCompilerOptions()

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [fileName],
    getScriptVersion: (name) => String(fileCache.get(name)?.version || 0),
    getScriptSnapshot: (name) => {
      const cached = fileCache.get(name)
      if (cached) {
        return ts.ScriptSnapshot.fromString(cached.content)
      }
      try {
        const fileContent = fs.readFileSync(name, 'utf-8')
        fileCache.set(name, { version: 1, content: fileContent })
        return ts.ScriptSnapshot.fromString(fileContent)
      } catch {
        return undefined
      }
    },
    getCurrentDirectory: () => path.dirname(filePath),
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
    directoryExists: ts.sys.directoryExists,
    getRootFiles: () => [fileName],
    getScriptFileNames: () => [fileName],
  }

  const service = ts.createLanguageService(host, ts.createDocumentRegistry())
  return { service, fileName }
}

export function getHover(filePath: string, content: string, line: number, column: number): HoverResult | null {
  try {
    const { service, fileName } = createLanguageService(filePath, content)
    const pos = content.split('\n').slice(0, line - 1).join('\n').length + column - 1
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
    const { service, fileName } = createLanguageService(filePath, content)
    const pos = content.split('\n').slice(0, line - 1).join('\n').length + column - 1
    const defs = service.getDefinitionAtPosition(fileName, pos)
    if (!defs || defs.length === 0) return null

    const def = defs[0]
    const defContent = fileCache.get(def.fileName)?.content
    if (!defContent) return null

    const defLines = defContent.split('\n')
    let defLine = 1
    let defCol = def.textSpan.start
    let chars = 0
    for (let i = 0; i < defLines.length; i++) {
      chars += defLines[i].length + 1
      if (chars > def.textSpan.start) {
        defLine = i + 1
        defCol = def.textSpan.start - (chars - defLines[i].length - 1) + 1
        break
      }
    }

    return { file: def.fileName, line: defLine, column: defCol }
  } catch {
    return null
  }
}

export function getReferences(filePath: string, content: string, line: number, column: number): ReferenceResult[] {
  try {
    const { service, fileName } = createLanguageService(filePath, content)
    const pos = content.split('\n').slice(0, line - 1).join('\n').length + column - 1
    const refs = service.getReferencesAtPosition(fileName, pos)
    if (!refs) return []

    return refs.map(ref => {
      const refContent = fileCache.get(ref.fileName)?.content || ''
      const refLines = refContent.split('\n')
      let refLine = 1
      let refCol = ref.textSpan.start
      let chars = 0
      for (let i = 0; i < refLines.length; i++) {
        chars += refLines[i].length + 1
        if (chars > ref.textSpan.start) {
          refLine = i + 1
          refCol = ref.textSpan.start - (chars - refLines[i].length - 1) + 1
          break
        }
      }

      const text = refLines[refLine - 1]?.trim() || ''
      return { file: ref.fileName, line: refLine, column: refCol, text }
    })
  } catch {
    return []
  }
}

export function getCodeActions(filePath: string, content: string, line: number, column: number): CodeAction[] {
  try {
    const { service, fileName } = createLanguageService(filePath, content)
    const pos = content.split('\n').slice(0, line - 1).join('\n').length + column - 1
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
    const { service, fileName } = createLanguageService(filePath, content)
    const diags = [
      ...service.getSemanticDiagnostics(fileName),
      ...service.getSyntacticDiagnostics(fileName)
    ]

    const lines = content.split('\n')
    return diags.map(d => {
      const start = d.start || 0
      const startLine = content.slice(0, start).split('\n').length
      const startCol = start - content.slice(0, start).lastIndexOf('\n')

      const end = start + (d.length || 0)
      const endLine = content.slice(0, end).split('\n').length
      const endCol = end - content.slice(0, end).lastIndexOf('\n')

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