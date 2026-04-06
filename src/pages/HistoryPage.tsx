import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search, Calendar, Package, RefreshCw, Edit } from 'lucide-react'
import { useOrdersStore } from '../stores/ordersStore'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { formatPrice } from '../lib/utils'
import { motion } from 'framer-motion'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { orders, getAllOrders, getOrdersByBranch } = useOrdersStore()
  const { clearCart, addItem } = useCartStore()
  const [searchTerm, setSearchTerm] = useState('')

  const displayOrders = user?.isAdmin ? getAllOrders() : getOrdersByBranch(user?.branchCode || '')

  const filteredOrders = useMemo(() => {
    return displayOrders.filter(order => {
      const searchLower = searchTerm.toLowerCase()
      return (
        order.branch.toLowerCase().includes(searchLower) ||
        order.items.some(item => item.name.toLowerCase().includes(searchLower))
      )
    })
  }, [displayOrders, searchTerm])

  const handleReorder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    clearCart()
    order.items.forEach(item => {
      addItem({
        productId: item.productId,
        name: item.name,
        supplier: item.supplier,
        price: item.price
      }, item.quantity)
    })
    navigate('/summary')
  }

  const handleEditAndOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    clearCart()
    order.items.forEach(item => {
      addItem({
        productId: item.productId,
        name: item.name,
        supplier: item.supplier,
        price: item.price
      }, item.quantity)
    })
    navigate('/orders')
  }

  return (
    <div className="min-h-screen bg-primary pb-safe">
      <div className="sticky top-0 z-10 bg-primary p-4 sm:p-6 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 mb-3 shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4 mb-3">
              <button
                onClick={() => navigate('/')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} className="sm:hidden" />
                <ChevronRight size={28} className="hidden sm:block" />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl sm:text-2xl">היסטוריית הזמנות</h2>
              </div>
              <div className="w-6 sm:w-7" />
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" size={20} />
              <input
                type="text"
                placeholder="חיפוש הזמנה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-3 pr-10 pl-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-3">
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto text-secondary/30 mb-4" size={64} />
            <p className="text-secondary/60 font-bold text-lg">אין הזמנות עדיין</p>
          </div>
        )}

        {filteredOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary rounded-2xl p-4 shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-black text-primary text-lg">{order.branch}</h3>
                <div className="flex items-center gap-2 text-primary/60 text-sm mt-1">
                  <Calendar size={14} />
                  <span>{new Date(order.createdAt).toLocaleDateString('he-IL')}</span>
                </div>
              </div>
              {user?.isAdmin && (
                <div className="text-left">
                  <p className="font-black text-primary text-lg">{formatPrice(order.totalPrice)}</p>
                  <p className="text-primary/60 text-xs">כולל מע"מ</p>
                </div>
              )}
            </div>

            <div className="bg-primary/5 rounded-xl p-3 mb-3">
              <p className="text-primary/70 font-bold text-sm mb-2">פריטים:</p>
              <div className="space-y-1">
                {order.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-primary font-bold">{item.name}</span>
                    <span className="text-primary/60">×{item.quantity}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-primary/50 text-xs">ועוד {order.items.length - 3} פריטים...</p>
                )}
              </div>
            </div>

            {order.notes && (
              <div className="bg-amber-50 rounded-xl p-3 mb-3">
                <p className="text-amber-900 text-xs font-bold">📝 {order.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleReorder(order.id)}
                className="flex-1 bg-primary text-secondary font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform touch-manipulation"
              >
                <RefreshCw size={16} />
                <span>הזמן שוב</span>
              </button>
              <button
                onClick={() => handleEditAndOrder(order.id)}
                className="flex-1 bg-primary/10 text-primary font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform touch-manipulation"
              >
                <Edit size={16} />
                <span>ערוך והזמן</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
