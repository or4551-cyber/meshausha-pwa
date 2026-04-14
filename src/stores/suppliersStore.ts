import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveSuppliersToCloud } from '../lib/cloudApi'

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
  adminPhone: string
  setAdminPhone: (phone: string) => void
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
  addProducts: (products: Omit<Product, 'id'>[]) => void
  seedStaticProducts: (products: Product[]) => void
  seedStaticSuppliers: (suppliers: Supplier[]) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  deleteProduct: (id: string) => void
  loadCloudData: (suppliers: Supplier[], products: Product[]) => void
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
      adminPhone: '',

      setAdminPhone: (phone) => {
        set({ adminPhone: phone })
      },

      addSupplier: (supplier) => {
        const newSupplier: Supplier = {
          ...supplier,
          id: `supplier_${Date.now()}`,
          createdAt: new Date().toISOString()
        }
        set((state) => ({ suppliers: [...state.suppliers, newSupplier] }))
        const s = get()
        saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products }).catch(console.error)
      },

      updateSupplier: (id, updates) => {
        set((state) => ({
          suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...updates } : s)
        }))
        const s = get()
        saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products }).catch(console.error)
      },

      deleteSupplier: (id) => {
        const supplier = get().suppliers.find(s => s.id === id)
        if (supplier) {
          set((state) => ({
            suppliers: state.suppliers.filter(s => s.id !== id),
            products: state.products.filter(p => p.supplier !== supplier.name)
          }))
          const s = get()
          saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products }).catch(console.error)
        }
      },

      addProducts: (products) => {
        const newProducts = products.map(p => ({
          ...p,
          id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
        set((state) => ({ products: [...state.products, ...newProducts] }))
        const s = get()
        saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products }).catch(console.error)
      },

      // זורע ספקים סטטיים — מוסיף רק אם עדיין לא קיימים (לפי ID)
      seedStaticSuppliers: (suppliers) => {
        set((state) => {
          const existingIds = new Set(state.suppliers.map(s => s.id))
          const toAdd = suppliers.filter(s => !existingIds.has(s.id))
          if (toAdd.length === 0) return state
          return { suppliers: [...state.suppliers, ...toAdd] }
        })
      },

      // זורע מוצרים סטטיים — מחליף את כל מוצרי הספקים הסטטיים (מבטיח התאמה מלאה למחירון)
      seedStaticProducts: (products) => {
        set((state) => {
          const staticSuppliers = new Set(products.map(p => p.supplier))
          // שמור מוצרים דינמיים (ספקים שאינם ברשימה הסטטית) + החלף את כל הסטטיים
          const nonStatic = state.products.filter(p => !staticSuppliers.has(p.supplier))
          return { products: [...nonStatic, ...products] }
        })
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
        }))
        const s = get()
        saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products }).catch(console.error)
      },

      deleteProduct: (id) => {
        set((state) => ({ products: state.products.filter(p => p.id !== id) }))
        const s = get()
        saveSuppliersToCloud({ suppliers: s.suppliers, products: s.products }).catch(console.error)
      },

      loadCloudData: (suppliers, products) => {
        set(state => ({ suppliers, products, adminPhone: state.adminPhone }))
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
