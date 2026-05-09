import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import webpush from 'web-push'
import { isAuthorized, UNAUTHORIZED_RESPONSE } from './_auth'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  if (!isAuthorized(event)) {
    return { ...UNAUTHORIZED_RESPONSE, headers: { ...UNAUTHORIZED_RESPONSE.headers, ...CORS } }
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

    // PATCH — עדכן סטטוס (dispatched/deleted/merged) או מיזוג תוספת
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}')

      // ── מצב 1: מיזוג תוספת לתוך הזמנה קיימת ──
      if (body.action === 'merge') {
        const { targetId, items, notes, branch } = body as {
          action: 'merge'
          targetId: string
          items: Array<{ name: string; quantity: number; price?: number; supplier: string; productId: string }>
          notes?: string
          branch?: string
        }
        if (!targetId || !Array.isArray(items)) {
          return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing targetId or items' }) }
        }
        const target = await store.get(targetId, { type: 'json' }) as any
        if (!target) {
          return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'target order not found' }) }
        }
        // מיזוג פריטים — שם זהה: סכום כמויות; חדש: הוספה
        const mergedItems = [...(target.items || [])]
        for (const ni of items) {
          const idx = mergedItems.findIndex((m: any) => m.name === ni.name)
          if (idx >= 0) {
            mergedItems[idx] = { ...mergedItems[idx], quantity: mergedItems[idx].quantity + ni.quantity }
          } else {
            mergedItems.push(ni)
          }
        }
        const mergedNotes = notes
          ? (target.notes ? `${target.notes}\n--- תוספת ---\n${notes}` : `--- תוספת ---\n${notes}`)
          : target.notes
        const totalPrice = mergedItems.reduce(
          (s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
          0
        )
        // VAT 17% — תואם להתנהגות המקומית (calculateTotal)
        const totalWithVAT = Math.round(totalPrice * 1.17 * 100) / 100
        const updated = { ...target, items: mergedItems, notes: mergedNotes, totalPrice: totalWithVAT }
        await store.set(targetId, JSON.stringify(updated))

        sendPushToAdmins(
          '➕ תוספת להזמנה',
          `${branch || target.branch} — ${items.length} פריטים נוספו ל-${items[0]?.supplier ?? 'הזמנה'}`
        ).catch(() => {})

        return {
          statusCode: 200,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true, order: updated }),
        }
      }

      // ── מצב 2: עדכון סטטוס בלבד (dispatched/deleted/merged) ──
      const { ids, status, mergedIntoId } = body
      if (!Array.isArray(ids) || !status) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing ids or status' }) }
      }
      const allowed = new Set(['pending', 'dispatched', 'deleted', 'merged'])
      if (!allowed.has(status)) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'invalid status' }) }
      }
      await Promise.all(
        ids.map(async (id: string) => {
          const order = await store.get(id, { type: 'json' }) as any
          if (order) {
            const patched: any = { ...order, status }
            if (status === 'deleted') {
              patched.deletedAt = new Date().toISOString()
              patched.deletedBy = 'admin'
            }
            if (status === 'merged' && mergedIntoId) {
              patched.mergedIntoId = mergedIntoId
              patched.mergedAt = new Date().toISOString()
            }
            await store.set(id, JSON.stringify(patched))
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
