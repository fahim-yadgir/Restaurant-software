import { useState } from 'react'
import { ShieldCheck, Utensils, LockKeyhole } from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { adminLogin } from '@/lib/adminApi'

export default function AdminLoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      await adminLogin(email, password)
      onLogin()
    } catch (err) {
      setError(err.message || 'Could not sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
    <section className="flex flex-col justify-between bg-[#171f2d] p-8 text-white sm:p-12 lg:p-16">
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500"><Utensils /></div><span className="font-display text-xl font-extrabold">RestroDesk POS</span></div>
      <div className="max-w-xl py-12"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-orange-300"><ShieldCheck size={15}/> PLATFORM ADMINISTRATION</div><h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">Manage every restaurant from one place.</h1><p className="mt-5 max-w-md leading-7 text-slate-400">Sign in to manage restaurant accounts and subscription plans.</p></div>
      <p className="text-xs text-slate-500">© 2026 RestroDesk · Platform Admin</p>
    </section>
    <section className="flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-7"><div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-600"><LockKeyhole size={22}/></div><div className="text-sm font-bold uppercase tracking-widest text-orange-600">Secure area</div><h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900">Platform admin login</h2><p className="mt-2 text-sm text-slate-500">This page is available directly at <b>/admin/login</b>.</p></div>
        <Field label="Admin email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full py-3">{busy ? 'Checking…' : 'Sign in to Platform Admin'}</Button>
      </form>
    </section>
  </main>
}