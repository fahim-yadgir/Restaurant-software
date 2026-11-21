export function readLocal(key, fallback) {
  try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value) } catch { return fallback }
}
export function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (error) { console.error('Could not save local data', error) }
}
