import { Handler } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { createBlobPriceCatalogRepository } from './_priceCatalogStore'
import { authorizePriceRequest, issueExportToken, EXPORT_TTL_MS } from './_priceCatalogAuth'
import { routePriceCatalog, type PriceApiRequest } from './_priceCatalogRouter'
import { createCatalogSeed } from '../../shared/priceCatalog/legacySeed'
import { PRODUCTS, INITIAL_SUPPLIERS } from '../../src/data/products'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// מנרמל את הנתיב ל-/api/prices/... גם כשמופעל כ-/.netlify/functions/price-catalog/...
function normalizePath(rawPath: string): string {
  if (rawPath.startsWith('/api/prices')) return rawPath
  const marker = '/price-catalog'
  const index = rawPath.indexOf(marker)
  const rest = index >= 0 ? rawPath.slice(index + marker.length) : ''
  return '/api/prices' + rest
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  try {
    // אימות לפני כל גישה ל-repo — בקשה לא-מאומתת לעולם לא מגיעה ל-seed/כתיבה (fail-closed).
    const method = event.httpMethod as PriceApiRequest['method']
    const access = method === 'GET' ? 'read' : 'write'
    const auth = authorizePriceRequest(
      { headers: event.headers, queryStringParameters: event.queryStringParameters },
      access,
      {
        API_TOKEN: process.env.API_TOKEN,
        PRICE_GPT_TOKEN: process.env.PRICE_GPT_TOKEN,
        PRICE_SESSION_SECRET: process.env.PRICE_SESSION_SECRET,
      },
      Date.now(),
    )
    if (!auth) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'unauthorized' }) }

    const repo = createBlobPriceCatalogRepository()

    // seed-on-first-read: רק אחרי אימות מוצלח — אם אין גרסה פעילה, זרע גרסה 1 מהנתונים הקיימים והפעל אותה.
    if (!(await repo.getActive())) {
      const seed = createCatalogSeed(INITIAL_SUPPLIERS, PRODUCTS, new Date().toISOString())
      await repo.saveVersion(seed)
      await repo.activateVersion(seed)
    }

    const response = await routePriceCatalog(
      {
        method,
        path: normalizePath(event.path),
        query: event.queryStringParameters ?? {},
        headers: event.headers,
        body: event.body ?? null,
        auth,
      },
      {
        repo,
        now: () => new Date().toISOString(),
        id: () => randomUUID(),
        issueExportToken: (version: number) => {
          const issuedAt = Date.now()
          const token = issueExportToken(version, issuedAt, { PRICE_SESSION_SECRET: process.env.PRICE_SESSION_SECRET })
          return { token, expiresAt: new Date(issuedAt + EXPORT_TTL_MS).toISOString() }
        },
      },
    )
    return { statusCode: response.statusCode, headers: { ...CORS, ...response.headers }, body: response.body }
  } catch {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal_error' }) }
  }
}
