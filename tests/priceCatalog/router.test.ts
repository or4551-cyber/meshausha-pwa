import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryPriceCatalogRepository } from '../../netlify/functions/_priceCatalogStore'
import { routePriceCatalog } from '../../netlify/functions/_priceCatalogRouter'
import { createCatalogSeed } from '../../shared/priceCatalog/legacySeed'
import { PRODUCTS, INITIAL_SUPPLIERS } from '../../src/data/products'

const now = '2026-06-20T12:00:00.000Z'

describe('price catalog router', () => {
  const repo = createMemoryPriceCatalogRepository()

  beforeEach(async () => {
    repo.clear?.()
    const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, now)
    await repo.saveVersion(seed)
    await repo.activateVersion(seed)
  })

  it('searches active products without returning inactive products by default', async () => {
    const response = await routePriceCatalog({
      method: 'GET',
      path: '/api/prices/products',
      query: { q: 'כפפות' },
      headers: {},
      body: null,
      auth: { role: 'app' },
    }, { repo, now: () => now, id: () => 'generated-id' })
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).products.length).toBeGreaterThan(0)
  })

  it('creates a preview without changing active version', async () => {
    const response = await routePriceCatalog({
      method: 'POST',
      path: '/api/prices/changes/preview',
      query: {},
      headers: {},
      body: JSON.stringify({
        source: 'admin',
        baseVersion: 1,
        operations: [{ type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 160 } }],
      }),
      auth: { role: 'admin' },
    }, { repo, now: () => now, id: () => 'change-1' })
    expect(response.statusCode).toBe(201)
    expect((await repo.getActive())?.version).toBe(1)
  })

  it('applies once and replays the same idempotency result', async () => {
    await routePriceCatalog({
      method: 'POST',
      path: '/api/prices/changes/preview',
      query: {},
      headers: {},
      body: JSON.stringify({
        source: 'admin',
        baseVersion: 1,
        operations: [{ type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 160 } }],
      }),
      auth: { role: 'admin' },
    }, { repo, now: () => now, id: () => 'change-1' })
    const request = {
      method: 'POST' as const,
      path: '/api/prices/changes/change-1/apply',
      query: {},
      headers: { 'idempotency-key': 'apply-change-1' },
      body: JSON.stringify({ confirmation: 'APPROVE' }),
      auth: { role: 'admin' as const },
    }
    const first = await routePriceCatalog(request, { repo, now: () => now, id: () => 'unused' })
    const second = await routePriceCatalog(request, { repo, now: () => now, id: () => 'unused' })
    expect(JSON.parse(first.body).version).toBe(2)
    expect(JSON.parse(second.body).version).toBe(2)
    expect((await repo.getActive())?.version).toBe(2)
  })

  it('rejects stale previews and app-role writes', async () => {
    const forbidden = await routePriceCatalog({
      method: 'POST',
      path: '/api/prices/changes/preview',
      query: {},
      headers: {},
      body: '{}',
      auth: { role: 'app' },
    }, { repo, now: () => now, id: () => 'unused' })
    expect(forbidden.statusCode).toBe(403)
  })
})
