import type {
  OrderRecord, OrderItemRecord, SummaryQuery, SummaryResult, SummaryGroup,
  GroupBy, ResolvedRange, TopProductsQuery, TopProductsResult, OverviewResult,
} from './types'
import { resolvePeriod, resolveExplicit, israelParts, HE_MONTHS, HE_WEEKDAYS } from './period'

const NOTE_EXVAT = 'סכומים לפני מע"מ; spendWithVat = ×1.17'

export function isActive(o: OrderRecord): boolean {
  return o.status === 'pending' || o.status === 'dispatched'
}
export function inRange(o: OrderRecord, range: ResolvedRange): boolean {
  return o.createdAt >= range.from && o.createdAt < range.to // ISO-UTC strings sort chronologically
}
export function orderSubtotal(o: OrderRecord): number {
  return o.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0)
}
export const round2 = (n: number): number => Math.round(n * 100) / 100
export const withVat = (exVat: number): number => round2(exVat * 1.17)

function rangeFor(q: { period?: string; from?: string; to?: string }, nowISO: string): ResolvedRange {
  return q.from && q.to ? resolveExplicit(q.from, q.to) : resolvePeriod((q.period as PeriodPresetLike) ?? 'this_month', nowISO)
}
type PeriodPresetLike = Parameters<typeof resolvePeriod>[0]

function groupKey(o: OrderRecord, it: OrderItemRecord, groupBy: GroupBy): { key: string; label: string } {
  switch (groupBy) {
    case 'supplier': return { key: it.supplier, label: it.supplier }
    case 'branch':   return { key: o.branchCode, label: o.branch }
    case 'month':    { const p = israelParts(new Date(o.createdAt)); return { key: `${p.year}-${String(p.month).padStart(2, '0')}`, label: `${HE_MONTHS[p.month - 1]} ${p.year}` } }
    case 'weekday':  { const wd = israelParts(new Date(o.createdAt)).weekday; return { key: String(wd), label: HE_WEEKDAYS[wd] } }
    default:         return { key: 'all', label: 'הכל' }
  }
}

function buildGroups(scoped: OrderRecord[], groupBy: GroupBy, supplierFilter?: string): SummaryGroup[] {
  if (groupBy === 'none') return []
  const map = new Map<string, { label: string; spend: number; units: number; orders: Set<string> }>()
  for (const o of scoped) {
    for (const it of o.items) {
      if (supplierFilter && it.supplier !== supplierFilter) continue
      const { key, label } = groupKey(o, it, groupBy)
      let g = map.get(key)
      if (!g) { g = { label, spend: 0, units: 0, orders: new Set() }; map.set(key, g) }
      g.spend += (Number(it.price) || 0) * (Number(it.quantity) || 0)
      g.units += Number(it.quantity) || 0
      g.orders.add(o.id)
    }
  }
  return [...map.entries()].map(([key, g]) => ({
    key, label: g.label, spendExVat: round2(g.spend), spendWithVat: withVat(g.spend), orders: g.orders.size, units: g.units,
  }))
}

export function computeSummary(orders: OrderRecord[], query: SummaryQuery, nowISO: string): SummaryResult {
  const range = rangeFor(query, nowISO)
  const groupBy = query.groupBy ?? 'none'
  const limit = query.limit ?? 50
  const filters: { branchCode?: string; supplier?: string } = {}
  if (query.branchCode) filters.branchCode = query.branchCode
  if (query.supplier) filters.supplier = query.supplier

  const scoped = orders.filter(o => isActive(o) && inRange(o, range) && (!query.branchCode || o.branchCode === query.branchCode))

  let spend = 0, units = 0
  const orderIds = new Set<string>()
  for (const o of scoped) {
    for (const it of o.items) {
      if (query.supplier && it.supplier !== query.supplier) continue
      spend += (Number(it.price) || 0) * (Number(it.quantity) || 0)
      units += Number(it.quantity) || 0
      orderIds.add(o.id)
    }
  }

  const groups = buildGroups(scoped, groupBy, query.supplier)
    .sort((a, b) => b.spendExVat - a.spendExVat)
    .slice(0, limit)

  return {
    range, groupBy, filters,
    totals: { spendExVat: round2(spend), spendWithVat: withVat(spend), orders: orderIds.size, units },
    groups, note: NOTE_EXVAT,
  }
}

