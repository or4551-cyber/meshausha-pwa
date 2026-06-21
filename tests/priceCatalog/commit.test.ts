import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { commitCatalogOperations, buildPriceUpdate } from '../../src/lib/priceCatalogWrites'
import { authenticateWithPin, clearPriceSession } from '../../src/lib/priceAdminSession'
import type { CatalogProduct, CatalogSupplier } from '../../shared/priceCatalog/types'

const NOW = '2026-06-21T12:00:00.000Z'
const future = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const terra: CatalogSupplier = {
  id: 'terra', name: 'טרה פלסט', aliases: [], active: true, pricesExcludeVat: true, lastPriceListAt: null,
}
const tp1 = (price: number): CatalogProduct => ({
  id: 'tp1', supplierId: 'terra', supplierSku: null, name: 'גביע 500', normalizedName: 'גביע 500',
  aliases: [], category: null, packagePrice: price, packageQuantity: null, unit: null, unitPrice: null,
  effectiveFrom: null, active: true, adminOnly: false, sourceId: 'seed-v1', updatedAt: NOW,
})

// stub גמיש: מנתב לפי URL; ל-preview אפשר לספק רצף תגובות (לבדיקת stale→retry).
function stub(routes: {
  version?: { version: number }
  previewSeq?: Array<{ status: number; body: unknown }>
  apply?: { status: number; body: unknown }
}) {
  let previewCall = 0
  const fn = vi.fn(async (url: string, _init?: RequestInit) => {
    const u = String(url)
    if (u.includes('/api/price-auth')) {
      return { ok: true, status: 200, json: async () => ({ token: 'sess-tok', expiresAt: future() }) } as Response
    }
    if (u.includes('/catalog/version')) {
      const v = routes.version ?? { version: 1 }
      return { ok: true, status: 200, json: async () => ({ ...v, checksum: 'c', createdAt: NOW }) } as Response
    }
    if (u.includes('/changes/preview')) {
      const seq = routes.previewSeq ?? [{ status: 201, body: { id: 'cs-1', warnings: [] } }]
      const r = seq[Math.min(previewCall, seq.length - 1)]
      previewCall += 1
      return { ok: r.status < 300, status: r.status, json: async () => r.body } as Response
    }
    if (u.includes('/apply')) {
      const a = routes.apply ?? { status: 200, body: { version: 2, suppliers: [terra], products: [tp1(200)] } }
      return { ok: a.status < 300, status: a.status, json: async () => a.body } as Response
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => clearPriceSession())
afterEach(() => { vi.unstubAllGlobals(); clearPriceSession() })

describe('commitCatalogOperations', () => {
  it('happy path: session → version → preview → apply → adapted snapshot', async () => {
    stub({
      version: { version: 1 },
      previewSeq: [{ status: 201, body: { id: 'cs-1', warnings: ['tp1: price change 33.33%'] } }],
      apply: { status: 200, body: { version: 2, suppliers: [terra], products: [tp1(200)] } },
    })
    await authenticateWithPin('9999')
    const result = await commitCatalogOperations([buildPriceUpdate('tp1', 200, NOW)])
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.version).toBe(2)
    expect(result.products).toHaveLength(1)
    expect(result.products[0]).toMatchObject({ id: 'tp1', price: 200, supplier: 'טרה פלסט' })
    expect(result.warnings).toEqual(['tp1: price change 33.33%'])
  })

  it('refreshes version and retries preview once on 409 stale_version', async () => {
    const fn = stub({
      version: { version: 1 },
      previewSeq: [
        { status: 409, body: { error: 'stale_version' } },
        { status: 201, body: { id: 'cs-2', warnings: [] } },
      ],
      apply: { status: 200, body: { version: 3, suppliers: [terra], products: [tp1(200)] } },
    })
    await authenticateWithPin('9999')
    const result = await commitCatalogOperations([buildPriceUpdate('tp1', 200, NOW)])
    expect(result.ok).toBe(true)
    // preview נקרא פעמיים (stale ואז הצלחה)
    const previewCalls = fn.mock.calls.filter(c => String(c[0]).includes('/changes/preview'))
    expect(previewCalls).toHaveLength(2)
  })

  it('returns no_session when not authenticated', async () => {
    stub({})
    const result = await commitCatalogOperations([buildPriceUpdate('tp1', 200, NOW)])
    expect(result).toEqual({ ok: false, error: 'no_session' })
  })

  it('threads an explicit idempotencyKey to the apply call (stable across retries)', async () => {
    const fn = stub({
      version: { version: 1 },
      previewSeq: [{ status: 201, body: { id: 'cs-1', warnings: [] } }],
      apply: { status: 200, body: { version: 2, suppliers: [terra], products: [tp1(200)] } },
    })
    await authenticateWithPin('9999')
    await commitCatalogOperations([buildPriceUpdate('tp1', 200, NOW)], { idempotencyKey: 'idem-stable' })
    const applyCall = fn.mock.calls.find(c => String(c[0]).includes('/apply'))
    const init = applyCall?.[1] as RequestInit
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('idem-stable')
  })

  it('surfaces an apply failure (version_conflict)', async () => {
    stub({
      version: { version: 1 },
      previewSeq: [{ status: 201, body: { id: 'cs-1', warnings: [] } }],
      apply: { status: 409, body: { error: 'version_conflict' } },
    })
    await authenticateWithPin('9999')
    const result = await commitCatalogOperations([buildPriceUpdate('tp1', 200, NOW)])
    expect(result).toEqual({ ok: false, error: 'version_conflict' })
  })
})
