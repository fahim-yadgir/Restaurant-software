import {useEffect} from 'react'
import {createPortal} from 'react-dom'
import {X} from 'lucide-react'

const SIZES={sm:'max-w-md',md:'max-w-xl',lg:'max-w-3xl'}

// Popup dialog used for every form. Closes with the X button, the Esc key or a click outside.
export default function Modal({title,subtitle,onClose,size='md',children}) {
  useEffect(()=>{
    const onKey=e=>{if(e.key==='Escape') onClose?.()}
    document.addEventListener('keydown',onKey)
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    return ()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=previous}
  },[onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center" onMouseDown={e=>{if(e.target===e.currentTarget) onClose?.()}}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`my-auto w-full ${SIZES[size]||SIZES.md} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
            {subtitle&&<p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18}/></button>
        </div>
        {/* Forms placed directly inside lose their own card border so they sit cleanly in the popup */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 [&>form]:rounded-none [&>form]:border-0 [&>form]:bg-transparent [&>form]:p-0">{children}</div>
      </div>
    </div>,
    document.body
  )
}