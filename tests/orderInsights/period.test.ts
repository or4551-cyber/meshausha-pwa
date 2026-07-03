import { describe, expect, it } from 'vitest'
import { resolvePeriod, resolveExplicit } from '../../shared/orderInsights/period'

describe('resolvePeriod (Asia/Jerusalem, DST-aware)', () => {
  it('this_month in July (IDT, UTC+3) spans Israel-local month boundaries', () => {
    const r = resolvePeriod('this_month', '2026-07-15T09:00:00.000Z')
    expect(r.from).toBe('2026-06-30T21:00:00.000Z') // 1 Jul 00:00 +03:00
    expect(r.to).toBe('2026-07-31T21:00:00.000Z')   // 1 Aug 00:00 +03:00
    expect(r.label).toBe('יולי 2026')
  })
  it('this_month in January (IST, UTC+2) uses the winter offset', () => {
    const r = resolvePeriod('this_month', '2026-01-15T09:00:00.000Z')
    expect(r.from).toBe('2025-12-31T22:00:00.000Z') // 1 Jan 00:00 +02:00
    expect(r.to).toBe('2026-01-31T22:00:00.000Z')
  })
  it('last_month steps back one calendar month', () => {
    const r = resolvePeriod('last_month', '2026-07-15T09:00:00.000Z')
    expect(r.from).toBe('2026-05-31T21:00:00.000Z')
    expect(r.to).toBe('2026-06-30T21:00:00.000Z')
    expect(r.label).toBe('יוני 2026')
  })
  it('last_30d is a rolling window ending now', () => {
    const now = '2026-07-15T09:00:00.000Z'
    const r = resolvePeriod('last_30d', now)
    expect(r.to).toBe(now)
    expect(r.from).toBe(new Date(Date.parse(now) - 30 * 86400000).toISOString())
  })
  it('all starts at the epoch', () => {
    const r = resolvePeriod('all', '2026-07-15T09:00:00.000Z')
    expect(r.from).toBe('1970-01-01T00:00:00.000Z')
  })
})

describe('resolveExplicit', () => {
  it('treats to-date as inclusive (adds one day) at Israel midnight', () => {
    const r = resolveExplicit('2026-07-01', '2026-07-31')
    expect(r.from).toBe('2026-06-30T21:00:00.000Z')
    expect(r.to).toBe('2026-07-31T21:00:00.000Z')
  })
})
