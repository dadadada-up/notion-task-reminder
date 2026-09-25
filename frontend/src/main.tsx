import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { DialogProvider } from './components/ui/ConfirmDialog'
import { ToastProvider } from './components/ui/Toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DialogProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </DialogProvider>
  </React.StrictMode>,
)
