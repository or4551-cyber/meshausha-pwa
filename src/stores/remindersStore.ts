import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Reminder {
  id: string
  title: string
  description: string
  date: string
  time: string
  createdAt: string
}

interface RemindersState {
  reminders: Reminder[]
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => void
  deleteReminder: (id: string) => void
}

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set) => ({
      reminders: [],

      addReminder: (data) => {
        const reminder: Reminder = {
          id: Date.now().toString(),
          ...data,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ reminders: [reminder, ...state.reminders] }))
      },

      deleteReminder: (id) => {
        set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }))
      },
    }),
    { name: 'reminders-store' }
  )
)
