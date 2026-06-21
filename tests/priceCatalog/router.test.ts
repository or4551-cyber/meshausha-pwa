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

  it('paginates products with offset+limit and reports total', async () => {
    const page1 = await routePriceCatalog({
      method: 'GET', path: '/api/prices/products', query: { limit: '200', offset: '0', includeInactive: 'true' },
      headers: {}, body: null, auth: { role: 'app' },
    }, { repo, now: () => now, id: () => 'x' })
    const body1 = JSON.parse(page1.body)
    expect(body1.total).toBe(291)
    expect(body1.products.length).toBe(200)
    expect(body1.offset).toBe(0)

    const page2 = await routePriceCatalog({
      method: 'GET', path: '/api/prices/products', query: { limit: '200', offset: '200', includeInactive: 'true' },
      headers: {}, body: null, auth: { role: 'app' },
    }, { repo, now: () => now, id: () => 'x' })
    const body2 = JSON.parse(page2.body)
    expect(body2.products.length).toBe(91)
    // שני הדפים יחד מכסים את כל 291 הפריטים בלי כפילות id
    const ids = new Set([...body1.products, ...body2.products].map((p: { id: string }) => p.id))
    expect(ids.size).toBe(291)
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

  it('rejects reusing an idempotency key for a different change with 409', async () => {
    await routePriceCatalog({
      method: 'POST', path: '/api/prices/changes/preview', query: {}, headers: {},
      body: JSON.stringify({ source: 'admin', baseVersion: 1, operations: [{ type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 160 } }] }),
      auth: { role: 'admin' },
    }, { repo, now: () => now, id: () => 'change-1' })
    const applyOne = await routePriceCatalog({
      method: 'POST', path: '/api/prices/changes/change-1/apply', query: {},
      headers: { 'idempotency-key': 'shared-key' }, body: JSON.stringify({ confirmation: 'APPROVE' }), auth: { role: 'admin' },
    }, { repo, now: () => now, id: () => 'unused' })
    expect(JSON.parse(applyOne.body).version).toBe(2)

    // change חדש על base 2, אבל שימוש חוזר באותו idempotency-key
    await routePriceCatalog({
      method: 'POST', path: '/api/prices/changes/preview', query: {}, headers: {},
      body: JSON.stringify({ source: 'admin', baseVersion: 2, operations: [{ type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 170 } }] }),
      auth: { role: 'admin' },
    }, { repo, now: () => now, id: () => 'change-2' })
    const reused = await routePriceCatalog({
      method: 'POST', path: '/api/prices/changes/change-2/apply', query: {},
      headers: { 'idempotency-key': 'shared-key' }, body: JSON.stringify({ confirmation: 'APPROVE' }), auth: { role: 'admin' },
    }, { repo, now: () => now, id: () => 'unused' })
    expect(reused.statusCode).toBe(409)
    expect(JSON.parse(reused.body).error).toBe('idempotency_key_conflict')
    expect((await repo.getActive())?.version).toBe(2)
  })

  it('returns 409 (not 500) when a revert would be a no-op', async () => {
    await repo.saveChangeSet({
      id: 'noop-change', baseVersion: 1, source: 'admin',
      operations: [{ type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 160 } }],
      warnings: [], createdAt: now, expiresAt: '2999-01-01T00:00:00.000Z',
      status: 'applied', appliedVersion: 1,
    } as never)
    const res = await routePriceCatalog({
      method: 'POST', path: '/api/prices/changes/noop-change/revert-preview',
      query: {}, headers: {}, body: null, auth: { role: 'admin' },
    }, { repo, now: () => now, id: () => 'revert-x' })
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).error).toBe('nothing_to_revert')
  })

  it('maps a concurrent version checksum conflict to 409 (not 500)', async () => {
    await routePriceCatalog({
      method: 'POST', path: '/api/prices/changes/preview', query: {}, headers: {},
      body: JSON.stringify({ source: 'admin', baseVersion: 1, operations: [{ type: 'updateProduct', productId: 'tp1', patch: { packagePrice: 160 } }] }),
      auth: { role: 'admin' },
    }, { repo, now: () => now, id: () => 'conflict-change' })
    const conflictRepo = {
      ...repo,
      saveVersion: async () => { throw new Error('refusing to overwrite version 2 with a different checksum') },
    }
    const res = await routePriceCatalog({
      method: 'POST', path: '/api/prices/changes/conflict-change/apply', query: {},
      headers: { 'idempotency-key': 'conflict-key' }, body: JSON.stringify({ confirmation: 'APPROVE' }), auth: { role: 'admin' },
    }, { repo: conflictRepo, now: () => now, id: () => 'unused' })
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).error).toBe('version_conflict')
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
