import StatusBadge from '@/components/admin/StatusBadge'
import Button from '@/components/ui/Button'
import { getRestaurantStatus, formatDate, formatRemaining } from '@/lib/registry'

export default function OverviewPage({ registry, now, onOpenRestaurants }) {
  const withStatus = registry.map((r) => ({ r, status: getRestaurantStatus(r, now) }))
  const count = (...s) => withStatus.filter((x) => s.includes(x.status)).length
  const cards = [['Registered restaurants', registry.length], ['Active subscriptions', count('active', 'expiring')], ['Awaiting first login', count('pending')], ['Expiring / expired', count('expiring', 'expired')]]
  const attention = withStatus.filter((x) => x.status !== 'active')
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-extrabold">Software admin</h2><p className="mt-1 text-sm text-slate-500">Overview of every registered restaurant and its subscription.</p></div><Button onClick={onOpenRestaurants}>Register a restaurant</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-2 font-display text-3xl font-extrabold">{value}</div></div>)}</div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4 font-bold">Needs attention</div>
      <table className="w-full text-left text-sm"><tbody>
        {attention.map(({ r, status }) => { return <tr key={r.id} className="border-t border-slate-100 first:border-0"><td className="px-5 py-4 font-bold">{r.name}<div className="text-xs font-normal text-slate-500">{r.ownerName} · {r.mobile}</div></td><td className="px-5 py-4"><StatusBadge status={status} /></td><td className="px-5 py-4 text-xs text-slate-500">{r.activatedAt ? `${formatDate(r.expiresAt)} · ${formatRemaining(r.expiresAt, now)}` : 'Not logged in yet'}</td></tr> })}
        {attention.length === 0 && <tr><td className="px-5 py-8 text-center text-slate-500">{registry.length ? 'All restaurants are active.' : 'No restaurants registered yet.'}</td></tr>}
      </tbody></table>
    </div>
  </div>
}