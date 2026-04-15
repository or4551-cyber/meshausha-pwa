import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, TrendingUp, Package, DollarSign, ShoppingCart } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts'
import { useAdminOrders } from '../../hooks/useAdminOrders'
import { formatPrice } from '../../lib/utils'
import { motion } from 'framer-motion'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const orders = useAdminOrders()

  const analytics = useMemo(() => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const thisMonthOrders = orders.filter(o => new Date(o.createdAt) >= thisMonth)
    const lastMonthOrders = orders.filter(o => {
      const date = new Date(o.createdAt)
      return date >= lastMonth && date < thisMonth
    })

    const thisMonthExpenses = thisMonthOrders.reduce((sum, o) => sum + o.totalPrice, 0)
    const lastMonthExpenses = lastMonthOrders.reduce((sum, o) => sum + o.totalPrice, 0)
    const expensesChange = lastMonthExpenses > 0
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : 0

    const avgOrderValue = thisMonthOrders.length > 0
      ? thisMonthExpenses / thisMonthOrders.length
      : 0

    // נתוני חודשים - ממוינים לפי תאריך
    const monthlyMap: Record<string, { label: string; expenses: number; orders: number; sortKey: number }> = {}
    const productCounts: Record<string, number> = {}
    const branchExpenses: Record<string, number> = {}

    orders.forEach(order => {
      const d = new Date(order.createdAt)
      const sortKey = d.getFullYear() * 100 + d.getMonth()
      const label = d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })

      if (!monthlyMap[sortKey]) {
        monthlyMap[sortKey] = { label, expenses: 0, orders: 0, sortKey }
      }
      monthlyMap[sortKey].expenses += order.totalPrice
      monthlyMap[sortKey].orders += 1

      order.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity
      })

      branchExpenses[order.branch] = (branchExpenses[order.branch] || 0) + order.totalPrice
    })

    const monthlyChartData = Object.values(monthlyMap)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-8)
      .map(m => ({
        חודש: m.label,
        הוצאות: Math.round(m.expenses),
        הזמנות: m.orders,
      }))

    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)

    const productChartData = topProducts.map(([name, count]) => ({
      מוצר: name.length > 12 ? name.slice(0, 12) + '…' : name,
      כמות: count,
    }))

    const topBranches = Object.entries(branchExpenses)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    return {
      thisMonthExpenses,
      thisMonthOrders: thisMonthOrders.length,
      expensesChange,
      avgOrderValue,
      monthlyChartData,
      productChartData,
      topProducts,
      topBranches,
      totalOrders: orders.length,
    }
  }, [orders])

  const TooltipPrice = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm font-bold text-gray-800 dir-ltr">
        {formatPrice(payload[0].value)}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary pb-safe">
      <div className="sticky top-0 z-10 bg-primary p-4 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary rounded-[2rem] p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">דשבורד אנליטי</h2>
              </div>
              <div className="w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-lg text-white"
          >
            <DollarSign size={24} className="mb-2" />
            <p className="text-2xl font-black">{formatPrice(analytics.thisMonthExpenses)}</p>
            <p className="text-white/80 text-xs font-bold">הוצאות החודש</p>
            {analytics.expensesChange !== 0 && (
              <p className={`text-xs font-bold mt-1 ${analytics.expensesChange <= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {analytics.expensesChange > 0 ? '↑' : '↓'} {Math.abs(analytics.expensesChange).toFixed(1)}%
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg text-white"
          >
            <ShoppingCart size={24} className="mb-2" />
            <p className="text-2xl font-black">{analytics.thisMonthOrders}</p>
            <p className="text-white/80 text-xs font-bold">הזמנות החודש</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-4 shadow-lg text-white"
          >
            <TrendingUp size={24} className="mb-2" />
            <p className="text-xl font-black">{formatPrice(analytics.avgOrderValue)}</p>
            <p className="text-white/80 text-xs font-bold">ממוצע הזמנה</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-lg text-white"
          >
            <Package size={24} className="mb-2" />
            <p className="text-2xl font-black">{analytics.totalOrders}</p>
            <p className="text-white/80 text-xs font-bold">סה"כ הזמנות</p>
          </motion.div>
        </div>

        {/* גרף הוצאות חודשי */}
        {analytics.monthlyChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-secondary rounded-2xl p-5 shadow-md"
          >
            <h3 className="font-black text-primary text-lg mb-4">הוצאות חודשיות</h3>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={analytics.monthlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#92400e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#92400e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5d5c5" />
                  <XAxis dataKey="חודש" tick={{ fontSize: 11, fill: '#78716c' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#78716c' }} tickFormatter={v => `₪${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<TooltipPrice />} />
                  <Area
                    type="monotone"
                    dataKey="הוצאות"
                    stroke="#92400e"
                    strokeWidth={2.5}
                    fill="url(#expGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* גרף צריכת מוצרים */}
        {analytics.productChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-secondary rounded-2xl p-5 shadow-md"
          >
            <h3 className="font-black text-primary text-lg mb-4">צריכת מוצרים מובילה</h3>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={analytics.productChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5d5c5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} />
                  <YAxis
                    type="category"
                    dataKey="מוצר"
                    tick={{ fontSize: 10, fill: '#44403c' }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(v) => [`${v} יח'`, 'כמות']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'Arial' }}
                  />
                  <Bar dataKey="כמות" fill="#d97706" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* סניפים מובילים */}
        {analytics.topBranches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-secondary rounded-2xl p-5 shadow-md"
          >
            <h3 className="font-black text-primary text-lg mb-4">סניפים מובילים</h3>
            <div className="space-y-3">
              {analytics.topBranches.map(([branch, amount], i) => {
                const max = analytics.topBranches[0][1]
                const pct = max > 0 ? (amount / max) * 100 : 0
                return (
                  <div key={branch}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-primary font-bold text-sm">{branch}</span>
                      <span className="text-primary font-black text-sm">{formatPrice(amount)}</span>
                    </div>
                    <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ריק */}
        {orders.length === 0 && (
          <div className="text-center py-16">
            <Package className="mx-auto text-secondary/30 mb-4" size={56} />
            <p className="text-secondary/60 font-bold text-lg">אין נתונים עדיין</p>
            <p className="text-secondary/40 text-sm mt-1">הגרפים יופיעו לאחר יצירת הזמנות</p>
          </div>
        )}
      </div>
    </div>
  )
}
