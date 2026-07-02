import { describe, expect, it } from 'vitest'
import {
  ImportRowSchema,
  ImportPreviewRequestSchema,
  buildImportPlan,
  type ImportPreviewRequest,
} from '../../shared/priceCatalog/import'
import { normalizeCatalogName } from '../../shared/priceCatalog/normalization'
import type { CatalogProduct, CatalogSnapshot, CatalogSupplier } from '../../shared/priceCatalog/types'

const NOW = '2026-07-02T12:00:00.000Z'

function mkProduct(
  over: Partial<CatalogProduct> & { id: string; supplierId: string; name: string; packagePrice: number },
): CatalogProduct {
  return {
    supplierSku: null,
    normalizedName: normalizeCatalogName(over.name),
    aliases: [],
    category: null,
    packageQuantity: null,
    unit: null,
    unitPrice: null,
    effectiveFrom: null,
    active: true,
    adminOnly: false,
    sourceId: 'seed',
    updatedAt: NOW,
    ...over,
  }
}

function mkSupplier(over: Partial<CatalogSupplier> & { id: string; name: string }): CatalogSupplier {
  return { aliases: [], active: true, pricesExcludeVat: true, lastPriceListAt: null, ...over }
}

function mkSnapshot(suppliers: CatalogSupplier[], products: CatalogProduct[]): CatalogSnapshot {
  return {
    version: 1,
    previousVersion: null,
    changeSetId: 'seed',
    createdAt: NOW,
    checksum: 'seed-checksum',
    suppliers,
    products,
  }
}

const S1 = 'sup_1'
const ctx = { now: NOW, newProductId: (row: { rowId: string }) => 'new-' + row.rowId }

function planFor(products: CatalogProduct[], request: ImportPreviewRequest) {
  const active = mkSnapshot([mkSupplier({ id: S1, name: 'טרה פלסט', aliases: ['terra'] })], products)
  return buildImportPlan(active, request, ctx)
}

describe('ImportRowSchema / ImportPreviewRequestSchema', () => {
  it('accepts a valid row and rejects empty rows list', () => {
    expect(ImportRowSchema.safeParse({ rowId: 'r1', name: 'מוצר', packagePrice: 5 }).success).toBe(true)
    expect(
      ImportPreviewRequestSchema.safeParse({ baseVersion: 1, supplierId: S1, rows: [] }).success,
    ).toBe(false)
  })

  it('rejects a non-numeric price at the schema level', () => {
    expect(ImportRowSchema.safeParse({ rowId: 'r1', name: 'מוצר', packagePrice: 'x' }).success).toBe(false)
  })
})

describe('buildImportPlan — supplier resolution', () => {
  it('reports unknown supplier when supplierId is not in the catalog', () => {
    const plan = planFor([], { baseVersion: 1, supplierId: 'nope', rows: [{ rowId: 'r1', name: 'x', packagePrice: 1 }] })
    expect(plan.supplierResolution.status).toBe('unknown')
  })

  it('resolves a supplier by name (and by alias)', () => {
    const p = planFor([], { baseVersion: 1, supplierName: 'terra', rows: [{ rowId: 'r1', name: 'x', packagePrice: 1 }] })
    expect(p.supplierResolution.status).toBe('resolved')
    if (p.supplierResolution.status === 'resolved') expect(p.supplierResolution.supplier.id).toBe(S1)
  })
})

