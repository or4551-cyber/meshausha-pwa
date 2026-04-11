import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Search, Calendar, Package, RefreshCw, Edit, X, FileDown } from 'lucide-react'
import { useOrdersStore } from '../stores/ordersStore'
import type { Order } from '../stores/ordersStore'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { formatPrice } from '../lib/utils'
import { printSavedOrderAsPDF } from '../lib/pdfExport'
import { motion, AnimatePresence } from 'framer-motion'

const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const DAY_NAMES = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { orders, getAllOrders, getOrdersByBranch } = useOrdersStore()
  const { clearCart, addItem } = useCartStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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

  // --- לוח שנה ---
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [calendarDate])

  const ordersByDate = useMemo(() => {
    const map: Record<string, Order[]> = {}
    displayOrders.forEach(order => {
      const date = order.createdAt.split('T')[0]
      if (!map[date]) map[date] = []
      map[date].push(order)
    })
    return map
  }, [displayOrders])

  const getDayKey = (day: number) => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const selectedDayOrders = selectedDay ? (ordersByDate[selectedDay] || []) : []

  // --- פעולות ---
  const handleReorder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    clearCart()
    order.items.forEach(item => {
      addItem({ productId: item.productId, name: item.name, supplier: item.supplier, price: item.price }, item.quantity)
    })
    navigate('/summary')
  }

  const handleEditAndOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    clearCart()
    order.items.forEach(item => {
      addItem({ productId: item.productId, name: item.name, supplier: item.supplier, price: item.price }, item.quantity)
    })
    navigate('/orders')
  }

  const prevMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  // --- כרטיס הזמנה (משותף לרשימה ולוח שנה) ---
  const OrderCard = ({ order, onClose }: { order: Order; onClose?: () => void }) => (
    <div className="bg-secondary rounded-3xl p-4 shadow-md">
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-primary/10">
        <div className="flex-1">
          <h3 className="font-black text-primary text-base mb-1">{order.branch}</h3>
          <div className="flex items-center gap-1.5 text-primary/60 text-xs">
            <Calendar size={12} />
            <span>{new Date(order.createdAt).toLocaleDateString('he-IL')}</span>
          </div>
        </div>
        {user?.isAdmin && (
          <div className="text-left">
            <p className="font-black text-primary text-base">{formatPrice(order.totalPrice)}</p>
            <p className="text-primary/60 text-xs">כולל מע"מ</p>
          </div>
        )}
      </div>

      <div className="bg-primary/5 rounded-xl p-3 mb-3">
        <p className="text-primary/70 font-bold text-xs mb-2">פריטים:</p>
        <div className="space-y-1">
          {order.items.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="text-primary font-bold truncate ml-2">{item.name}</span>
              <span className="text-primary/60 flex-shrink-0">×{item.quantity}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-primary/50 text-xs mt-1">ועוד {order.items.length - 3} פריטים...</p>
          )}
        </div>
      </div>

      {order.notes && (
        <div className="bg-amber-50 rounded-xl p-2.5 mb-3">
          <p className="text-amber-900 text-xs font-bold">📝 {order.notes}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => { onClose?.(); handleReorder(order.id) }}
          className="flex-1 bg-primary text-secondary font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform touch-manipulation text-sm"
        >
          <RefreshCw size={14} />
          <span>הזמן שוב</span>
        </button>
        <button
          onClick={() => { onClose?.(); handleEditAndOrder(order.id) }}
          className="flex-1 bg-primary/10 text-primary font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform touch-manipulation text-sm"
        >
          <Edit size={14} />
          <span>ערוך</span>
        </button>
        <button
          onClick={() => printSavedOrderAsPDF(order, user?.isAdmin ?? false)}
          className="bg-primary/10 text-primary font-bold py-2.5 px-3 rounded-xl flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
          aria-label="ייצא PDF"
        >
          <FileDown size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 mb-3 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => navigate('/')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">היסטוריית הזמנות</h2>
              </div>
              <button
                onClick={() => { setViewMode(v => v === 'list' ? 'calendar' : 'list'); setSelectedDay(null) }}
                className={`p-2 rounded-xl transition-colors touch-manipulation ${
                  viewMode === 'calendar'
                    ? 'bg-primary text-secondary'
                    : 'text-primary/40 hover:text-primary/60'
                }`}
                aria-label="החלף תצוגה"
              >
                <Calendar size={20} />
              </button>
            </div>

            {viewMode === 'list' && (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" size={18} />
                <input
                  type="text"
                  placeholder="חיפוש הזמנה..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-2.5 pr-10 pl-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {viewMode === 'calendar' && (
              <div className="flex items-center justify-between">
                <button onClick={nextMonth} className="p-2 text-primary/60 hover:text-primary active:scale-90 touch-manipulation">
                  <ChevronLeft size={20} />
                </button>
                <span className="font-black text-primary text-base">
                  {HEBREW_MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                </span>
                <button onClick={prevMonth} className="p-2 text-primary/60 hover:text-primary active:scale-90 touch-manipulation">
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">

        {/* תצוגת רשימה */}
        {viewMode === 'list' && (
          <div className="space-y-3">
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
              >
                <OrderCard order={order} />
              </motion.div>
            ))}
          </div>
        )}

        {/* תצוגת לוח שנה */}
        {viewMode === 'calendar' && (
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            {/* כותרות ימים */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map(day => (
                <div key={day} className="text-center text-xs font-black text-primary/40 py-1">{day}</div>
              ))}
            </div>
            {/* גריד ימים */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />
                const key = getDayKey(day)
                const dayOrders = ordersByDate[key] || []
                const hasOrders = dayOrders.length > 0
                const isToday = key === todayKey
                const isSelected = key === selectedDay
                return (
                  <button
                    key={key}
                    onClick={() => hasOrders ? setSelectedDay(isSelected ? null : key) : undefined}
                    className={`relative flex flex-col items-center justify-center aspect-square rounded-xl transition-all touch-manipulation ${
                      isSelected
                        ? 'bg-primary text-secondary'
                        : isToday
                          ? 'bg-amber-500/20'
                          : hasOrders
                            ? 'hover:bg-primary/10 active:bg-primary/20'
                            : 'cursor-default'
                    }`}
                  >
                    <span className={`text-sm font-black leading-none ${
                      isSelected ? 'text-secondary' :
                      isToday ? 'text-amber-500' :
                      hasOrders ? 'text-primary' : 'text-primary/30'
                    }`}>
                      {day}
                    </span>
                    {hasOrders && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: Math.min(dayOrders.length, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-1 rounded-full ${isSelected ? 'bg-secondary/70' : 'bg-amber-500'}`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* אגדה */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-primary/10">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-primary/50 font-bold">הזמנה</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-xs font-black text-amber-500">{today.getDate()}</span>
                </div>
                <span className="text-xs text-primary/50 font-bold">היום</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom sheet - הזמנות של יום נבחר */}
      <AnimatePresence>
        {selectedDay && selectedDayOrders.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedDay(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-primary rounded-t-3xl max-h-[75vh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-secondary/20 flex-shrink-0">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 text-secondary/60 hover:text-secondary active:scale-90 transition-all touch-manipulation"
                >
                  <X size={20} />
                </button>
                <h3 className="font-black text-secondary text-base">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('he-IL', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </h3>
                <div className="w-10" />
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {selectedDayOrders.map(order => (
                  <OrderCard key={order.id} order={order} onClose={() => setSelectedDay(null)} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
