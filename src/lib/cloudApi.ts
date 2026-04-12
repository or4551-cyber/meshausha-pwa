import type { Order } from '../stores/ordersStore'

const BASE = '/.netlify/functions'

// ─── ספקים ומוצרים ────────────────────────────────────────
// משתמשים ב-settings-api (פונקציה קיימת ועובדת) במקום פונקציה חדשה

/** שמור ספקים ומוצרים בענן (נתוני אדמין) */
export async function saveSuppliersToCloud(data: { suppliers: any[]; products: any[] }): Promise<void> {
  const res = await fetch(`${BASE}/settings-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suppliersData: data }),
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

/** שמור הזמנה בענן (fire-and-forget) */
export async function saveOrderToCloud(order: Order): Promise<void> {
  await fetch(`${BASE}/orders-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  })
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

/** סמן הזמנות כנשלחו לספק */
export async function markOrdersDispatchedInCloud(ids: string[]): Promise<void> {
  await fetch(`${BASE}/orders-api`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status: 'dispatched' }),
  })
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

/** שמור מספר WhatsApp של אדמין בענן */
export async function saveAdminPhoneToCloud(phone: string): Promise<void> {
  await fetch(`${BASE}/settings-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPhone: phone }),
  })
}
