export default function Badge({children,tone='slate'}) {
 const tones={slate:'bg-slate-100 text-slate-600',green:'bg-emerald-50 text-emerald-700',orange:'bg-orange-50 text-orange-700',red:'bg-rose-50 text-rose-700',blue:'bg-blue-50 text-blue-700'}
 return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]||tones.slate}`}>{children}</span>
}