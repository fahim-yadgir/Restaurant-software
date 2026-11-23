import { useState } from 'react'
import { Utensils, WifiOff, ShieldCheck, Link2 } from 'lucide-react'

import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'

// license = the license saved on this device (null until the first online sign-in).
// onLogin(identifier, password) returns an error message, or '' on success.
export default function LoginPage({
  license,
  onLogin,
  onSwitchRestaurant,
}) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()

    if (!identifier.trim() || !password) {
      setError('Enter your email/mobile number and password.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const message = await onLogin(identifier, password)

      if (message) setError(message)
    } catch (err) {
      console.error('Login error:', err)
      setError('Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const switchRestaurant = () => {
    if (
      window.confirm(
        `Remove ${license.restaurantName} from this computer?\n\n${license.restaurantName} stays linked to this device until the software owner resets it. Use this only to sign in with a different restaurant.`
      )
    ) {
      onSwitchRestaurant()
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">

      {/* Left section */}
      <div className="flex flex-col justify-between bg-[#171f2d] p-10 text-white lg:p-16">

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500">
            <Utensils />
          </div>

          <span className="font-display text-xl font-extrabold">
            RestroDesk POS
          </span>
        </div>

        <div className="max-w-xl">

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-emerald-300">
            <WifiOff size={14} />
            Local counter edition
          </div>

          <h1 className="font-display text-5xl font-extrabold leading-tight">
            Billing and accounting,{' '}
            <span className="text-orange-400">
              without the internet.
            </span>
          </h1>

          <p className="mt-5 max-w-md leading-7 text-slate-400">
            Fast customer billing, menu management, expenses and reports.
            Your restaurant records stay on your local computer.
          </p>

          <div className="mt-9 grid gap-3 text-sm text-slate-300">
            <div>✓ Local-first restaurant operations</div>
            <div>✓ GST-ready billing and receipt printing</div>
            <div>✓ Sales, expenses and profit reports</div>
          </div>

        </div>

        <p className="text-xs text-slate-500">
          © 2026 RestroDesk
        </p>

      </div>

      {/* Login section */}
      <div className="flex items-center justify-center p-6">

        <form onSubmit={submit} className="w-full max-w-md">

          <div className="mb-8">

            <div className="text-sm font-bold uppercase tracking-widest text-orange-600">
              {license ? 'Welcome back' : 'Owner sign in'}
            </div>

            <h2 className="mt-2 font-display text-3xl font-extrabold">
              {license ? license.restaurantName : 'Sign in to RestroDesk'}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {license
                ? `Owner: ${license.ownerName}. Sign in with the email or mobile number registered for this restaurant.`
                : 'Sign in with the email or mobile number registered by the software owner.'}
            </p>

          </div>

          <div className="space-y-4">

            <Field
              label="Email or mobile number"
              value={identifier}
              onChange={setIdentifier}
              placeholder="owner@example.com or 9876543210"
              autoFocus
            />

            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />

            {error && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full py-3"
            >
              {busy ? 'Signing in...' : 'Sign in to Counter POS'}
            </Button>

          </div>

          {!license && (
            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              <Link2 className="mb-1" size={16} />
              The first sign-in on a computer needs internet. This account
              will be linked to this computer and cannot be used on another
              device. After that, the app works offline.
            </div>
          )}

          <div className="mt-4 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-800">
            <ShieldCheck className="mb-1" size={16} />
            Forgot your password or changing computers? Ask the software
            owner to reset the password or the device.
          </div>

          {license && (
            <button
              type="button"
              onClick={switchRestaurant}
              className="mt-4 w-full text-center text-sm font-semibold text-orange-600 hover:underline"
            >
              Not {license.restaurantName}? Switch restaurant
            </button>
          )}

        </form>

      </div>

    </div>
  )
}