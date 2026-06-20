import { createHash } from 'node:crypto'
import {
  CatalogSnapshotSchema,
  ChangeSetSchema,
  type CatalogProduct,
  type CatalogSnapshot,
  type CatalogSupplier,
  type ChangeOperation,
  type ChangeSet,
} from './types'
import { calculateUnitPrice, normalizeCatalogName } from './normalization'

export function snapshotChecksum(snapshot: Omit<CatalogSnapshot, 'checksum'>): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

export interface ChangeSetContext {
  id: string
  source: ChangeSet['source']
  now: string
  expiresAt: string
}

export interface RevertContext {
  id: string
  now: string
  expiresAt: string
}

// שדות שניתן לעדכן בפריט (תואם ProductPatchSchema ב-types.ts).
const PATCH_FIELDS = [
  'supplierSku', 'name', 'normalizedName', 'aliases', 'category',
  'packagePrice', 'packageQuantity', 'unit', 'unitPrice', 'effectiveFrom',
  'active', 'adminOnly', 'sourceId', 'updatedAt',
] as const

// אינווריאנטים מבניים: בלי כפילות ספק/מוצר, בלי הפניה לספק לא קיים, בלי SKU כפול בתוך ספק.
function assertInvariants(suppliers: CatalogSupplier[], products: CatalogProduct[]): void {
  const supplierIds = new Set<string>()
  for (const s of suppliers) {
    if (supplierIds.has(s.id)) throw new Error('duplicate supplier id ' + s.id)
    supplierIds.add(s.id)
  }
  const productIds = new Set<string>()
  const skuBySupplier = new Map<string, Set<string>>()
  for (const p of products) {
    if (productIds.has(p.id)) throw new Error('duplicate product id ' + p.id)
    productIds.add(p.id)
    if (!supplierIds.has(p.supplierId)) {
      throw new Error('unknown supplier ' + p.supplierId + ' for product ' + p.id)
    }
    if (p.supplierSku !== null) {
      let skus = skuBySupplier.get(p.supplierId)
      if (!skus) { skus = new Set<string>(); skuBySupplier.set(p.supplierId, skus) }
      if (skus.has(p.supplierSku)) {
        throw new Error('duplicate supplierSku ' + p.supplierSku + ' for supplier ' + p.supplierId)
      }
      skus.add(p.supplierSku)
    }
  }
}

// מחשב מחדש normalizedName/unitPrice כשהשם/מחיר/כמות/יחידה משתנים. לא מוטט את המקור.
function applyPatch(product: CatalogProduct, patch: Partial<CatalogProduct>): CatalogProduct {
  const merged: CatalogProduct = { ...product, ...patch }
  if (patch.name !== undefined) {
    merged.normalizedName = normalizeCatalogName(merged.name)
  }
  if (patch.packagePrice !== undefined || patch.packageQuantity !== undefined || patch.unit !== undefined) {
    merged.unitPrice = calculateUnitPrice(merged.packagePrice, merged.packageQuantity)
  }
  return merged
}

export function createChangeSet(
  active: CatalogSnapshot,
  operations: ChangeOperation[],
  context: ChangeSetContext,
): ChangeSet {
  const productById = new Map(active.products.map(product => [product.id, product]))
  const warnings: string[] = []
  for (const operation of operations) {
    if (operation.type !== 'updateProduct') continue
    const previous = productById.get(operation.productId)
    if (!previous) throw new Error('unknown product ' + operation.productId)
    const nextPrice = operation.patch.packagePrice
    if (nextPrice !== undefined) {
      const pct = ((nextPrice - previous.packagePrice) / previous.packagePrice) * 100
      if (Math.abs(pct) > 20) warnings.push(operation.productId + ': price change ' + pct.toFixed(2) + '%')
    }
  }
  return ChangeSetSchema.parse({
    id: context.id,
    baseVersion: active.version,
    source: context.source,
    operations,
    warnings,
    createdAt: context.now,
    expiresAt: context.expiresAt,
    status: 'pending',
    appliedVersion: null,
  })
}

