import { Handler } from '@netlify/functions'
import { createHash, timingSafeEqual } from 'node:crypto'
import { issueAdminSession, SESSION_TTL_MS } from './_priceCatalogAuth'
import { checkLoginRateLimit, recordLoginFailure, resetLoginRateLimit } from './_priceRateLimit'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// השוואה בזמן-קבוע ללא תלות באורך: digest קבוע-אורך לכל צד ואז timingSafeEqual.
function safeEqual(a: string, b: string): boolean {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

function clientIpOf(headers: Record<string, string | undefined>): string {
  return headers['x-nf-client-connection-ip'] || headers['client-ip'] || headers['x-forwarded-for'] || 'unknown'
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method not allowed' }

  try {
    const now = Date.now()
    const ip = clientIpOf(event.headers)

    const limit = await checkLoginRateLimit(ip, now)
    if (limit.limited) {
      return {
        statusCode: 429,
        headers: { ...CORS, 'Retry-After': String(limit.retryAfterSeconds) },
        body: JSON.stringify({ error: 'too many attempts' }),
      }
    }

    let secret = ''
    try { secret = String(JSON.parse(event.body || '{}').secret ?? '') } catch { secret = '' }

    const configured = process.env.PRICE_ADMIN_SECRET ?? ''
    // השוואה בזמן-קבוע מתבצעת תמיד, בלי gate שתלוי באורך הקלט. תגובות לא חושפות אם הסוד מוגדר.
    const ok = configured.length > 0 && safeEqual(secret, configured)
    if (!ok) {
      await recordLoginFailure(ip, now)
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'unauthorized' }) }
    }

    await resetLoginRateLimit(ip)
    const token = issueAdminSession(now, { PRICE_SESSION_SECRET: process.env.PRICE_SESSION_SECRET })
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, expiresAt: new Date(now + SESSION_TTL_MS).toISOString() }),
    }
  } catch {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal error' }) }
  }
}
