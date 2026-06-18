import React, { useRef, useCallback, useEffect, useState } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import { useEditorContext } from '../contexts/EditorContext'
import { useSettings } from '../contexts/SettingsContext'
import MarkdownPreview from './MarkdownPreview'
import SettingsView from './SettingsView'
import Breadcrumbs from './Breadcrumbs'
import { allSnippets } from '../snippets'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

export default function EditorPane() {
  const { state, updateContent, markSaved, setCursor } = useEditorContext()
  const { settings } = useSettings()
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<any>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const activeFile = state.activeTabId ? state.files[state.activeTabId] : null
  const isMarkdown = activeFile?.language === 'markdown'
  const ed = settings.editor
  const monacoTheme = settings.appearance.theme === 'dark' ? 'vs-dark' : 'vs'

  const handleSave = useCallback(async () => {
    if (!activeFile) return
    const result = await window.electronAPI.saveFile({
      path: activeFile.path,
      content: activeFile.content
    })
    if ('success' in result && result.success) markSaved(activeFile.path)
  }, [activeFile, markSaved])

  useEffect(() => {
    if (!settings.files.autoSave || !activeFile) return
    if (activeFile.content === activeFile.originalContent) return
    const t = setTimeout(() => { handleSave() }, 1500)
    return () => clearTimeout(t)
  }, [activeFile?.content, activeFile?.originalContent, settings.files.autoSave, handleSave, activeFile])

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    editor.onDidChangeCursorPosition((e) => {
      if (activeFile) setCursor(activeFile.path, e.position.lineNumber, e.position.column)
    })

    editor.addCommand(2048 | 49, () => handleSave())

    // register custom completions per language
    for (const [lang, snippets] of Object.entries(allSnippets)) {
      monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          }
          return {
            suggestions: snippets.map(s => ({
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: s.insert,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: s.detail,
              range
            }))
          }
        }
      })
    }

    // tab completion with diff decoration
    editor.addAction({
      id: 'tab-complete-diff',
      label: 'Tab Complete',
      keybindings: [9], // Tab key
      run: (ed) => {
        const model = ed.getModel()
        if (!model) return

        const pos = ed.getPosition()
        if (!pos) return

        // check if suggest widget is open
        const suggestController = ed.getContribution('editor.contrib.suggestController')
        if (suggestController && (suggestController as any)._suggestWidget?.isVisible()) {
          // let suggest widget handle it normally
          ed.trigger('keyboard', 'editor.action.suggestInsert', null)
          return
        }

        // no suggest open — insert tab
        ed.trigger('keyboard', 'editor.action.insertTab', null)
      }
    })

    editor.focus()
  }, [activeFile, handleSave, setCursor])

  // show diff decoration after completion insert
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    let decoIds: string[] = []
    let timer: ReturnType<typeof setTimeout> | null = null

    const disposable = editor.onDidChangeModelContent((e) => {
      if (!e.changes.length) return
      // find insertions that span multiple lines (snippet inserts)
      for (const change of e.changes) {
        const insertedLines = change.text.split('\n').length
        if (insertedLines > 1) {
          const startLine = change.range.startLineNumber
          const endLine = startLine + insertedLines - 1
          const model = editor.getModel()
          if (!model) return

          // clear old decorations
          decoIds = editor.deltaDecorations(decoIds, [
            {
              range: new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine)),
              options: {
                isWholeLine: true,
                className: 'diff-highlight',
                overviewRuler: { color: '#a6e3a1', position: 1 }
              }
            }
          ])

          // auto-clear after 2s
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            decoIds = editor.deltaDecorations(decoIds, [])
          }, 2000)
        }
      }
    })

    return () => {
      disposable.dispose()
      if (timer) clearTimeout(timer)
    }
  }, [state.activeTabId])

  useEffect(() => {
    if (editorRef.current && activeFile) editorRef.current.focus()
  }, [state.activeTabId])

  // sync monaco theme with app theme
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return
    monaco.editor.setTheme(monacoTheme)
  }, [monacoTheme])

  useEffect(() => {
    window.electronAPI.onRequestSave(() => handleSave())
    return () => { window.electronAPI.removeAllListeners('file:requestSave') }
  }, [handleSave])

  useEffect(() => {
    if (!settings.files.autoSave || !activeFile) return
    if (activeFile.content === activeFile.originalContent) return
    const t = setTimeout(() => { handleSave() }, 1500)
    return () => clearTimeout(t)
  }, [activeFile, settings.files.autoSave, handleSave])

  const autoPath = activeFile?.path
  const autoContent = activeFile?.content
  const autoDirty = activeFile?.isDirty

  useEffect(() => {
    if (!settings.files.autoSave) return
    if (!autoPath || !autoContent || !autoDirty) return
    const id = setTimeout(() => {
      window.electronAPI.saveFile({ path: autoPath, content: autoContent }).then(r => {
        if ('success' in r && r.success) markSaved(autoPath)
      })
    }, 1500)
    return () => clearTimeout(id)
  }, [autoPath, autoContent, autoDirty, settings.files.autoSave, markSaved])

  // Go to Line
  useEffect(() => {
    const handler = (e: Event) => {
      const line = (e as CustomEvent).detail
      if (editorRef.current && typeof line === 'number') {
        editorRef.current.revealLineInCenter(line)
        editorRef.current.setPosition({ lineNumber: line, column: 1 })
        editorRef.current.focus()
      }
    }
    document.addEventListener('editor:goToLine', handler)
    return () => document.removeEventListener('editor:goToLine', handler)
  }, [state.activeTabId])

  // settings tab — no file data needed
  const isSettings = state.tabs.find(t => t.id === state.activeTabId)?.isSettings
  if (isSettings) {
    return (
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <SettingsView />
      </div>
    )
  }

  if (!activeFile) return null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Breadcrumbs />
      {isMarkdown && (
        <div className="editor-toolbar">
          <button
            className={`editor-toolbar-btn${!previewMode ? ' editor-toolbar-btn--active' : ''}`}
            onClick={() => setPreviewMode(false)}
          >
            Edit
          </button>
          <button
            className={`editor-toolbar-btn${previewMode ? ' editor-toolbar-btn--active' : ''}`}
            onClick={() => setPreviewMode(true)}
          >
            Preview
          </button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {isMarkdown && previewMode ? (
          <MarkdownPreview content={activeFile.content} theme={state.theme} />
        ) : (
          <Editor
            key={activeFile.path}
            height="100%"
            language={activeFile.language}
            value={activeFile.content}
            theme={monacoTheme}
            onChange={(v) => { if (v !== undefined) updateContent(activeFile.path, v) }}
            onMount={handleEditorMount}
            options={{
              fontSize: ed.fontSize,
              fontFamily: ed.fontFamily,
              fontLigatures: true,
              minimap: { enabled: ed.minimap },
              lineNumbers: ed.lineNumbers ? 'on' : 'off',
              renderWhitespace: 'selection',
              tabSize: ed.tabSize,
              insertSpaces: true,
              wordWrap: ed.wordWrap,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              smoothScrolling: ed.smoothScrolling,
              cursorBlinking: ed.cursorBlinking,
              cursorSmoothCaretAnimation: 'on',
              bracketPairColorization: { enabled: true },
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              formatOnPaste: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: { enabled: true },
              folding: true,
              foldingHighlight: true,
              guides: { indentation: true, bracketPairs: true },
              selectionHighlight: true,
              occurrencesHighlight: 'singleFile',
              renderLineHighlight: 'all',
              padding: { top: 8 },
              suggestSelection: 'first',
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: 'on',
              snippetSuggestions: 'inline',
              tabCompletion: 'on'
            }}
          />
        )}
      </div>
    </div>
  )
}
