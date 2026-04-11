import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationPriority = 'info' | 'warning' | 'urgent'

export interface AdminNotification {
  id: string
  title: string
  message: string
  targetBranchCodes: string[] // ['all'] לכל הסניפים, או קודים ספציפיים
  priority: NotificationPriority
  createdAt: string
  expiresAt?: string // ISO date, אופציונלי
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
          return isTarget && notExpired
        })
      },
    }),
    { name: 'admin-notifications-store' }
  )
)
