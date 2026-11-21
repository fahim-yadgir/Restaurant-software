import {useState} from 'react'
import {Plus,X} from 'lucide-react'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import {CUSTOM,getCategories,getGstSlabs} from '@/lib/menuOptions'

const selectCls='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400'
const newRow=()=>({id:`${Date.now()}-${Math.random()}`,name:'',price:''})

export default function FoodForm({onAdd,foods=[]}) {
  const categories=getCategories(foods)
  const slabs=getGstSlabs(foods)

  const [name,setName]=useState('')
  const [category,setCategory]=useState('Main Course')
  const [customCategory,setCustomCategory]=useState('')
  const [half,setHalf]=useState('')
  const [full,setFull]=useState('')
  const [extras,setExtras]=useState([])          // custom portions: [{id,name,price}]
  const [gst,setGst]=useState('5')
  const [customGst,setCustomGst]=useState('')
  const [error,setError]=useState('')

  const updateExtra=(id,key,value)=>setExtras(old=>old.map(r=>r.id===id?{...r,[key]:value}:r))

  const submit=e=>{
    e.preventDefault()

    const dish=name.trim()
    if(!dish) return setError('Enter the food item name.')

    // Category (existing or custom)
    let finalCategory=category
    if(category===CUSTOM){
      const c=customCategory.trim()
      if(!c) return setError('Enter the custom category name.')
      finalCategory=categories.find(x=>x.toLowerCase()===c.toLowerCase())||c
    }

    // GST (slab or custom)
    let rate=Number(gst)
    if(gst===CUSTOM){
      rate=Number(customGst)
      if(customGst===''||!Number.isFinite(rate)||rate<0||rate>100) return setError('Enter a custom GST rate between 0 and 100.')
      rate=Math.round(rate*100)/100
    }

    // Portions: Half, Full and any number of custom portions
    const variants=[]
    if(half!==''){ if(!(Number(half)>0)) return setError('Half price must be more than 0.'); variants.push({name:'Half',price:Number(half)}) }
    if(full!==''){ if(!(Number(full)>0)) return setError('Full price must be more than 0.'); variants.push({name:'Full',price:Number(full)}) }
    for(const r of extras){
      const n=r.name.trim()
      if(!n&&r.price==='') continue                       // ignore empty rows
      if(!n||!(Number(r.price)>0)) return setError('Each custom portion needs a name and a price above 0.')
      if(variants.some(v=>v.name.toLowerCase()===n.toLowerCase())) return setError(`Portion "${n}" is added twice.`)
      variants.push({name:n,price:Number(r.price)})
    }
    if(!variants.length) return setError('Add at least one portion price (Half, Full or Custom).')

    onAdd({name:dish,category:finalCategory,gst:rate,active:true,variants})

    // reset form (keep the category / GST just used so repeated entry is quick)
    setName('');setHalf('');setFull('');setExtras([]);setError('')
    setCategory(finalCategory);setCustomCategory('')
    setGst(String(rate));setCustomGst('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <Field label="Food item name" value={name} onChange={setName} placeholder="e.g. Paneer Tikka"/>

      {/* Category */}
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Category</span>
          <select value={category} onChange={e=>setCategory(e.target.value)} className={selectCls}>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
            <option value={CUSTOM}>+ Custom category…</option>
          </select>
        </label>
        {category===CUSTOM&&<Field label="Custom category name" value={customCategory} onChange={setCustomCategory} placeholder="e.g. Chaat Corner"/>}
      </div>

      {/* Portions */}
      <div className="md:col-span-2">
        <div className="mb-2 text-xs font-semibold text-slate-600">Portion prices (fill at least one)</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Half price" type="number" min="0" value={half} onChange={setHalf} placeholder="140"/>
          <Field label="Full price" type="number" min="0" value={full} onChange={setFull} placeholder="240"/>
        </div>

        {extras.length>0&&<div className="mt-3 space-y-2">
          {extras.map(r=>(
            <div key={r.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Field label="Custom portion name" value={r.name} onChange={v=>updateExtra(r.id,'name',v)} placeholder="e.g. Small, Quarter, Large"/>
              <Field label="Price" type="number" min="0" value={r.price} onChange={v=>updateExtra(r.id,'price',v)} placeholder="90"/>
              <button type="button" onClick={()=>setExtras(extras.filter(x=>x.id!==r.id))} className="mb-1 grid h-10 w-10 place-items-center rounded-xl text-rose-500 hover:bg-rose-50" title="Remove portion"><X size={16}/></button>
            </div>
          ))}
        </div>}

        <button type="button" onClick={()=>setExtras([...extras,newRow()])} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-orange-300 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50">
          <Plus size={14}/> Add custom portion
        </button>
      </div>

      {/* GST */}
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">GST slab</span>
          <select value={gst} onChange={e=>setGst(e.target.value)} className={selectCls}>
            {slabs.map(s=><option key={s} value={String(s)}>{s}%</option>)}
            <option value={CUSTOM}>+ Custom GST…</option>
          </select>
        </label>
        {gst===CUSTOM&&<Field label="Custom GST rate (%)" type="number" min="0" max="100" step="0.01" value={customGst} onChange={setCustomGst} placeholder="e.g. 7.5"/>}
      </div>

      <div className="flex items-end"><Button type="submit" className="w-full md:w-auto">Add food item</Button></div>
      {error&&<p className="form-error md:col-span-2">{error}</p>}
    </form>
  )
}