import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ShoppingBag, TrendingUp } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { he } from 'date-fns/locale'
import 'react-day-picker/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useAdminOrders } from '../hooks/useAdminOrders'
import { isActiveOrder, type Order } from '../stores/ordersStore'
import { formatPrice } from '../lib/utils'
import { CalendarOff } from 'lucide-react'

function dateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function sameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

export default function OrdersCalendarPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const allOrders = useAdminOrders()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [month, setMonth] = useState<Date>(new Date())

  // סנן לפי הסניף — אדמין רואה הכל, סניף רואה רק את עצמו
  const visibleOrders = useMemo(() => {
    const active = allOrders.filter(isActiveOrder)
    if (user?.isAdmin) return active
    return active.filter(o => o.branchCode === user?.branchCode)
  }, [allOrders, user])

  // Map תאריך → הזמנות
  const ordersByDay = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of visibleOrders) {
      const k = dateKey(o.createdAt)
      const list = map.get(k)
      if (list) list.push(o)
      else map.set(k, [o])
    }
    return map
  }, [visibleOrders])

  // ימים שיש בהם הזמנות (לסימון בלוח שנה)
  const daysWithOrders = useMemo(() => {
    return Array.from(ordersByDay.keys()).map(k => {
      const [y, m, d] = k.split('-').map(Number)
      return new Date(y, m - 1, d)
    })
  }, [ordersByDay])

  const selectedDayOrders = useMemo(() => {
    if (!selectedDate) return []
    return ordersByDay.get(dateKey(selectedDate)) ?? []
  }, [selectedDate, ordersByDay])

  // סיכום חודשי לסיכום למעלה
  const monthSummary = useMemo(() => {
    let count = 0
    let total = 0
    for (const o of visibleOrders) {
      const d = new Date(o.createdAt)
      if (d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()) {
        count++
        total += o.totalPrice || 0
      }
    }
    return { count, total }
  }, [visibleOrders, month])

  const selectedDayTotal = useMemo(
    () => selectedDayOrders.reduce((s, o) => s + (o.totalPrice || 0), 0),
    [selectedDayOrders]
  )

  // קבץ את הזמנות היום הנבחר לפי ספק
  const groupedBySupplier = useMemo(() => {
    const map = new Map<string, { count: number; total: number; branches: Set<string> }>()
    for (const order of selectedDayOrders) {
      for (const item of order.items) {
        const supplier = item.supplier
        const entry = map.get(supplier) ?? { count: 0, total: 0, branches: new Set() }
        entry.count += 1
        entry.total += (item.price || 0) * (item.quantity || 0)
        entry.branches.add(order.branch)
        map.set(supplier, entry)
      }
    }
    return Array.from(map.entries()).map(([supplier, info]) => ({
      supplier,
      itemCount: info.count,
      total: info.total,
      branches: Array.from(info.branches),
    }))
  }, [selectedDayOrders])

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-4 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              aria-label="חזרה"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl">לוח שנה — הזמנות</h2>
              <p className="text-primary/60 text-xs font-bold mt-0.5">
                {user?.isAdmin ? 'כל הסניפים' : user?.branch}
              </p>
            </div>
            <div className="w-8" />
          </div>
        </header>

        {/* סיכום חודשי */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-md text-white">
            <ShoppingBag size={20} className="mb-2" />
            <p className="text-2xl font-black">{monthSummary.count}</p>
            <p className="text-white/80 text-xs font-bold">הזמנות החודש</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-4 shadow-md text-white">
            <TrendingUp size={20} className="mb-2" />
            <p className="text-2xl font-black">{formatPrice(monthSummary.total)}</p>
            <p className="text-white/80 text-xs font-bold">סך הוצאות החודש</p>
          </div>
        </div>

        {/* לוח שנה */}
        <div className="bg-secondary rounded-3xl p-4 shadow-xl mb-4 calendar-container">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={month}
            onMonthChange={setMonth}
            locale={he}
            dir="rtl"
            modifiers={{ hasOrders: daysWithOrders }}
            modifiersClassNames={{ hasOrders: 'rdp-day-has-orders' }}
            showOutsideDays
          />
        </div>

        {/* פירוט יום נבחר */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={dateKey(selectedDate)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-secondary rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-primary/10">
                  <div>
                    <h3 className="font-black text-primary text-lg">
                      {selectedDate.toLocaleDateString('he-IL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {sameDay(selectedDate, new Date()) && (
                        <span className="text-xs bg-primary text-secondary px-2 py-0.5 rounded-full mr-2 font-bold">
                          היום
                        </span>
                      )}
                    </h3>
                    {selectedDayOrders.length > 0 && (
                      <p className="text-primary/60 text-xs font-bold mt-1">
                        {selectedDayOrders.length} הזמנות · {formatPrice(selectedDayTotal)}
                      </p>
                    )}
                  </div>
                </div>

                {selectedDayOrders.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarOff className="mx-auto text-primary/30 mb-3" size={40} aria-hidden />
                    <p className="text-primary/60 font-bold">אין הזמנות ביום זה</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupedBySupplier.map(g => (
                      <div
                        key={g.supplier}
                        className="bg-primary/5 rounded-2xl p-3 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-primary text-sm truncate">{g.supplier}</p>
                          <p className="text-primary/60 text-xs font-bold mt-0.5">
                            {g.itemCount} פריטים
                            {user?.isAdmin && g.branches.length > 0 && (
                              <> · {g.branches.join(' · ')}</>
                            )}
                          </p>
                        </div>
                        {user?.isAdmin && (
                          <p className="font-black text-primary text-sm whitespace-nowrap">
                            {formatPrice(g.total)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
