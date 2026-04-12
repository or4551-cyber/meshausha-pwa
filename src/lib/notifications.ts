// מערכת התראות Push לאדמין

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
}

const BASE = '/.netlify/functions'

// בדיקת תמיכה בהתראות
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

// בקשת הרשאה להתראות
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser')
  }
  return Notification.requestPermission()
}

// שליחת התראה מקומית
export const sendLocalNotification = async (payload: NotificationPayload): Promise<void> => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported')
    return
  }
  if (Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-192x192.png',
    data: payload.data,
  })
}

// התראה על הזמנה חדשה
export const notifyNewOrder = async (orderData: {
  branch: string
  itemCount: number
  totalPrice: number
}): Promise<void> => {
  await sendLocalNotification({
    title: '🛒 הזמנה חדשה!',
    body: `${orderData.branch} - ${orderData.itemCount} פריטים`,
    data: { type: 'new_order', ...orderData },
  })
}

// המרת מפתח VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

// קבלת המפתח הציבורי מהשרת (נוצר אוטומטית בפעם הראשונה)
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/push-manager`)
    if (!res.ok) return null
    const data = await res.json()
    return data.publicKey ?? null
  } catch {
    return null
  }
}

// שמירת מנוי Push בשרת
export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  await fetch(`${BASE}/push-manager`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  })
}

// מחיקת מנוי Push מהשרת
export async function deletePushSubscription(endpoint: string): Promise<void> {
  await fetch(`${BASE}/push-manager`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
}

/**
 * מנוי מלא: מבקש הרשאה → מקבל מפתח VAPID מהשרת → נרשם → שומר בשרת
 * מחזיר את ה-PushSubscription או null אם נכשל
 */
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  if (!isNotificationSupported()) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const publicKey = await getVapidPublicKey()
  if (!publicKey) {
    console.warn('[Push] לא ניתן לקבל VAPID key מהשרת')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
    })
    await savePushSubscription(subscription)
    return subscription
  } catch (error) {
    console.error('[Push] נרשם נכשל:', error)
    return null
  }
}

/**
 * בודק אם יש מנוי קיים — אם לא, מנסה לרשום
 * לשימוש בטעינת האפליקציה של האדמין
 */
export const ensurePushSubscription = async (): Promise<void> => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      // שמור מחדש בשרת (אולי השרת איבד את המנוי)
      await savePushSubscription(existing)
    }
  } catch (err) {
    console.warn('[Push] ensurePushSubscription failed:', err)
  }
}
