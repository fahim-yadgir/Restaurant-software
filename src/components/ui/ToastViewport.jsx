
import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const styles = {
  success: 'border-emerald-200 bg-white text-emerald-700',
  error: 'border-rose-200 bg-white text-rose-700',
  info: 'border-blue-200 bg-white text-blue-700',
}

export default function ToastViewport() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (event) => {
      const toast = event.detail

      setToasts((old) => [...old, toast])

      window.setTimeout(() => {
        setToasts((old) => old.filter((item) => item.id !== toast.id))
      }, 3500)
    }

    window.addEventListener('restrodesk:toast', handleToast)

    return () => {
      window.removeEventListener('restrodesk:toast', handleToast)
    }
  }, [])

  const removeToast = (id) => {
    setToasts((old) => old.filter((item) => item.id !== id))
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || Info

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border p-4 shadow-xl ${styles[toast.type] || styles.info}`}
          >
            <Icon size={22} className="shrink-0" />

            <p className="flex-1 text-sm font-semibold">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded-lg p-1 opacity-60 hover:bg-slate-100 hover:opacity-100"
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
