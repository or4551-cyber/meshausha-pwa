// מערכת התראות Push לאדמין

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
}

// בדיקת תמיכה בהתראות
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

// בקשת הרשאה להתראות
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  return permission
}

// שליחת התראה מקומית
export const sendLocalNotification = async (payload: NotificationPayload): Promise<void> => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported')
    return
  }

  const permission = await Notification.requestPermission()
  
  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready
    
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-192x192.png',
      data: payload.data
    })
  }
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
    data: { type: 'new_order', ...orderData }
  })
}

// התראה על שינוי מחיר
export const notifyPriceChange = async (productName: string, oldPrice: number, newPrice: number): Promise<void> => {
  const change = newPrice > oldPrice ? 'עלה' : 'ירד'
  await sendLocalNotification({
    title: '💰 שינוי מחיר',
    body: `${productName} - המחיר ${change}`,
    data: { type: 'price_change', productName, oldPrice, newPrice }
  })
}

// התראה על חריגת תקציב
export const notifyBudgetExceeded = async (branch: string, budget: number, spent: number): Promise<void> => {
  await sendLocalNotification({
    title: '⚠️ חריגת תקציב',
    body: `${branch} חרג מהתקציב`,
    data: { type: 'budget_exceeded', branch, budget, spent }
  })
}

// שמירת מנוי Push (לעתיד - דורש שרת)
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  if (!isNotificationSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // TODO: החלף במפתח VAPID אמיתי
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmrpcPBblQV4qwFSf01S-4kkRzKftsHqOjfH5VqJB5VJBDWr2RGk'
      ) as any
    })
    
    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    return null
  }
}

// המרת מפתח VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
