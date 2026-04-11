import type { CartItem } from '../stores/cartStore'
import type { Order } from '../stores/ordersStore'

interface OrderForPrint {
  branch: string
  branchCode: string
  items: CartItem[]
  notes?: string
  totalPrice?: number
  createdAt?: string
}

const formatPrice = (price: number) =>
  price.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2 })

const calculateVAT = (total: number) => total * 0.17
const calculateTotal = (total: number) => total * 1.17

function buildHTML(order: OrderForPrint, isAdmin: boolean): string {
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })

  const time = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  // קיבוץ פריטים לפי ספק
  const groupedItems = order.items.reduce((acc, item) => {
    if (!acc[item.supplier]) acc[item.supplier] = []
    acc[item.supplier].push(item)
    return acc
  }, {} as Record<string, CartItem[]>)

  const totalBeforeVAT = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const vat = calculateVAT(totalBeforeVAT)
  const totalWithVAT = calculateTotal(totalBeforeVAT)

  const supplierSections = Object.entries(groupedItems).map(([supplier, items]) => {
    const rows = items.map(item => {
      const priceRow = isAdmin
        ? `<td class="price">${formatPrice(item.price)}</td>
           <td class="price">${formatPrice(item.price * item.quantity)}</td>`
        : ''
      return `<tr>
        <td>${item.name}</td>
        <td class="center">${item.quantity}</td>
        ${priceRow}
      </tr>`
    }).join('')

    const headerPriceCols = isAdmin
      ? '<th class="price">מחיר ליח׳</th><th class="price">סה"כ</th>'
      : ''

    return `
      <div class="supplier-section">
        <div class="supplier-header">${supplier}</div>
        <table>
          <thead>
            <tr>
              <th>מוצר</th>
              <th class="center">כמות</th>
              ${headerPriceCols}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `
  }).join('')

  const financialSection = isAdmin ? `
    <div class="financial-section">
      <h3>סיכום כספי</h3>
      <div class="financial-row"><span>סה"כ לפני מע"מ</span><span>${formatPrice(totalBeforeVAT)}</span></div>
      <div class="financial-row"><span>מע"מ (17%)</span><span>${formatPrice(vat)}</span></div>
      <div class="financial-row total"><span>סה"כ כולל מע"מ</span><span>${formatPrice(totalWithVAT)}</span></div>
    </div>
  ` : ''

  const notesSection = order.notes ? `
    <div class="notes-section">
      <strong>הערות:</strong> ${order.notes}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>הזמנת רכש - ${order.branch}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Arial', 'David', sans-serif;
      direction: rtl;
      color: #1a1a1a;
      font-size: 13px;
      padding: 24px;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #92400e;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 900;
      color: #92400e;
    }
    .company-sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .order-meta { text-align: left; font-size: 12px; color: #4b5563; }
    .order-meta .branch { font-size: 15px; font-weight: 700; color: #1a1a1a; }
    .order-meta .date { margin-top: 4px; }
    .supplier-section { margin-bottom: 20px; }
    .supplier-header {
      background: #78350f;
      color: white;
      font-weight: 700;
      font-size: 14px;
      padding: 8px 12px;
      border-radius: 4px 4px 0 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #fef3c7;
      padding: 7px 10px;
      text-align: right;
      font-weight: 700;
      font-size: 11px;
      color: #92400e;
      border-bottom: 1px solid #fde68a;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 12px;
    }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fafafa; }
    .center { text-align: center; }
    .price { text-align: left; white-space: nowrap; }
    .financial-section {
      margin-top: 20px;
      border: 2px solid #f59e0b;
      border-radius: 6px;
      padding: 14px;
      background: #fffbeb;
    }
    .financial-section h3 {
      font-size: 14px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 10px;
      border-bottom: 1px solid #fde68a;
      padding-bottom: 6px;
    }
    .financial-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 13px;
    }
    .financial-row.total {
      font-weight: 900;
      font-size: 16px;
      border-top: 2px solid #f59e0b;
      margin-top: 6px;
      padding-top: 8px;
      color: #92400e;
    }
    .notes-section {
      margin-top: 16px;
      padding: 10px 12px;
      background: #f9fafb;
      border-right: 3px solid #d97706;
      border-radius: 0 4px 4px 0;
      font-size: 12px;
    }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
    }
    @media print {
      body { padding: 10px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">משאוושה</div>
      <div class="company-sub">רשת חומוסיות</div>
    </div>
    <div class="order-meta">
      <div class="branch">${order.branch}</div>
      <div class="date">${date} | ${time}</div>
    </div>
  </div>

  ${supplierSections}
  ${financialSection}
  ${notesSection}

  <div class="footer">
    מסמך זה הופק ממערכת הזמנות משאוושה
  </div>
</body>
</html>`
}

export function printOrderAsPDF(order: OrderForPrint, isAdmin: boolean) {
  const html = buildHTML(order, isAdmin)
  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  // delay to ensure rendering
  setTimeout(() => {
    win.print()
  }, 400)
}

// עבור הזמנות שמורות מהיסטוריה
export function printSavedOrderAsPDF(order: Order, isAdmin: boolean) {
  printOrderAsPDF(order, isAdmin)
}
