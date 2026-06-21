import React, { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEditorContext } from '../contexts/EditorContext'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default function AiChat() {
  const { state } = useEditorContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; provider?: string; model?: string }>({ configured: false })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeFile = state.activeTabId ? state.files[state.activeTabId] : null

  // check LLM config on mount
  useEffect(() => {
    window.electronAPI.llmGetConfig().then(cfg => {
      setConfigStatus({
        configured: !!cfg?.hasApiKey,
        provider: cfg?.provider,
        model: cfg?.model
      })
    })
  }, [])

  // auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

    // build context-aware system prompt
    const systemPrompt = `You are an AI coding assistant inside a code editor called kc-vcode. You help with coding questions, writing code, debugging, and explaining code. Be concise and practical. When showing code, use fenced code blocks with the appropriate language tag.`

    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text }
    ]

    const context = buildContext()

    // use streaming
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
  }, [input, loading, messages, buildContext])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const insertCodeBlock = useCallback((code: string) => {
    // dispatch custom event to insert code at cursor in editor
    document.dispatchEvent(new CustomEvent('ai:insertCode', { detail: code }))
  }, [])

  if (!configStatus.configured) {
    return (
      <div className="ai-chat">
        <div className="ai-chat-header">
          <span className="ai-chat-title">AI Assistant</span>
        </div>
        <div className="ai-chat-empty">
          <div className="ai-chat-empty-icon">AI</div>
          <div className="ai-chat-empty-text">Configure your API key in Settings to enable AI features.</div>
          <button
            className="sidebar-empty-btn"
            onClick={() => document.dispatchEvent(new CustomEvent('editor:openSettings'))}
          >
            Open Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <span className="ai-chat-title">AI Assistant</span>
        <span className="ai-chat-model">{configStatus.provider} / {configStatus.model}</span>
      </div>
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <div className="ai-chat-empty-icon">AI</div>
            <div className="ai-chat-empty-text">
              Ask me anything about your code. I can see your current file and cursor position.
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