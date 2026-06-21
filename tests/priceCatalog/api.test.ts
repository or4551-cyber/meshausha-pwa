import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchActiveCatalog, getCatalogVersion, previewChanges, applyChange } from '../../src/lib/priceCatalogApi'
import type { CatalogProduct, CatalogSupplier, ChangeOperation } from '../../shared/priceCatalog/types'

const terra: CatalogSupplier = {
  id: 'terra', name: 'טרה פלסט', aliases: [], active: true, pricesExcludeVat: true, lastPriceListAt: null,
}
const product = (id: string, active = true): CatalogProduct => ({
  id, supplierId: 'terra', supplierSku: null, name: 'גביע ' + id, normalizedName: 'גביע ' + id,
  aliases: [], category: null, packagePrice: 150, packageQuantity: 500, unit: 'unit', unitPrice: 0.3,
  effectiveFrom: null, active, adminOnly: false, sourceId: 'seed-v1', updatedAt: '2026-06-20T00:00:00.000Z',
})

// מנתב לפי ה-URL ומחזיר Response מדומה. כל route: { ok?, status?, body }.
function stubFetch(routes: Array<[string, { ok?: boolean; status?: number; body: unknown }]>) {
  const fn = vi.fn(async (url: string, _init?: RequestInit) => {
    for (const [pattern, resp] of routes) {
      if (url.includes(pattern)) {
        return { ok: resp.ok ?? true, status: resp.status ?? 200, json: async () => resp.body } as Response
      }
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => { vi.unstubAllGlobals() })

describe('price catalog read client', () => {
  it('getCatalogVersion returns null on a non-2xx', async () => {
    stubFetch([['/catalog/version', { ok: false, status: 401, body: {} }]])
    expect(await getCatalogVersion()).toBeNull()
  })

  it('fetchActiveCatalog assembles version + active products on the happy path', async () => {
    stubFetch([
      ['/catalog/version', { body: { version: 1, checksum: 'c', createdAt: '2026-06-20T00:00:00.000Z' } }],
      ['/suppliers', { body: { version: 1, suppliers: [terra] } }],
      ['/products', { body: { version: 1, total: 2, offset: 0, products: [product('tp1'), product('tp2', false)] } }],
    ])
    const result = await fetchActiveCatalog()
    expect(result?.version).toBe(1)
    expect(result?.products).toHaveLength(1) // המוצר הלא-פעיל סונן
    expect(result?.products[0]).toMatchObject({ id: 'tp1', supplier: 'טרה פלסט', price: 150 })
  })

  it('returns null when suppliers come from a different version than versionInfo', async () => {
    stubFetch([
      ['/catalog/version', { body: { version: 2, checksum: 'c', createdAt: '2026-06-20T00:00:00.000Z' } }],
      ['/suppliers', { body: { version: 1, suppliers: [terra] } }], // אי-עקביות גרסה
      ['/products', { body: { version: 2, total: 1, offset: 0, products: [product('tp1')] } }],
    ])
    expect(await fetchActiveCatalog()).toBeNull()
  })

  it('returns null when a products page version drifts mid-pagination', async () => {
    stubFetch([
      ['/catalog/version', { body: { version: 1, checksum: 'c', createdAt: '2026-06-20T00:00:00.000Z' } }],
      ['/suppliers', { body: { version: 1, suppliers: [terra] } }],
      ['/products', { body: { version: 2, total: 1, offset: 0, products: [product('tp1')] } }], // גרסה השתנתה
    ])
    expect(await fetchActiveCatalog()).toBeNull()
  })
})

const op: ChangeOperation = { type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 200 } }

describe('price catalog write client', () => {
  it('previewChanges posts baseVersion+operations with the session bearer and returns the changeSet', async () => {
    const fn = stubFetch([['/changes/preview', { status: 201, body: { id: 'cs-1', warnings: [] } }]])
    const result = await previewChanges(1, [op], 'sess-tok')
    expect(result).toEqual({ ok: true, changeSet: { id: 'cs-1', warnings: [] } })
    const init = fn.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sess-tok')
    expect(JSON.parse(init.body as string)).toEqual({ baseVersion: 1, operations: [op] })
  })

  it('previewChanges surfaces a 409 stale_version as a structured error (no throw)', async () => {
    stubFetch([['/changes/preview', { ok: false, status: 409, body: { error: 'stale_version' } }]])
    expect(await previewChanges(1, [op], 'sess-tok')).toEqual({ ok: false, status: 409, error: 'stale_version' })
  })

  it('applyChange sends APPROVE + Idempotency-Key and returns the new snapshot', async () => {
    const snapshot = { version: 2, suppliers: [], products: [] }
    const fn = stubFetch([['/apply', { status: 200, body: snapshot }]])
    const result = await applyChange('cs-1', 'sess-tok', 'idem-1')
    expect(result).toEqual({ ok: true, snapshot })
    const url = fn.mock.calls[0][0]
    const init = fn.mock.calls[0][1] as RequestInit
    expect(String(url)).toContain('/changes/cs-1/apply')
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('idem-1')
    expect(JSON.parse(init.body as string)).toEqual({ confirmation: 'APPROVE' })
  })

  it('applyChange surfaces a 410 expired as a structured error', async () => {
    stubFetch([['/apply', { ok: false, status: 410, body: { error: 'expired' } }]])
    expect(await applyChange('cs-1', 'sess-tok', 'idem-1')).toEqual({ ok: false, status: 410, error: 'expired' })
  })
})
