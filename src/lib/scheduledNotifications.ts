// מערכת התראות מתוזמנות לפי ימי הזמנה
import { useSuppliersStore, DaySchedule } from '../stores/suppliersStore'

export interface SupplierSchedule {
  name: string
  schedules: DaySchedule[] // לוח זמנים עם סניפים לפי יום
  description: string
}

// ממשק לתאימות לאחור
export interface LegacySupplierSchedule {
  name: string
  orderDays: number[]
  notificationTime: string
  description: string
}

// לוח זמנים סטטי לספקים (לתאימות לאחור) - כל הסניפים
const ALL_BRANCHES = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009']

const STATIC_SUPPLIER_SCHEDULES: SupplierSchedule[] = [
  {
    name: 'מעדניית השף',
    schedules: [
      { day: 0, branchCodes: ALL_BRANCHES, notificationTime: '09:00' },
      { day: 3, branchCodes: ALL_BRANCHES, notificationTime: '09:00' }
    ],
    description: 'הזמנה למעדניית השף - ראשון ורביעי בבוקר'
  },
  {
    name: 'ירקות ופירות',
    schedules: [
      { day: 1, branchCodes: ALL_BRANCHES, notificationTime: '08:00' },
      { day: 4, branchCodes: ALL_BRANCHES, notificationTime: '08:00' }
    ],
    description: 'הזמנת ירקות ופירות - שני וחמישי בבוקר'
  },
  {
    name: 'מאפים',
    schedules: [
      { day: 0, branchCodes: ALL_BRANCHES, notificationTime: '07:30' },
      { day: 2, branchCodes: ALL_BRANCHES, notificationTime: '07:30' },
      { day: 4, branchCodes: ALL_BRANCHES, notificationTime: '07:30' }
    ],
    description: 'הזמנת מאפים - ראשון, שלישי וחמישי'
  },
  {
    name: 'בשר ועוף',
    schedules: [
      { day: 0, branchCodes: ALL_BRANCHES, notificationTime: '10:00' },
      { day: 3, branchCodes: ALL_BRANCHES, notificationTime: '10:00' }
    ],
    description: 'הזמנת בשר ועוף - ראשון ורביעי'
  },
  {
    name: 'מוצרי חלב',
    schedules: [
      { day: 1, branchCodes: ALL_BRANCHES, notificationTime: '08:30' },
      { day: 3, branchCodes: ALL_BRANCHES, notificationTime: '08:30' },
      { day: 5, branchCodes: ALL_BRANCHES, notificationTime: '08:30' }
    ],
    description: 'הזמנת מוצרי חלב - שני, רביעי ושישי'
  }
]

// קבלת כל הספקים (סטטיים + דינמיים)
export const getAllSupplierSchedules = (): SupplierSchedule[] => {
  try {
    const store = useSuppliersStore.getState()
    const dynamicSuppliers = store.getAllSuppliers()
    
    const dynamicSchedules: SupplierSchedule[] = dynamicSuppliers.map(s => ({
      name: s.name,
      schedules: s.schedules,
      description: s.description
    }))
    
    return [...STATIC_SUPPLIER_SCHEDULES, ...dynamicSchedules]
  } catch (e) {
    return STATIC_SUPPLIER_SCHEDULES
  }
}

// בדיקה אם צריך לשלוח התראה היום לסניף מסוים
export const shouldNotifyToday = (schedule: SupplierSchedule, branchCode?: string): boolean => {
  const today = new Date().getDay()
  
  // בדוק אם יש לוח זמנים להיום
  const todaySchedules = schedule.schedules.filter(s => s.day === today)
  
  if (todaySchedules.length === 0) return false
  
  // אם לא צוין סניף, החזר true אם יש לוח זמנים להיום
  if (!branchCode) return true
  
  // בדוק אם הסניף נמצא באחד מלוחות הזמנים של היום
  return todaySchedules.some(s => s.branchCodes.includes(branchCode))
}

// קבלת ספקים שצריך להזמין היום (לסניף מסוים)
export const getTodaySuppliers = (branchCode?: string): SupplierSchedule[] => {
  return getAllSupplierSchedules().filter(s => shouldNotifyToday(s, branchCode))
}

