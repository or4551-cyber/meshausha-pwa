import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** עיצוב הרסני (אדום) — לפעולות מחיקה / לא הפיכות */
  destructive?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  id: string
  resolve: (ok: boolean) => void
}

interface ConfirmState {
  pending: PendingConfirm | null
  open: (opts: ConfirmOptions, resolve: (ok: boolean) => void) => void
  close: (ok: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,

  open: (opts, resolve) => {
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    set({ pending: { ...opts, id, resolve } })
  },

  close: (ok) => {
    const current = get().pending
    if (current) current.resolve(ok)
    set({ pending: null })
  },
}))

/**
 * תחליף ל-window.confirm עם UI מעוצב. השימוש:
 *   const ok = await showConfirm({ title: 'למחוק?', description: '...', destructive: true })
 *   if (!ok) return
 */
export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().open(opts, resolve)
  })
}
