import React, { useEffect, useRef } from 'react'

interface Props {
  title: string
  message: string
  okText: string
  cancelText: string
  danger: boolean
  onClose: (ok: boolean) => void
}

export default function ConfirmDialog({ title, message, okText, cancelText, danger, onClose }: Props) {
  const okRef = useRef<HTMLButtonElement>(null)
  const esc = useRef(false)

  useEffect(() => {
    okRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { esc.current = true; onClose(false) }
      if (e.key === 'Enter') { esc.current = true; onClose(true) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="confirm-overlay" onClick={() => onClose(false)}>
      <div
        className={`confirm-dialog${danger ? ' confirm-dialog--danger' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn--cancel" onClick={() => onClose(false)}>
            {cancelText}
          </button>
          <button
            ref={okRef}
            className={`confirm-btn ${danger ? 'confirm-btn--danger' : 'confirm-btn--ok'}`}
            onClick={() => onClose(true)}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  )
}