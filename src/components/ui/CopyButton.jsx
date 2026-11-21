import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import Button from '@/components/ui/Button'

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

export default function CopyButton({ text, label = 'Copy', variant = 'secondary' }) {
  const [copied, setCopied] = useState(false)
  const click = async () => { if (await copyText(text)) { setCopied(true); window.setTimeout(() => setCopied(false), 1500) } }
  return <Button variant={variant} onClick={click} className="!px-3 !py-2 text-xs">{copied ? <Check size={14}/> : <Copy size={14}/>}{copied ? 'Copied' : label}</Button>
}
