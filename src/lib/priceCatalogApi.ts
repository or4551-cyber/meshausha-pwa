// Client קריאה לקטלוג המחירים המרכזי (‎/api/prices/*‎).
// משתמש באותו VITE_API_TOKEN של שאר ה-API (תפקיד app=קריאה-בלבד), עם retry על 5xx/רשת.
// כל פונקציה מחזירה null על כל כשל — כדי שה-cache המקומי לעולם לא יתאפס בגלל שגיאה.
// פעולות כתיבה (preview/apply/revert/export) נבנות ב-Task 9 יחד עם מסך האדמין שמשתמש בהן.

import type { CatalogProduct, CatalogSupplier, CatalogSnapshot } from '../../shared/priceCatalog/types'
import { adaptCatalogSnapshot, type LegacyCatalogProduct } from './priceCatalogAdapter'

const TOKEN = (import.meta.env.VITE_API_TOKEN as string | undefined) ?? ''
const PRICE_BASE = '/api/prices'
const PAGE_SIZE = 200

const MAX_RETRIES = 2
const BACKOFF_MS = [100, 350, 900]
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
  return headers
}

function shouldRetry(error: unknown, response?: Response): boolean {
  if (response) return response.status >= 500 && response.status < 600
  return error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')
}

// אותה התנהגות retry כמו apiClient.ts (network/5xx בלבד; 4xx לעולם לא).
async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init)
      if (!shouldRetry(null, res)) return res
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (err) {
      if (!shouldRetry(err)) throw err
      lastErr = err
    }
    if (attempt < MAX_RETRIES) await sleep(BACKOFF_MS[attempt] ?? 1000)
  }
  throw lastErr instanceof Error ? lastErr : new Error('fetch failed after retries')
}

export interface CatalogVersionInfo {
  version: number
  checksum: string
  createdAt: string
}

// בדיקה קלה (בקשה אחת) של גרסת הקטלוג הפעילה — לשימוש ב-focus/visibility refresh.
export async function getCatalogVersion(): Promise<CatalogVersionInfo | null> {
  try {
    const res = await fetchWithRetry(`${PRICE_BASE}/catalog/version`, { headers: authHeaders() })
    if (!res.ok) return null
    return (await res.json()) as CatalogVersionInfo
  } catch {
    return null
  }
}

export interface ActiveCatalog {
  version: number
  products: LegacyCatalogProduct[]
}

// מביא את הקטלוג הפעיל המלא (גרסה + כל המוצרים הפעילים + ספקים), בעימוד.
// מחזיר null על *כל* כשל (כולל אי-עקביות גרסה תוך כדי עימוד) — כדי לא לערבב גרסאות
// ולא לאפס cache. ה-includeInactive=true מושך הכל, וה-adapter מסנן ל-active בלבד.
export async function fetchActiveCatalog(): Promise<ActiveCatalog | null> {
  try {
    const versionInfo = await getCatalogVersion()
    if (!versionInfo) return null

    const supRes = await fetchWithRetry(`${PRICE_BASE}/suppliers`, { headers: authHeaders() })
    if (!supRes.ok) return null
    const supBody = (await supRes.json()) as { version: number; suppliers: CatalogSupplier[] }
    // עקביות גרסה: אם ה-suppliers הגיעו מגרסה אחרת מ-versionInfo — בטל, אל תערבב גרסאות.
    if (supBody.version !== versionInfo.version) return null

    const products: CatalogProduct[] = []
    let offset = 0
    let total = Infinity
    while (offset < total) {
      const url = `${PRICE_BASE}/products?limit=${PAGE_SIZE}&offset=${offset}&includeInactive=true`
      const res = await fetchWithRetry(url, { headers: authHeaders() })
      if (!res.ok) return null
      const body = (await res.json()) as { version: number; total: number; products: CatalogProduct[] }
      // אם הקטלוג השתנה באמצע העימוד — בטל, אל תערבב גרסאות.
      if (body.version !== versionInfo.version) return null
      total = body.total
      products.push(...body.products)
      if (body.products.length === 0) break
      offset += body.products.length
    }

    const assembled: Pick<CatalogSnapshot, 'suppliers' | 'products'> = {
      suppliers: supBody.suppliers,
      products,
    }
    return { version: versionInfo.version, products: adaptCatalogSnapshot(assembled) }
  } catch {
    return null
  }
}