describe('buildImportPlan — matching & diff', () => {
  const products = [
    mkProduct({ id: 'p1', supplierId: S1, name: 'מזלגות קשיחים M', packagePrice: 3.2, supplierSku: 'SKU-1' }),
    mkProduct({ id: 'p2', supplierId: S1, name: 'כוס יהלום 1000', packagePrice: 100, aliases: ['כוס יהלום'] }),
  ]

  it('classifies an unchanged row (same price) with no operation', () => {
    const plan = planFor(products, { baseVersion: 1, supplierId: S1, rows: [{ rowId: 'r1', name: 'מזלגות קשיחים M', packagePrice: 3.2 }] })
    expect(plan.counts.unchanged).toBe(1)
    expect(plan.confidentOperations).toHaveLength(0)
  })

  it('classifies a changed price as a confident updateProduct with correct pct', () => {
    const plan = planFor(products, { baseVersion: 1, supplierId: S1, rows: [{ rowId: 'r1', name: 'מזלגות קשיחים M', packagePrice: 4 }] })
    expect(plan.counts.changed).toBe(1)
    expect(plan.confidentOperations).toHaveLength(1)
    const op = plan.confidentOperations[0]
    expect(op.type).toBe('updateProduct')
    if (op.type === 'updateProduct') {
      expect(op.productId).toBe('p1')
      expect(op.patch.packagePrice).toBe(4)
    }
    expect(plan.changes.find(c => c.rowId === 'r1')?.pct).toBeCloseTo(25, 1)
  })

  it('matches by SKU even when the name differs', () => {
    const plan = planFor(products, { baseVersion: 1, supplierId: S1, rows: [{ rowId: 'r1', name: 'שם אחר לגמרי', supplierSku: 'SKU-1', packagePrice: 5 }] })
    expect(plan.counts.changed).toBe(1)
    const op = plan.confidentOperations[0]
    expect(op.type === 'updateProduct' && op.productId).toBe('p1')
  })

  it('matches by alias (medium confidence, confident)', () => {
    const plan = planFor(products, { baseVersion: 1, supplierId: S1, rows: [{ rowId: 'r1', name: 'כוס יהלום', packagePrice: 120 }] })
    expect(plan.counts.changed).toBe(1)
    expect(plan.confidentOperations).toHaveLength(1)
  })

  it('proposes a new product (addProduct) when no candidate matches', () => {
    const plan = planFor(products, { baseVersion: 1, supplierId: S1, rows: [{ rowId: 'r1', name: 'מוצר חדש לגמרי', packagePrice: 9 }] })
    expect(plan.counts.new).toBe(1)
    const op = plan.confidentOperations[0]
    expect(op.type).toBe('addProduct')
    if (op.type === 'addProduct') {
      expect(op.product.supplierId).toBe(S1)
      expect(op.product.sourceId).toBe('import')
      expect(op.product.active).toBe(true)
      expect(op.product.normalizedName).toBe(normalizeCatalogName('מוצר חדש לגמרי'))
    }
  })

  it('routes multiple name matches to review (uncertain), never confident', () => {
    const dupProducts = [
      mkProduct({ id: 'p1', supplierId: S1, name: 'קערה שחורה', packagePrice: 10 }),
      mkProduct({ id: 'p2', supplierId: S1, name: 'קערה שחורה', packagePrice: 12 }),
    ]
    const plan = planFor(dupProducts, { baseVersion: 1, supplierId: S1, rows: [{ rowId: 'r1', name: 'קערה שחורה', packagePrice: 15 }] })
    expect(plan.counts.uncertain).toBe(1)
    expect(plan.confidentOperations).toHaveLength(0)
    const review = plan.review.find(r => r.rowId === 'r1')
    expect(review?.candidates?.length).toBe(2)
  })

  it('routes a partial-name match to review (never auto-applied)', () => {
    const plan = planFor(products, { baseVersion: 1, supplierId: S1, rows: [{ rowId: 'r1', name: 'מזלגות', packagePrice: 4 }] })
    expect(plan.counts.uncertain).toBe(1)
    expect(plan.confidentOperations).toHaveLength(0)
    expect(plan.review[0].reason).toBe('partial-match')
  })

  it('rejects a zero/negative price as invalid, never confident', () => {
    const plan = planFor(products, { baseVersion: 1, supplierId: S1, rows: [
      { rowId: 'r1', name: 'מזלגות קשיחים M', packagePrice: 0 },
      { rowId: 'r2', name: 'כוס יהלום 1000', packagePrice: -5 },
    ] })
    expect(plan.counts.invalid).toBe(2)
    expect(plan.confidentOperations).toHaveLength(0)
  })

  it('detects missing products only when detectMissing is true', () => {
    const off = planFor(products, { baseVersion: 1, supplierId: S1, rows: [{ rowId: 'r1', name: 'מזלגות קשיחים M', packagePrice: 3.2 }] })
    expect(off.counts.missing).toBe(0)
    const on = planFor(products, { baseVersion: 1, supplierId: S1, detectMissing: true, rows: [{ rowId: 'r1', name: 'מזלגות קשיחים M', packagePrice: 3.2 }] })
    // p2 wasn't in the list → proposed deactivate
    expect(on.counts.missing).toBe(1)
    expect(on.confidentOperations.some(o => o.type === 'deactivateProduct')).toBe(true)
  })

  it('honors excludeRowIds / excludeProductIds', () => {
    const rows = [
      { rowId: 'r1', name: 'מזלגות קשיחים M', packagePrice: 4 },
      { rowId: 'r2', name: 'כוס יהלום 1000', packagePrice: 120 },
    ]
    const full = planFor(products, { baseVersion: 1, supplierId: S1, rows })
    expect(full.confidentOperations).toHaveLength(2)
    const excluded = planFor(products, { baseVersion: 1, supplierId: S1, rows, excludeRowIds: ['r1'] })
    expect(excluded.confidentOperations).toHaveLength(1)
  })

  it('routes duplicate supplierSku among new rows to review (avoids invariant violation at apply)', () => {
    const plan = planFor(products, { baseVersion: 1, supplierId: S1, rows: [
      { rowId: 'r1', name: 'חדש א', supplierSku: 'DUP', packagePrice: 5 },
      { rowId: 'r2', name: 'חדש ב', supplierSku: 'DUP', packagePrice: 6 },
    ] })
    // at most one may become a confident addProduct; the collision is routed to review
    const addOps = plan.confidentOperations.filter(o => o.type === 'addProduct')
    expect(addOps.length).toBeLessThanOrEqual(1)
    expect(plan.counts.uncertain).toBeGreaterThanOrEqual(1)
  })

  it('never enumerates unchanged rows in the changes summary (response-size guard)', () => {
    const many = Array.from({ length: 50 }, (_, i) => mkProduct({ id: 'p' + i, supplierId: S1, name: 'פריט ' + i, packagePrice: 10 }))
    const rows = many.map((p, i) => ({ rowId: 'r' + i, name: 'פריט ' + i, packagePrice: 10 }))
    const plan = planFor(many, { baseVersion: 1, supplierId: S1, rows })
    expect(plan.counts.unchanged).toBe(50)
    expect(plan.changes.filter(c => c.matchType === 'unchanged')).toHaveLength(0)
  })
})
