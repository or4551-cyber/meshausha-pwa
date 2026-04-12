import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from './cartStore'
import { savePendingOrder, getPendingOrders, markOrderSynced } from '../lib/db'

export interface Order {
  id: string
  branch: string
  branchCode: string
  items: CartItem[]
  notes: string
  createdAt: string
  totalPrice: number
  status: 'pending' | 'dispatched'
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
  getPendingOrders: () => Order[]
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

      getPendingOrders: () => {
        return get().orders.filter(o => o.status === 'pending')
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
