import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

import {
  COPY_OPTIONS,
  PAPER_OPTIONS,
  PAPER_WIDTH_PX,
  buildReceiptHtml,
  printReceipt,
} from '@/lib/receipt'

const PAPER_KEY = 'rd_receipt_paper'

const readPaper = () => {
  try {
    return localStorage.getItem(PAPER_KEY) === '80' ? '80' : '58'
  } catch {
    return '58'
  }
}

const selectClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm'

// restaurant = { name, address, gstin, phone }
export default function InvoiceModal({ bill, restaurant, onClose }) {
  const [copy, setCopy] = useState('customer')
  const [paper, setPaper] = useState(readPaper)

  const html = useMemo(
    () => (bill ? buildReceiptHtml({ bill, restaurant, copy, paper }) : ''),
    [bill, restaurant, copy, paper]
  )

  if (!bill) return null

  const changePaper = (value) => {
    setPaper(value)

    try {
      localStorage.setItem(PAPER_KEY, value)
    } catch {
      // Ignore unavailable local storage.
    }
  }

  const missingDetails = !restaurant?.address || !restaurant?.gstin

  return (
    <Modal
      title={`Invoice ${bill.id}`}
      subtitle="Choose the copy and paper size, then print one slip"
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-600">
          Copy
          <select
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            className={selectClass}
          >
            {COPY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-semibold text-slate-600">
          Paper size
          <select
            value={paper}
            onChange={(e) => changePaper(e.target.value)}
            className={selectClass}
          >
            {PAPER_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {missingDetails && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          Add your restaurant address and GSTIN in Settings to print them on
          the bill.
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl bg-slate-100 p-3">
        <iframe
          key={paper}
          title="Receipt preview"
          srcDoc={html}
          onLoad={(e) => {
            const doc = e.target.contentDocument

            if (doc) {
              e.target.style.height = `${doc.documentElement.scrollHeight + 4}px`
            }
          }}
          style={{ width: PAPER_WIDTH_PX[paper], height: 420 }}
          className="mx-auto block border-0 bg-white shadow"
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>

        <Button onClick={() => printReceipt(html)}>
          <Printer size={15} />
          Print {copy === 'owner' ? 'owner' : 'customer'} copy
        </Button>
      </div>
    </Modal>
  )
}