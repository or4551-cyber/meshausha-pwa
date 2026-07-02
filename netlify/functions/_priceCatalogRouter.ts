import { z } from 'zod'
import type { PriceRole } from './_priceCatalogAuth'
import type { PriceCatalogRepository } from './_priceCatalogStore'
import {
  applyChangeSet,
  createChangeSet,
  createRevertChangeSet,
} from '../../shared/priceCatalog/engine'
import { normalizeCatalogName } from '../../shared/priceCatalog/normalization'
import {
  ChangeOperationSchema,
  type CatalogSnapshot,
  type ChangeSet,
} from '../../shared/priceCatalog/types'
import { ImportPreviewRequestSchema, buildImportPlan } from '../../shared/priceCatalog/import'

export interface PriceApiRequest {
  method: 'GET' | 'POST' | 'OPTIONS'
  path: string
  query: Record<string, string | undefined>
  headers: Record<string, string | undefined>
  body: string | null
  auth: { role: PriceRole }
}

export interface PriceApiResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
}

export interface PriceRouterDependencies {
  repo: PriceCatalogRepository
  now: () => string
  id: () => string
  // מוזרק ע"י ה-handler (זקוק לסוד) — מנפיק טוקן ייצוא חתום קצר-מועד.
  issueExportToken?: (version: number) => { token: string; expiresAt: string }
}

const PREVIEW_TTL_MS = 10 * 60 * 1000
const JSON_HEADERS = { 'Content-Type': 'application/json' }

const json = (statusCode: number, payload: unknown): PriceApiResponse => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(payload),
})
const fail = (statusCode: number, code: string): PriceApiResponse => json(statusCode, { error: code })

// תשובת apply: אדמין (האפליקציה) מקבל snapshot מלא — הוא מעדכן את החנות המקומית מ-result.products.
// GPT מקבל תשובה קלה בלבד: snapshot מלא (~130KB / 291 מוצרים) חורג מגבול התשובה של ChatGPT Actions
// וגורם ל-"תקלה בקבלת התשובה" אף שהכתיבה הצליחה. הקל מחזיר רק מטא-נתוני הגרסה + המוצרים שהשתנו.
function buildApplyResponse(
  role: PriceRole,
  snapshot: CatalogSnapshot,
  change: ChangeSet | null,
): PriceApiResponse {
  if (role !== 'gpt') return json(200, snapshot)
  const changedIds = new Set<string>()
  for (const op of change?.operations ?? []) {
    if (op.type === 'updateProduct' || op.type === 'deactivateProduct') changedIds.add(op.productId)
    else if (op.type === 'addProduct') changedIds.add(op.product.id)
  }
  const changed = snapshot.products
    .filter(product => changedIds.has(product.id))
    .map(product => ({
      id: product.id,
      name: product.name,
      supplierId: product.supplierId,
      packagePrice: product.packagePrice,
      active: product.active,
    }))
  return json(200, {
    version: snapshot.version,
    previousVersion: snapshot.previousVersion,
    changeSetId: snapshot.changeSetId,
    createdAt: snapshot.createdAt,
    checksum: snapshot.checksum,
    changed,
  })
}

const PreviewBodySchema = z.object({
  baseVersion: z.number().int().positive(),
  operations: z.array(ChangeOperationSchema).min(1),
})
const ApplyBodySchema = z.object({ confirmation: z.literal('APPROVE') })

function isWriter(role: PriceRole): boolean {
  return role === 'admin' || role === 'gpt'
}

function parseJson(body: string | null): unknown | undefined {
  if (body === null) return undefined
  try { return JSON.parse(body) } catch { return undefined }
}

function segmentsOf(path: string): string[] {
  return path.replace(/^\/api\/prices\/?/, '').split('/').filter(Boolean)
}

