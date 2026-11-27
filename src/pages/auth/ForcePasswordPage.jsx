import { KeyRound } from 'lucide-react'

import ChangePasswordForm from '@/components/account/ChangePasswordForm'

// Shown right after sign-in while the owner still has the temporary password from the admin.
// onChangePassword(current, next) returns an error message, or '' on success (the page then closes by itself).
export default function ForcePasswordPage({ license, onChangePassword, onLogout }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600">
            <KeyRound size={22} />
          </div>

          <div>
            <h1 className="font-display text-xl font-extrabold">Set your own password</h1>
            <p className="text-sm text-slate-500">{license.restaurantName}</p>
          </div>
        </div>

        <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          The software owner gave you a temporary password. Choose a new password that only you know to
          continue. This needs the internet once.
        </p>

        <ChangePasswordForm onSubmit={onChangePassword} onDone={onLogout} />
      </div>
    </div>
  )
}