// חישוב זמן עד ההתראה הבאה (במילישניות) לסניף מסוים
export const getTimeUntilNextNotification = (schedule: SupplierSchedule, branchCode: string): number => {
  const now = new Date()
  const currentDay = now.getDay()
  
  // מצא את כל הלוחות זמנים שרלוונטיים לסניף
  const relevantSchedules = schedule.schedules.filter(s => s.branchCodes.includes(branchCode))
  
  if (relevantSchedules.length === 0) {
    return Infinity // אין לוח זמנים לסניף הזה
  }
  
  let minTime = Infinity
  
  // עבור על כל לוח זמנים רלוונטי
  for (const daySchedule of relevantSchedules) {
    const [hours, minutes] = daySchedule.notificationTime.split(':').map(Number)
    const notificationTime = new Date()
    notificationTime.setHours(hours, minutes, 0, 0)
    
    // חשב כמה ימים עד היום הזה
    let daysUntil = (daySchedule.day - currentDay + 7) % 7
    
    // אם זה היום ואבל הזמן עבר, קפוץ לשבוע הבא
    if (daysUntil === 0 && notificationTime <= now) {
      daysUntil = 7
    }
    
    notificationTime.setDate(notificationTime.getDate() + daysUntil)
    const timeUntil = notificationTime.getTime() - now.getTime()
    
    if (timeUntil < minTime) {
      minTime = timeUntil
    }
  }
  
  return minTime
}

// הגדרת התראה מתוזמנת לסניף מסוים
export const scheduleNotification = async (
  schedule: SupplierSchedule,
  branchName: string,
  branchCode: string
): Promise<void> => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported')
    return
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return
  }

  // בדוק אם הסניף רלוונטי לספק הזה
  if (!shouldNotifyToday(schedule, branchCode) && 
      schedule.schedules.every(s => !s.branchCodes.includes(branchCode))) {
    return // הסניף לא רלוונטי לספק הזה
  }

  const timeUntilNotification = getTimeUntilNextNotification(schedule, branchCode)
  
  if (timeUntilNotification === Infinity) {
    return // אין לוח זמנים לסניף הזה
  }
  
  setTimeout(async () => {
    const registration = await navigator.serviceWorker.ready
    
    await registration.showNotification('⏰ תזכורת הזמנה', {
      body: `${branchName} - זמן להזמין מ${schedule.name}!`,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: `order-reminder-${schedule.name}-${branchCode}`,
      requireInteraction: true,
      data: {
        type: 'order_reminder',
        supplier: schedule.name,
        branch: branchName,
        branchCode
      }
    })
    
    // תזמן שוב ליום הבא
    scheduleNotification(schedule, branchName, branchCode)
  }, timeUntilNotification)
}

// הפעלת כל ההתראות המתוזמנות לסניף מסוים
export const scheduleAllNotifications = async (branchName: string, branchCode: string): Promise<void> => {
  const allSchedules = getAllSupplierSchedules()
  for (const schedule of allSchedules) {
    await scheduleNotification(schedule, branchName, branchCode)
  }
}

// קבלת סיכום ההתראות הקרובות לסניף מסוים
export const getUpcomingNotifications = (branchCode: string): Array<{
  supplier: string
  time: Date
  description: string
}> => {
  const now = new Date()
  const allSchedules = getAllSupplierSchedules()
  
  return allSchedules
    .filter(schedule => schedule.schedules.some(s => s.branchCodes.includes(branchCode)))
    .map(schedule => {
      const timeUntil = getTimeUntilNextNotification(schedule, branchCode)
      
      if (timeUntil === Infinity) return null
      
      const notificationTime = new Date(now.getTime() + timeUntil)
      
      return {
        supplier: schedule.name,
        time: notificationTime,
        description: schedule.description
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.time.getTime() - b.time.getTime())
}

// פורמט תאריך לעברית
export const formatNotificationTime = (date: Date): string => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const dayName = days[date.getDay()]
  const time = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return `היום ב-${time}`
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return `מחר ב-${time}`
  } else {
    return `יום ${dayName} ב-${time}`
  }
}
