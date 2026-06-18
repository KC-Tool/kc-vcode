import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'

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
              const { children, className, ...rest } = props
              const match = /language-(\w+)/.exec(className || '')
              const lang = match?.[1]
              const text = String(children).replace(/\n$/, '')

              if (lang === 'mermaid') {
                return <MermaidBlock code={text} />
              }

              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              )
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
