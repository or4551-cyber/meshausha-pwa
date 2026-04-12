import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { google } from 'googleapis'

function openStore(name: string) {
  const siteID = process.env.SITE_ID
  const token = process.env.NETLIFY_TOKEN
  if (siteID && token) return getStore({ name, siteID, token })
  return getStore(name)
}

interface AutomationConfig {
  enabled: boolean
  followupAfterDays: number
  suppliers: Array<{
    supplierId: string
    supplierName: string
    email: string
    contactPerson: string
    branchNames: string[]
    included: boolean
  }>
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

const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
]

function buildRawEmail(to: string, subject: string, bodyText: string): string {
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
  const message = [
    `To: ${to}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    `Subject: ${subjectEncoded}`,
    '',
    Buffer.from(bodyText).toString('base64'),
  ].join('\r\n')
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// פונקציה מתוזמנת — בודקת כל יום ב-09:00 UTC מי לא ענה ושולחת תזכורות
export default async function handler() {
  const now = new Date()

  try {
    const store = openStore('automation')
    const [config, existingLog] = await Promise.all([
      store.get('config', { type: 'json' }) as Promise<AutomationConfig | null>,
      store.get('send-log', { type: 'json' }).catch(() => null) as Promise<SendLog[] | null>,
    ])

    if (!config?.enabled) {
      console.log('Automation disabled, skipping follow-up.')
      return
    }

    const log: SendLog[] = existingLog ?? []
    const followupAfterMs = (config.followupAfterDays ?? 2) * 24 * 60 * 60 * 1000

    // מצא בקשות ראשוניות שנשלחו לפני X ימים ועדיין בסטטוס 'sent' (לא 'responded')
    const pendingFollowup = log.filter(entry => {
      if (entry.type !== 'initial' || entry.status !== 'sent') return false
      const sentAgo = now.getTime() - new Date(entry.sentAt).getTime()
      if (sentAgo < followupAfterMs) return false

      // בדוק שלא שלחנו כבר תזכורת לאותו ספק+חודש
      const alreadyFollowedUp = log.some(
        other =>
          other.type === 'followup' &&
          other.supplierEmail === entry.supplierEmail &&
          other.month === entry.month
      )
      return !alreadyFollowedUp
    })

    if (pendingFollowup.length === 0) {
      console.log('No pending follow-ups needed.')
      return
    }

    // קבל OAuth client
    const tokenStore = openStore('gmail-tokens')
    const tokenData = await tokenStore.get('admin-refresh-token', { type: 'json' }) as { refreshToken: string } | null
    if (!tokenData?.refreshToken) {
      console.error('No refresh token, cannot send follow-ups.')
      return
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const newLogEntries: SendLog[] = []

    for (const pending of pendingFollowup) {
      const [yearStr, monthStr] = pending.month.split('-')
      const monthName = MONTH_NAMES_HE[parseInt(monthStr) - 1]
      const year = parseInt(yearStr)

      // מצא פרטי הספק מההגדרות
      const supplierConfig = config.suppliers.find(s => s.email === pending.supplierEmail)
      const contactPerson = supplierConfig?.contactPerson || pending.supplierName
      const branchNames = supplierConfig?.branchNames ?? []
      const branchesList = branchNames.length > 0
        ? branchNames.map(b => `• ${b}`).join('\n')
        : '• כל הסניפים'

      const subject = `תזכורת: בקשה לחשבונית ${monthName} ${year} — ${pending.supplierName}`
      const bodyText = `שלום ${contactPerson},

זוהי תזכורת לבקשתנו הקודמת שנשלחה לפני מספר ימים.

אנו מבקשים לקבל חשבונית מס/קבלה עבור חודש ${monthName} ${year} עבור הסניפים הבאים:

${branchesList}

נא לשלוח את החשבונית לכתובת מייל זו בהקדם האפשרי.

בתודה וכל הכבוד,
צוות משאוושה
`

      let status: 'sent' | 'failed' = 'sent'
      try {
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: buildRawEmail(pending.supplierEmail, subject, bodyText) },
        })
        console.log(`Follow-up sent to ${pending.supplierName}`)
      } catch (err: any) {
        console.error(`Failed follow-up to ${pending.supplierName}:`, err.message)
        status = 'failed'
      }

      newLogEntries.push({
        id: `followup_${Date.now()}_${pending.supplierEmail}`,
        type: 'followup',
        supplierName: pending.supplierName,
        supplierEmail: pending.supplierEmail,
        month: pending.month,
        sentAt: new Date().toISOString(),
        status,
      })

      await new Promise(r => setTimeout(r, 800))
    }

    const updatedLog = [...newLogEntries, ...log].slice(0, 200)
    await store.set('send-log', JSON.stringify(updatedLog))
    console.log(`Follow-up done: sent ${newLogEntries.filter(e => e.status === 'sent').length} reminders`)
  } catch (error: any) {
    console.error('scheduled-followup error:', error)
  }
}

// רץ כל יום ב-09:00 UTC (12:00 שעון ישראל)
export const config: Config = {
  schedule: '0 9 * * *',
}
