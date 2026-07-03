import { describe, expect, it } from 'vitest'
import { routeInsights } from '../../shared/orderInsights/router'
import type { OrderRecord } from '../../shared/orderInsights/types'

const NOW = '2026-07-15T09:00:00.000Z'
const orders: OrderRecord[] = [
  { id: 'o1', branch: 'רמלה', branchCode: '101', createdAt: '2026-07-03T08:00:00.000Z', status: 'dispatched', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 5 },
    { productId: 'p2', name: 'מגש', supplier: 'ניר', price: 20, quantity: 2 },
  ] },
  { id: 'o2', branch: 'לוד', branchCode: '102', createdAt: '2026-07-10T08:00:00.000Z', status: 'pending', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 3 },
  ] },
]
const base = { method: 'GET', path: '/api/insights/summary', query: {}, role: 'gpt' as const }

describe('routeInsights', () => {
  it('forbids the app role (cross-branch analytics is admin/gpt only)', () => {
    expect(routeInsights({ ...base, role: 'app' }, orders, NOW).statusCode).toBe(403)
  })
  it('rejects non-GET', () => {
    expect(routeInsights({ ...base, method: 'POST' }, orders, NOW).statusCode).toBe(405)
  })
  it('404 on unknown path', () => {
    expect(routeInsights({ ...base, path: '/api/insights/nope' }, orders, NOW).statusCode).toBe(404)
  })
  it('400 on invalid period', () => {
    expect(routeInsights({ ...base, query: { period: 'bogus' } }, orders, NOW).statusCode).toBe(400)
  })
  it('200 summary returns correct totals', () => {
    const res = routeInsights({ ...base, query: { period: 'this_month', groupBy: 'supplier' } }, orders, NOW)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).totals.spendExVat).toBe(120)
  })
  it('overview response stays well under 100KB for ~450 orders', () => {
    const many: OrderRecord[] = Array.from({ length: 450 }, (_, i) => ({
      id: 'x' + i, branch: 'רמלה', branchCode: String(101 + (i % 9)), createdAt: '2026-07-0' + (1 + (i % 9)) + 'T08:00:00.000Z',
      status: 'dispatched', items: [{ productId: 'p' + (i % 20), name: 'פריט', supplier: 'ספק' + (i % 8), price: 5, quantity: 3 }],
    }))
    const res = routeInsights({ ...base, path: '/api/insights/overview' }, many, NOW)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeLessThan(100000)
  })
})
