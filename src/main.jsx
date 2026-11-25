import React from 'react'
import ReactDOM from 'react-dom/client'

import App from '@/app/App'
import ToastViewport from '@/components/ui/ToastViewport'
import { loadOwnerDemo, loadRevenueDemo, clearDemo, demoReport } from '@/lib/seedDemo'

import '@/styles/index.css'

// Auto-seed demo data once on first visit for any PC/browser
const DEMO_FLAG = 'restrodesk_demo_seeded_v1'
if (!localStorage.getItem(DEMO_FLAG)) {
  // Note: Ensure loadOwnerDemo() in src/lib/seedDemo.js doesn't block with window.confirm() when auto-seeding
  loadOwnerDemo(true)
  loadRevenueDemo()
  localStorage.setItem(DEMO_FLAG, '1')
}

window.restroDemo = {
  load: loadOwnerDemo,
  revenue: loadRevenueDemo,
  clear: () => {
    localStorage.removeItem(DEMO_FLAG)
    clearDemo()
  },
  report: demoReport,
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <ToastViewport />
  </React.StrictMode>
)