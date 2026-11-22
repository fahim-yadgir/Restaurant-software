// Platform admin sign-in (DEMO). The first password is "demo123". After the admin changes it, only a salted hash
// of the new password is saved in this browser. For real use, move this to a secure server.
import { readLocal, writeLocal } from '@/lib/localStore'
import { hashPassword, randomSalt } from '@/lib/registry'

export const ADMIN_EMAIL = 'admin@restrodesk.com'
const KEY = 'rd_admin_cred'
const DEFAULT_PASSWORD = 'demo123'

export const usingDefaultPassword = () => !readLocal(KEY, null)

export async function verifyAdminLogin(email, password) {
  if (String(email).trim().toLowerCase() !== ADMIN_EMAIL) return false
  const saved = readLocal(KEY, null)
  if (!saved) return password === DEFAULT_PASSWORD
  return (await hashPassword(password, saved.salt)) === saved.hash
}

// Returns '' on success, otherwise a message to show.
export async function changeAdminPassword(current, next) {
  if (!(await verifyAdminLogin(ADMIN_EMAIL, current))) return 'Current password is incorrect.'
  const salt = randomSalt()
  writeLocal(KEY, { salt, hash: await hashPassword(next, salt) })
  return ''
}