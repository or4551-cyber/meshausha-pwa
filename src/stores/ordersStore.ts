import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from './cartStore'
import { savePendingOrder, getPendingOrders, markOrderSynced } from '../lib/db'

export type OrderStatus = 'pending' | 'dispatched' | 'deleted' | 'merged'

export interface Order {
  id: string
  branch: string
  branchCode: string
  items: CartItem[]
  notes: string
  createdAt: string
  totalPrice: number
  status: OrderStatus
  deletedAt?: string
  deletedBy?: 'admin'
  mergedIntoId?: string
  mergedAt?: string
}

/** האם ההזמנה אקטיבית (לא נמחקה ולא מוזגה) */
export function isActiveOrder(o: Order): boolean {
  return o.status !== 'deleted' && o.status !== 'merged'
}

export interface OrderTemplate {
  id: string
  name: string
  items: CartItem[]
  createdAt: string
}

interface OrdersState {
  orders: Order[]
  templates: OrderTemplate[]
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => Order
  getOrdersByBranch: (branchCode: string) => Order[]
  getAllOrders: () => Order[]
  saveTemplate: (name: string, items: CartItem[]) => void
  updateTemplate: (templateId: string, items: CartItem[]) => void
  loadTemplate: (templateId: string) => CartItem[] | null
  deleteTemplate: (templateId: string) => void
  markOrderDispatched: (orderId: string) => void
  markOrderDeleted: (orderId: string) => void
  markOrderMerged: (orderId: string, targetId: string) => void
  applyMergeAppend: (targetId: string, items: CartItem[], notesAppendix: string, totalPrice: number) => void
  getPendingOrders: () => Order[]
  /** הזמנה אחרונה לאותו ספק+סניף בחלון N שעות, רק הזמנות פעילות */
  getRecentOrderForSupplierBranch: (
    supplier: string,
    branchCode: string,
    hoursWindow?: number,
    extraOrders?: Order[]
  ) => Order | null
  syncOfflineOrders: () => Promise<number>
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      templates: [],
      
      addOrder: (order) => {
        const newOrder: Order = {
          ...order,
          id: `order_${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: 'pending'
        }

        if (!navigator.onLine) {
          savePendingOrder({
            branch: order.branch,
            branchCode: order.branchCode,
            items: order.items,
            notes: order.notes,
            totalPrice: order.totalPrice,
            createdAt: newOrder.createdAt,
          })
        }

        set((state) => ({
          orders: [newOrder, ...state.orders]
        }))

        return newOrder
      },

      markOrderDispatched: (orderId) => {
        set((state) => ({
          orders: state.orders.map(o =>
            o.id === orderId ? { ...o, status: 'dispatched' as const } : o
          )
        }))
      },

      markOrderDeleted: (orderId) => {
        set((state) => ({
          orders: state.orders.map(o =>
            o.id === orderId
              ? { ...o, status: 'deleted' as const, deletedAt: new Date().toISOString(), deletedBy: 'admin' }
              : o
          )
        }))
      },

      markOrderMerged: (orderId, targetId) => {
        set((state) => ({
          orders: state.orders.map(o =>
            o.id === orderId
              ? { ...o, status: 'merged' as const, mergedIntoId: targetId, mergedAt: new Date().toISOString() }
              : o
          )
        }))
      },

      applyMergeAppend: (targetId, newItems, notesAppendix, totalPrice) => {
        set((state) => ({
          orders: state.orders.map(o => {
            if (o.id !== targetId) return o
            // ממזג פריטים: שם זהה → סוכם quantities, חדש → מתווסף
            const merged = [...o.items]
            newItems.forEach(ni => {
              const idx = merged.findIndex(m => m.name === ni.name)
              if (idx >= 0) merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + ni.quantity }
              else merged.push(ni)
            })
            const notes = notesAppendix
              ? (o.notes ? `${o.notes}\n--- תוספת ---\n${notesAppendix}` : `--- תוספת ---\n${notesAppendix}`)
              : o.notes
            return { ...o, items: merged, notes, totalPrice }
          })
        }))
      },

      getPendingOrders: () => {
        return get().orders.filter(o => o.status === 'pending')
      },

      getRecentOrderForSupplierBranch: (supplier, branchCode, hoursWindow = 12, extraOrders) => {
        const cutoff = Date.now() - hoursWindow * 3600 * 1000
        const all = extraOrders && extraOrders.length > 0
          ? (() => {
              const map = new Map<string, Order>()
              extraOrders.forEach(o => map.set(o.id, o))
              get().orders.forEach(o => { if (!map.has(o.id)) map.set(o.id, o) })
              return Array.from(map.values())
            })()
          : get().orders
        const matches = all
          .filter(isActiveOrder)
          .filter(o => o.branchCode === branchCode)
          .filter(o => o.items.some(i => i.supplier === supplier))
          .filter(o => new Date(o.createdAt).getTime() >= cutoff)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        return matches[0] ?? null
      },

      syncOfflineOrders: async () => {
        const pending = await getPendingOrders()
        let synced = 0
        for (const p of pending) {
          const exists = get().orders.some(
            o => o.branchCode === p.branchCode && o.createdAt === p.createdAt
          )
          if (!exists) {
            const newOrder: Order = {
              id: `order_offline_${p.id ?? Date.now()}`,
              branch: p.branch,
              branchCode: p.branchCode,
              items: p.items,
              notes: p.notes,
              totalPrice: p.totalPrice,
              createdAt: p.createdAt,
              status: 'pending',
            }
            set((state) => ({ orders: [newOrder, ...state.orders] }))
          }
          if (p.id !== undefined) await markOrderSynced(p.id)
          synced++
        }
        return synced
      },
      
      getOrdersByBranch: (branchCode) => {
        return get().orders.filter(order => order.branchCode === branchCode)
      },
      
      getAllOrders: () => {
        return get().orders
      },
      
      saveTemplate: (name, items) => {
        const newTemplate: OrderTemplate = {
          id: `template_${Date.now()}`,
          name,
          items,
          createdAt: new Date().toISOString()
        }
        
        set((state) => ({
          templates: [newTemplate, ...state.templates]
        }))
      },
      
      updateTemplate: (templateId, items) => {
        set((state) => ({
          templates: state.templates.map(t =>
            t.id === templateId ? { ...t, items } : t
          )
        }))
      },

      loadTemplate: (templateId) => {
        const template = get().templates.find(t => t.id === templateId)
        return template ? template.items : null
      },
      
      deleteTemplate: (templateId) => {
        set((state) => ({
          templates: state.templates.filter(t => t.id !== templateId)
        }))
      }
    }),
    {
      name: 'meshausha-orders'
    }
  )
)
