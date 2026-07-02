import { z } from 'zod'
import { CatalogUnitSchema, type CatalogProduct, type CatalogSnapshot, type ChangeOperation } from './types'
import { normalizeCatalogName } from './normalization'

// ── Input schemas (what the GPT sends after extracting rows from the attached file) ──
export const ImportRowSchema = z.object({
  rowId: z.string().min(1),
  name: z.string().min(1),
  supplierSku: z.string().min(1).nullable().optional(),
  packagePrice: z.number(), // אימות >0/finite נעשה במנוע (שורה לא-תקינה מסווגת, לא מפילה את הבקשה)
  packageQuantity: z.number().positive().nullable().optional(),
  unit: CatalogUnitSchema.nullable().optional(),
  category: z.string().min(1).nullable().optional(),
})

export const ImportPreviewRequestSchema = z.object({
  baseVersion: z.number().int().positive(),
  supplierId: z.string().min(1).optional(),
  supplierName: z.string().min(1).optional(),
  rows: z.array(ImportRowSchema).min(1).max(500),
  detectMissing: z.boolean().optional(),
  excludeRowIds: z.array(z.string()).optional(),
  excludeProductIds: z.array(z.string()).optional(),
  fileMeta: z.object({
    fileName: z.string().optional(),
    fileType: z.string().optional(),
    checksum: z.string().optional(),
  }).optional(),
})

export type ImportRow = z.infer<typeof ImportRowSchema>
export type ImportPreviewRequest = z.infer<typeof ImportPreviewRequestSchema>

// ── Output shapes ──
export interface SupplierRef { id: string; name: string }
export type MatchType = 'unchanged' | 'changed' | 'new' | 'missing'
export type ReviewReason =
  | 'multiple-name-matches'
  | 'multiple-alias-matches'
  | 'partial-match'
  | 'invalid-price'
  | 'duplicate-sku'
  | 'duplicate-target'

export interface ChangeSummary {
  rowId?: string
  productId?: string
  name: string
  matchType: MatchType
  from?: number
  to?: number
  pct?: number
}
export interface ReviewCandidate { id: string; name: string; price: number }
export interface ReviewRow { rowId: string; name: string; reason: ReviewReason; candidates?: ReviewCandidate[] }
export interface ImportCounts {
  unchanged: number
  changed: number
  new: number
  missing: number
  uncertain: number
  invalid: number
  total: number
}
export type SupplierResolution =
  | { status: 'resolved'; supplier: SupplierRef }
  | { status: 'unknown' }
  | { status: 'ambiguous'; candidates: SupplierRef[] }

export interface ImportPlan {
  supplierResolution: SupplierResolution
  counts: ImportCounts
  confidentOperations: ChangeOperation[]
  changes: ChangeSummary[]
  review: ReviewRow[]
}

export interface ImportContext {
  now: string
  newProductId: (row: ImportRow) => string
}

const CANDIDATE_CAP = 3
const PRICE_EPSILON = 1e-6

function resolveSupplier(active: CatalogSnapshot, req: ImportPreviewRequest): SupplierResolution {
  if (req.supplierId) {
    const found = active.suppliers.find(s => s.id === req.supplierId)
    return found ? { status: 'resolved', supplier: { id: found.id, name: found.name } } : { status: 'unknown' }
  }
  if (req.supplierName) {
    const needle = normalizeCatalogName(req.supplierName)
    const matches = active.suppliers.filter(s =>
      normalizeCatalogName(s.name) === needle ||
      s.aliases.some(a => normalizeCatalogName(a) === needle))
    if (matches.length === 1) return { status: 'resolved', supplier: { id: matches[0].id, name: matches[0].name } }
    if (matches.length > 1) {
      return { status: 'ambiguous', candidates: matches.map(s => ({ id: s.id, name: s.name })) }
    }
    return { status: 'unknown' }
  }
  return { status: 'unknown' }
}

const emptyCounts = (): ImportCounts => ({ unchanged: 0, changed: 0, new: 0, missing: 0, uncertain: 0, invalid: 0, total: 0 })

/**
 * מנוע-התאמה טהור ודטרמיניסטי לייבוא מחירון. מסווג כל שורה מול הקטלוג הפעיל ומייצר
 * (א) confidentOperations — פעולות ChangeSet בטוחות בלבד; (ב) review — שורות לא-ודאיות/לא-תקינות
 * שלעולם לא מוחלות אוטומטית. precision-over-recall: התאמה חלקית או רב-משמעית → review, לא confident.
 */
