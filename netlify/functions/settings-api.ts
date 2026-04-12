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

  try {
    // getStore חייב להיות בתוך try/catch — אחרת MissingBlobsEnvironmentError גורם ל-502
    const store = getStore('meshausha-settings')

    // GET עם ?type=suppliers — חייב לבוא לפני הבדיקה הרגילה של GET
    if (event.httpMethod === 'GET' && event.queryStringParameters?.type === 'suppliers') {
      const data = await store.get('suppliers-data', { type: 'json' })
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify(data ?? null),
      }
    }

    // GET — החזר הגדרות
    if (event.httpMethod === 'GET') {
      const settings = await store.get('admin-settings', { type: 'json' }) as any
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings || { adminPhone: '' }),
      }
    }

    // POST — עדכן הגדרות (כולל suppliersData אם קיים)
    if (event.httpMethod === 'POST') {
      const updates = JSON.parse(event.body || '{}')
      // ספקים נשמרים במפתח נפרד כי הנתונים גדולים
      if (updates.suppliersData !== undefined) {
        await store.set('suppliers-data', JSON.stringify(updates.suppliersData))
        return {
          statusCode: 200,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        }
      }
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
