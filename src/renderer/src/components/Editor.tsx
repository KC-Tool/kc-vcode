import React, { useRef, useCallback, useEffect, useState } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
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

interface CursorPosition {
  lineNumber: number
  column: number
}

export default function EditorPane() {
  const { state, updateContent, markSaved, setCursor, setMarkers } = useEditorContext()
  const { settings } = useSettings()
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<any>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // cursor history for back/forward navigation
  const cursorHistoryRef = useRef<CursorPosition[]>([])
  const cursorIndexRef = useRef<number>(-1)

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

  // auto-save
  useEffect(() => {
    if (!settings.files.autoSave || !activeFile) return
    if (activeFile.content === activeFile.originalContent) return
    const t = setTimeout(() => { handleSave() }, 1500)
    return () => clearTimeout(t)
  }, [activeFile?.content, activeFile?.originalContent, settings.files.autoSave, handleSave, activeFile])

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // track cursor position changes for history
    let lastPos: CursorPosition | null = null
    editor.onDidChangeCursorPosition((e) => {
      if (activeFile) setCursor(activeFile.path, e.position.lineNumber, e.position.column)

      const pos = e.position
      // avoid adding consecutive same positions
      if (lastPos && lastPos.lineNumber === pos.lineNumber && lastPos.column === pos.column) return
      // avoid adding positions from programmatic navigation
      if (e.source === 'api') return

      lastPos = pos
      const hist = cursorHistoryRef.current
      const idx = cursorIndexRef.current

      // truncate forward history when user moves cursor manually
      if (idx < hist.length - 1) {
        hist.splice(idx + 1)
      }
      // avoid duplicate adjacent entries
      if (hist.length === 0 || hist[hist.length - 1].lineNumber !== pos.lineNumber || hist[hist.length - 1].column !== pos.column) {
        hist.push({ lineNumber: pos.lineNumber, column: pos.column })
        // cap history size
        if (hist.length > 200) hist.shift()
      }
      cursorIndexRef.current = hist.length - 1
    })

    // markers listener
    monaco.editor.onDidChangeMarkers(() => {
      const allMarkers = monaco.editor.getModelMarkers({})
      const mapped = allMarkers.map(m => ({
        file: m.resource?.path || m.source || '',
        line: m.startLineNumber,
        column: m.startColumn,
        message: m.message,
        severity: m.severity === 8 ? 'error' as const : m.severity === 4 ? 'warning' as const : m.severity === 2 ? 'info' as const : 'hint' as const
      }))
      setMarkers(mapped)
    })

    // Ctrl+S save
    editor.addCommand(2048 | 49, () => handleSave())

    // cursor history navigation: Alt+Left = back, Alt+Right = forward
    editor.addCommand(512 | 17, () => { // Alt+Left
      const hist = cursorHistoryRef.current
      if (hist.length === 0) return
      if (cursorIndexRef.current > 0) {
        cursorIndexRef.current--
        const pos = hist[cursorIndexRef.current]
        editor.setPosition(pos)
        editor.revealLineInCenter(pos.lineNumber)
      }
    })
    editor.addCommand(512 | 19, () => { // Alt+Right
      const hist = cursorHistoryRef.current
      if (cursorIndexRef.current < hist.length - 1) {
        cursorIndexRef.current++
        const pos = hist[cursorIndexRef.current]
        editor.setPosition(pos)
        editor.revealLineInCenter(pos.lineNumber)
      }
    })

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

    // tab completion
    editor.addAction({
      id: 'tab-complete-diff',
      label: 'Tab Complete',
      keybindings: [9],
      run: (ed) => {
        const suggestController = ed.getContribution('editor.contrib.suggestController')
        if (suggestController && (suggestController as any)._suggestWidget?.isVisible()) {
          ed.trigger('keyboard', 'editor.action.suggestInsert', null)
          return
        }
        ed.trigger('keyboard', 'editor.action.insertTab', null)
      }
    })

    // AI Inline Completion (Ghost Text)
    let completionTimer: ReturnType<typeof setTimeout> | null = null
    let abortController: AbortController | null = null
    const language = activeFile?.language || 'plaintext'

    monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model, position, context, token) => {
        // debounce: wait 400ms after last keystroke
        if (completionTimer) clearTimeout(completionTimer)

        // abort any in-flight request
        if (abortController) abortController.abort()
        abortController = new AbortController()

        const prompt = model.getValueInRange({
          startLineNumber: Math.max(1, position.lineNumber - 30),
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        })

        if (!prompt.trim()) return { items: [] }

        try {
          const result = await window.electronAPI.llmComplete({
            prompt: `Complete the code at the cursor position. Output ONLY the completion text, no explanations, no markdown, no code fences.\n\nLanguage: ${language}\n\nCode context:\n${prompt}\n\nComplete from cursor:`,
            language
          })

          if ('error' in result || !result.completion) return { items: [] }

          const completion = result.completion.replace(/^\n+/, '')
          if (!completion) return { items: [] }

          return {
            items: [{
              insertText: completion,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              }
            }]
          }
        } catch {
          return { items: [] }
        }
      },
      freeInlineCompletions: () => {}
    })

    editor.focus()
  }, [activeFile, handleSave, setCursor, setMarkers])

  // diff highlight decoration
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    let decoIds: string[] = []
    let timer: ReturnType<typeof setTimeout> | null = null

    const disposable = editor.onDidChangeModelContent((e) => {
      if (!e.changes.length) return
      for (const change of e.changes) {
        const insertedLines = change.text.split('\n').length
        if (insertedLines > 1) {
          const startLine = change.range.startLineNumber
          const endLine = startLine + insertedLines - 1
          const model = editor.getModel()
          if (!model) return
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

  // error lens: inline decorations for markers
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    let decoIds: string[] = []

    const updateErrorLens = () => {
      const model = editor.getModel()
      if (!model) return
      const markers = monaco.editor.getModelMarkers({ resource: model.uri })
      if (!markers.length) {
        decoIds = editor.deltaDecorations(decoIds, [])
        return
      }

      const decorations = markers
        .filter(m => m.severity === 8 || m.severity === 4) // error or warning
        .map(m => {
          const maxCol = model.getLineMaxColumn(m.startLineNumber)
          const icon = m.severity === 8 ? '\u2716' : '\u26A0'
          const color = m.severity === 8 ? '#f44747' : '#cca700'
          return {
            range: new monaco.Range(m.startLineNumber, maxCol, m.startLineNumber, maxCol),
            options: {
              after: {
                content: ` ${icon} ${m.message}`,
                inlineClassName: `error-lens-inline ${m.severity === 8 ? 'error-lens-error' : 'error-lens-warning'}`,
                color,
                fontStyle: 'italic',
                fontSize: '12px'
              },
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
            }
          }
        })

      decoIds = editor.deltaDecorations(decoIds, decorations)
    }

    updateErrorLens()

    const disposable = monaco.editor.onDidChangeMarkers(() => {
      updateErrorLens()
    })

    return () => {
      disposable.dispose()
      editor.deltaDecorations(decoIds, [])
    }
  }, [state.activeTabId])

  // focus on tab switch
  useEffect(() => {
    if (editorRef.current && activeFile) editorRef.current.focus()
  }, [state.activeTabId])

  // AI: apply full file edit from /edit command
  useEffect(() => {
    const handler = (e: Event) => {
      const newContent = (e as CustomEvent).detail
      const editor = editorRef.current
      const model = editor?.getModel()
      if (!editor || !model || typeof newContent !== 'string') return

      const fullRange = model.getFullModelRange()
      editor.executeEdits('ai-edit', [{
        range: fullRange,
        text: newContent,
        forceMoveMarkers: true
      }])
      editor.focus()
    }
    document.addEventListener('ai:applyEdit', handler)
    return () => document.removeEventListener('ai:applyEdit', handler)
  }, [state.activeTabId])

  // sync theme
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return
    monaco.editor.setTheme(monacoTheme)
  }, [monacoTheme])

  // request save from menu
  useEffect(() => {
    window.electronAPI.onRequestSave(() => handleSave())
    return () => { window.electronAPI.removeAllListeners('file:requestSave') }
  }, [handleSave])

  // go to line
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

  // AI: insert code from chat
  useEffect(() => {
    const handler = (e: Event) => {
      const code = (e as CustomEvent).detail
      const editor = editorRef.current
      if (!editor || typeof code !== 'string') return
      const pos = editor.getPosition()
      if (!pos) return
      editor.executeEdits('ai-insert', [{
        range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
        text: code,
        forceMoveMarkers: true
      }])
      editor.focus()
    }
    document.addEventListener('ai:insertCode', handler)
    return () => document.removeEventListener('ai:insertCode', handler)
  }, [state.activeTabId])

  // settings tab
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
              // font
              fontSize: ed.fontSize,
              fontFamily: ed.fontFamily,
              fontLigatures: true,
              lineHeight: 1.6,

              // minimap
              minimap: { enabled: ed.minimap, renderCharacters: false, maxColumn: 80 },

              // display
              lineNumbers: ed.lineNumbers ? 'on' : 'off',
              renderWhitespace: 'selection',
              wordWrap: ed.wordWrap,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: 'all',
              renderLineHighlightOnlyWhenFocus: false,

              // scrolling
              smoothScrolling: ed.smoothScrolling,
              mouseWheelScrollSensitivity: 1.2,
              fastScrollSensitivity: 5,

              // cursor
              cursorBlinking: ed.cursorBlinking,
              cursorSmoothCaretAnimation: 'on',
              cursorWidth: 2,
              cursorInvertSelection: false,

              // editing
              tabSize: ed.tabSize,
              insertSpaces: true,
              autoIndent: 'advanced',
              formatOnPaste: true,
              formatOnType: true,

              // bracket
              bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              autoSurround: 'languageDefined',

              // suggestions
              suggestOnTriggerCharacters: true,
              quickSuggestions: { other: true, comments: true, strings: true },
              parameterHints: { enabled: true, cycle: true },
              suggestSelection: 'first',
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: 'on',
              snippetSuggestions: 'inline',
              tabCompletion: 'on',
              wordBasedSuggestions: 'currentDocument',

              // folding
              folding: true,
              foldingHighlight: true,
              showFoldingControls: 'mouseover',
              foldingStrategy: 'indentation',

              // guides
              guides: {
                indentation: true,
                bracketPairs: true,
                bracketPairsHorizontal: true,
                highlightActiveBracketPair: true,
                indentationLines: true
              },

              // selection
              selectionHighlight: true,
              occurrencesHighlight: 'singleFile',
              selectOnLineNumbers: true,

              // sticky scroll
              stickyScroll: { enabled: true },

              // inline suggest
              inlineSuggest: { enabled: true },

              // misc
              contextmenu: true,
              copyWithSyntaxHighlighting: true,
              multiCursorModifier: 'ctrlCmd',
              linkedEditing: true,
              colorDecorators: true,
             OccurrencesHighlight: 'singleFile' as any
            }}
          />
        )}
      </div>
    </div>
  )
}