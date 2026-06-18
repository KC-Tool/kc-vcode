import React, { useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'

const categories = ['editor', 'appearance', 'terminal', 'files'] as const
const catLabels: Record<string, string> = {
  editor: 'Editor',
  appearance: 'Appearance',
  terminal: 'Terminal',
  files: 'Files'
}

export default function SettingsView() {
  const { settings, update } = useSettings()
  const [activeCat, setActiveCat] = useState<string>('editor')

  return (
    <div className="settings-view">
      <div className="settings-view-sidebar">
        <div className="settings-view-title">Settings</div>
        {categories.map(c => (
          <div
            key={c}
            className={`settings-cat${activeCat === c ? ' settings-cat--active' : ''}`}
            onClick={() => setActiveCat(c)}
          >
            {catLabels[c]}
          </div>
        ))}
      </div>
      <div className="settings-view-body">
        {activeCat === 'editor' && (
          <>
            <SettingRow label="Font Size" desc="Editor font size in pixels">
              <input type="number" className="settings-input settings-input--sm"
                value={settings.editor.fontSize}
                onChange={e => update('editor', 'fontSize', +e.target.value)} />
            </SettingRow>
            <SettingRow label="Font Family" desc="Monospace font for the editor">
              <input type="text" className="settings-input"
                value={settings.editor.fontFamily}
                onChange={e => update('editor', 'fontFamily', e.target.value)} />
            </SettingRow>
            <SettingRow label="Tab Size" desc="Number of spaces per tab">
              <input type="number" className="settings-input settings-input--sm"
                value={settings.editor.tabSize}
                onChange={e => update('editor', 'tabSize', +e.target.value)} />
            </SettingRow>
            <SettingRow label="Word Wrap" desc="Wrap long lines">
              <select className="settings-select"
                value={settings.editor.wordWrap}
                onChange={e => update('editor', 'wordWrap', e.target.value)}>
                <option value="off">Off</option>
                <option value="on">On</option>
              </select>
            </SettingRow>
            <SettingRow label="Minimap" desc="Show minimap on the right">
              <Toggle checked={settings.editor.minimap} onChange={v => update('editor', 'minimap', v)} />
            </SettingRow>
            <SettingRow label="Line Numbers" desc="Show line numbers">
              <Toggle checked={settings.editor.lineNumbers} onChange={v => update('editor', 'lineNumbers', v)} />
            </SettingRow>
            <SettingRow label="Smooth Scrolling" desc="Enable smooth scroll animation">
              <Toggle checked={settings.editor.smoothScrolling} onChange={v => update('editor', 'smoothScrolling', v)} />
            </SettingRow>
            <SettingRow label="Cursor Style" desc="Cursor blink animation style">
              <select className="settings-select"
                value={settings.editor.cursorBlinking}
                onChange={e => update('editor', 'cursorBlinking', e.target.value)}>
                <option value="blink">Blink</option>
                <option value="smooth">Smooth</option>
                <option value="phase">Phase</option>
                <option value="expand">Expand</option>
                <option value="line">Line</option>
              </select>
            </SettingRow>
          </>
        )}
        {activeCat === 'appearance' && (
          <>
            <SettingRow label="Theme" desc="Color theme for the editor">
              <select className="settings-select"
                value={settings.appearance.theme}
                onChange={e => update('appearance', 'theme', e.target.value)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </SettingRow>
            <SettingRow label="UI Font Size" desc="Font size for sidebar, tabs, status bar">
              <input type="number" className="settings-input settings-input--sm"
                value={settings.appearance.fontSize}
                onChange={e => update('appearance', 'fontSize', +e.target.value)} />
            </SettingRow>
            <SettingRow label="Tab Blur" desc="Background blur for inactive tabs (px, 0 = off)">
              <input type="range" min="0" max="12" step="1"
                value={settings.appearance.tabBlur}
                onChange={e => update('appearance', 'tabBlur', +e.target.value)} />
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', minWidth: 20, textAlign: 'right' }}>
                {settings.appearance.tabBlur}px
              </span>
            </SettingRow>
          </>
        )}
        {activeCat === 'terminal' && (
          <>
            <SettingRow label="Font Size" desc="Terminal font size">
              <input type="number" className="settings-input settings-input--sm"
                value={settings.terminal.fontSize}
                onChange={e => update('terminal', 'fontSize', +e.target.value)} />
            </SettingRow>
            <SettingRow label="Cursor Blink" desc="Blink the terminal cursor">
              <Toggle checked={settings.terminal.cursorBlink} onChange={v => update('terminal', 'cursorBlink', v)} />
            </SettingRow>
            <SettingRow label="Scrollback Lines" desc="Max lines to keep in terminal history">
              <input type="number" className="settings-input settings-input--sm"
                value={settings.terminal.scrollback}
                onChange={e => update('terminal', 'scrollback', +e.target.value)} />
            </SettingRow>
          </>
        )}
        {activeCat === 'files' && (
          <>
            <SettingRow label="Auto Save" desc="Save files automatically after changes">
              <Toggle checked={settings.files.autoSave} onChange={v => update('files', 'autoSave', v)} />
            </SettingRow>
            <SettingRow label="Encoding" desc="Default file encoding">
              <select className="settings-select"
                value={settings.files.encoding}
                onChange={e => update('files', 'encoding', e.target.value)}>
                <option value="utf-8">UTF-8</option>
                <option value="utf-16le">UTF-16 LE</option>
                <option value="ascii">ASCII</option>
              </select>
            </SettingRow>
            <SettingRow label="Trim Trailing Whitespace" desc="Remove trailing whitespace on save">
              <Toggle checked={settings.files.trimTrailingWhitespace} onChange={v => update('files', 'trimTrailingWhitespace', v)} />
            </SettingRow>
            <SettingRow label="Insert Final Newline" desc="Ensure file ends with newline">
              <Toggle checked={settings.files.insertFinalNewline} onChange={v => update('files', 'insertFinalNewline', v)} />
            </SettingRow>
          </>
        )}
      </div>
    </div>
  )
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        <div className="setting-desc">{desc}</div>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`settings-toggle${checked ? ' settings-toggle--on' : ''}`} onClick={() => onChange(!checked)}>
      <div className="settings-toggle-thumb" />
    </div>
  )
}
