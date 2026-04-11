import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationPriority = 'info' | 'warning' | 'urgent'
export type NotificationRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export interface AdminNotification {
  id: string
  title: string
  message: string
  targetBranchCodes: string[] // ['all'] לכל הסניפים, או קודים ספציפיים
  priority: NotificationPriority
  createdAt: string
  expiresAt?: string          // ISO date, אופציונלי
  scheduledAt?: string        // ISO datetime – מתי להציג לראשונה
  recurrence?: NotificationRecurrence
}

// האם ההתראה אמורה להופיע עכשיו לפי לוח הזמנים
const shouldShowNow = (n: AdminNotification): boolean => {
  if (!n.scheduledAt) return true   // ללא תזמון – מוצג מיד

  const scheduled = new Date(n.scheduledAt)
  const now = new Date()

  if (!n.recurrence || n.recurrence === 'none') {
    return scheduled <= now
  }

  // לא הגיע עדיין תאריך ההתחלה
  if (scheduled > now) return false

  const sh = scheduled.getHours()
  const sm = scheduled.getMinutes()
  const nh = now.getHours()
  const nm = now.getMinutes()
  const isTimeOk = nh > sh || (nh === sh && nm >= sm)

  if (n.recurrence === 'daily')   return isTimeOk
  if (n.recurrence === 'weekly')  return now.getDay()  === scheduled.getDay()  && isTimeOk
  if (n.recurrence === 'monthly') return now.getDate() === scheduled.getDate() && isTimeOk

  return true
}

interface AdminNotificationsState {
  notifications: AdminNotification[]
  addNotification: (n: Omit<AdminNotification, 'id' | 'createdAt'>) => void
  deleteNotification: (id: string) => void
  getNotificationsForBranch: (branchCode: string) => AdminNotification[]
}

export const useAdminNotificationsStore = create<AdminNotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (data) => {
        const notification: AdminNotification = {
          ...data,
          id: `notif_${Date.now()}`,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ notifications: [notification, ...state.notifications] }))
      },

      deleteNotification: (id) => {
        set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }))
      },

      getNotificationsForBranch: (branchCode) => {
        const now = new Date()
        return get().notifications.filter((n) => {
          const isTarget =
            n.targetBranchCodes.includes('all') || n.targetBranchCodes.includes(branchCode)
          const notExpired = !n.expiresAt || new Date(n.expiresAt) > now
          return isTarget && notExpired && shouldShowNow(n)
        })
      },
    }),
    { name: 'admin-notifications-store' }
  )
)
