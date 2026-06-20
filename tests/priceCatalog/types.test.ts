import { describe, expect, it } from 'vitest'
import {
  CatalogProductSchema,
  CatalogSnapshotSchema,
  ChangeOperationSchema,
} from '../../shared/priceCatalog/types'

const product = {
  id: 'tp1',
  supplierId: 'terra-plast',
  supplierSku: null,
  name: 'גביע 1000',
  normalizedName: 'גביע 1000',
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

describe('catalog schemas', () => {
  it('accepts a valid product and rejects non-positive prices', () => {
    expect(CatalogProductSchema.parse(product)).toEqual(product)
    expect(() => CatalogProductSchema.parse({ ...product, packagePrice: 0 })).toThrow()
  })

  it('requires the snapshot checksum and complete arrays', () => {
    const parsed = CatalogSnapshotSchema.parse({
      version: 1,
      previousVersion: null,
      changeSetId: 'seed-v1',
      createdAt: '2026-06-20T00:00:00.000Z',
      checksum: 'abc123',
      suppliers: [],
      products: [product],
    })
    expect(parsed.version).toBe(1)
  })

  it('accepts only explicit change-operation variants', () => {
    expect(ChangeOperationSchema.parse({
      type: 'updateProduct',
      productId: 'tp1',
      patch: { packagePrice: 160 },
    }).type).toBe('updateProduct')
    expect(() => ChangeOperationSchema.parse({ type: 'deleteForever', productId: 'tp1' })).toThrow()
  })
})
