import React, { useState, useRef, useEffect } from 'react'

interface Props {
  visible: boolean
  onClose: () => void
  onGo: (line: number) => void
  maxLine: number
}

export default function GoToLine({ visible, onClose, onGo, maxLine }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [visible])

  const handleSubmit = () => {
    const line = parseInt(value, 10)
    if (line >= 1 && line <= maxLine) {
      onGo(line)
      onClose()
    }
  }

  if (!visible) return null

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" style={{ width: 300 }} onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          type="number"
          placeholder={`Go to line (1-${maxLine})…`}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onClose()
          }}
          min={1}
          max={maxLine}
        />
      </div>
    </div>
  )
}
