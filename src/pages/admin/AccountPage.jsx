import { useEffect, useState } from 'react'
import { LogOut, KeyRound, ShieldCheck } from 'lucide-react'

import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'

import { adminChangePassword, adminMe } from '@/lib/adminApi'

const card = 'rounded-2xl border border-slate-200 bg-white p-5'

// Super admin account page: profile, change password and sign out.
export default function AccountPage({ onLogout }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    adminMe()
      .then((data) => setEmail(data.admin.email))
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold">Account & security</h2>
        <p className="mt-1 text-sm text-slate-500">Manage the platform admin password and sign out.</p>
      </div>

      <div className={card}>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-600">
            <ShieldCheck size={26} />
          </div>

          <div>
            <div className="font-bold">Super admin</div>
            <div className="text-sm text-slate-500">{email || '…'}</div>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-bold">
              <KeyRound size={17} /> Password
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Use a strong password (at least 8 characters) that only you know. Changing it signs out every other session.
            </p>
          </div>

          <Button onClick={() => setOpen(true)}>Change password</Button>
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-bold">
              <LogOut size={17} /> Sign out
            </div>

            <p className="mt-1 text-sm text-slate-500">End this admin session on this browser.</p>
          </div>

          <Button variant="secondary" onClick={onLogout}>Sign out</Button>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        After 5 wrong password attempts the sign-in page is locked for 15 minutes.
      </p>

      {open && (
        <Modal title="Change password" subtitle="Super admin" size="sm" onClose={() => setOpen(false)}>
          <ChangePasswordForm
            minLength={8}
            onSubmit={adminChangePassword}
            onDone={() => setOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}