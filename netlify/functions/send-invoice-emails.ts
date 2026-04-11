import { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { getStore } from '@netlify/blobs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
]

// בניית הודעת RFC 2822 בקידוד base64 לשליחה ב-Gmail API
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

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function buildInvoiceRequestBody(params: {
  contactPerson: string
  supplierName: string
  monthName: string
  year: number
  branchNames: string[]
  isFollowup?: boolean
}): string {
  const branchesList = params.branchNames.map(b => `• ${b}`).join('\n')
  const intro = params.isFollowup
    ? `שלום ${params.contactPerson},\n\nזוהי תזכורת לבקשתנו הקודמת שנשלחה לפני מספר ימים.`
    : `שלום ${params.contactPerson},`

  return `${intro}

אנו מבקשים לקבל חשבונית מס/קבלה עבור חודש ${params.monthName} ${params.year} עבור הסניפים הבאים:

${branchesList}

נא לשלוח את החשבונית לכתובת מייל זו בהקדם האפשרי.

בתודה וכל הכבוד,
צוות משאוושה
`
}

async function getOAuthClient() {
  const store = getStore('gmail-tokens')
  const tokenData = await store.get('admin-refresh-token', { type: 'json' }) as { refreshToken: string } | null

  if (!tokenData?.refreshToken) {
    throw new Error('refresh_token לא נמצא — יש להתחבר ל-Gmail תחילה בהגדרות')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken })
  return oauth2Client
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      suppliers,      // SupplierEmailConfig[]
      month,          // YYYY-MM
      isFollowup = false,
    } = body

    if (!suppliers?.length || !month) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'suppliers ו-month נדרשים' }),
      }
    }

    const [year, monthNum] = month.split('-').map(Number)
    const monthName = MONTH_NAMES_HE[monthNum - 1]

    const oauth2Client = await getOAuthClient()
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const results: Array<{ supplier: string; success: boolean; error?: string }> = []

    for (const supplier of suppliers) {
      if (!supplier.email || !supplier.included) continue

      try {
        const subject = isFollowup
          ? `תזכורת: בקשה לחשבונית ${monthName} ${year} — ${supplier.supplierName}`
          : `בקשה לחשבונית ${monthName} ${year} — ${supplier.supplierName}`

        const bodyText = buildInvoiceRequestBody({
          contactPerson: supplier.contactPerson || supplier.supplierName,
          supplierName: supplier.supplierName,
          monthName,
          year,
          branchNames: supplier.branchNames,
          isFollowup,
        })

        const rawEmail = buildRawEmail(supplier.email, subject, bodyText)

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: rawEmail },
        })

        results.push({ supplier: supplier.supplierName, success: true })

        // המתנה קצרה בין מיילים למניעת rate-limiting
        await new Promise(r => setTimeout(r, 800))
      } catch (err: any) {
        console.error(`Failed to send to ${supplier.supplierName}:`, err.message)
        results.push({ supplier: supplier.supplierName, success: false, error: err.message })
      }
    }

    const sent = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, sent, failed, results }),
    }
  } catch (error: any) {
    console.error('send-invoice-emails error:', error)
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
