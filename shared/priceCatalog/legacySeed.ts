import { snapshotChecksum } from './engine'
import { normalizeCatalogName } from './normalization'
import {
  CatalogSnapshotSchema,
  type CatalogSnapshot,
} from './types'

// חוזי קלט ציבוריים שתואמים לנתוני האפליקציה הקיימת, בלי לייבא טיפוסי Zustand.
export interface LegacySupplierSeed {
  id: string
  name: string
}

export interface LegacyProductSeed {
  id: string
  name: string
  supplier: string
  price: number
  category?: string
  adminOnly?: boolean
}

// בונה snapshot v1 דטרמיניסטי מהנתונים הקיימים (270 מוצרים / 8 ספקים). שומר id ומחיר.
export function createCatalogSeed(
  legacySuppliers: LegacySupplierSeed[],
  legacyProducts: LegacyProductSeed[],
  now: string,
): CatalogSnapshot {
  const supplierByName = new Map(legacySuppliers.map(supplier => [supplier.name, supplier]))
  const suppliers = legacySuppliers.map(supplier => ({
    id: supplier.id,
    name: supplier.name,
    aliases: [],
    active: true,
    pricesExcludeVat: true as const,
    lastPriceListAt: null,
  }))
  const products = legacyProducts.map(product => {
    const supplier = supplierByName.get(product.supplier)
    if (!supplier) throw new Error('missing supplier for ' + product.id + ': ' + product.supplier)
    return {
      id: product.id,
      supplierId: supplier.id,
      supplierSku: null,
      name: product.name,
      normalizedName: normalizeCatalogName(product.name),
      aliases: [],
      category: product.category ?? null,
      packagePrice: product.price,
      packageQuantity: null,
      unit: null,
      unitPrice: null,
      effectiveFrom: null,
      active: true,
      adminOnly: product.adminOnly ?? false,
      sourceId: 'seed-v1',
      updatedAt: now,
    }
  })
  const withoutChecksum = {
    version: 1,
    previousVersion: null,
    changeSetId: 'seed-v1',
    createdAt: now,
    suppliers,
    products,
  }
  return CatalogSnapshotSchema.parse({
    ...withoutChecksum,
    checksum: snapshotChecksum(withoutChecksum),
  })
}
