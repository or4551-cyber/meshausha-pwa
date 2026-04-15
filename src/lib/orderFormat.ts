import { formatPrice } from './utils'

interface Item {
  name: string
  quantity: number
  price?: number
  supplier?: string
}

interface BranchItems {
  branch: string
  items: Item[]
  notes?: string
}

const SEP = '━━━━━━━━━━━━━━━━━━━━'
const dateStr = () => new Date().toLocaleDateString('he-IL')

/** מיישר טבלה: שם מוצר משמאל (עם ריפוד נקודות), כמות מימין */
function formatRows(items: Item[], showPrice: boolean): string {
  const NAME_WIDTH = 22
  return items.map(it => {
    const name = it.name.length > NAME_WIDTH ? it.name.slice(0, NAME_WIDTH - 1) + '…' : it.name
    const padded = name.padEnd(NAME_WIDTH, ' ')
    const qty = `× ${it.quantity}`
    const priceCol = showPrice && it.price ? `   ${formatPrice(it.price * it.quantity)}` : ''
    return `${padded}${qty}${priceCol}`
  }).join('\n')
}

/** הזמנה מסניף לספק יחיד (טבלה אחת) */
export function formatSingleSupplierOrder(opts: {
  branch: string
  supplier: string
  items: Item[]
  notes?: string
  showPrice?: boolean
}): string {
  const { branch, supplier, items, notes, showPrice = false } = opts
  const total = items.reduce((s, i) => s + i.quantity, 0)
  let text = `🛒 *משאוושה — הזמנה*\n`
  text += `📍 ${branch}  •  📅 ${dateStr()}\n\n`
  text += `📦 *${supplier}*\n`
  text += '```\n'
  text += `${SEP}\n`
  text += formatRows(items, showPrice) + '\n'
  text += `${SEP}\n`
  text += '```'
  text += `\n📊 *סה"כ:* ${items.length} פריטים  •  ${total} יחידות`
  if (notes) text += `\n\n📝 _הערות:_ ${notes}`
  return text
}

/** הזמנה מסניף לאדמין/ספק עם מספר ספקים */
export function formatMultiSupplierOrder(opts: {
  branch: string
  groups: Record<string, Item[]>
  notes?: string
  showPrice?: boolean
  showFinancial?: { totalBeforeVAT: number; vat: number; totalWithVAT: number }
}): string {
  const { branch, groups, notes, showPrice = false, showFinancial } = opts
  let text = `🛒 *משאוושה — הזמנה חדשה*\n`
  text += `📍 ${branch}  •  📅 ${dateStr()}\n\n`

  Object.entries(groups).forEach(([supplier, items]) => {
    const total = items.reduce((s, i) => s + i.quantity, 0)
    text += `📦 *${supplier}*\n`
    text += '```\n'
    text += `${SEP}\n`
    text += formatRows(items, showPrice) + '\n'
    text += `${SEP}\n`
    text += '```'
    text += `\n_${items.length} פריטים • ${total} יחידות_\n\n`
  })

  if (showFinancial) {
    text += `💰 *סיכום כספי:*\n`
    text += '```\n'
    text += `לפני מע"מ:  ${formatPrice(showFinancial.totalBeforeVAT)}\n`
    text += `מע"מ 17%:   ${formatPrice(showFinancial.vat)}\n`
    text += `${SEP}\n`
    text += `סה"כ:       ${formatPrice(showFinancial.totalWithVAT)}\n`
    text += '```\n'
  }

  if (notes) text += `\n📝 _הערות:_ ${notes}`
  return text
}

/** הזמנה מאוחדת לספק עם מספר סניפים (Dispatch) */
export function formatDispatchOrder(opts: {
  supplier: string
  branches: BranchItems[]
}): string {
  const { supplier, branches } = opts
  let text = `🛒 *הזמנה — ${supplier}*\n`
  text += `📅 ${dateStr()}\n\n`

  branches.forEach(({ branch, items, notes }) => {
    const filtered = items.filter(i => i.quantity > 0)
    if (filtered.length === 0) return
    const total = filtered.reduce((s, i) => s + i.quantity, 0)
    text += `📍 *${branch}*\n`
    text += '```\n'
    text += `${SEP}\n`
    text += formatRows(filtered, false) + '\n'
    text += `${SEP}\n`
    text += '```'
    text += `\n_${total} יחידות_`
    if (notes) text += `\n📝 ${notes}`
    text += '\n\n'
  })

  return text.trimEnd()
}
