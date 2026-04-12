import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  const store = getStore('meshausha-settings')

  try {
    // GET — החזר הגדרות
    if (event.httpMethod === 'GET') {
      const settings = await store.get('admin-settings', { type: 'json' }) as any
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings || { adminPhone: '' }),
      }
    }

    // POST — עדכן הגדרות
    if (event.httpMethod === 'POST') {
      const updates = JSON.parse(event.body || '{}')
      const current = await store.get('admin-settings', { type: 'json' }) as any || {}
      await store.set('admin-settings', JSON.stringify({ ...current, ...updates }))
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
