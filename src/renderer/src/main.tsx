import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/styles/global.css'

// apply theme immediately — no flash of wrong theme
try {
  const saved = JSON.parse(localStorage.getItem('kc-edit-state') || '{}')
  document.documentElement.setAttribute('data-theme', saved.theme || 'dark')
} catch {
  document.documentElement.setAttribute('data-theme', 'dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
