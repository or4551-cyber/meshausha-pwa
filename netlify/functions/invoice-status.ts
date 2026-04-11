import { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { getStore } from '@netlify/blobs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SendLog {
  id: string
  type: 'initial' | 'followup'
  supplierName: string
  supplierEmail: string
  month: string
  sentAt: string
  status: 'sent' | 'responded' | 'failed'
}

/**
 * בודק ב-Gmail האם ספקים ששלחנו להם בקשה ענו עם קובץ חשבונית.
 * מסמן אותם כ-'responded' בלוג.
 *
 * Body: { accessToken: string, month: string }
 * Returns: { updated: number, log: SendLog[] }
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { accessToken, month } = body

    // מאפשר שימוש ב-accessToken מ-frontend או refresh_token מהBlobs
    let authClient: any

    if (accessToken) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      )
      oauth2Client.setCredentials({ access_token: accessToken })
      authClient = oauth2Client
    } else {
      const tokenStore = getStore('gmail-tokens')
      const tokenData = await tokenStore.get('admin-refresh-token', { type: 'json' }) as { refreshToken: string } | null
      if (!tokenData?.refreshToken) {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ error: 'יש להתחבר ל-Gmail תחילה' }),
        }
      }
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      )
      oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken })
      authClient = oauth2Client
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient })

    // חפש מיילים עם קבצים שהתקבלו בחודש הנוכחי
    const since = month
      ? `after:${month.replace('-', '/')}/01`
      : 'newer_than:60d'

    const query = `(subject:חשבונית OR subject:invoice OR subject:חשבון OR subject:קבלה) has:attachment ${since}`

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
    })

    const messages = response.data.messages ?? []

    // אסוף את כתובות הנשלחים (from) מכל מייל
    const respondedEmails = new Set<string>()

    for (const msg of messages.slice(0, 50)) { // הגבלה למניעת timeout
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From'],
        })
        const fromHeader = detail.data.payload?.headers?.find(h => h.name === 'From')?.value ?? ''
        // חלץ כתובת מייל מ-"Name <email>" או "email"
        const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s]+@[^\s]+)/)
        if (emailMatch) {
          respondedEmails.add(emailMatch[1].toLowerCase())
        }
      } catch {
        // דלג על מיילים שנכשלים
      }
    }

    if (respondedEmails.size === 0) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ updated: 0, respondedEmails: [] }),
      }
    }

    // עדכן את הלוג
    const store = getStore('automation')
    const existingLog: SendLog[] = (await store.get('send-log', { type: 'json' }).catch(() => null)) ?? []

    let updated = 0
    const updatedLog = existingLog.map(entry => {
      if (entry.status === 'sent' && respondedEmails.has(entry.supplierEmail.toLowerCase())) {
        const targetMonth = month || entry.month
        if (!month || entry.month === targetMonth) {
          updated++
          return { ...entry, status: 'responded' as const }
        }
      }
      return entry
    })

    if (updated > 0) {
      await store.setJSON('send-log', updatedLog)
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        updated,
        respondedEmails: [...respondedEmails],
        log: updatedLog,
      }),
    }
  } catch (error: any) {
    console.error('invoice-status error:', error)
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
