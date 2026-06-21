import { describe, expect, it } from 'vitest'
import { PRODUCTS, INITIAL_SUPPLIERS } from '../../src/data/products'
import { createCatalogSeed } from '../../shared/priceCatalog/legacySeed'

describe('legacy seed', () => {
  it('reconciles every current supplier and product exactly once', () => {
    const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, '2026-06-20T00:00:00.000Z')
    expect(seed.version).toBe(1)
    expect(seed.suppliers).toHaveLength(8)
    expect(seed.products).toHaveLength(291) // 270 + 21 שהוחזרו בפיוס מול פרודקשן
    expect(new Set(seed.products.map(product => product.id)).size).toBe(291)
    expect(seed.products.every(product => product.packagePrice > 0)).toBe(true)
  })

  it('preserves legacy IDs and package prices', () => {
    const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, '2026-06-20T00:00:00.000Z')
    for (const legacy of PRODUCTS) {
      const product = seed.products.find(candidate => candidate.id === legacy.id)
      expect(product?.packagePrice).toBe(legacy.price)
    }
  })
})