export function buildImportPlan(
  active: CatalogSnapshot,
  request: ImportPreviewRequest,
  ctx: ImportContext,
): ImportPlan {
  const supplierResolution = resolveSupplier(active, request)
  const counts = emptyCounts()
  counts.total = request.rows.length
  if (supplierResolution.status !== 'resolved') {
    return { supplierResolution, counts: emptyCounts(), confidentOperations: [], changes: [], review: [] }
  }

  const supplierId = supplierResolution.supplier.id
  const supplierProducts = active.products.filter(p => p.supplierId === supplierId && p.active)

  const bySku = new Map<string, CatalogProduct>()
  const byNorm = new Map<string, CatalogProduct[]>()
  const byAlias = new Map<string, CatalogProduct[]>()
  for (const p of supplierProducts) {
    if (p.supplierSku) bySku.set(p.supplierSku, p)
    const nn = p.normalizedName
    ;(byNorm.get(nn) ?? byNorm.set(nn, []).get(nn)!).push(p)
    for (const alias of p.aliases) {
      const an = normalizeCatalogName(alias)
      ;(byAlias.get(an) ?? byAlias.set(an, []).get(an)!).push(p)
    }
  }

  const excludeRowIds = new Set(request.excludeRowIds ?? [])
  const excludeProductIds = new Set(request.excludeProductIds ?? [])

  const confidentOperations: ChangeOperation[] = []
  const changes: ChangeSummary[] = []
  const review: ReviewRow[] = []
  const touchedProductIds = new Set<string>() // מוצרים קיימים שנגעה בהם שורה (unchanged/changed) — למניעת deactivate שגוי
  const newSkus = new Set<string>()
  const candidatesOf = (list: CatalogProduct[]): ReviewCandidate[] =>
    list.slice(0, CANDIDATE_CAP).map(p => ({ id: p.id, name: p.name, price: p.packagePrice }))

  const markUncertain = (row: ImportRow, reason: ReviewReason, candidates?: CatalogProduct[]) => {
    counts.uncertain++
    review.push({ rowId: row.rowId, name: row.name, reason, ...(candidates ? { candidates: candidatesOf(candidates) } : {}) })
  }

  const applyConfidentMatch = (row: ImportRow, product: CatalogProduct) => {
    if (excludeProductIds.has(product.id)) return
    if (touchedProductIds.has(product.id)) { markUncertain(row, 'duplicate-target', [product]); return }
    touchedProductIds.add(product.id)
    if (Math.abs(product.packagePrice - row.packagePrice) < PRICE_EPSILON) {
      counts.unchanged++ // לא נכנס ל-changes (חוסך גודל-תשובה)
      return
    }
    counts.changed++
    confidentOperations.push({ type: 'updateProduct', productId: product.id, patch: { packagePrice: row.packagePrice, effectiveFrom: ctx.now } })
    const pct = ((row.packagePrice - product.packagePrice) / product.packagePrice) * 100
    changes.push({ rowId: row.rowId, productId: product.id, name: product.name, matchType: 'changed', from: product.packagePrice, to: row.packagePrice, pct })
  }

  const addNewProduct = (row: ImportRow) => {
    const sku = row.supplierSku ?? null
    if (sku && newSkus.has(sku)) { markUncertain(row, 'duplicate-sku'); return }
    if (excludeProductIds.has(ctx.newProductId(row))) return
    if (sku) newSkus.add(sku)
    counts.new++
    const product: CatalogProduct = {
      id: ctx.newProductId(row),
      supplierId,
      supplierSku: sku,
      name: row.name,
      normalizedName: normalizeCatalogName(row.name),
      aliases: [],
      category: row.category ?? null,
      packagePrice: row.packagePrice,
      packageQuantity: row.packageQuantity ?? null,
      unit: row.unit ?? null,
      unitPrice: null,
      effectiveFrom: ctx.now,
      active: true,
      adminOnly: false,
      sourceId: 'import',
      updatedAt: ctx.now,
    }
    confidentOperations.push({ type: 'addProduct', product })
    changes.push({ rowId: row.rowId, name: row.name, matchType: 'new', to: row.packagePrice })
  }

  for (const row of request.rows) {
    if (excludeRowIds.has(row.rowId)) continue
    if (!Number.isFinite(row.packagePrice) || row.packagePrice <= 0) { counts.invalid++; review.push({ rowId: row.rowId, name: row.name, reason: 'invalid-price' }); continue }

    // 1) SKU מדויק
    if (row.supplierSku && bySku.has(row.supplierSku)) { applyConfidentMatch(row, bySku.get(row.supplierSku)!); continue }

    const rowNorm = normalizeCatalogName(row.name)

    // 2) שם מנורמל מדויק
    const nameHits = byNorm.get(rowNorm)
    if (nameHits && nameHits.length === 1) { applyConfidentMatch(row, nameHits[0]); continue }
    if (nameHits && nameHits.length > 1) { markUncertain(row, 'multiple-name-matches', nameHits); continue }

    // 3) alias מדויק
    const aliasHits = byAlias.get(rowNorm)
    if (aliasHits && aliasHits.length === 1) { applyConfidentMatch(row, aliasHits[0]); continue }
    if (aliasHits && aliasHits.length > 1) { markUncertain(row, 'multiple-alias-matches', aliasHits); continue }

    // 4) התאמה חלקית (subset של טוקנים בכל כיוון) → תמיד uncertain
    const partial = supplierProducts.filter(p =>
      p.normalizedName.includes(rowNorm) || rowNorm.includes(p.normalizedName))
    if (partial.length >= 1) { markUncertain(row, 'partial-match', partial); continue }

    // 5) אין מועמד → מוצר חדש
    addNewProduct(row)
  }

  // מוצרים שנעלמו מהמחירון → הצעת השבתה (רק אם התבקש במפורש)
  if (request.detectMissing) {
    for (const p of supplierProducts) {
      if (touchedProductIds.has(p.id)) continue
      if (excludeProductIds.has(p.id)) continue
      counts.missing++
      confidentOperations.push({ type: 'deactivateProduct', productId: p.id })
      changes.push({ productId: p.id, name: p.name, matchType: 'missing', from: p.packagePrice })
    }
  }

  return { supplierResolution, counts, confidentOperations, changes, review }
}
