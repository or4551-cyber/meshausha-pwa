import { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { getStore } from '@netlify/blobs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const TZ = 'Asia/Jerusalem'
const DAY_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

async function getAuth() {
  const store = getStore('gmail-tokens')
  const tokenData = await store.get('admin-refresh-token', { type: 'json' }) as any
  if (!tokenData?.refreshToken) throw new Error('NOT_CONNECTED')

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: tokenData.refreshToken })
  return oauth2
}

// מוצא את התאריך הבא של יום בשבוע מסוים עם שעה מסוימת
function nextOccurrence(dayOfWeek: number, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const result = new Date(now)
  result.setHours(h, m, 0, 0)

  const diff = (dayOfWeek - now.getDay() + 7) % 7
  if (diff === 0 && result <= now) result.setDate(result.getDate() + 7)
  else result.setDate(result.getDate() + diff)

  return result.toISOString().split('T')[0] // YYYY-MM-DD
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' }

  try {
    const body = JSON.parse(event.body || '{}')
    const { action, branchCode, branchName, reminder } = body

    const auth = await getAuth()
    const cal = google.calendar({ version: 'v3', auth })
    const db = getStore('calendar-data')

    // ── get-all ─────────────────────────────────────────────────────────────
    if (action === 'get-all') {
      const BRANCHES = [
        '1001','1002','1003','1004','1005','1006','1007','1008','1009'
      ]
      const result: Record<string, any> = {}
      await Promise.all(BRANCHES.map(async code => {
        const calData = await db.get(`calendar-${code}`, { type: 'json' })
        const reminders = await db.get(`reminders-${code}`, { type: 'json' }) ?? []
        result[code] = { calendar: calData, reminders }
      }))
      return { statusCode: 200, headers: CORS, body: JSON.stringify(result) }
    }

    // ── create-calendar ──────────────────────────────────────────────────────
    if (action === 'create-calendar') {
      const res = await cal.calendars.insert({
        requestBody: {
          summary: `Meshausha - ${branchName}`,
          description: `יומן הזמנות לסניף ${branchName}`,
          timeZone: TZ,
        }
      })
      const calendarId = res.data.id!

      // הפוך ליומן ציבורי (קריאה בלבד) — כדי שכל אחד יוכל להצטרף בלי Google login
      await cal.acl.insert({
        calendarId,
        requestBody: {
          role: 'reader',
          scope: { type: 'default' }
        }
      })

      const shareLink = `https://calendar.google.com/calendar/r?cid=${Buffer.from(calendarId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`

      await db.setJSON(`calendar-${branchCode}`, {
        calendarId, branchCode, branchName, shareLink,
        createdAt: new Date().toISOString()
      })

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ calendarId, shareLink }) }
    }

    // ── add-reminder ─────────────────────────────────────────────────────────
    if (action === 'add-reminder') {
      const calData = await db.get(`calendar-${branchCode}`, { type: 'json' }) as any
      if (!calData) throw new Error('יומן לא נמצא לסניף זה')

      // חשב תאריך התחלה
      let startDate: string
      if (reminder.recurrence === 'daily') {
        startDate = new Date().toISOString().split('T')[0]
      } else if (reminder.recurrence === 'weekly') {
        startDate = nextOccurrence(reminder.dayOfWeek, reminder.time)
      } else if (reminder.recurrence === 'monthly') {
        const now = new Date()
        const d = new Date(now.getFullYear(), now.getMonth(), reminder.dayOfMonth)
        if (d <= now) d.setMonth(d.getMonth() + 1)
        startDate = d.toISOString().split('T')[0]
      } else {
        // once - reminder.date = YYYY-MM-DD
        startDate = reminder.date
      }

      // RRULE
      let recurrence: string[] = []
      if (reminder.recurrence === 'daily')   recurrence = ['RRULE:FREQ=DAILY']
      if (reminder.recurrence === 'weekly')  recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${DAY_MAP[reminder.dayOfWeek]}`]
      if (reminder.recurrence === 'monthly') recurrence = [`RRULE:FREQ=MONTHLY;BYMONTHDAY=${reminder.dayOfMonth}`]

      const endTime = addMinutes(reminder.time, 30)

      const res = await cal.events.insert({
        calendarId: calData.calendarId,
        requestBody: {
          summary: reminder.title,
          description: reminder.description ?? '',
          start: { dateTime: `${startDate}T${reminder.time}:00`, timeZone: TZ },
          end:   { dateTime: `${startDate}T${endTime}:00`,       timeZone: TZ },
          recurrence: recurrence.length ? recurrence : undefined,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 0 },   // בדיוק בשעה
              { method: 'popup', minutes: 30 },  // חצי שעה לפני
            ]
          }
        }
      })

      // שמור מטא-דאטה
      const existing = (await db.get(`reminders-${branchCode}`, { type: 'json' }) as any[]) ?? []
      existing.push({
        eventId: res.data.id,
        title: reminder.title,
        description: reminder.description ?? '',
        recurrence: reminder.recurrence,
        dayOfWeek: reminder.dayOfWeek,
        dayOfMonth: reminder.dayOfMonth,
        time: reminder.time,
        date: reminder.date,
        createdAt: new Date().toISOString()
      })
      await db.setJSON(`reminders-${branchCode}`, existing)

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ eventId: res.data.id }) }
    }

    // ── delete-reminder ──────────────────────────────────────────────────────
    if (action === 'delete-reminder') {
      const calData = await db.get(`calendar-${branchCode}`, { type: 'json' }) as any
      if (!calData) throw new Error('יומן לא נמצא')

      await cal.events.delete({ calendarId: calData.calendarId, eventId: reminder.eventId })

      const existing = (await db.get(`reminders-${branchCode}`, { type: 'json' }) as any[]) ?? []
      await db.setJSON(`reminders-${branchCode}`, existing.filter((r: any) => r.eventId !== reminder.eventId))

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'פעולה לא מוכרת' }) }

  } catch (err: any) {
    const isNotConnected = err.message === 'NOT_CONNECTED'
    return {
      statusCode: isNotConnected ? 401 : 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message })
    }
  }
}
