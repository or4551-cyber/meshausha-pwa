// מנהל session-אדמין לכתיבות-מחירון. ממיר את ה-PIN (9999) ל"רישיון כתיבה" חתום (8h)
// דרך /api/price-auth (בנוי + rate-limited בשרת). הסוד עצמו (ה-PIN) לעולם לא נשמר בבאנדל —
// הוא מוקלד ע"י האדמין בכניסה ומומר מיד לטוקן. הטוקן נשמר ב-localStorage (לא ה-PIN) כדי
// שריענון דף בתוך 8h לא ידרוש כניסה מחדש. ה-PIN נשמר בזיכרון בלבד (לא מתמיד) להנפקה-מחדש שקטה.

const AUTH_URL = '/api/price-auth'
const STORAGE_KEY = 'meshausha-price-session'
const SKEW_MS = 60_000 // מנפיק מחדש דקה לפני פקיעה, כדי לא לשלוח טוקן שפג באמצע בקשה.

interface CachedToken { token: string; expiresAtMs: number }

let cachedToken: CachedToken | null = null
let cachedPin: string | null = null // זיכרון בלבד — מאפשר re-mint שקט בלי מודל. לא מתמיד.
let hydrated = false
let persistEnabled = false // האם להתמיד את הטוקן ב-localStorage — נקבע לפי "זכור אותי".

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

// נקבע בכניסה לפי ה-checkbox "זכור אותי": off → הטוקן בזיכרון בלבד (לא נשאר ב-localStorage
// אחרי סגירת הלשונית), בהתאמה ל-authStore שלא משמר את מצב ההתחברות כש-rememberMe כבוי.
export function setSessionPersistence(enabled: boolean): void {
  persistEnabled = enabled
  persist() // אם כיבוי — מסיר מיד טוקן שאולי נשמר בעבר תחת "זכור אותי" דולק.
}

// טעינה עצלה של טוקן מתמיד (אם קיים ותקין) — פעם אחת.
function hydrate(): void {
  if (hydrated) return
  hydrated = true
  const ls = safeLocalStorage()
  if (!ls) return
  try {
    const raw = ls.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<CachedToken>
    if (typeof parsed.token === 'string' && typeof parsed.expiresAtMs === 'number') {
      cachedToken = { token: parsed.token, expiresAtMs: parsed.expiresAtMs }
    }
  } catch {
    /* התעלם — טוקן פגום פשוט יתעלם */
  }
}

function persist(): void {
  const ls = safeLocalStorage()
  if (!ls) return
  try {
    // כותב ל-localStorage רק כש"זכור אותי" דולק; אחרת מבטיח שאין טוקן שמור (מסיר).
    if (persistEnabled && cachedToken) ls.setItem(STORAGE_KEY, JSON.stringify(cachedToken))
    else ls.removeItem(STORAGE_KEY)
  } catch {
    /* התעלם */
  }
}

function isValid(t: CachedToken | null): t is CachedToken {
  return !!t && Date.now() < t.expiresAtMs - SKEW_MS
}

// ממיר PIN לטוקן. מחזיר true בהצלחה (200). לא זורק — 401/429/רשת מחזירים false.
export async function authenticateWithPin(pin: string): Promise<boolean> {
  try {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: pin }),
    })
    if (!res.ok) return false
    const body = (await res.json()) as { token?: unknown; expiresAt?: unknown }
    if (typeof body.token !== 'string' || typeof body.expiresAt !== 'string') return false
    const expiresAtMs = Date.parse(body.expiresAt)
    if (!Number.isFinite(expiresAtMs)) return false
    cachedToken = { token: body.token, expiresAtMs }
    cachedPin = pin
    hydrated = true
    persist()
    return true
  } catch {
    return false
  }
}

// קריאה טרייה (בלי narrowing שיורי). מחזיר טוקן שעדיין תקף-לשרת (לא פג-ממש): בתוך SKEW
// עדיין מותר להשתמש, אבל re-mint כושל שמשאיר טוקן פג-ממש → null, כדי שלא נשלח טוקן ידוע-כפסול
// (וה-UI ינחה לכניסה-מחדש במקום שגיאת 401 מבלבלת).
function freshToken(): string | null {
  return cachedToken && Date.now() < cachedToken.expiresAtMs ? cachedToken.token : null
}

// מחזיר טוקן תקף, מנפיק מחדש בשקט אם פג וה-PIN זכור. null אם אין session ואין דרך להנפיק.
export async function getSessionToken(): Promise<string | null> {
  hydrate()
  if (isValid(cachedToken)) return cachedToken.token
  if (cachedPin) {
    await authenticateWithPin(cachedPin)
    return freshToken()
  }
  return null
}

// האם יש session פעיל (בלי הנפקה). לשימוש ה-UI להצגת מצב.
export function hasActiveSession(): boolean {
  hydrate()
  return isValid(cachedToken)
}

// זוכר את ה-PIN סינכרונית (בכניסת אדמין) כדי שהכתיבה הראשונה לא תתחרה בהנפקה ברקע:
// אם getSessionToken נקרא לפני שההנפקה ברקע הסתיימה, יש לו PIN להנפיק ממנו מיד.
export function primeAdminPin(pin: string): void {
  cachedPin = pin
}

// ניקוי בהתנתקות — שוכח טוקן ו-PIN (בלי re-mint שקט).
export function clearPriceSession(): void {
  cachedToken = null
  cachedPin = null
  hydrated = true
  persist()
}

// סנכרון cross-tab: התנתקות בלשונית אחת (הסרת המפתח מ-localStorage) מפילה את ה-session
// גם בלשוניות הפתוחות האחרות — אחרת cachedToken/cachedPin בזיכרון-המודול היו ממשיכים לאשר כתיבה.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue === null) {
      cachedToken = null
      cachedPin = null
    }
  })
}
