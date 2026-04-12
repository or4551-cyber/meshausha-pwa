import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  if (siteID && token) {
    return getStore({ name, siteID, token })
  }
  return getStore(name)
}

// הפונקציה הזו הוחלפה ב-settings-api — נשמרת רק כ-fallback עם תגובה ברורה
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' }

  try {
    const store = openStore('meshausha-config')

    if (event.httpMethod === 'GET') {
      const data = await store.get('suppliers-data', { type: 'json' })
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data ?? null) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      await store.set('suppliers-data', JSON.stringify(body))
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
    }

    return { statusCode: 405, headers: CORS, body: 'Method not allowed' }
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) }
  }
}
