// Shared-secret auth wrapper for Netlify Functions.
// VITE_API_TOKEN must match API_TOKEN on the server side.
// Note: this is a speedbump that blocks drive-by API access; anyone running
// the app's JS bundle can still extract the token. Real auth lives in Track 4.

const BASE = '/.netlify/functions'
const TOKEN = (import.meta.env.VITE_API_TOKEN as string | undefined) ?? ''

const MAX_RETRIES = 2 // total attempts = 3 (initial + 2 retries)
const BACKOFF_MS = [100, 350, 900]

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

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Should we retry this attempt? Network errors and 5xx are retried; 4xx never. */
function shouldRetry(error: unknown, response?: Response): boolean {
  if (response) return response.status >= 500 && response.status < 600
  // network / abort error
  return error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')
}

/**
 * fetch with automatic retry on network errors and 5xx (Netlify Blobs sometimes
 * returns transient 500s). 4xx is never retried — those are real errors.
 * Only used for non-keepalive flows; keepalive/sendBeacon are fire-and-forget.
 */
async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init)
      if (!shouldRetry(null, res)) return res
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (err) {
      if (!shouldRetry(err)) throw err
      lastErr = err
    }
    if (attempt < MAX_RETRIES) {
      await sleep(BACKOFF_MS[attempt] ?? 1000)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('fetch failed after retries')
}

/** Standard JSON GET — returns parsed body or null on failure. Auto-retries 5xx. */
export async function apiGet<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await fetchWithRetry(`${BASE}/${path}`, { headers: authHeaders() })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

/** Standard JSON POST/PATCH/DELETE — awaitable, throws on non-2xx. Auto-retries 5xx. */
export async function apiSend(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<Response> {
  const res = await fetchWithRetry(`${BASE}/${path}`, {
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
