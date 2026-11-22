// One labelled progress bar, used for payment split and expense categories.
export default function BarRow({label,value,percent,color='bg-orange-500'}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate text-slate-600">{label}</span><b className="shrink-0">{value}</b></div>
      <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color}`} style={{width:`${Math.min(100,Math.max(0,percent))}%`}}/></div>
    </div>
  )
}