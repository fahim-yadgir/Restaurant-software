
import { useEffect, useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react'

const toastStyles = {
  success: {
    icon: CheckCircle,
    color: 'border-emerald-500',
    iconColor: 'text-emerald-600',
  },
  error: {
    icon: XCircle,
    color: 'border-red-500',
    iconColor: 'text-red-600',
  },
  info: {
    icon: Info,
    color: 'border-blue-500',
    iconColor: 'text-blue-600',
  },
  confirm: {
    icon: AlertTriangle,
    color: 'border-amber-500',
    iconColor: 'text-amber-600',
  },
}

export default function ToastViewport() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (event) => {
      const toast = event.detail

      if (!toast?.message) return

      const id = toast.id || `${Date.now()}-${Math.random()}`

      const newToast = {
        ...toast,
        id,
        type: toastStyles[toast.type] ? toast.type : 'success',
      }

      setToasts((previous) => [...previous, newToast])

      // Confirmation must remain until user chooses
      if (newToast.type !== 'confirm') {
        setTimeout(() => {
          setToasts((previous) =>
            previous.filter((item) => item.id !== id)
          )
        }, 3500)
      }
    }

    window.addEventListener('restrodesk:toast', handleToast)

    return () => {
      window.removeEventListener('restrodesk:toast', handleToast)
    }
  }, [])

  const removeToast = (toast, result = false) => {
    if (toast.type === 'confirm') {
      toast.resolve?.(result)
    }

    setToasts((previous) =>
      previous.filter((item) => item.id !== toast.id)
    )
  }

  return (
    <div className="fixed right-4 top-4 z-[99999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const style = toastStyles[toast.type]
        const Icon = style.icon

        return (
          <div
            key={toast.id}
            role={toast.type === 'confirm' ? 'alertdialog' : 'status'}
            className={`rounded-xl border-l-4 ${style.color} bg-white p-4 shadow-2xl`}
          >
            <div className="flex items-start gap-3">
              <Icon
                size={23}
                className={`mt-0.5 shrink-0 ${style.iconColor}`}
              />

              <div className="min-w-0 flex-1">
                {toast.type === 'confirm' && (
                  <h3 className="text-sm font-bold text-slate-900">
                    {toast.title}
                  </h3>
                )}

                <p className="mt-1 text-sm text-slate-700">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast, false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close notification"
              >
                <X size={18} />
              </button>
            </div>

            {toast.type === 'confirm' && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => removeToast(toast, false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => removeToast(toast, true)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
