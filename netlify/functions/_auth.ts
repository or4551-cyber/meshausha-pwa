import type { HandlerEvent } from '@netlify/functions'

/**
 * Shared-secret auth gate for public-facing Netlify functions.
 * Set API_TOKEN in Netlify env vars; the client must send the same value
 * via `Authorization: Bearer <token>` header or `?t=<token>` query string
 * (the latter is needed for sendBeacon, which cannot set headers).
 *
 * If API_TOKEN is unset (e.g. local dev / fresh deploy) the gate is open —
 * fail-open is intentional so the app keeps working until the env var is set.
 * Once set, every request without the right token is rejected.
 */
export function isAuthorized(event: HandlerEvent): boolean {
  const expected = process.env.API_TOKEN
  if (!expected) return true // fail-open until configured

  const auth = event.headers?.['authorization'] || event.headers?.['Authorization']
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    if (auth.slice(7) === expected) return true
  }

  const tokenParam = event.queryStringParameters?.t
  if (tokenParam && tokenParam === expected) return true

  return false
}

export const UNAUTHORIZED_RESPONSE = {
  statusCode: 401,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: 'unauthorized' }),
}
