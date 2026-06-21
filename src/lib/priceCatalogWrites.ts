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

// מצב-ניסיון יציב לפעולה לוגית, שמשותף על-פני ניסיונות-חוזרים. commitCatalogOperations
// **מעדכן** את changeSetId אחרי preview מוצלח, כדי שניסיון-חוזר ימשיך מאותו changeSet במקום
// ליצור חדש — זה מה שמאפשר לשרת לזהות replay (idempotencyKey+changeId) או recovery
// (active.changeSetId===change.id) ולהחזיר snapshot במקום 409 conflict / כפילות.
// לפעולות-הוספה: חובה אובייקט יציב (נשמר ב-ref של המסך). לעדכון/השבתה אפשר להשמיט.
export interface CommitAttempt {
  idempotencyKey: string
  changeSetId?: string
}

function adaptResult(snapshot: CatalogSnapshot, warnings: string[]): CommitResult {
  return { ok: true, version: snapshot.version, products: adaptCatalogSnapshot(snapshot), snapshot, warnings }
}

// סטטוסים שבהם ה-changeSet השמור כבר אינו ישים (פג/נעלם/בסיס-ישן/כבר-טופל) → נכון לבצע
// preview חדש. network/401/500 — שומרים את ה-changeSet ומחזירים שגיאה לניסיון-חוזר עתידי.
function changeSetUnusable(status: number): boolean {
  return status === 404 || status === 410 || status === 409
}

// תזמור כתיבה מלא: session → (resume או preview) → apply → snapshot מותאם.
export async function commitCatalogOperations(
  operations: ChangeOperation[],
  attempt: CommitAttempt = { idempotencyKey: newId() },
): Promise<CommitResult> {
  const token = await getSessionToken()
  if (!token) return { ok: false, error: 'no_session' }

  // resume: אם ניסיון קודם כבר עשה preview (changeSetId שמור) — נסה apply ישירות על אותו
  // changeId+idempotencyKey. אם החל בשרת קודם (גם אם התשובה אבדה) → replay/recovery מחזיר snapshot.
  if (attempt.changeSetId) {
    const resumed = await applyChange(attempt.changeSetId, token, attempt.idempotencyKey)
    if (resumed.ok) return adaptResult(resumed.snapshot, [])
    if (!changeSetUnusable(resumed.status)) return { ok: false, error: resumed.error }
    attempt.changeSetId = undefined // לא-ישים → ניצור preview חדש למטה
  }

  const versionInfo = await getCatalogVersion()
  if (!versionInfo) return { ok: false, error: 'no_version' }

  let preview = await previewChanges(versionInfo.version, operations, token)
  if (!preview.ok && preview.status === 409 && preview.error === 'stale_version') {
    const fresh = await getCatalogVersion()
    if (!fresh) return { ok: false, error: 'no_version' }
    preview = await previewChanges(fresh.version, operations, token)
  }
  if (!preview.ok) return { ok: false, error: preview.error }
  // שומרים את ה-changeSet לפני apply — כך ניסיון-חוזר אחרי apply-מוצלח+תשובה-אבודה ימשיך ממנו.
  attempt.changeSetId = preview.changeSet.id

  const applied = await applyChange(attempt.changeSetId, token, attempt.idempotencyKey)
  if (!applied.ok) return { ok: false, error: applied.error }

  return adaptResult(applied.snapshot, preview.changeSet.warnings ?? [])
}
