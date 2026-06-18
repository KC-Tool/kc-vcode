import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose'
})

interface Props {
  content: string
  theme?: 'dark' | 'light'
}

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 8)}`)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    mermaid.render(idRef.current, code).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg
    }).catch(() => {
      if (ref.current) ref.current.textContent = code
    })
  }, [code])

  return <div ref={ref} className="mermaid-block" />
}

function CodeBlock({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null)
  const match = /language-(\w+)/.exec(className || '')
  const lang = match?.[1]
  const text = String(children).replace(/\n$/, '')

  useEffect(() => {
    if (!ref.current) return
    if (lang && hljs.getLanguage(lang)) {
      ref.current.innerHTML = hljs.highlight(text, { language: lang }).value
    } else {
      ref.current.textContent = text
    }
  }, [text, lang])

  return (
    <pre className={className} style={{ position: 'relative' }}>
      <code ref={ref} className={className} {...rest} />
    </pre>
  )
}

export default function MarkdownPreview({ content, theme = 'dark' }: Props) {
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose'
    })
  }, [theme])

  return (
    <div className="md-preview">
      <div className="md-preview-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code(props) {
              const { className, children, ...rest } = props
              const match = /language-(\w+)/.exec(className || '')
              const lang = match?.[1]
              const text = String(children).replace(/\n$/, '')

              if (lang === 'mermaid') {
                return <MermaidBlock code={text} />
              }

              if (lang) {
                return <CodeBlock className={className} {...rest}>{children}</CodeBlock>
              }

              return <code className={className} {...rest}>{children}</code>
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}