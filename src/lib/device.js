
const DEVICE_STORAGE_KEY = 'restrodesk_installation_device_id'

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY)

  if (deviceId) {
    return deviceId
  }

  deviceId = `rd-${crypto.randomUUID()}`

  localStorage.setItem(DEVICE_STORAGE_KEY, deviceId)

  return deviceId
}
