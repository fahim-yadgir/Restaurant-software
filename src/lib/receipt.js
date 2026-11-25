// Thermal (mini printer) receipt: 58 mm (2 inch) or 80 mm (3 inch) paper.
// The slip is built as a small standalone HTML page and printed from a hidden
// iframe, so only the slip prints (no blank / duplicate pages from the app).

import { APP_NAME } from '@/lib/appConfig'

export const PAPER_OPTIONS = [
  ['58', '58 mm (2 inch mini printer)'],
  ['80', '80 mm (3 inch printer)'],
]

export const PAPER_WIDTH_PX = { 58: 232, 80: 320 }

export const COPY_OPTIONS = [
  ['customer', 'Customer copy'],
  ['owner', 'Owner copy'],
]

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c])

const amount = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const showDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-')
  return y && m && d ? `${d}/${m}/${y}` : esc(iso || '')
}

export function buildReceiptHtml({ bill, restaurant = {}, copy = 'customer', paper = '58' }) {
  const width = paper === '80' ? 80 : 58
  const font = width === 80 ? 12 : 11
  const owner = copy === 'owner'

  const items = (bill.items || [])
    .map((x) => {
      const name = esc(x.name) + (x.variant ? ` (${esc(x.variant)})` : '')

      return `<div class="item">
        <div class="row"><span class="nm">${name}</span><b>${amount(x.price * x.qty)}</b></div>
        <div class="sub">${esc(x.qty)} × ${amount(x.price)}</div>
      </div>`
    })
    .join('')

  const discount = Number(bill.discount || 0)
  const tax = Number(bill.tax || 0)
  const roundOff =
    Number(bill.total || 0) -
    (Number(bill.subtotal || 0) - discount + tax)

  const line = (label, value, cls = '') =>
    `<div class="row ${cls}"><span>${label}</span><span>${value}</span></div>`

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(bill.id)}</title>
<style>
  @page { size: ${width}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: ${width}mm;
    padding: 3mm 2.5mm 9mm;
    font-family: Arial, Helvetica, sans-serif;
    font-size: ${font}px;
    line-height: 1.35;
    color: #000;
  }
  .c { text-align: center; }
  .tag { display: inline-block; border: 1px solid #000; padding: 1px 8px; font-weight: 700; letter-spacing: 1px; font-size: ${font - 1}px; }
  .name { font-size: ${font + 5}px; font-weight: 800; margin-top: 5px; text-transform: uppercase; word-break: break-word; }
  .small { font-size: ${font - 1}px; word-break: break-word; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .nm { flex: 1; word-break: break-word; }
  .item { margin-bottom: 4px; }
  .sub { font-size: ${font - 1}px; padding-left: 8px; }
  .total { font-size: ${font + 4}px; font-weight: 800; margin-top: 3px; }
  .foot { margin-top: 8px; }
</style></head>
<body>
  <div class="c"><span class="tag">${owner ? 'OWNER COPY' : 'CUSTOMER COPY'}</span></div>
  <div class="c">
    <div class="name">${esc(restaurant.name || 'Restaurant')}</div>
    ${restaurant.address ? `<div class="small">${esc(restaurant.address)}</div>` : ''}
    ${restaurant.phone ? `<div class="small">Ph: ${esc(restaurant.phone)}</div>` : ''}
    ${restaurant.gstin ? `<div class="small"><b>GSTIN: ${esc(restaurant.gstin)}</b></div>` : ''}
  </div>
  <div class="hr"></div>
  <div class="c"><b>TAX INVOICE</b></div>
  ${line('Bill No', esc(bill.id))}
  ${line('Date', `${showDate(bill.date)} ${esc(bill.time || '')}`)}
  ${line('Order', esc(bill.orderType))}
  ${line('Payment', esc(bill.payment))}
  <div class="hr"></div>
  ${items}
  <div class="hr"></div>
  ${line('Subtotal', amount(bill.subtotal))}
  ${discount > 0 ? line('Discount', `-${amount(discount)}`) : ''}
  ${line('CGST', amount(tax / 2))}
  ${line('SGST', amount(tax / 2))}
  ${Math.abs(roundOff) >= 0.005 ? line('Round off', `${roundOff > 0 ? '+' : '-'}${amount(Math.abs(roundOff))}`) : ''}
  <div class="hr"></div>
  ${line('GRAND TOTAL', `₹${amount(bill.total)}`, 'total')}
  <div class="hr"></div>
  <div class="c foot">
    <div>${owner ? 'Owner copy - keep for records' : 'Thank you! Visit again.'}</div>
    <div class="small" style="margin-top:4px">Software by <b>${esc(APP_NAME)}</b></div>
  </div>
</body></html>`
}

export function printReceipt(html) {
  const frame = document.createElement('iframe')

  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'

  document.body.appendChild(frame)

  const doc = frame.contentWindow.document

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => setTimeout(() => frame.remove(), 500)

  frame.contentWindow.onafterprint = cleanup

  setTimeout(() => {
    frame.contentWindow.focus()
    frame.contentWindow.print()

    // Fallback if the browser never fires afterprint.
    setTimeout(() => frame.isConnected && frame.remove(), 120000)
  }, 250)
}