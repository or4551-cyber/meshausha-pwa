import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Product {
  id: string
  name: string
  supplier: string
  price: number
  category?: string
}

export interface DaySchedule {
  day: number // 0 = ראשון, 1 = שני, וכו'
  branchCodes: string[] // קודי הסניפים שמזמינים ביום הזה
  notificationTime: string // פורמט: "HH:MM"
}

export interface Supplier {
  id: string
  name: string
  schedules: DaySchedule[] // לוח זמנים לפי יום עם סניפים ספציפיים
  description: string
  logo?: string
  email?: string
  contactPerson?: string
  phone?: string
  createdAt: string
}

interface SuppliersState {
  suppliers: Supplier[]
  products: Product[]
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
  addProducts: (products: Omit<Product, 'id'>[]) => void
  seedStaticProducts: (products: Product[]) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  deleteProduct: (id: string) => void
  getSupplierById: (id: string) => Supplier | undefined
  getProductsBySupplier: (supplierName: string) => Product[]
  getAllSuppliers: () => Supplier[]
  getAllProducts: () => Product[]
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set, get) => ({
      suppliers: [],
      products: [],

      addSupplier: (supplier) => {
        const newSupplier: Supplier = {
          ...supplier,
          id: `supplier_${Date.now()}`,
          createdAt: new Date().toISOString()
        }
        
        set((state) => ({
          suppliers: [...state.suppliers, newSupplier]
        }))
      },

      updateSupplier: (id, updates) => {
        set((state) => ({
          suppliers: state.suppliers.map(s => 
            s.id === id ? { ...s, ...updates } : s
          )
        }))
      },

      deleteSupplier: (id) => {
        const supplier = get().suppliers.find(s => s.id === id)
        if (supplier) {
          // מחק גם את כל המוצרים של הספק
          set((state) => ({
            suppliers: state.suppliers.filter(s => s.id !== id),
            products: state.products.filter(p => p.supplier !== supplier.name)
          }))
        }
      },

      addProducts: (products) => {
        const newProducts = products.map(p => ({
          ...p,
          id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))

        set((state) => ({
          products: [...state.products, ...newProducts]
        }))
      },

      // זורע מוצרים סטטיים עם ID קבוע - לא מוסיף אם כבר קיים
      seedStaticProducts: (products) => {
        set((state) => {
          const existingIds = new Set(state.products.map(p => p.id))
          const toAdd = products.filter(p => !existingIds.has(p.id))
          if (toAdd.length === 0) return state
          return { products: [...state.products, ...toAdd] }
        })
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map(p => 
            p.id === id ? { ...p, ...updates } : p
          )
        }))
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter(p => p.id !== id)
        }))
      },

      getSupplierById: (id) => {
        return get().suppliers.find(s => s.id === id)
      },

      getProductsBySupplier: (supplierName) => {
        return get().products.filter(p => p.supplier === supplierName)
      },

      getAllSuppliers: () => {
        return get().suppliers
      },

      getAllProducts: () => {
        return get().products
      }
    }),
    {
      name: 'meshausha-suppliers'
    }
  )
)
