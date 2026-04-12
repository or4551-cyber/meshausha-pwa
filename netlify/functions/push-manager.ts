import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import webpush from 'web-push'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  if (siteID && token) return getStore({ name, siteID, token })
  return getStore(name)
}

/**
 * GET  → מחזיר את המפתח הציבורי VAPID (יוצר בפעם הראשונה)
 * POST → שומר מנוי Push חדש { subscription: PushSubscription }
 * DELETE → מוחק מנוי { endpoint: string }
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' }

  try {
    const store = openStore('push-data')

    // ── GET: public key ──────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      let keys = await store.get('vapid-keys', { type: 'json' }) as { publicKey: string; privateKey: string } | null
      if (!keys) {
        keys = webpush.generateVAPIDKeys()
        await store.set('vapid-keys', JSON.stringify(keys))
      }
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ publicKey: keys.publicKey }),
      }
    }

    // ── POST: save subscription ──────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const { subscription } = JSON.parse(event.body || '{}')
      if (!subscription?.endpoint) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing subscription' }) }
      }
      const subs: any[] = (await store.get('subscriptions', { type: 'json' })) ?? []
      const filtered = subs.filter((s: any) => s.endpoint !== subscription.endpoint)
      filtered.push(subscription)
      await store.set('subscriptions', JSON.stringify(filtered))
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
    }

    // ── DELETE: remove subscription ──────────────────────────────────────────
    if (event.httpMethod === 'DELETE') {
      const { endpoint } = JSON.parse(event.body || '{}')
      if (!endpoint) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing endpoint' }) }
      }
      const subs: any[] = (await store.get('subscriptions', { type: 'json' })) ?? []
      await store.set('subscriptions', JSON.stringify(subs.filter((s: any) => s.endpoint !== endpoint)))
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
    }

    return { statusCode: 405, headers: CORS, body: 'Method not allowed' }
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) }
  }
}
