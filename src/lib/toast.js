
export function notify(message, type = 'success') {
  window.dispatchEvent(
    new CustomEvent('restrodesk:toast', {
      detail: {
        id: `${Date.now()}-${Math.random()}`,
        message,
        type,
      },
    })
  )
}

export const notifySuccess = (message) => notify(message, 'success')
export const notifyError = (message) => notify(message, 'error')
export const notifyInfo = (message) => notify(message, 'info')
