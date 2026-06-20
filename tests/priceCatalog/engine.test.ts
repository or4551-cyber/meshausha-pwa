import { describe, expect, it } from 'vitest'
import {
  applyChangeSet,
  createChangeSet,
  createRevertChangeSet,
} from '../../shared/priceCatalog/engine'
import {
  calculateUnitPrice,
  normalizeCatalogName,
} from '../../shared/priceCatalog/normalization'
import type { CatalogSnapshot } from '../../shared/priceCatalog/types'

const active: CatalogSnapshot = {
  version: 1,
  previousVersion: null,
  changeSetId: 'seed-v1',
  createdAt: '2026-06-20T00:00:00.000Z',
  checksum: 'seed',
  suppliers: [{
    id: 'terra',
    name: 'טרה פלסט',
    aliases: [],
    active: true,
    pricesExcludeVat: true,
    lastPriceListAt: null,
  }],
  products: [{
    id: 'tp1',
    supplierId: 'terra',
    supplierSku: null,
    name: 'גביע 1000',
    normalizedName: 'גביע 1000',
    aliases: [],
    category: null,
    packagePrice: 150,
    packageQuantity: 500,
    unit: 'unit',
    unitPrice: 0.3,
    effectiveFrom: null,
    active: true,
    adminOnly: false,
    sourceId: 'seed-v1',
    updatedAt: '2026-06-20T00:00:00.000Z',
  }],
}

describe('catalog engine', () => {
  it('normalizes Hebrew punctuation and whitespace', () => {
    expect(normalizeCatalogName('  גביע  1,000  יח׳ ')).toBe('גביע 1000 יח')
  })

  it('calculates unit price only when quantity exists', () => {
    expect(calculateUnitPrice(150, 500)).toBe(0.3)
    expect(calculateUnitPrice(150, null)).toBeNull()
  })

  it('previews without mutating and warns on a change above 20 percent', () => {
    const change = createChangeSet(active, [{
      type: 'updateProduct',
      productId: 'tp1',
      patch: { packagePrice: 200 },
    }], {
      id: 'change-1',
      source: 'admin',
      now: '2026-06-20T10:00:00.000Z',
      expiresAt: '2026-06-20T10:10:00.000Z',
    })
    expect(active.products[0].packagePrice).toBe(150)
    expect(change.warnings[0]).toContain('33.33%')
  })

  it('applies once against the expected base version', () => {
    const change = createChangeSet(active, [{
      type: 'updateProduct',
      productId: 'tp1',
      patch: { packagePrice: 160 },
    }], {
      id: 'change-2',
      source: 'admin',
      now: '2026-06-20T10:00:00.000Z',
      expiresAt: '2026-06-20T10:10:00.000Z',
    })
    const next = applyChangeSet(active, change, '2026-06-20T10:01:00.000Z')
    expect(next.version).toBe(2)
    expect(next.products[0].packagePrice).toBe(160)
    expect(() => applyChangeSet(next, change, '2026-06-20T10:02:00.000Z')).toThrow('base version')
  })

  it('creates a revert change set that restores the previous snapshot', () => {
    const revert = createRevertChangeSet(
      { ...active, version: 2, previousVersion: 1, products: [{ ...active.products[0], packagePrice: 160 }] },
      active,
      {
        id: 'revert-2',
        now: '2026-06-20T11:00:00.000Z',
        expiresAt: '2026-06-20T11:10:00.000Z',
      },
    )
    expect(revert.source).toBe('revert')
    expect(revert.operations).toContainEqual({
      type: 'updateProduct',
      productId: 'tp1',
      patch: expect.objectContaining({ packagePrice: 150 }),
    })
  })
})
