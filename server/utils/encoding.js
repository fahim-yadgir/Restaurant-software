// Small helpers for turning bytes <-> text. Used by password hashing and licenses.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const utf8 = (text) => encoder.encode(text)
export const fromUtf8 = (bytes) => decoder.decode(bytes)

// base64url = base64 that is safe inside URLs / tokens (no + / =)
export function b64uEncode(input) {
  const bytes = typeof input === 'string' ? utf8(input) : input
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64uDecode(text) {
  const base64 = String(text).replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)

  return bytes
}

// Compares two byte arrays in constant time, so timing cannot reveal how many
// bytes matched (used for passwords).
export function bytesEqual(a, b) {
  if (a.length !== b.length) return false

  let diff = 0

  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]

  return diff === 0
}