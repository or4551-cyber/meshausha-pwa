import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { google } from 'googleapis'

// מבנה הגדרות (מועתק מ-automation-config.ts לעצמאות)
interface SupplierEmailConfig {
  supplierId: string
  supplierName: string
  email: string
  contactPerson: string
  branchNames: string[]
  included: boolean
}

interface AutomationConfig {
  enabled: boolean
  sendDayOfMonth: number
  followupAfterDays: number
  suppliers: SupplierEmailConfig[]
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

// פונקציה מתוזמנת — רצה כל יום ב-07:00 UTC, בודקת אם היום הוא יום השליחה המוגדר
export default async function handler() {
  const now = new Date()
  const todayDay = now.getUTCDate()

  try {
    const store = getStore('automation')
    const config = await store.get('config', { type: 'json' }) as AutomationConfig | null

    if (!config?.enabled) {
      console.log('Automation disabled, skipping.')
      return
    }

    if (todayDay !== config.sendDayOfMonth) {
      console.log(`Today is ${todayDay}, send day is ${config.sendDayOfMonth}. Skipping.`)
      return
    }

    // חודש שעבר (זה מה שמבקשים)
    const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const month = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
    const monthName = MONTH_NAMES_HE[targetDate.getMonth()]
    const year = targetDate.getFullYear()

    // בדוק אם כבר שלחנו החודש
    const existingLog: SendLog[] = (await store.get('send-log', { type: 'json' }).catch(() => null)) ?? []
    const alreadySentThisMonth = existingLog.some(
      entry => entry.type === 'initial' && entry.month === month && entry.status !== 'failed'
    )
    if (alreadySentThisMonth) {
      console.log(`Already sent initial requests for ${month}, skipping.`)
      return
    }

    // קבל OAuth client
    const tokenStore = getStore('gmail-tokens')
    const tokenData = await tokenStore.get('admin-refresh-token', { type: 'json' }) as { refreshToken: string } | null
    if (!tokenData?.refreshToken) {
      console.error('No refresh token found, cannot send emails.')
      return
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const suppliers = config.suppliers.filter(s => s.included && s.email)
    const newLogEntries: SendLog[] = []

    for (const supplier of suppliers) {
      const subject = `בקשה לחשבונית ${monthName} ${year} — ${supplier.supplierName}`
      const branchesList = supplier.branchNames.map(b => `• ${b}`).join('\n')
      const bodyText = `שלום ${supplier.contactPerson || supplier.supplierName},

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
          requestBody: { raw: buildRawEmail(supplier.email, subject, bodyText) },
        })
        console.log(`Sent to ${supplier.supplierName} (${supplier.email})`)
      } catch (err: any) {
        console.error(`Failed to send to ${supplier.supplierName}:`, err.message)
        status = 'failed'
      }

      newLogEntries.push({
        id: `${Date.now()}_${supplier.supplierId}`,
        type: 'initial',
        supplierName: supplier.supplierName,
        supplierEmail: supplier.email,
        month,
        sentAt: new Date().toISOString(),
        status,
      })

      await new Promise(r => setTimeout(r, 800))
    }

    // שמור את הלוג
    const updatedLog = [...newLogEntries, ...existingLog].slice(0, 200)
    await store.setJSON('send-log', updatedLog)

    console.log(`Done: sent ${newLogEntries.filter(e => e.status === 'sent').length} emails for ${month}`)
  } catch (error: any) {
    console.error('scheduled-invoice-send error:', error)
  }
}

// רץ כל יום ב-07:00 UTC (10:00 שעון ישראל)
export const config: Config = {
  schedule: '0 7 * * *',
}
