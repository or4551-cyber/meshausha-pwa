import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { authorizePriceRequest } from './_priceCatalogAuth'
import { routeInsights } from '../../shared/orderInsights/router'
import type { OrderRecord } from '../../shared/orderInsights/types'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  return siteID && token ? getStore({ name, siteID, token }) : getStore(name)
}

// נורמול הנתיב ל-/api/insights/... גם כשמופעל כ-/.netlify/functions/insights-api/...
function normalizePath(rawPath: string): string {
  if (rawPath.startsWith('/api/insights')) return rawPath
  const marker = '/insights-api'
  const i = rawPath.indexOf(marker)
  return '/api/insights' + (i >= 0 ? rawPath.slice(i + marker.length) : '')
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  const auth = authorizePriceRequest(
    { headers: event.headers, queryStringParameters: event.queryStringParameters },
    'read',
    { API_TOKEN: process.env.API_TOKEN, PRICE_GPT_TOKEN: process.env.PRICE_GPT_TOKEN, PRICE_SESSION_SECRET: process.env.PRICE_SESSION_SECRET },
    Date.now(),
  )
  if (!auth) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'unauthorized' }) }

  try {
    const store = openStore('meshausha-orders')
    const { blobs } = await store.list()
    const raw = await Promise.all(blobs.map(b => store.get(b.key, { type: 'json' })))
    const orders = raw.filter(Boolean) as OrderRecord[]

    const res = routeInsights(
      { method: event.httpMethod, path: normalizePath(event.path), query: event.queryStringParameters ?? {}, role: auth.role },
      orders,
      new Date().toISOString(),
    )
    return { statusCode: res.statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: res.body }
  } catch {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal_error' }) }
  }
}
