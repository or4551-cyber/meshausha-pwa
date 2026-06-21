import { getStore } from '@netlify/blobs'
import { createHash } from 'node:crypto'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  if (siteID && token) return getStore({ name, siteID, token })
  return getStore(name)
}

interface LoginCounter {
  count: number
  windowStart: number
}

// מפתח עובר hash — לא חושפים IP בנתיב blob.
const counterKey = (clientIp: string) =>
  'rate-limit/login/' + createHash('sha256').update(clientIp).digest('hex') + '.json'

export interface RateLimitState {
  limited: boolean
  retryAfterSeconds: number
}

// עד 5 ניסיונות כושלים בחלון 15 דקות.
export async function checkLoginRateLimit(clientIp: string, now: number): Promise<RateLimitState> {
  const store = openStore('meshausha-price-catalog')
  const raw = (await store.get(counterKey(clientIp), { type: 'json' })) as LoginCounter | null
  if (!raw || now - raw.windowStart >= WINDOW_MS) return { limited: false, retryAfterSeconds: 0 }
  if (raw.count >= MAX_ATTEMPTS) {
    return { limited: true, retryAfterSeconds: Math.ceil((raw.windowStart + WINDOW_MS - now) / 1000) }
  }
  return { limited: false, retryAfterSeconds: 0 }
}

export async function recordLoginFailure(clientIp: string, now: number): Promise<void> {
  const store = openStore('meshausha-price-catalog')
  const raw = (await store.get(counterKey(clientIp), { type: 'json' })) as LoginCounter | null
  if (!raw || now - raw.windowStart >= WINDOW_MS) {
    await store.set(counterKey(clientIp), JSON.stringify({ count: 1, windowStart: now }))
  } else {
    await store.set(counterKey(clientIp), JSON.stringify({ count: raw.count + 1, windowStart: raw.windowStart }))
  }
}

// התחברות מוצלחת מאפסת את המונה.
export async function resetLoginRateLimit(clientIp: string): Promise<void> {
  const store = openStore('meshausha-price-catalog')
  await store.delete(counterKey(clientIp))
}
