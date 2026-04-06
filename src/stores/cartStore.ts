import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  supplier: string
  quantity: number
  price: number
}

interface CartState {
  items: CartItem[]
  favorites: string[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleFavorite: (productId: string) => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      favorites: [],
      
      addItem: (item, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(i => i.productId === item.productId)
          
          if (existingItem) {
            return {
              items: state.items.map(i =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              )
            }
          }
          
          return {
            items: [...state.items, { ...item, quantity }]
          }
        })
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
      }
    }),
    {
      name: 'meshausha-cart'
    }
  )
)
