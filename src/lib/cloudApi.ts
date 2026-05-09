import type { Order } from '../stores/ordersStore'
import { apiGet, apiSend, apiBeacon, apiKeepalivePatch } from './apiClient'

/**
 * Re-exports for backward compatibility with code that imports beaconPost / keepalivePatch
 * directly. Prefer apiClient helpers in new code.
 */
export const beaconPost = apiBeacon
export const keepalivePatch = apiKeepalivePatch

// ─── ספקים ומוצרים ────────────────────────────────────────

/** שמור ספקים ומוצרים בענן (נתוני אדמין) — שורד ניווט */
export async function saveSuppliersToCloud(data: { suppliers: any[]; products: any[] }): Promise<void> {
  await apiSend('settings-api', 'POST', { suppliersData: data })
}

/** טען ספקים ומוצרים מהענן */
export async function getSuppliersFromCloud(): Promise<{ suppliers: any[]; products: any[] } | null> {
  return apiGet<{ suppliers: any[]; products: any[] }>('settings-api?type=suppliers')
}

// ─── הזמנות ───────────────────────────────────────────────

/** שמור הזמנה בענן (awaitable) */
export async function saveOrderToCloud(order: Order): Promise<void> {
  await apiSend('orders-api', 'POST', order)
}

/**
 * שמור הזמנה לענן באמצעות sendBeacon — אמין גם בזמן ניווט/יציאה לאפליקציה אחרת
 * (כמו פתיחת WhatsApp במובייל).
 */
export function saveOrderToCloudBeacon(order: Order): void {
  apiBeacon('orders-api', order)
}

/** קבל את כל ההזמנות מהענן */
export async function getOrdersFromCloud(): Promise<Order[]> {
  return (await apiGet<Order[]>('orders-api')) ?? []
}

/** סמן הזמנות כנשלחו לספק — שורד ניווט (keepalive) */
export function markOrdersDispatchedInCloud(ids: string[]): void {
  apiKeepalivePatch('orders-api', { ids, status: 'dispatched' })
}

/** מחיקה רכה של הזמנה (אדמין) — שורד ניווט */
export function deleteOrderInCloud(id: string): void {
  apiKeepalivePatch('orders-api', { ids: [id], status: 'deleted' })
}

/** סימון הזמנה כממוזגת (אחרי מיזוג ידני באדמין) — שורד ניווט */
export function markOrderMergedInCloud(id: string, mergedIntoId: string): void {
  apiKeepalivePatch('orders-api', { ids: [id], status: 'merged', mergedIntoId })
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
    await apiSend('orders-api', 'PATCH', { action: 'merge', targetId, items, notes, branch })
    return true
  } catch {
    return false
  }
}

// ─── הגדרות ───────────────────────────────────────────────

/** קבל מספר WhatsApp של אדמין מהענן */
export async function getAdminPhoneFromCloud(): Promise<string> {
  const data = await apiGet<{ adminPhone?: string }>('settings-api')
  return data?.adminPhone ?? ''
}

/** שמור מספר WhatsApp של אדמין בענן — שורד ניווט */
export function saveAdminPhoneToCloud(phone: string): void {
  apiBeacon('settings-api', { adminPhone: phone })
}
