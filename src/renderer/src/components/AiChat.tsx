import React, { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEditorContext } from '../contexts/EditorContext'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const PROVIDERS: Record<string, { label: string; models: string[] }> = {
  openai: { label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  anthropic: { label: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] }
}

export default function AiChat() {
  const { state } = useEditorContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeFile = state.activeTabId ? state.files[state.activeTabId] : null

  // check LLM config on mount
  useEffect(() => {
    window.electronAPI.llmGetConfig().then(cfg => {
      if (cfg?.hasApiKey) {
        setConfigured(true)
        setProvider(cfg.provider || 'openai')
        setModel(cfg.model || 'gpt-4o')
      } else {
        setShowSetup(true)
      }
    })
  }, [])

  // auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSaveConfig = useCallback(async () => {
    if (!apiKey.trim()) { setSaveMsg('API Key is required'); return }
    setSaving(true)
    setSaveMsg('')
    try {
      await window.electronAPI.llmConfigure({ provider, apiKey: apiKey.trim(), model, baseUrl: baseUrl.trim() || undefined })
      setConfigured(true)
      setShowSetup(false)
      setSaveMsg('')
    } catch (err) {
      setSaveMsg('Failed to save configuration')
    }
    setSaving(false)
  }, [provider, apiKey, model, baseUrl])

  const buildContext = useCallback(() => {
    if (!activeFile) return undefined
    const content = activeFile.content
    const lines = content.split('\n')
    const line = activeFile.cursorLine || 1
    const start = Math.max(0, line - 15)
    const end = Math.min(lines.length, line + 15)
    const surrounding = lines.slice(start, end).join('\n')
    return {
      currentFile: {
        path: activeFile.path,
        content: surrounding,
        language: activeFile.language,
        cursorLine: line
      }
    }
  }, [activeFile])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // handle /edit command
    if (text.startsWith('/edit ')) {
      const instruction = text.slice(6)
      if (!activeFile) {
        const assistantMsg: ChatMessage = { role: 'assistant', content: 'No file is currently open. Open a file first to use /edit.' }
        setMessages(prev => [...prev, assistantMsg])
        setLoading(false)
        return
      }

      const assistantMsg: ChatMessage = { role: 'assistant', content: 'Editing file...' }
      setMessages(prev => [...prev, assistantMsg])

      const result = await window.electronAPI.llmEdit({
        instruction,
        fileContent: activeFile.content,
        language: activeFile.language,
        filePath: activeFile.path
      })

      if ('error' in result && result.error) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: `Error: ${result.error}` }
          return updated
        })
      } else if (result.content) {
        document.dispatchEvent(new CustomEvent('ai:applyEdit', { detail: result.content }))
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: `Applied edit to \`${activeFile.path.split(/[/\\]/).pop()}\`. The file has been updated.` }
          return updated
        })
      }
      setLoading(false)
      return
    }

    const systemPrompt = `You are an AI coding assistant inside a code editor called kc-vcode. You help with coding questions, writing code, debugging, and explaining code. Be concise and practical. When showing code, use fenced code blocks with the appropriate language tag.`

    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text }
    ]

    const context = buildContext()

    await window.electronAPI.llmChatStream({ messages: chatMessages, context })

    let assistantContent = ''
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    window.electronAPI.onLlmChatChunk((chunk) => {
      if (chunk.type === 'text') {
        assistantContent += chunk.content
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
          return updated
        })
      } else if (chunk.type === 'done') {
        setLoading(false)
        window.electronAPI.removeAllLlmListeners()
      }
    })
  }, [input, loading, messages, buildContext, activeFile])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const insertCodeBlock = useCallback((code: string) => {
    document.dispatchEvent(new CustomEvent('ai:insertCode', { detail: code }))
  }, [])

  // Setup wizard
  if (!configured || showSetup) {
    return (
      <div className="ai-chat">
        <div className="ai-chat-header">
          <span className="ai-chat-title">AI Setup</span>
        </div>
        <div className="ai-setup">
          <div className="ai-setup-step">
            <label className="ai-setup-label">Provider</label>
            <select className="ai-setup-select" value={provider} onChange={e => {
              setProvider(e.target.value)
              setModel(PROVIDERS[e.target.value]?.models[0] || '')
            }}>
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="ai-setup-step">
            <label className="ai-setup-label">API Key</label>
            <input
              className="ai-setup-input"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              autoFocus
            />
            <div className="ai-setup-hint">Your key is stored locally and never shared.</div>
          </div>

          <div className="ai-setup-step">
            <label className="ai-setup-label">Model</label>
            <select className="ai-setup-select" value={PROVIDERS[provider]?.models.includes(model) ? model : '__custom__'} onChange={e => {
              if (e.target.value !== '__custom__') setModel(e.target.value)
            }}>
              {(PROVIDERS[provider]?.models || []).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="__custom__">Custom model...</option>
            </select>
            {(!PROVIDERS[provider]?.models.includes(model) || model === '') && (
              <input
                className="ai-setup-input"
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. gpt-4o, deepseek-chat, local-model..."
                style={{ marginTop: 6 }}
              />
            )}
          </div>

          <div className="ai-setup-step">
            <label className="ai-setup-label">Base URL <span className="ai-setup-optional">(optional)</span></label>
            <input
              className="ai-setup-input"
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder={provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com'}
            />
            <div className="ai-setup-hint">Leave empty for default API endpoint.</div>
          </div>

          {saveMsg && <div className="ai-setup-error">{saveMsg}</div>}

          <button
            className="ai-setup-btn"
            onClick={handleSaveConfig}
            disabled={saving || !apiKey.trim()}
          >
            {saving ? 'Saving...' : 'Save & Start Chat'}
          </button>

          {configured && (
            <button
              className="ai-setup-skip"
              onClick={() => setShowSetup(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <span className="ai-chat-title">AI Assistant</span>
        <span className="ai-chat-model">{provider} / {model}</span>
        <button className="ai-chat-settings-btn" onClick={() => setShowSetup(true)} title="Reconfigure">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <div className="ai-chat-empty-icon">AI</div>
            <div className="ai-chat-empty-text">
              Ask me anything about your code. I can see your current file and cursor position.
              <br /><br />
              <strong>Commands:</strong><br />
              <code>/edit &lt;instruction&gt;</code> - Edit the current file with natural language
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`ai-chat-msg ai-chat-msg--${msg.role}`}>
            <div className="ai-chat-msg-role">{msg.role === 'user' ? 'You' : 'AI'}</div>
            <div className="ai-chat-msg-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isBlock = String(children).includes('\n')
                    if (isBlock) {
                      const code = String(children).replace(/\n$/, '')
                      const lang = match ? match[1] : ''
                      return (
                        <div className="ai-code-block">
                          <div className="ai-code-block-header">
                            <span>{lang}</span>
                            <button
                              className="ai-code-block-btn"
                              onClick={() => navigator.clipboard.writeText(code)}
                            >
                              Copy
                            </button>
                            <button
                              className="ai-code-block-btn"
                              onClick={() => insertCodeBlock(code)}
                            >
                              Insert
                            </button>
                          </div>
                          <pre><code className={className} {...props}>{children}</code></pre>
                        </div>
                      )
                    }
                    return <code className={className} {...props}>{children}</code>
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="ai-chat-input-area">
        <textarea
          ref={inputRef}
          className="ai-chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Thinking...' : 'Ask about your code... (Enter to send, Shift+Enter for newline)'}
          disabled={loading}
          rows={3}
        />
        <button
          className="ai-chat-send"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}