export function computeTopProducts(orders: OrderRecord[], query: TopProductsQuery, nowISO: string): TopProductsResult {
  const range = rangeFor(query, nowISO)
  const by = query.by ?? 'spend'
  const limit = Math.min(query.limit ?? 10, 50)
  const filters: { branchCode?: string; supplier?: string } = {}
  if (query.branchCode) filters.branchCode = query.branchCode
  if (query.supplier) filters.supplier = query.supplier

  const scoped = orders.filter(o => isActive(o) && inRange(o, range) && (!query.branchCode || o.branchCode === query.branchCode))
  const map = new Map<string, { productId?: string; name: string; supplier: string; units: number; spend: number; orders: Set<string> }>()
  for (const o of scoped) {
    for (const it of o.items) {
      if (query.supplier && it.supplier !== query.supplier) continue
      const key = it.productId || `${it.name}|${it.supplier}`
      let p = map.get(key)
      if (!p) { p = { productId: it.productId, name: it.name, supplier: it.supplier, units: 0, spend: 0, orders: new Set() }; map.set(key, p) }
      p.units += Number(it.quantity) || 0
      p.spend += (Number(it.price) || 0) * (Number(it.quantity) || 0)
      p.orders.add(o.id)
    }
  }
  const products = [...map.values()]
    .map(p => ({ ...(p.productId ? { productId: p.productId } : {}), name: p.name, supplier: p.supplier, units: p.units, spendExVat: round2(p.spend), orders: p.orders.size }))
    .sort((a, b) => (by === 'quantity' ? b.units - a.units : b.spendExVat - a.spendExVat))
    .slice(0, limit)
  return { range, by, filters, products, note: 'סכומים לפני מע"מ' }
}

export function computeOverview(orders: OrderRecord[], nowISO: string): OverviewResult {
  const today = resolvePeriod('today', nowISO)
  const week = resolvePeriod('this_week', nowISO)
  const month = resolvePeriod('this_month', nowISO)
  const active = orders.filter(isActive)

  const sumRange = (range: ResolvedRange) => {
    let spend = 0; const ids = new Set<string>()
    for (const o of active) if (inRange(o, range)) { spend += orderSubtotal(o); ids.add(o.id) }
    return { orders: ids.size, spendExVat: round2(spend) }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const pending = { orders: pendingOrders.length, spendExVat: round2(pendingOrders.reduce((s, o) => s + orderSubtotal(o), 0)) }

  const branchMap = new Map<string, { branch: string; lastOrderAt?: string; pendingOrders: number; monthSpend: number }>()
  for (const o of active) {
    let b = branchMap.get(o.branchCode)
    if (!b) { b = { branch: o.branch, pendingOrders: 0, monthSpend: 0 }; branchMap.set(o.branchCode, b) }
    if (!b.lastOrderAt || o.createdAt > b.lastOrderAt) b.lastOrderAt = o.createdAt
    if (o.status === 'pending') b.pendingOrders++
    if (inRange(o, month)) b.monthSpend += orderSubtotal(o)
  }
  const branches = [...branchMap.entries()]
    .map(([branchCode, b]) => ({ branchCode, branch: b.branch, ...(b.lastOrderAt ? { lastOrderAt: b.lastOrderAt } : {}), pendingOrders: b.pendingOrders, thisMonthSpendExVat: round2(b.monthSpend) }))
    .sort((a, b) => (b.lastOrderAt ?? '').localeCompare(a.lastOrderAt ?? ''))

  const supMap = new Map<string, number>()
  for (const o of active) if (inRange(o, month)) for (const it of o.items) supMap.set(it.supplier, (supMap.get(it.supplier) ?? 0) + (Number(it.price) || 0) * (Number(it.quantity) || 0))
  const topSuppliersThisMonth = [...supMap.entries()].map(([supplier, spend]) => ({ supplier, spendExVat: round2(spend) })).sort((a, b) => b.spendExVat - a.spendExVat).slice(0, 5)

  return { now: nowISO, pending, today: sumRange(today), thisWeek: sumRange(week), thisMonth: sumRange(month), branches, topSuppliersThisMonth }
}