export function applyChangeSet(
  active: CatalogSnapshot,
  changeSet: ChangeSet,
  now: string,
): CatalogSnapshot {
  if (changeSet.status !== 'pending') throw new Error('change set is not pending')
  if (Date.parse(changeSet.expiresAt) <= Date.parse(now)) throw new Error('change set expired')
  if (changeSet.baseVersion !== active.version) {
    throw new Error('base version mismatch: expected ' + active.version + ' got ' + changeSet.baseVersion)
  }

  const suppliers: CatalogSupplier[] = active.suppliers.map(s => ({ ...s }))
  const products: CatalogProduct[] = active.products.map(p => ({ ...p }))
  const supplierIndex = new Map(suppliers.map((s, i) => [s.id, i]))
  const productIndex = new Map(products.map((p, i) => [p.id, i]))

  for (const op of changeSet.operations) {
    switch (op.type) {
      case 'addSupplier': {
        if (supplierIndex.has(op.supplier.id)) throw new Error('duplicate supplier id ' + op.supplier.id)
        supplierIndex.set(op.supplier.id, suppliers.push({ ...op.supplier }) - 1)
        break
      }
      case 'addProduct': {
        if (productIndex.has(op.product.id)) throw new Error('duplicate product id ' + op.product.id)
        const created: CatalogProduct = {
          ...op.product,
          normalizedName: normalizeCatalogName(op.product.name),
          unitPrice: calculateUnitPrice(op.product.packagePrice, op.product.packageQuantity),
        }
        productIndex.set(created.id, products.push(created) - 1)
        break
      }
      case 'updateProduct': {
        const idx = productIndex.get(op.productId)
        if (idx === undefined) throw new Error('unknown product ' + op.productId)
        products[idx] = { ...applyPatch(products[idx], op.patch), updatedAt: now }
        break
      }
      case 'deactivateProduct': {
        const idx = productIndex.get(op.productId)
        if (idx === undefined) throw new Error('unknown product ' + op.productId)
        products[idx] = { ...products[idx], active: false, updatedAt: now }
        break
      }
    }
  }

  assertInvariants(suppliers, products)

  const withoutChecksum: Omit<CatalogSnapshot, 'checksum'> = {
    version: active.version + 1,
    previousVersion: active.version,
    changeSetId: changeSet.id,
    createdAt: now,
    suppliers,
    products,
  }
  return CatalogSnapshotSchema.parse({ ...withoutChecksum, checksum: snapshotChecksum(withoutChecksum) })
}

function productPatch(target: CatalogProduct): Partial<CatalogProduct> {
  const patch: Record<string, unknown> = {}
  for (const field of PATCH_FIELDS) patch[field] = target[field]
  return patch as Partial<CatalogProduct>
}

function productsEqual(a: CatalogProduct, b: CatalogProduct): boolean {
  return PATCH_FIELDS.every(field => JSON.stringify(a[field]) === JSON.stringify(b[field]))
}

// בונה ChangeSet (source='revert') שמחזיר את active למצב target ע"י diff.
export function createRevertChangeSet(
  active: CatalogSnapshot,
  target: CatalogSnapshot,
  context: RevertContext,
): ChangeSet {
  const operations: ChangeOperation[] = []

  const activeSupplierIds = new Set(active.suppliers.map(s => s.id))
  for (const supplier of target.suppliers) {
    if (!activeSupplierIds.has(supplier.id)) operations.push({ type: 'addSupplier', supplier })
  }

  const activeById = new Map(active.products.map(p => [p.id, p]))
  const targetIds = new Set(target.products.map(p => p.id))
  for (const targetProduct of target.products) {
    const activeProduct = activeById.get(targetProduct.id)
    if (!activeProduct) {
      operations.push({ type: 'addProduct', product: targetProduct })
    } else if (!productsEqual(activeProduct, targetProduct)) {
      operations.push({ type: 'updateProduct', productId: targetProduct.id, patch: productPatch(targetProduct) })
    }
  }
  for (const activeProduct of active.products) {
    if (!targetIds.has(activeProduct.id) && activeProduct.active) {
      operations.push({ type: 'deactivateProduct', productId: activeProduct.id })
    }
  }

  return createChangeSet(active, operations, {
    id: context.id,
    source: 'revert',
    now: context.now,
    expiresAt: context.expiresAt,
  })
}

// מאמת שלמות snapshot: סכמה + אינווריאנטים + התאמת checksum. זורק על תקלה.
export function verifySnapshotIntegrity(snapshot: CatalogSnapshot): void {
  const parsed = CatalogSnapshotSchema.parse(snapshot)
  assertInvariants(parsed.suppliers, parsed.products)
  const { checksum, ...rest } = parsed
  if (checksum !== snapshotChecksum(rest)) throw new Error('snapshot checksum mismatch')
}
