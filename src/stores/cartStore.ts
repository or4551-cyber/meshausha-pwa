import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  supplier: string
  quantity: number
  price: number
}

export type AddItemResult =
  | { ok: true }
  | { ok: false; reason: 'supplier_conflict'; conflictSupplier: string }

interface CartState {
  items: CartItem[]
  favorites: string[]
  /**
   * מוסיף פריט לסל. החל מ-Phase 1: סל יכול להכיל ספק יחיד.
   * אם הסל כבר מכיל ספק שונה — יחזיר { ok: false, conflictSupplier }.
   * הקוד הקורא חייב להציג מודאל שמציע: שלח קודם / רוקן ופתח חדש.
   * `force: true` עוקף את הבדיקה (לשימוש פנימי אחרי clearCart בלוגיקות הזמנה-חוזרת).
   */
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number, force?: boolean) => AddItemResult
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleFavorite: (productId: string) => void
  getTotalItems: () => number
  getTotalPrice: () => number
  /** שם הספק היחיד בסל (null אם הסל ריק) */
  getCartSupplier: () => string | null
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      favorites: [],
      
      addItem: (item, quantity = 1, force = false) => {
        const state = get()
        const existingItem = state.items.find(i => i.productId === item.productId)

        // אם המוצר כבר בסל — רק עדכון כמות, אין קונפליקט
        if (existingItem) {
          set({
            items: state.items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + quantity }
                : i
            )
          })
          return { ok: true }
        }

        // בדיקת ספק יחיד — חוסמת אם הסל מכיל ספק אחר
        if (!force && state.items.length > 0) {
          const cartSupplier = state.items[0].supplier
          if (cartSupplier && item.supplier && cartSupplier !== item.supplier) {
            return { ok: false, reason: 'supplier_conflict', conflictSupplier: cartSupplier }
          }
        }

        set({
          items: [...state.items, { ...item, quantity }]
        })
        return { ok: true }
      },
      
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.productId !== productId)
        }))
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        
        set((state) => ({
          items: state.items.map(i =>
            i.productId === productId ? { ...i, quantity } : i
          )
        }))
      },
      
      clearCart: () => set({ items: [] }),
      
      toggleFavorite: (productId) => {
        set((state) => ({
          favorites: state.favorites.includes(productId)
            ? state.favorites.filter(id => id !== productId)
            : [...state.favorites, productId]
        }))
      },
      
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
      
      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      },

      getCartSupplier: () => {
        const items = get().items
        if (items.length === 0) return null
        return items[0].supplier ?? null
      }
    }),
    {
      name: 'meshausha-cart'
    }
  )
)
