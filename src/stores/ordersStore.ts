import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from './cartStore'

export interface Order {
  id: string
  branch: string
  branchCode: string
  items: CartItem[]
  notes: string
  createdAt: string
  totalPrice: number
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
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => void
  getOrdersByBranch: (branchCode: string) => Order[]
  getAllOrders: () => Order[]
  saveTemplate: (name: string, items: CartItem[]) => void
  loadTemplate: (templateId: string) => CartItem[] | null
  deleteTemplate: (templateId: string) => void
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
          createdAt: new Date().toISOString()
        }
        
        set((state) => ({
          orders: [newOrder, ...state.orders]
        }))
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
