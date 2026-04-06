import { useState } from 'react'
import { Star, Plus, Minus, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { Product } from '../data/products'
import { formatPrice } from '../lib/utils'
import { motion } from 'framer-motion'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem, favorites, toggleFavorite, items } = useCartStore()
  const { user } = useAuthStore()
  const isFavorite = favorites.includes(product.id)
  const cartItem = items.find(item => item.productId === product.id)

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      supplier: product.supplier,
      price: product.price
    }, quantity)
    setQuantity(1)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-secondary rounded-2xl p-4 shadow-md"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-primary text-sm leading-tight mb-1">
            {product.name}
          </h3>
          {user?.isAdmin && (
            <p className="text-primary/70 font-bold text-lg">
              {formatPrice(product.price)}
            </p>
          )}
        </div>
        <button
          onClick={() => toggleFavorite(product.id)}
          className="p-2 touch-manipulation"
        >
          <Star
            size={20}
            className={isFavorite ? 'fill-amber-500 text-amber-500' : 'text-primary/30'}
          />
        </button>
      </div>

      {cartItem && (
        <div className="bg-primary/5 rounded-xl p-2 mb-3 text-center">
          <span className="text-primary font-bold text-sm">
            בסל: {cartItem.quantity} יחידות
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-primary/10 rounded-xl">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 touch-manipulation"
          >
            <Minus size={18} className="text-primary" />
          </button>
          <span className="px-3 font-black text-primary min-w-[2rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-2 touch-manipulation"
          >
            <Plus size={18} className="text-primary" />
          </button>
        </div>
        
        <button
          onClick={handleAdd}
          className="flex-1 bg-primary text-secondary font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform touch-manipulation"
        >
          <ShoppingCart size={18} />
          <span>הוסף</span>
        </button>
      </div>
    </motion.div>
  )
}
