
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from '@/app/App'
import ToastViewport from '@/components/ui/ToastViewport'

import '@/styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <ToastViewport />
  </React.StrictMode>
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => {
        console.warn('Offline cache registration failed', error)
      })
  })
}
