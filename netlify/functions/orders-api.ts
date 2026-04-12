import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import webpush from 'web-push'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
}

function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  if (siteID && token) {
    return getStore({ name, siteID, token })
  }
  return getStore(name)
}

// שולח Push לכל האדמינים שרשומים
async function sendPushToAdmins(title: string, body: string) {
  try {
    const store = openStore('push-data')
    const [keys, subs] = await Promise.all([
      store.get('vapid-keys', { type: 'json' }) as Promise<{ publicKey: string; privateKey: string } | null>,
      store.get('subscriptions', { type: 'json' }) as Promise<any[] | null>,
    ])
    if (!keys || !subs || subs.length === 0) return

    webpush.setVapidDetails(
      'mailto:admin@meshausha.app',
      keys.publicKey,
      keys.privateKey,
    )

    const payload = JSON.stringify({ title, body, data: { url: '/admin/dispatch' } })
    await Promise.allSettled(
      subs.map(sub => webpush.sendNotification(sub, payload))
    )
  } catch (err) {
    console.error('push failed:', err)
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  try {
    const store = openStore('meshausha-orders')
    // GET — החזר את כל ההזמנות
    if (event.httpMethod === 'GET') {
      const { blobs } = await store.list()
      const orders = await Promise.all(
        blobs.map(b => store.get(b.key, { type: 'json' }))
      )
      const valid = orders.filter(Boolean) as any[]
      valid.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify(valid),
      }
    }

    // POST — שמור הזמנה חדשה
    if (event.httpMethod === 'POST') {
      const order = JSON.parse(event.body || '{}')
      if (!order.id) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing id' }) }
      }
      await store.set(order.id, JSON.stringify(order))

      // שלח Push לאדמין — fire and forget
      sendPushToAdmins(
        '🛒 הזמנה חדשה!',
        `${order.branch} — ${order.items?.length ?? 0} פריטים`
      ).catch(() => {})

      return {
        statusCode: 201,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true }),
      }
    }

    // PATCH — עדכן סטטוס (dispatched)
    if (event.httpMethod === 'PATCH') {
      const { ids, status } = JSON.parse(event.body || '{}')
      if (!Array.isArray(ids) || !status) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing ids or status' }) }
      }
      await Promise.all(
        ids.map(async (id: string) => {
          const order = await store.get(id, { type: 'json' }) as any
          if (order) {
            await store.set(id, JSON.stringify({ ...order, status }))
          }
        })
      )
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true }),
      }
    }

    return { statusCode: 405, headers: CORS, body: 'Method not allowed' }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
