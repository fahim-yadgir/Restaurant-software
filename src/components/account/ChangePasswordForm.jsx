
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'

import { notifySuccess, notifyError } from '@/lib/toast'

export default function ChangePasswordForm({ onSubmit, onDone }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event) => {
    event.preventDefault()

    if (!current) {
      setError('Enter your current password.')
      return
    }

    if (next.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (next === current) {
      setError('New password must be different from the current one.')
      return
    }

    if (next !== confirm) {
      setError('New password and confirm password do not match.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const problem = await onSubmit(current, next)

      if (problem) {
        setError(problem)
        notifyError(problem)
        return
      }

      setDone(true)
      notifySuccess('Password changed successfully!')
    } catch (err) {
      const message = err.message || 'Could not change password.'

      setError(message)
      notifyError(message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2
          className="mx-auto text-emerald-500"
          size={44}
        />

        <div className="font-bold">
          Password changed successfully
        </div>

        <p className="text-sm text-slate-500">
          Use your new password the next time you sign in.
        </p>

        <Button onClick={onDone} className="w-full">
          Done
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Current password"
        type="password"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        autoFocus
      />

      <Field
        label="New password (min 6 characters)"
        type="password"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
      />

      <Field
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />

      {error && (
        <p className="form-error">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={onDone}
          type="button"
        >
          Cancel
        </Button>

        <Button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Change password'}
        </Button>
      </div>
    </form>
  )
}
