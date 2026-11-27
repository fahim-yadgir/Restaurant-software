// Stops password guessing: 5 wrong attempts from the same visitor (IP address) within 15 minutes
// lock that visitor out for 15 minutes. Counters live in the D1 table `login_attempts`.
//
//   const key = attemptKey(c, 'login')
//   await assertNotLocked(db, key)            // throws 429 while locked
//   ...wrong password?  const left = await recordFailure(db, key)
//   ...correct?         await clearFailures(db, key)

import { ApiError } from './errors.js'

export const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000

export const attemptKey = (c, kind) => `${kind}:${c.req.header('CF-Connecting-IP') || 'unknown'}`

export async function assertNotLocked(db, key) {
  const row = await db.prepare('SELECT locked_until FROM login_attempts WHERE key = ?').bind(key).first()
  const now = Date.now()

  if (row?.locked_until && row.locked_until > now) {
    const minutes = Math.ceil((row.locked_until - now) / 60000)

    throw new ApiError(
      429,
      'TOO_MANY_ATTEMPTS',
      `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
    )
  }
}

// Counts one wrong attempt. Returns how many attempts are left before the lock (0 = locked now).
// max = how many wrong attempts are allowed for this key (default 5).
export async function recordFailure(db, key, max = MAX_FAILURES) {
  const now = Date.now()
  const row = await db.prepare('SELECT failures, first_failed_at FROM login_attempts WHERE key = ?').bind(key).first()

  const fresh = !row || now - row.first_failed_at > WINDOW_MS
  const failures = fresh ? 1 : row.failures + 1
  const firstFailedAt = fresh ? now : row.first_failed_at
  const lockedUntil = failures >= max ? now + LOCK_MS : null

  await db.batch([
    db
      .prepare(
        `INSERT INTO login_attempts (key, failures, first_failed_at, locked_until) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           failures = excluded.failures,
           first_failed_at = excluded.first_failed_at,
           locked_until = excluded.locked_until`
      )
      .bind(key, failures, firstFailedAt, lockedUntil),
    // Housekeeping: counters that have expired no longer need to be remembered.
    db
      .prepare('DELETE FROM login_attempts WHERE first_failed_at < ? AND (locked_until IS NULL OR locked_until < ?)')
      .bind(now - WINDOW_MS, now),
  ])

  return Math.max(0, max - failures)
}

export const clearFailures = (db, key) => db.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run()