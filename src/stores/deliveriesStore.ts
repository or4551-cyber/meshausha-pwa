import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order } from './ordersStore'

export type DeliveryStatus = 'pending' | 'confirmed' | 'partial'
export type CreditStatus = 'pending_credit' | 'credit_received' | 'pending_delivery' | 'resolved'

export interface DeliveryItem {
  productId: string
  productName: string
  supplier: string
  orderedQty: number
  receivedQty: number
  price: number
  status: 'received' | 'missing' | 'partial'
  creditStatus?: CreditStatus
  creditNote?: string
}

export interface Delivery {
  id: string
  orderId: string
  branchCode: string
  branchName: string
  orderDate: string
  confirmedAt?: string
  status: DeliveryStatus
  items: DeliveryItem[]
  notes?: string
}

interface DeliveriesState {
  deliveries: Delivery[]

  // יצירת רשומת אספקה מהזמנה (ברגע שהמשתמש לוחץ "אשר קבלה")
  createDelivery: (order: Order) => Delivery
  // שמירת אישור אספקה
  confirmDelivery: (deliveryId: string, items: DeliveryItem[], notes?: string) => void
  // אדמין: עדכון סטטוס זיכוי לפריט
  resolveCredit: (deliveryId: string, productId: string, status: CreditStatus, note?: string) => void

  getDeliveryForOrder: (orderId: string) => Delivery | undefined
  getDeliveriesForBranch: (branchCode: string) => Delivery[]
  getAllDeliveries: () => Delivery[]
  getPendingCredits: () => Array<{ delivery: Delivery; item: DeliveryItem }>
}

export const useDeliveriesStore = create<DeliveriesState>()(
  persist(
    (set, get) => ({
      deliveries: [],

      createDelivery: (order) => {
        // אם כבר קיים רשומה להזמנה הזו, החזר אותה
        const existing = get().deliveries.find(d => d.orderId === order.id)
        if (existing) return existing

        const newDelivery: Delivery = {
          id: `delivery_${Date.now()}`,
          orderId: order.id,
          branchCode: order.branchCode,
          branchName: order.branch,
          orderDate: order.createdAt,
          status: 'pending',
          items: order.items.map(item => ({
            productId: item.productId,
            productName: item.name,
            supplier: item.supplier,
            orderedQty: item.quantity,
            receivedQty: item.quantity,
            price: item.price,
            status: 'received' as const,
          })),
        }

        set(state => ({ deliveries: [newDelivery, ...state.deliveries] }))
        return newDelivery
      },

      confirmDelivery: (deliveryId, items, notes) => {
        const hasMissing = items.some(i => i.status === 'missing' || i.status === 'partial')
        set(state => ({
          deliveries: state.deliveries.map(d =>
            d.id === deliveryId
              ? {
                  ...d,
                  status: hasMissing ? 'partial' : 'confirmed',
                  confirmedAt: new Date().toISOString(),
                  items,
                  notes: notes ?? d.notes,
                }
              : d
          ),
        }))
      },

      resolveCredit: (deliveryId, productId, status, note) => {
        set(state => ({
          deliveries: state.deliveries.map(d => {
            if (d.id !== deliveryId) return d
            return {
              ...d,
              items: d.items.map(item =>
                item.productId === productId
                  ? { ...item, creditStatus: status, creditNote: note ?? item.creditNote }
                  : item
              ),
            }
          }),
        }))
      },

      getDeliveryForOrder: (orderId) =>
        get().deliveries.find(d => d.orderId === orderId),

      getDeliveriesForBranch: (branchCode) =>
        get().deliveries.filter(d => d.branchCode === branchCode),

      getAllDeliveries: () => get().deliveries,

      getPendingCredits: () => {
        const result: Array<{ delivery: Delivery; item: DeliveryItem }> = []
        for (const delivery of get().deliveries) {
          for (const item of delivery.items) {
            if (
              (item.status === 'missing' || item.status === 'partial') &&
              (!item.creditStatus || item.creditStatus === 'pending_credit')
            ) {
              result.push({ delivery, item })
            }
          }
        }
        return result
      },
    }),
    { name: 'meshausha-deliveries' }
  )
)
