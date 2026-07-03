import type { OrderRecord, GroupBy, TopBy, PeriodPreset } from './types'
import { computeSummary, computeTopProducts, computeOverview } from './engine'

export interface InsightsRequest {
  method: string
  path: string
  query: Record<string, string | undefined>
  role: 'app' | 'admin' | 'gpt'
}
export interface InsightsResponse { statusCode: number; body: string }

const VALID_PERIOD = new Set(['today','yesterday','this_week','last_week','this_month','last_month','last_30d','last_90d','this_quarter','last_quarter','ytd','all'])
const VALID_GROUP = new Set(['none','supplier','branch','month','weekday'])
const VALID_BY = new Set(['quantity','spend'])

const resp = (statusCode: number, body: unknown): InsightsResponse => ({ statusCode, body: JSON.stringify(body) })

export function routeInsights(req: InsightsRequest, orders: OrderRecord[], nowISO: string): InsightsResponse {
  if (req.role === 'app') return resp(403, { error: 'forbidden' })
  if (req.method !== 'GET') return resp(405, { error: 'method_not_allowed' })

  const seg = req.path.replace(/^\/api\/insights\/?/, '').split('/').filter(Boolean)
  const q = req.query
  const limit = q.limit ? Number(q.limit) : undefined
  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) return resp(400, { error: 'invalid_param', param: 'limit' })
  if (q.period && !VALID_PERIOD.has(q.period)) return resp(400, { error: 'invalid_param', param: 'period' })

  if (seg[0] === 'summary') {
    if (q.groupBy && !VALID_GROUP.has(q.groupBy)) return resp(400, { error: 'invalid_param', param: 'groupBy' })
    return resp(200, computeSummary(orders, { period: q.period as PeriodPreset, from: q.from, to: q.to, groupBy: q.groupBy as GroupBy, branchCode: q.branchCode, supplier: q.supplier, limit }, nowISO))
  }
  if (seg[0] === 'top-products') {
    if (q.by && !VALID_BY.has(q.by)) return resp(400, { error: 'invalid_param', param: 'by' })
    return resp(200, computeTopProducts(orders, { period: q.period as PeriodPreset, from: q.from, to: q.to, by: q.by as TopBy, branchCode: q.branchCode, supplier: q.supplier, limit }, nowISO))
  }
  if (seg[0] === 'overview') {
    return resp(200, computeOverview(orders, nowISO))
  }
  return resp(404, { error: 'not_found' })
}
