import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  try {
    // getStore חייב להיות בתוך try/catch — אחרת MissingBlobsEnvironmentError גורם ל-502
    const store = getStore('meshausha-orders')
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
