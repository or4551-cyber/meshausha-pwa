import { create } from 'zustand'

export interface SupplierEmailConfig {
  supplierId: string
  supplierName: string
  email: string
  contactPerson: string
  branchNames: string[]
  included: boolean
}

export interface AutomationConfig {
  enabled: boolean
  sendDayOfMonth: number      // 1–28
  followupAfterDays: number   // כמה ימים לפני תזכורת
  suppliers: SupplierEmailConfig[]
  updatedAt: string
}

export interface SendLog {
  id: string
  type: 'initial' | 'followup'
  supplierName: string
  supplierEmail: string
  month: string               // YYYY-MM
  sentAt: string
  status: 'sent' | 'responded' | 'failed'
}

interface AutomationState {
  config: AutomationConfig | null
  log: SendLog[]
  loading: boolean
  error: string | null

  fetchConfig: () => Promise<void>
  saveConfig: (config: AutomationConfig) => Promise<void>
  sendNow: (suppliers: SupplierEmailConfig[], month: string, isFollowup?: boolean) => Promise<{ sent: number; failed: number }>
  checkResponses: (accessToken?: string, month?: string) => Promise<{ updated: number }>
}

const API_BASE = '/.netlify/functions'

export const useAutomationStore = create<AutomationState>((set) => ({
  config: null,
  log: [],
  loading: false,
  error: null,

  fetchConfig: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/automation-config`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ config: data.config, log: data.log ?? [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  saveConfig: async (config) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/automation-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-config', config }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ config: data.config, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  sendNow: async (suppliers, month, isFollowup = false) => {
    const res = await fetch(`${API_BASE}/send-invoice-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suppliers, month, isFollowup }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    // שמור לוג
    const logEntries: SendLog[] = suppliers
      .filter(s => s.included && s.email)
      .map(s => ({
        id: `${Date.now()}_${s.supplierId}`,
        type: isFollowup ? 'followup' : 'initial',
        supplierName: s.supplierName,
        supplierEmail: s.email,
        month,
        sentAt: new Date().toISOString(),
        status: data.results?.find((r: any) => r.supplier === s.supplierName)?.success ? 'sent' : 'failed',
      }))

    for (const entry of logEntries) {
      await fetch(`${API_BASE}/automation-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'append-log', entry }),
      })
    }

    set(state => ({ log: [...logEntries, ...state.log] }))
    return { sent: data.sent ?? 0, failed: data.failed ?? 0 }
  },

  checkResponses: async (accessToken, month) => {
    const res = await fetch(`${API_BASE}/invoice-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, month }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    if (data.log) {
      set({ log: data.log })
    }

    return { updated: data.updated ?? 0 }
  },
}))
