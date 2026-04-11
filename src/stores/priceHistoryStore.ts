import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from './cartStore'

export interface PricePoint {
  productId: string
  productName: string
  supplier: string
  price: number
  orderedAt: string // ISO date
  branchCode: string
}

interface PriceHistoryState {
  history: PricePoint[]

  // קלט: פריטים מהזמנה + קוד סניף + תאריך
  recordOrderPrices: (items: CartItem[], branchCode: string, orderedAt: string) => void

  // קבלת היסטוריית מחיר לפריט לפי productId (כרונולוגי)
  getProductHistory: (productId: string) => PricePoint[]

  // כל המוצרים הידועים (ייחודיים)
  getKnownProducts: () => Array<{ productId: string; productName: string; supplier: string }>

  // שינוי מחיר: מחיר ראשון → מחיר אחרון + אחוז
  getPriceTrend: (productId: string) => {
    first: number; last: number; change: number; changePct: number
  } | null
}

export const usePriceHistoryStore = create<PriceHistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      recordOrderPrices: (items, branchCode, orderedAt) => {
        const newPoints: PricePoint[] = items.map(item => ({
          productId: item.productId,
          productName: item.name,
          supplier: item.supplier,
          price: item.price,
          orderedAt,
          branchCode,
        }))
        set(state => ({ history: [...state.history, ...newPoints] }))
      },

      getProductHistory: (productId) =>
        get().history
          .filter(p => p.productId === productId)
          .sort((a, b) => a.orderedAt.localeCompare(b.orderedAt)),

      getKnownProducts: () => {
        const seen = new Map<string, { productId: string; productName: string; supplier: string }>()
        for (const p of get().history) {
          if (!seen.has(p.productId)) {
            seen.set(p.productId, {
              productId: p.productId,
              productName: p.productName,
              supplier: p.supplier,
            })
          }
        }
        return Array.from(seen.values()).sort((a, b) => a.productName.localeCompare(b.productName, 'he'))
      },

      getPriceTrend: (productId) => {
        const history = get().getProductHistory(productId)
        if (history.length < 2) return null
        const first = history[0].price
        const last = history[history.length - 1].price
        const change = last - first
        const changePct = (change / first) * 100
        return { first, last, change, changePct }
      },
    }),
    { name: 'meshausha-price-history' }
  )
)
