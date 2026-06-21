import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchActiveCatalog, getCatalogVersion } from '../../src/lib/priceCatalogApi'
import type { CatalogProduct, CatalogSupplier } from '../../shared/priceCatalog/types'

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
  const fn = vi.fn(async (url: string) => {
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
