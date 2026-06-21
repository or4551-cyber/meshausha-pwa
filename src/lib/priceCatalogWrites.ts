// בוני פעולות (ChangeOperation) טהורים שממירים פעולת-אדמין לפעולת-קטלוג.
// טהורים ודטרמיניסטיים (id/now מוזרקים) — קלים לבדיקה, ותואמים ל-ChangeOperationSchema
// כדי שיעברו את ולידציית ה-preview בשרת. ה-engine מחשב מחדש normalizedName/unitPrice ב-apply,
// אבל הסכמה דורשת normalizedName לא-ריק, לכן אנו מחשבים אותו כאן (אותו normalizeCatalogName).

import type { ChangeOperation, CatalogUnit, CatalogSnapshot } from '../../shared/priceCatalog/types'
import { normalizeCatalogName } from '../../shared/priceCatalog/normalization'
import { getSessionToken } from './priceAdminSession'
import { getCatalogVersion, previewChanges, applyChange } from './priceCatalogApi'
import { adaptCatalogSnapshot, type LegacyCatalogProduct } from './priceCatalogAdapter'

// עדכון מחיר: patch של packagePrice + effectiveFrom (מתי המחיר נכנס לתוקף).
export function buildPriceUpdate(productId: string, packagePrice: number, now: string): ChangeOperation {
  return { type: 'updateProduct', productId, patch: { packagePrice, effectiveFrom: now } }
}

// הסתרה/הצגה לסניפים: patch של adminOnly בלבד.
export function buildAdminOnlyUpdate(productId: string, adminOnly: boolean): ChangeOperation {
  return { type: 'updateProduct', productId, patch: { adminOnly } }
}

// מחיקה = השבתה (deactivate). שומר את המוצר בהיסטוריה, מסיר אותו מהקטלוג הפעיל.
export function buildDeactivate(productId: string): ChangeOperation {
  return { type: 'deactivateProduct', productId }
}

export interface NewProductInput {
  supplierId: string
  name: string
  packagePrice: number
  adminOnly?: boolean
  category?: string | null
  packageQuantity?: number | null
  unit?: CatalogUnit | null
}

// הוספת מוצר: בונה CatalogProduct מלא ותקין-סכמה. ה-engine ידרוס normalizedName/unitPrice ב-apply.
export function buildAddProduct(input: NewProductInput, ctx: { id: string; now: string }): ChangeOperation {
  return {
    type: 'addProduct',
    product: {
      id: ctx.id,
      supplierId: input.supplierId,
      supplierSku: null,
      name: input.name,
      normalizedName: normalizeCatalogName(input.name),
      aliases: [],
      category: input.category ?? null,
      packagePrice: input.packagePrice,
      packageQuantity: input.packageQuantity ?? null,
      unit: input.unit ?? null,
      unitPrice: null,
      effectiveFrom: ctx.now,
      active: true,
      adminOnly: input.adminOnly ?? false,
      sourceId: 'admin',
      updatedAt: ctx.now,
    },
  }
}

// הוספת ספק לקטלוג (זהות + מטא-תמחור). לוחות-זמנים/סניפים נשמרים בנפרד ב-settings-api.
export function buildAddSupplier(name: string, ctx: { id: string }): ChangeOperation {
  return {
    type: 'addSupplier',
    supplier: { id: ctx.id, name, aliases: [], active: true, pricesExcludeVat: true, lastPriceListAt: null },
  }
}

// מזהה ייחודי לכל מחזור id/idempotency. crypto.randomUUID זמין בדפדפן ו-Node 18+.
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export type CommitResult =
  | { ok: true; version: number; products: LegacyCatalogProduct[]; snapshot: CatalogSnapshot; warnings: string[] }
  | { ok: false; error: string }

// תזמור כתיבה מלא: session → גרסה → preview → apply → snapshot מותאם.
// אופטימי-בטוח: על 409 stale_version (גרסה התקדמה בין הקריאות) מרענן גרסה ומנסה preview שוב פעם אחת.
// ה-Idempotency-Key מבטיח שניסיון-חוזר של apply לא יחיל פעמיים.
export async function commitCatalogOperations(operations: ChangeOperation[]): Promise<CommitResult> {
  const token = await getSessionToken()
  if (!token) return { ok: false, error: 'no_session' }

  const versionInfo = await getCatalogVersion()
  if (!versionInfo) return { ok: false, error: 'no_version' }

  let preview = await previewChanges(versionInfo.version, operations, token)
  if (!preview.ok && preview.status === 409 && preview.error === 'stale_version') {
    const fresh = await getCatalogVersion()
    if (!fresh) return { ok: false, error: 'no_version' }
    preview = await previewChanges(fresh.version, operations, token)
  }
  if (!preview.ok) return { ok: false, error: preview.error }

  const applied = await applyChange(preview.changeSet.id, token, newId())
  if (!applied.ok) return { ok: false, error: applied.error }

  return {
    ok: true,
    version: applied.snapshot.version,
    products: adaptCatalogSnapshot(applied.snapshot),
    snapshot: applied.snapshot,
    warnings: preview.changeSet.warnings ?? [],
  }
}
