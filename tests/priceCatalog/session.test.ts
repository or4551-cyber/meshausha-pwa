import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { authenticateWithPin, getSessionToken, clearPriceSession, primeAdminPin } from '../../src/lib/priceAdminSession'

const future = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 1000).toISOString()
const withinSkew = () => new Date(Date.now() + 30 * 1000).toISOString() // עדיין תקף-לשרת אך בתוך חלון הרענון

// stub שמחזיר token שונה בכל קריאה מוצלחת ל-/api/price-auth, ומאפשר לשלוט בתוקף ובסטטוס.
function stubAuth(opts: { status?: number; expiresAt?: () => string; throwErr?: boolean } = {}) {
  let n = 0
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    if (opts.throwErr) throw new TypeError('network down')
    const status = opts.status ?? 200
    n += 1
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ token: 'tok-' + n, expiresAt: (opts.expiresAt ?? future)() }),
    } as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => clearPriceSession())
afterEach(() => vi.unstubAllGlobals())

describe('priceAdminSession', () => {
  it('authenticateWithPin posts the pin as `secret` and caches the returned token', async () => {
    const fn = stubAuth()
    expect(await authenticateWithPin('9999')).toBe(true)
    expect(await getSessionToken()).toBe('tok-1')
    // נשלח ל-price-auth עם הסוד בגוף
    const [url, init] = fn.mock.calls[0]
    expect(String(url)).toContain('/api/price-auth')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ secret: '9999' })
  })

  it('returns a cached valid token without re-minting', async () => {
    const fn = stubAuth()
    await authenticateWithPin('9999')
    await getSessionToken()
    await getSessionToken()
    expect(fn).toHaveBeenCalledTimes(1) // mint אחד בלבד; השאר מה-cache
  })

  it('authenticateWithPin returns false on 401 and leaves no session', async () => {
    stubAuth({ status: 401 })
    expect(await authenticateWithPin('0000')).toBe(false)
    expect(await getSessionToken()).toBeNull()
  })

  it('returns false on a network error without throwing', async () => {
    stubAuth({ throwErr: true })
    await expect(authenticateWithPin('9999')).resolves.toBe(false)
    expect(await getSessionToken()).toBeNull()
  })

  it('re-mints with the remembered pin when the cached token is within the refresh skew window', async () => {
    const fn = stubAuth({ expiresAt: withinSkew }) // בתוך חלון הרענון אך עדיין תקף-לשרת
    await authenticateWithPin('9999')
    const token = await getSessionToken() // מזהה צורך-רענון → מנפיק מחדש עם ה-pin הזכור
    expect(token).toBe('tok-2')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('returns null when the cached token is truly expired and the re-mint fails (no stale token)', async () => {
    let n = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      n += 1
      if (n === 1) return { ok: true, status: 200, json: async () => ({ token: 'tok-1', expiresAt: past() }) } as Response
      return { ok: false, status: 401, json: async () => ({}) } as Response
    }))
    await authenticateWithPin('9999') // cachedToken=tok-1 פג, ה-PIN זכור
    // re-mint נכשל (401) ומשאיר טוקן פג-ממש → לא מוחזר (אחרת היה נשלח טוקן ידוע-כפסול לשרת)
    expect(await getSessionToken()).toBeNull()
  })

  it('getSessionToken returns null when never authenticated', async () => {
    stubAuth()
    expect(await getSessionToken()).toBeNull()
  })

  it('primeAdminPin lets getSessionToken mint before any explicit authenticate (login race)', async () => {
    const fn = stubAuth()
    primeAdminPin('9999') // נקרא סינכרונית בכניסה, לפני שההנפקה ברקע הסתיימה
    expect(await getSessionToken()).toBe('tok-1') // מנפיק על-בסיס ה-PIN הזכור
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('clearPriceSession forgets the token and the remembered pin (no silent re-mint)', async () => {
    stubAuth()
    await authenticateWithPin('9999')
    clearPriceSession()
    expect(await getSessionToken()).toBeNull()
  })
})
