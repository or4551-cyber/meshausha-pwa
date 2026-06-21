import { describe, expect, it } from 'vitest'
import { PRODUCTS, INITIAL_SUPPLIERS } from '../../src/data/products'
import { createCatalogSeed } from '../../shared/priceCatalog/legacySeed'

const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, '2026-06-20T00:00:00.000Z')

describe('legacy reconciliation', () => {
  it('reconciles all ids, total price, and supplier references', () => {
    expect(seed.products.map(p => p.id).sort()).toEqual(PRODUCTS.map(p => p.id).sort())
    expect(seed.products.reduce((sum, p) => sum + p.packagePrice, 0))
      .toBeCloseTo(PRODUCTS.reduce((sum, p) => sum + p.price, 0), 6)
    expect(new Set(seed.products.map(p => p.supplierId))).toEqual(new Set(seed.suppliers.map(s => s.id)))
  })

  it('matches the expected supplier product counts', () => {
    expect(Object.fromEntries(
      seed.suppliers.map(supplier => [
        supplier.name,
        seed.products.filter(product => product.supplierId === supplier.id).length,
      ]),
    )).toEqual({
      // ספירות אחרי פיוס מול פרודקשן (2026-06-21): הוחזרו 21 מוצרים חיים (+2 טרה, +17 יבולי, +1 תפוכן, +1 סלטים)
      'חטיפי אלקיים': 2,
      'מוטיפוד בע"מ': 1,
      'טרה פלסט (משאוושה)': 90,
      'יבולי שדה תמרה': 58,
      'תפוכן': 5,
      'קוקה קולה': 26,
      'סלטים משאוושה': 106,
      'נט פארם- מתקלות': 3,
    })
  })
})
