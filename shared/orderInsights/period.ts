import type { PeriodPreset, ResolvedRange } from './types'

export const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
export const HE_WEEKDAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']
const TZ = 'Asia/Jerusalem'
const DAY = 86400000

export function israelParts(instant: Date): { year: number; month: number; day: number; weekday: number } {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { year: +p.year, month: +p.month, day: +p.day, weekday: wd[p.weekday] }
}

function tzOffsetMs(instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value
  let hour = +p.hour
  if (hour === 24) hour = 0
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second)
  return asUTC - instant.getTime()
}

// UTC instant of Israel-local midnight for (y, m[1-based], d). Overflow in d/m is normalized by Date.UTC.
function israelMidnightUTC(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0)
  const offset = tzOffsetMs(new Date(guess))
  return new Date(guess - offset)
}

export function resolvePeriod(preset: PeriodPreset, nowISO: string): ResolvedRange {
  const now = new Date(nowISO)
  const { year: y, month: m, day: d, weekday: wd } = israelParts(now)
  const iso = (dt: Date) => dt.toISOString()
  const mid = israelMidnightUTC
  switch (preset) {
    case 'today':      return { from: iso(mid(y, m, d)),     to: iso(mid(y, m, d + 1)), label: 'היום' }
    case 'yesterday':  return { from: iso(mid(y, m, d - 1)), to: iso(mid(y, m, d)),     label: 'אתמול' }
    case 'this_week':  { const s = mid(y, m, d - wd); return { from: iso(s), to: iso(new Date(s.getTime() + 7 * DAY)), label: 'השבוע' } }
    case 'last_week':  { const cur = mid(y, m, d - wd); const s = new Date(cur.getTime() - 7 * DAY); return { from: iso(s), to: iso(cur), label: 'שבוע שעבר' } }
    case 'this_month': return { from: iso(mid(y, m, 1)), to: iso(mid(y, m + 1, 1)), label: `${HE_MONTHS[m - 1]} ${y}` }
    case 'last_month': { const pm = m === 1 ? 12 : m - 1; const py = m === 1 ? y - 1 : y; return { from: iso(mid(py, pm, 1)), to: iso(mid(y, m, 1)), label: `${HE_MONTHS[pm - 1]} ${py}` } }
    case 'last_30d':   return { from: iso(new Date(now.getTime() - 30 * DAY)), to: iso(now), label: '30 הימים האחרונים' }
    case 'last_90d':   return { from: iso(new Date(now.getTime() - 90 * DAY)), to: iso(now), label: '90 הימים האחרונים' }
    case 'this_quarter': { const qs = Math.floor((m - 1) / 3) * 3 + 1; return { from: iso(mid(y, qs, 1)), to: iso(mid(y, qs + 3, 1)), label: `רבעון ${Math.floor((m - 1) / 3) + 1}/${y}` } }
    case 'last_quarter': { const cqs = Math.floor((m - 1) / 3) * 3 + 1; return { from: iso(mid(y, cqs - 3, 1)), to: iso(mid(y, cqs, 1)), label: 'רבעון קודם' } }
    case 'ytd':        return { from: iso(mid(y, 1, 1)), to: iso(now), label: `מתחילת ${y}` }
    case 'all':        return { from: '1970-01-01T00:00:00.000Z', to: iso(now), label: 'כל הזמן' }
  }
}

export function resolveExplicit(fromDate: string, toDate: string): ResolvedRange {
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  return {
    from: israelMidnightUTC(fy, fm, fd).toISOString(),
    to: israelMidnightUTC(ty, tm, td + 1).toISOString(), // inclusive end day
    label: `${fromDate} – ${toDate}`,
  }
}
