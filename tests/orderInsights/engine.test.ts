import { describe, expect, it } from 'vitest'
import { computeSummary, computeTopProducts, computeOverview } from '../../shared/orderInsights/engine'
import type { OrderRecord } from '../../shared/orderInsights/types'

const NOW = '2026-07-15T09:00:00.000Z' // this_month = July 2026

const orders: OrderRecord[] = [
  { id: 'o1', branch: 'רמלה', branchCode: '101', createdAt: '2026-07-03T08:00:00.000Z', status: 'dispatched', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 5 },
    { productId: 'p2', name: 'מגש', supplier: 'ניר', price: 20, quantity: 2 },
  ] },
  { id: 'o2', branch: 'לוד', branchCode: '102', createdAt: '2026-07-10T08:00:00.000Z', status: 'pending', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 3 },
  ] },
  { id: 'o3', branch: 'רמלה', branchCode: '101', createdAt: '2026-06-20T08:00:00.000Z', status: 'dispatched', items: [
    { productId: 'p1', name: 'כוס', supplier: 'טרה', price: 10, quantity: 100 },
  ] },
  { id: 'o4', branch: 'לוד', branchCode: '102', createdAt: '2026-07-05T08:00:00.000Z', status: 'deleted', items: [
    { productId: 'p2', name: 'מגש', supplier: 'ניר', price: 20, quantity: 50 },
  ] },
]

describe('computeSummary', () => {
  it('totals + supplier groups for this_month, excluding out-of-range and deleted', () => {
    const r = computeSummary(orders, { period: 'this_month', groupBy: 'supplier' }, NOW)
    expect(r.range.label).toBe('יולי 2026')
    expect(r.totals).toEqual({ spendExVat: 120, spendWithVat: 140.4, orders: 2, units: 10 })
    expect(r.groups.map(g => [g.key, g.spendExVat, g.orders, g.units])).toEqual([['טרה', 80, 2, 8], ['ניר', 40, 1, 2]])
  })

  it('supplier filter narrows to item-level and groups by branch', () => {
    const r = computeSummary(orders, { period: 'this_month', groupBy: 'branch', supplier: 'טרה' }, NOW)
    expect(r.filters).toEqual({ supplier: 'טרה' })
    expect(r.totals.spendExVat).toBe(80)
    expect(r.groups.map(g => [g.key, g.spendExVat])).toEqual([['101', 50], ['102', 30]])
  })

  it('groupBy none returns totals only', () => {
    const r = computeSummary(orders, { period: 'this_month', groupBy: 'none' }, NOW)
    expect(r.groups).toEqual([])
    expect(r.totals.spendExVat).toBe(120)
  })

  it('empty range yields zeros, not an error', () => {
    const r = computeSummary(orders, { from: '2020-01-01', to: '2020-01-31' }, NOW)
    expect(r.totals).toEqual({ spendExVat: 0, spendWithVat: 0, orders: 0, units: 0 })
    expect(r.groups).toEqual([])
  })
})

describe('computeTopProducts', () => {
  it('aggregates by productId and sorts by the chosen metric', () => {
    const t = computeTopProducts(orders, { period: 'this_month', by: 'quantity' }, NOW)
    expect(t.by).toBe('quantity')
    expect(t.products[0]).toMatchObject({ productId: 'p1', units: 8, spendExVat: 80, orders: 2 })
    expect(t.products[1]).toMatchObject({ productId: 'p2', units: 2, spendExVat: 40 })
  })
  it('respects limit', () => {
    const t = computeTopProducts(orders, { period: 'this_month', by: 'spend', limit: 1 }, NOW)
    expect(t.products).toHaveLength(1)
    expect(t.products[0].productId).toBe('p1')
  })
})

describe('computeOverview', () => {
  it('summarizes pending/today/week/month, branches by recency, top suppliers', () => {
    const ov = computeOverview(orders, NOW)
    expect(ov.pending).toEqual({ orders: 1, spendExVat: 30 })       // o2 only
    expect(ov.thisMonth).toEqual({ orders: 2, spendExVat: 120 })    // o1 + o2
    expect(ov.branches[0].branchCode).toBe('102')                   // o2 Jul10 latest
    expect(ov.branches.find(b => b.branchCode === '101')?.thisMonthSpendExVat).toBe(90) // o1 only, o3 is June
    expect(ov.topSuppliersThisMonth).toEqual([{ supplier: 'טרה', spendExVat: 80 }, { supplier: 'ניר', spendExVat: 40 }])
  })
})
