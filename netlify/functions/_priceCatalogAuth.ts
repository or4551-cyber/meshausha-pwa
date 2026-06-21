import { createHmac, timingSafeEqual } from 'node:crypto'

export type PriceAccess = 'read' | 'write'
export type PriceRole = 'app' | 'admin' | 'gpt'
export interface PriceAuthResult { role: PriceRole }

export interface PriceEnv {
  API_TOKEN?: string
  PRICE_GPT_TOKEN?: string
  PRICE_SESSION_SECRET?: string
  PRICE_ADMIN_SECRET?: string
}

export interface PriceAuthEvent {
  headers: Record<string, string | undefined>
  queryStringParameters: Record<string, string | undefined> | null
}

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000

// השוואה בזמן-קבוע; false אם האורכים שונים (timingSafeEqual זורק על אורך לא תואם).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function bearerToken(event: PriceAuthEvent): string | null {
  const header = event.headers.authorization ?? event.headers.Authorization
  if (!header) return null
  const match = /^Bearer (.+)$/.exec(header)
  return match ? match[1] : null
}

export function issueAdminSession(now: number, env: PriceEnv): string {
  if (!env.PRICE_SESSION_SECRET) throw new Error('PRICE_SESSION_SECRET is not configured')
  const payload = JSON.stringify({ role: 'admin', exp: now + SESSION_TTL_MS })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const signature = createHmac('sha256', env.PRICE_SESSION_SECRET).update(payloadB64).digest('base64url')
  return payloadB64 + '.' + signature
}

export function verifyAdminSession(token: string, now: number, env: PriceEnv): PriceAuthResult | null {
  if (!env.PRICE_SESSION_SECRET) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts
  const expected = createHmac('sha256', env.PRICE_SESSION_SECRET).update(payloadB64).digest('base64url')
  if (!safeEqual(signature, expected)) return null
  let payload: { role?: unknown; exp?: unknown }
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
  } catch {
    return null
  }
  if (payload.role !== 'admin' || typeof payload.exp !== 'number') return null
  if (now >= payload.exp) return null
  return { role: 'admin' }
}

// read מקבל API_TOKEN / PRICE_GPT_TOKEN / סשן אדמין תקף.
// write מקבל רק PRICE_GPT_TOKEN / סשן אדמין תקף. fail-closed כשאין סוד.
export function authorizePriceRequest(
  event: PriceAuthEvent,
  access: PriceAccess,
  env: PriceEnv,
  now: number,
): PriceAuthResult | null {
  const token = bearerToken(event)
  if (!token) return null

  if (env.PRICE_GPT_TOKEN && safeEqual(token, env.PRICE_GPT_TOKEN)) return { role: 'gpt' }

  const session = verifyAdminSession(token, now, env)
  if (session) return session

  if (access === 'read' && env.API_TOKEN && safeEqual(token, env.API_TOKEN)) return { role: 'app' }

  return null
}
