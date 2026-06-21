import { describe, expect, it } from 'vitest'
import {
  catalogProductToLegacy,
  adaptCatalogSnapshot,
} from '../../src/lib/priceCatalogAdapter'
import type { CatalogProduct, CatalogSupplier, CatalogSnapshot } from '../../shared/priceCatalog/types'

const terra: CatalogSupplier = {
  id: 'terra',
  name: 'טרה פלסט',
  aliases: [],
  active: true,
  pricesExcludeVat: true,
  lastPriceListAt: null,
}

const product: CatalogProduct = {
  id: 'tp1',
  supplierId: 'terra',
  supplierSku: null,
  name: 'גביע',
  normalizedName: 'גביע',
  aliases: [],
  category: 'אריזות',
  packagePrice: 150,
  packageQuantity: 500,
  unit: 'unit',
  unitPrice: 0.3,
  effectiveFrom: null,
  active: true,
  adminOnly: false,
  sourceId: 'seed-v1',
  updatedAt: '2026-06-20T00:00:00.000Z',
}

describe('catalog frontend adapter', () => {
  it('preserves the legacy price and supplier fields', () => {
    const legacy = catalogProductToLegacy(product, terra)
    expect(legacy).toMatchObject({
      id: 'tp1',
      supplier: 'טרה פלסט',
      price: 150,
      packageQuantity: 500,
      unitPrice: 0.3,
      category: 'אריזות',
      supplierId: 'terra',
      sourceId: 'seed-v1',
    })
  })

  it('maps nullable catalog fields to undefined, never null', () => {
    const legacy = catalogProductToLegacy(
      { ...product, supplierSku: null, category: null, packageQuantity: null, unit: null, unitPrice: null, effectiveFrom: null },
      terra,
    )
    expect(legacy.supplierSku).toBeUndefined()
    expect(legacy.category).toBeUndefined()
    expect(legacy.packageQuantity).toBeUndefined()
    expect(legacy.unit).toBeUndefined()
    expect(legacy.unitPrice).toBeUndefined()
    expect(legacy.effectiveFrom).toBeUndefined()
    // no enumerable null values leak into the legacy product
    expect(Object.values(legacy).every(v => v !== null)).toBe(true)
  })

  it('adaptCatalogSnapshot returns only active products with their supplier name', () => {
    const snapshot: CatalogSnapshot = {
      version: 3,
      previousVersion: 2,
      changeSetId: 'cs-3',
      createdAt: '2026-06-20T00:00:00.000Z',
      checksum: 'abc',
      suppliers: [terra],
      products: [
        product,
        { ...product, id: 'tp2', name: 'מכסה', active: false },
      ],
    }
    const legacy = adaptCatalogSnapshot(snapshot)
    expect(legacy).toHaveLength(1)
    expect(legacy[0]).toMatchObject({ id: 'tp1', supplier: 'טרה פלסט' })
  })

  it('skips products whose supplier is missing from the snapshot', () => {
    const snapshot: CatalogSnapshot = {
      version: 1,
      previousVersion: null,
      changeSetId: 'cs-1',
      createdAt: '2026-06-20T00:00:00.000Z',
      checksum: 'abc',
      suppliers: [],
      products: [product],
    }
    expect(adaptCatalogSnapshot(snapshot)).toHaveLength(0)
  })
})
