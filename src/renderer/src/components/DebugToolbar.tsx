import React, { useState, useEffect, useCallback } from 'react'

interface DebugToolbarProps {
  onOpenFile: (path: string) => void
}

export default function DebugToolbar({ onOpenFile }: DebugToolbarProps) {
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [stackFrames, setStackFrames] = useState<Array<{ id: number; name: string; file: string; line: number }>>([])
  const [variables, setVariables] = useState<Array<{ name: string; value: string; type: string }>>([])
  const [evalInput, setEvalInput] = useState('')
  const [evalResult, setEvalResult] = useState('')

  useEffect(() => {
    window.electronAPI.onDebugStopped(async () => {
      setPaused(true)
      const frames = await window.electronAPI.debugStackTrace()
      setStackFrames(frames)
      if (frames.length > 0) {
        const scopes = await window.electronAPI.debugScopes({ frameId: frames[0].id })
        if (scopes.length > 0) {
          const vars = await window.electronAPI.debugVariables({ variablesReference: scopes[0].variablesReference })
          setVariables(vars)
        }
      }
    })
    window.electronAPI.onDebugTerminated(() => {
      setRunning(false)
      setPaused(false)
      setStackFrames([])
      setVariables([])
    })
    return () => { window.electronAPI.removeAllDebugListeners() }
  }, [])

  const handleStart = useCallback(async () => {
    const activeFile = document.querySelector('.file-tree-item--active')?.getAttribute('title')
    if (!activeFile) return
    const cwd = activeFile.split(/[/\\]/).slice(0, -1).join('/') || '.'
    await window.electronAPI.debugStart({ filePath: activeFile, cwd })
    setRunning(true)
    setPaused(false)
  }, [])

  const handleStop = useCallback(async () => {
    await window.electronAPI.debugStop()
    setRunning(false)
    setPaused(false)
    setStackFrames([])
    setVariables([])
  }, [])

  const handleContinue = useCallback(async () => {
    await window.electronAPI.debugContinue()
    setPaused(false)
  }, [])

  const handlePause = useCallback(async () => {
    await window.electronAPI.debugPause()
  }, [])

  const handleNext = useCallback(async () => {
    await window.electronAPI.debugNext()
  }, [])

  const handleStepIn = useCallback(async () => {
    await window.electronAPI.debugStepIn()
  }, [])

  const handleStepOut = useCallback(async () => {
    await window.electronAPI.debugStepOut()
  }, [])

  const handleEvaluate = useCallback(async () => {
    if (!evalInput.trim()) return
    const frameId = stackFrames[0]?.id
    const result = await window.electronAPI.debugEvaluate({ expression: evalInput, frameId })
    setEvalResult(result)
  }, [evalInput, stackFrames])

  const handleSelectFrame = useCallback(async (frameId: number) => {
    const scopes = await window.electronAPI.debugScopes({ frameId })
    if (scopes.length > 0) {
      const vars = await window.electronAPI.debugVariables({ variablesReference: scopes[0].variablesReference })
      setVariables(vars)
    }
    const frame = stackFrames.find(f => f.id === frameId)
    if (frame?.file) onOpenFile(frame.file)
  }, [stackFrames, onOpenFile])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Debug Toolbar */}
      <div className="debug-toolbar">
        {!running ? (
          <button className="debug-btn debug-btn--start" onClick={handleStart} title="Start Debugging (F5)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
          </button>
        ) : (
          <>
            {paused && (
              <button className="debug-btn" onClick={handleContinue} title="Continue (F5)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
              </button>
            )}
            <button className="debug-btn" onClick={handlePause} title="Pause (F6)" disabled={!running || paused}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            </button>
            <button className="debug-btn" onClick={handleNext} title="Step Over (F10)" disabled={!paused}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17,8 22,8 22,13" /><path d="M22 8L10 8a4 4 0 00-4 4v0" /></svg>
            </button>
            <button className="debug-btn" onClick={handleStepIn} title="Step Into (F11)" disabled={!paused}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8,4 8,14 4,14" /><polyline points="17,8 22,8 22,13" /></svg>
            </button>
            <button className="debug-btn" onClick={handleStepOut} title="Step Out (Shift+F11)" disabled={!paused}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16,14 22,8 16,2" /><path d="M22 8H10a4 4 0 00-4 4v0" /></svg>
            </button>
            <button className="debug-btn debug-btn--stop" onClick={handleStop} title="Stop (Shift+F5)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            </button>
          </>
        )}
        <span className="debug-status">
          {running ? (paused ? 'Paused' : 'Running') : 'Stopped'}
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
        {/* Stack Trace */}
        {stackFrames.length > 0 && (
          <div className="debug-section">
            <div className="debug-section-title">Call Stack</div>
            {stackFrames.map((frame, i) => (
              <div
                key={frame.id}
                className={`debug-stack-frame${i === 0 ? ' debug-stack-frame--active' : ''}`}
                onClick={() => handleSelectFrame(frame.id)}
              >
                <span className="debug-frame-name">{frame.name}</span>
                <span className="debug-frame-location">
                  {frame.file.split(/[/\\]/).pop()}:{frame.line}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Variables */}
        {variables.length > 0 && (
          <div className="debug-section">
            <div className="debug-section-title">Variables</div>
            {variables.map((v, i) => (
              <div key={i} className="debug-variable">
                <span className="debug-var-name">{v.name}</span>
                <span className="debug-var-sep"> = </span>
                <span className="debug-var-value">{v.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Watch / Evaluate */}
        {paused && (
          <div className="debug-section">
            <div className="debug-section-title">Watch</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                className="sidebar-input"
                style={{ flex: 1 }}
                value={evalInput}
                onChange={e => setEvalInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEvaluate() }}
                placeholder="Expression..."
              />
              <button className="debug-btn" onClick={handleEvaluate} style={{ padding: '2px 8px', fontSize: 11 }}>Eval</button>
            </div>
            {evalResult && (
              <div className="debug-var-result">{evalResult}</div>
            )}
          </div>
        )}

        {!running && (
          <div className="debug-empty">
            <div className="debug-empty-text">No debug session active</div>
            <div className="debug-empty-hint">Open a .js/.ts file and press F5 to start debugging</div>
          </div>
        )}
      </div>
    </div>
  )
}