export async function routePriceCatalog(
  request: PriceApiRequest,
  dependencies: PriceRouterDependencies,
): Promise<PriceApiResponse> {
  const { repo } = dependencies
  if (request.method === 'OPTIONS') return { statusCode: 204, headers: JSON_HEADERS, body: '' }

  try {
    const seg = segmentsOf(request.path)

    // ---------- READ ----------
    if (request.method === 'GET') {
      const active = await repo.getActive()
      if (!active) return fail(404, 'no_active_catalog')

      if (seg[0] === 'suppliers') {
        return json(200, { version: active.version, suppliers: active.suppliers })
      }
      if (seg[0] === 'catalog' && seg[1] === 'version') {
        return json(200, { version: active.version, checksum: active.checksum, createdAt: active.createdAt })
      }
      if (seg[0] === 'products' && seg.length === 1) {
        return json(200, searchProducts(active, request.query))
      }
      if (seg[0] === 'products' && seg.length === 2) {
        const product = active.products.find(p => p.id === seg[1])
        return product ? json(200, product) : fail(404, 'not_found')
      }
      if (seg[0] === 'products' && seg.length === 3 && seg[2] === 'history') {
        return json(200, await productHistory(repo, seg[1]))
      }
      return fail(404, 'not_found')
    }

    // ---------- WRITE ----------
    if (request.method === 'POST') {
      if (!isWriter(request.auth.role)) return fail(403, 'forbidden')

      if (seg[0] === 'changes' && seg[1] === 'preview') {
        return await handlePreview(request, dependencies)
      }
      if (seg[0] === 'changes' && seg[2] === 'apply') {
        return await handleApply(request, dependencies, seg[1])
      }
      if (seg[0] === 'changes' && seg[2] === 'revert-preview') {
        return await handleRevertPreview(dependencies, seg[1])
      }
      if (seg[0] === 'export-link') {
        return await handleExportLink(dependencies)
      }
      if (seg[0] === 'imports' && seg[1] === 'preview') {
        return await handleImportPreview(request, dependencies)
      }
      return fail(404, 'not_found')
    }

    return fail(405, 'method_not_allowed')
  } catch {
    return fail(500, 'internal_error')
  }

  // ---------- helpers ----------
  function searchProducts(active: CatalogSnapshot, query: Record<string, string | undefined>) {
    let products = active.products
    if (query.includeInactive !== 'true') products = products.filter(p => p.active)
    if (query.supplierId) products = products.filter(p => p.supplierId === query.supplierId)
    if (query.category) products = products.filter(p => p.category === query.category)
    if (query.q) {
      const needle = normalizeCatalogName(query.q)
      products = products.filter(p =>
        p.normalizedName.includes(needle) ||
        p.aliases.some(alias => normalizeCatalogName(alias).includes(needle)))
    }
    const total = products.length
    let limit = query.limit ? Number.parseInt(query.limit, 10) : 50
    if (!Number.isFinite(limit) || limit < 1) limit = 50
    if (limit > 200) limit = 200
    let offset = query.offset ? Number.parseInt(query.offset, 10) : 0
    if (!Number.isFinite(offset) || offset < 0) offset = 0
    // total+offset מאפשרים ל-client לעמד (paginate) על קטלוג גדול מ-limit (270 > 200).
    return { version: active.version, total, offset, products: products.slice(offset, offset + limit) }
  }

  async function handlePreview(req: PriceApiRequest, deps: PriceRouterDependencies): Promise<PriceApiResponse> {
    const parsed = PreviewBodySchema.safeParse(parseJson(req.body))
    if (!parsed.success) return fail(400, 'invalid_request')
    const active = await deps.repo.getActive()
    if (!active) return fail(404, 'no_active_catalog')
    if (parsed.data.baseVersion !== active.version) return fail(409, 'stale_version')
    const source = req.auth.role === 'gpt' ? 'gpt' : 'admin'
    const change = createChangeSet(active, parsed.data.operations, {
      id: deps.id(),
      source,
      now: deps.now(),
      expiresAt: new Date(Date.parse(deps.now()) + PREVIEW_TTL_MS).toISOString(),
    })
    await deps.repo.saveChangeSet(change)
    return json(201, change)
  }

  // ייבוא מחירון: התאמת שורות מול הקטלוג → ChangeSet source:'import' → מוחל דרך ה-apply הקיים.
  // ספק לא-מזוהה/דו-משמעי מוחזר כ-200 (סטטוס שיחתי, לא שגיאה) כדי שה-GPT ישאל. תשובה תמצתית (<100KB).
  async function handleImportPreview(req: PriceApiRequest, deps: PriceRouterDependencies): Promise<PriceApiResponse> {
    const parsed = ImportPreviewRequestSchema.safeParse(parseJson(req.body))
    if (!parsed.success) return fail(400, 'invalid_request')
    const active = await deps.repo.getActive()
    if (!active) return fail(404, 'no_active_catalog')
    if (parsed.data.baseVersion !== active.version) return fail(409, 'stale_version')

    const plan = buildImportPlan(active, parsed.data, { now: deps.now(), newProductId: () => deps.id() })
    if (plan.supplierResolution.status === 'unknown') {
      return json(200, { status: 'unknown_supplier', baseVersion: active.version })
    }
    if (plan.supplierResolution.status === 'ambiguous') {
      return json(200, { status: 'ambiguous_supplier', baseVersion: active.version, candidates: plan.supplierResolution.candidates })
    }

    const CAP = 60
    const truncated: { changes?: number; review?: number } = {}
    if (plan.changes.length > CAP) truncated.changes = plan.changes.length - CAP
    if (plan.review.length > CAP) truncated.review = plan.review.length - CAP
    const compact = {
      supplier: plan.supplierResolution.supplier,
      baseVersion: active.version,
      counts: plan.counts,
      changes: plan.changes.slice(0, CAP),
      review: plan.review.slice(0, CAP),
      ...(Object.keys(truncated).length ? { truncated } : {}),
    }

    if (plan.confidentOperations.length === 0) {
      return json(200, { status: 'no_confident_changes', changeSetId: null, ...compact })
    }
    const change = createChangeSet(active, plan.confidentOperations, {
      id: deps.id(),
      source: 'import',
      now: deps.now(),
      expiresAt: new Date(Date.parse(deps.now()) + PREVIEW_TTL_MS).toISOString(),
    })
    await deps.repo.saveChangeSet(change)
    return json(201, { status: 'ready', changeSetId: change.id, expiresAt: change.expiresAt, warnings: change.warnings, ...compact })
  }

  async function handleApply(
    req: PriceApiRequest,
    deps: PriceRouterDependencies,
    changeId: string,
  ): Promise<PriceApiResponse> {
    const idempotencyKey = req.headers['idempotency-key']
    if (!idempotencyKey) return fail(400, 'missing_idempotency_key')

    const replay = await deps.repo.getIdempotencyResult(idempotencyKey)
    if (replay) {
      // המפתח חייב להיות שייך ל-change המבוקש; שימוש חוזר על change אחר = התנגשות.
      if (replay.changeSetId !== changeId) return fail(409, 'idempotency_key_conflict')
      const snapshot = await deps.repo.getVersion(replay.version)
      if (!snapshot) return fail(500, 'internal_error')
      const replayedChange = await deps.repo.getChangeSet(changeId)
      return buildApplyResponse(req.auth.role, snapshot, replayedChange)
    }

    const applyBody = ApplyBodySchema.safeParse(parseJson(req.body))
    if (!applyBody.success) return fail(400, 'invalid_confirmation')

    const change = await deps.repo.getChangeSet(changeId)
    if (!change) return fail(404, 'not_found')

    const active = await deps.repo.getActive()
    if (!active) return fail(404, 'no_active_catalog')

    // התאוששות: אם הגרסה הפעילה כבר נוצרה מה-change הזה — החזר אותה ושמור idempotency חסר.
    if (active.changeSetId === change.id) {
      await deps.repo.saveIdempotencyResult(idempotencyKey, { changeSetId: change.id, version: active.version })
      return buildApplyResponse(req.auth.role, active, change)
    }

    let next: CatalogSnapshot
    try {
      next = applyChangeSet(active, change, deps.now())
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('expired')) return fail(410, 'expired')
      if (message.includes('base version')) return fail(409, 'stale_version')
      if (message.includes('not pending')) return fail(409, 'not_pending')
      return fail(500, 'internal_error')
    }

    try {
      await deps.repo.saveVersion(next)
      await deps.repo.activateVersion(next)
    } catch (err) {
      // התנגשות checksum על אותה גרסה (שני changes על אותו base במקביל) = 409, לא 500.
      const message = err instanceof Error ? err.message : ''
      if (message.includes('refusing to overwrite')) return fail(409, 'version_conflict')
      throw err
    }
    await deps.repo.saveChangeSet({ ...change, status: 'applied', appliedVersion: next.version })
    await deps.repo.saveIdempotencyResult(idempotencyKey, { changeSetId: change.id, version: next.version })
    return buildApplyResponse(req.auth.role, next, change)
  }

  async function handleRevertPreview(
    deps: PriceRouterDependencies,
    changeId: string,
  ): Promise<PriceApiResponse> {
    const change = await deps.repo.getChangeSet(changeId)
    if (!change || change.appliedVersion === null) return fail(404, 'not_found')
    const target = await deps.repo.getVersion(change.baseVersion)
    if (!target) return fail(404, 'not_found')
    const active = await deps.repo.getActive()
    if (!active) return fail(404, 'no_active_catalog')
    let revert
    try {
      revert = createRevertChangeSet(active, target, {
        id: deps.id(),
        now: deps.now(),
        expiresAt: new Date(Date.parse(deps.now()) + PREVIEW_TTL_MS).toISOString(),
      })
    } catch (err) {
      // revert ריק (אין מה לשחזר) = 409 מפורש, לא קריסת 500 מהסכמה.
      const message = err instanceof Error ? err.message : ''
      if (message.includes('nothing to revert')) return fail(409, 'nothing_to_revert')
      throw err
    }
    await deps.repo.saveChangeSet(revert)
    return json(201, revert)
  }

  async function handleExportLink(deps: PriceRouterDependencies): Promise<PriceApiResponse> {
    if (!deps.issueExportToken) return fail(500, 'internal_error')
    const active = await deps.repo.getActive()
    if (!active) return fail(404, 'no_active_catalog')
    const { token, expiresAt } = deps.issueExportToken(active.version)
    return json(200, { url: '/api/prices/export.xlsx?token=' + encodeURIComponent(token), expiresAt })
  }

  async function productHistory(repository: PriceCatalogRepository, productId: string) {
    const versions = await repository.listVersions()
    const history: Array<{ version: number; packagePrice: number; packageQuantity: number | null; unitPrice: number | null; createdAt: string }> = []
    let last = ''
    for (const version of versions) {
      const product = version.products.find(p => p.id === productId)
      if (!product) continue
      const key = JSON.stringify([product.packagePrice, product.packageQuantity, product.unitPrice])
      if (key !== last) {
        history.push({
          version: version.version,
          packagePrice: product.packagePrice,
          packageQuantity: product.packageQuantity,
          unitPrice: product.unitPrice,
          createdAt: version.createdAt,
        })
        last = key
      }
    }
    return { productId, history }
  }
}
