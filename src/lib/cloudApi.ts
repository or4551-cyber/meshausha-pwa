import type { Order } from '../stores/ordersStore'

const BASE = '/.netlify/functions'

/**
 * שמירה לענן שמובטחת לשרוד ניווט/סגירת טאב/יציאה לאפליקציה אחרת (WhatsApp).
 * משתמש ב-sendBeacon כשזמין; אחרת ב-fetch עם keepalive:true.
 * כל הכתיבות לענן חייבות להשתמש ב-helper זה כדי למנוע איבוד נתונים.
 */
export function beaconPost(path: string, data: unknown): void {
  const url = `${BASE}/${path}`
  const body = JSON.stringify(data)
  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(url, blob)) return
    }
  } catch { /* ignore */ }
  // fallback: fetch עם keepalive — שורד גם במהלך unload
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

/** שליחת PATCH שמובטחת לשרוד ניווט. sendBeacon לא תומך ב-PATCH ולכן keepalive בלבד. */
export function keepalivePatch(path: string, data: unknown): void {
  fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  }).catch(() => {})
}

// ─── ספקים ומוצרים ────────────────────────────────────────

/** שמור ספקים ומוצרים בענן (נתוני אדמין) — שורד ניווט */
export async function saveSuppliersToCloud(data: { suppliers: any[]; products: any[] }): Promise<void> {
  const res = await fetch(`${BASE}/settings-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suppliersData: data }),
    keepalive: true,
  })
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`
    try { const b = await res.json(); errMsg = b.error || b.errorMessage || errMsg } catch {}
    throw new Error(errMsg)
  }
}

/** טען ספקים ומוצרים מהענן */
export async function getSuppliersFromCloud(): Promise<{ suppliers: any[]; products: any[] } | null> {
  try {
    const res = await fetch(`${BASE}/settings-api?type=suppliers`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// ─── הזמנות ───────────────────────────────────────────────

/** שמור הזמנה בענן (awaitable) */
export async function saveOrderToCloud(order: Order): Promise<void> {
  await fetch(`${BASE}/orders-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
    keepalive: true,
  })
}

/**
 * שמור הזמנה לענן באמצעות sendBeacon — אמין גם בזמן ניווט/יציאה לאפליקציה אחרת
 * (כמו פתיחת WhatsApp במובייל).
 */
export function saveOrderToCloudBeacon(order: Order): void {
  beaconPost('orders-api', order)
}

/** קבל את כל ההזמנות מהענן */
export async function getOrdersFromCloud(): Promise<Order[]> {
  try {
    const res = await fetch(`${BASE}/orders-api`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

/** סמן הזמנות כנשלחו לספק — שורד ניווט (keepalive) */
export function markOrdersDispatchedInCloud(ids: string[]): void {
  keepalivePatch('orders-api', { ids, status: 'dispatched' })
}

/** מחיקה רכה של הזמנה (אדמין) — שורד ניווט */
export function deleteOrderInCloud(id: string): void {
  keepalivePatch('orders-api', { ids: [id], status: 'deleted' })
}

/** סימון הזמנה כממוזגת (אחרי מיזוג ידני באדמין) — שורד ניווט */
export function markOrderMergedInCloud(id: string, mergedIntoId: string): void {
  keepalivePatch('orders-api', { ids: [id], status: 'merged', mergedIntoId })
}

/**
 * מיזוג תוספת לתוך הזמנה קיימת בענן (manager-initiated או admin-initiated).
 * שולח awaitable כדי שנדע אם הצליח לפני שמסיימים את הזרימה.
 */
export async function mergeIntoOrder(
  targetId: string,
  items: Array<{ productId: string; name: string; supplier: string; quantity: number; price: number }>,
  notes: string,
  branch: string
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/orders-api`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'merge', targetId, items, notes, branch }),
      keepalive: true,
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── הגדרות ───────────────────────────────────────────────

/** קבל מספר WhatsApp של אדמין מהענן */
export async function getAdminPhoneFromCloud(): Promise<string> {
  try {
    const res = await fetch(`${BASE}/settings-api`)
    if (!res.ok) return ''
    const data = await res.json()
    return data.adminPhone || ''
  } catch {
    return ''
  }
}

/** שמור מספר WhatsApp של אדמין בענן — שורד ניווט */
export function saveAdminPhoneToCloud(phone: string): void {
  beaconPost('settings-api', { adminPhone: phone })
}
