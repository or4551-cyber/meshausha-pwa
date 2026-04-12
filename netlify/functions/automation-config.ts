import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export interface SupplierEmailConfig {
  supplierId: string
  supplierName: string
  email: string
  contactPerson: string
  branchNames: string[]
  included: boolean
}

export interface AutomationConfig {
  enabled: boolean
  sendDayOfMonth: number      // 1–28: איזה יום בחודש לשלוח בקשות
  followupAfterDays: number   // כמה ימים להמתין לפני תזכורת
  suppliers: SupplierEmailConfig[]
  updatedAt: string
}

export interface SendLog {
  id: string
  type: 'initial' | 'followup'
  supplierName: string
  supplierEmail: string
  month: string               // פורמט YYYY-MM
  sentAt: string
  status: 'sent' | 'responded' | 'failed'
}

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

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  try {
    const store = openStore('automation')

    // GET — החזר הגדרות + לוג שליחות
    if (event.httpMethod === 'GET') {
      const [configRaw, logRaw] = await Promise.all([
        store.get('config', { type: 'json' }).catch(() => null),
        store.get('send-log', { type: 'json' }).catch(() => null),
      ])

      const config: AutomationConfig = configRaw ?? {
        enabled: false,
        sendDayOfMonth: 1,
        followupAfterDays: 2,
        suppliers: [],
        updatedAt: new Date().toISOString(),
      }

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ config, log: logRaw ?? [] }),
      }
    }

    // POST — שמור הגדרות
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')

      if (body.action === 'save-config') {
        const config: AutomationConfig = {
          ...body.config,
          updatedAt: new Date().toISOString(),
        }
        await store.set('config', JSON.stringify(config))
        return {
          statusCode: 200,
          headers: CORS,
          body: JSON.stringify({ success: true, config }),
        }
      }

      if (body.action === 'append-log') {
        const existing: SendLog[] = (await store.get('send-log', { type: 'json' }).catch(() => null)) ?? []
        const updated = [body.entry as SendLog, ...existing].slice(0, 200)
        await store.set('send-log', JSON.stringify(updated))
        return {
          statusCode: 200,
          headers: CORS,
          body: JSON.stringify({ success: true }),
        }
      }

      if (body.action === 'update-log-status') {
        const existing: SendLog[] = (await store.get('send-log', { type: 'json' }).catch(() => null)) ?? []
        const updated = existing.map(entry =>
          entry.id === body.id ? { ...entry, status: body.status } : entry
        )
        await store.set('send-log', JSON.stringify(updated))
        return {
          statusCode: 200,
          headers: CORS,
          body: JSON.stringify({ success: true }),
        }
      }

      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) }
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (error: any) {
    console.error('automation-config error:', error)
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
