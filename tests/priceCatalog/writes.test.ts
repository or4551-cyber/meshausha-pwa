import { describe, expect, it } from 'vitest'
import {
  buildPriceUpdate,
  buildAdminOnlyUpdate,
  buildDeactivate,
  buildAddProduct,
  buildAddSupplier,
} from '../../src/lib/priceCatalogWrites'
import { ChangeOperationSchema } from '../../shared/priceCatalog/types'
import { createCatalogSeed } from '../../shared/priceCatalog/legacySeed'
import { applyChangeSet, createChangeSet } from '../../shared/priceCatalog/engine'

const NOW = '2026-06-21T12:00:00.000Z'
const LATER = '2026-06-21T13:00:00.000Z'

// snapshot זרע קטן ל-round-trip מול ה-engine.
function seed() {
  return createCatalogSeed(
    [{ id: 'terra', name: 'טרה פלסט' }],
    [{ id: 'tp1', name: 'גביע 500', supplier: 'טרה פלסט', price: 150 }],
    NOW,
  )
}

describe('priceCatalogWrites — pure op builders', () => {
  it('buildPriceUpdate produces a schema-valid updateProduct with packagePrice + effectiveFrom', () => {
    const op = buildPriceUpdate('tp1', 175, NOW)
    expect(() => ChangeOperationSchema.parse(op)).not.toThrow()
    expect(op).toMatchObject({ type: 'updateProduct', productId: 'tp1' })
    expect(op.type === 'updateProduct' && op.patch.packagePrice).toBe(175)
    expect(op.type === 'updateProduct' && op.patch.effectiveFrom).toBe(NOW)
  })

  it('buildAdminOnlyUpdate produces an updateProduct that only patches adminOnly', () => {
    const op = buildAdminOnlyUpdate('tp1', true)
    expect(() => ChangeOperationSchema.parse(op)).not.toThrow()
    expect(op).toEqual({ type: 'updateProduct', productId: 'tp1', patch: { adminOnly: true } })
  })

  it('buildDeactivate produces a schema-valid deactivateProduct', () => {
    const op = buildDeactivate('tp1')
    expect(() => ChangeOperationSchema.parse(op)).not.toThrow()
    expect(op).toEqual({ type: 'deactivateProduct', productId: 'tp1' })
  })

  it('buildAddProduct produces a full schema-valid CatalogProduct with normalized name', () => {
    const op = buildAddProduct(
      { supplierId: 'terra', name: '  גביע   חדש  ', packagePrice: 99, adminOnly: true, category: 'כלים' },
      { id: 'new-1', now: NOW },
    )
    expect(() => ChangeOperationSchema.parse(op)).not.toThrow()
    if (op.type !== 'addProduct') throw new Error('expected addProduct')
    expect(op.product).toMatchObject({
      id: 'new-1', supplierId: 'terra', name: '  גביע   חדש  ', packagePrice: 99,
      adminOnly: true, category: 'כלים', active: true, supplierSku: null, sourceId: 'admin',
    })
    expect(op.product.normalizedName).toBe('גביע חדש') // נורמל: רווחים מצומצמים
    expect(op.product.normalizedName.length).toBeGreaterThan(0)
  })

  it('buildAddSupplier produces a schema-valid CatalogSupplier (VAT-excluded, active)', () => {
    const op = buildAddSupplier('ספק חדש', { id: 'sup-1' })
    expect(() => ChangeOperationSchema.parse(op)).not.toThrow()
    expect(op).toEqual({
      type: 'addSupplier',
      supplier: { id: 'sup-1', name: 'ספק חדש', aliases: [], active: true, pricesExcludeVat: true, lastPriceListAt: null },
    })
  })

  it('round-trips through the engine: price update changes the active product price', () => {
    const active = seed()
    const change = createChangeSet(active, [buildPriceUpdate('tp1', 200, LATER)], {
      id: 'cs-1', source: 'admin', now: LATER, expiresAt: '2026-06-21T13:10:00.000Z',
    })
    const next = applyChangeSet(active, change, LATER)
    expect(next.products.find(p => p.id === 'tp1')?.packagePrice).toBe(200)
  })

  it('round-trips through the engine: deactivate removes the product from the active set', () => {
    const active = seed()
    const change = createChangeSet(active, [buildDeactivate('tp1')], {
      id: 'cs-2', source: 'admin', now: LATER, expiresAt: '2026-06-21T13:10:00.000Z',
    })
    const next = applyChangeSet(active, change, LATER)
    expect(next.products.find(p => p.id === 'tp1')?.active).toBe(false)
  })

  it('round-trips through the engine: addSupplier + addProduct land a new product under a new supplier', () => {
    const active = seed()
    const change = createChangeSet(
      active,
      [
        buildAddSupplier('ספק חדש', { id: 'sup-9' }),
        buildAddProduct({ supplierId: 'sup-9', name: 'מוצר חדש', packagePrice: 50 }, { id: 'prod-9', now: LATER }),
      ],
      { id: 'cs-3', source: 'admin', now: LATER, expiresAt: '2026-06-21T13:10:00.000Z' },
    )
    const next = applyChangeSet(active, change, LATER)
    expect(next.suppliers.find(s => s.id === 'sup-9')?.name).toBe('ספק חדש')
    const created = next.products.find(p => p.id === 'prod-9')
    expect(created?.supplierId).toBe('sup-9')
    expect(created?.packagePrice).toBe(50)
  })
})
