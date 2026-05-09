import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  duration: number
}

interface ToastState {
  toasts: Toast[]
  show: (variant: ToastVariant, title: string, description?: string, duration?: number) => string
  dismiss: (id: string) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (variant, title, description, duration = 4000) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const toast: Toast = { id, variant, title, description, duration }
    set((state) => ({ toasts: [...state.toasts, toast] }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
    return id
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  clear: () => set({ toasts: [] }),
}))

/**
 * תחליף ל-alert() עם UX אנושי. השתמש כך:
 *   toast.success('נשמר בהצלחה')
 *   toast.error('שגיאה', 'הפרטים: ...')
 */
export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().show('success', title, description, duration),
  error: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().show('error', title, description, duration ?? 6000),
  info: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().show('info', title, description, duration),
  warning: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().show('warning', title, description, duration ?? 5000),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
}
