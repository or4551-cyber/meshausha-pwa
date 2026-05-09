// Shared-secret auth wrapper for Netlify Functions.
// VITE_API_TOKEN must match API_TOKEN on the server side.
// Note: this is a speedbump that blocks drive-by API access; anyone running
// the app's JS bundle can still extract the token. Real auth lives in Track 4.

const BASE = '/.netlify/functions'
const TOKEN = (import.meta.env.VITE_API_TOKEN as string | undefined) ?? ''

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
  if (extra) Object.assign(headers, extra)
  return headers
}

function withTokenQuery(url: string): string {
  if (!TOKEN) return url
  return url.includes('?') ? `${url}&t=${encodeURIComponent(TOKEN)}` : `${url}?t=${encodeURIComponent(TOKEN)}`
}

/** Standard JSON GET — returns parsed body or null on failure. */
export async function apiGet<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/${path}`, { headers: authHeaders() })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

/** Standard JSON POST/PATCH/DELETE — awaitable, throws on non-2xx. */
export async function apiSend(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<Response> {
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    keepalive: true,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const b = await res.json()
      msg = b?.error || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res
}

/**
 * sendBeacon-first POST that survives navigation/app exit (e.g. opening WhatsApp).
 * Token is passed via query string because sendBeacon cannot set headers.
 * Falls back to keepalive fetch when sendBeacon is unavailable or rejects.
 */
export function apiBeacon(path: string, data: unknown): void {
  const url = withTokenQuery(`${BASE}/${path}`)
  const body = JSON.stringify(data)
  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(url, blob)) return
    }
  } catch { /* ignore */ }
  fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body,
    keepalive: true,
  }).catch(() => {})
}

/** PATCH that survives navigation. sendBeacon does not support PATCH, so keepalive only. */
export function apiKeepalivePatch(path: string, data: unknown): void {
  fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
    keepalive: true,
  }).catch(() => {})
}
