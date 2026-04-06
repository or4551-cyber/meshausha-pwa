import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, TrendingUp, Package, DollarSign, ShoppingCart } from 'lucide-react'
import { useOrdersStore } from '../../stores/ordersStore'
import { formatPrice } from '../../lib/utils'
import { motion } from 'framer-motion'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { getAllOrders } = useOrdersStore()
  const orders = getAllOrders()

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

    const monthlyExpenses: Record<string, number> = {}
    const monthlyOrders: Record<string, number> = {}
    const productCounts: Record<string, number> = {}
    const branchCounts: Record<string, number> = {}

    orders.forEach(order => {
      const month = new Date(order.createdAt).toLocaleDateString('he-IL', { 
        year: 'numeric', 
        month: 'long' 
      })

      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + order.totalPrice
      monthlyOrders[month] = (monthlyOrders[month] || 0) + 1

      order.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity
      })

      branchCounts[order.branch] = (branchCounts[order.branch] || 0) + 1
    })

    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([product, count]) => ({ product, count }))

    const branchExpenses: Record<string, number> = {}
    orders.forEach(order => {
      branchExpenses[order.branch] = (branchExpenses[order.branch] || 0) + order.totalPrice
    })

    const topBranches = Object.entries(branchExpenses)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    return {
      thisMonthExpenses,
      thisMonthOrders: thisMonthOrders.length,
      expensesChange,
      avgOrderValue,
      monthlyExpenses: Object.entries(monthlyExpenses).map(([month, expenses]) => ({
        month,
        expenses,
        orders: monthlyOrders[month] || 0
      })),
      topProducts,
      topBranches,
      totalOrders: orders.length
    }
  }, [orders])

  return (
    <div className="min-h-screen bg-primary pb-safe">
      <div className="sticky top-0 z-10 bg-primary p-4 sm:p-6 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} className="sm:hidden" />
                <ChevronRight size={28} className="hidden sm:block" />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl sm:text-2xl">דשבורד אנליטי</h2>
              </div>
              <div className="w-6 sm:w-7" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
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
            className="w-full bg-gradient-to-baccmntent [#7a6348]8] p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2rem] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-between group touch-manipulation"
          >
            <TrendingUp size={24} className="mb-2" />
            <p className="text-2xl font-black">{formatPrice(analytics.avgOrderValue)}</p>
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-secondary rounded-2xl p-5 shadow-md"
        >
          <h3 className="font-black text-primary text-lg mb-4">מוצרים פופולריים</h3>
          <div className="space-y-2">
            {analytics.topProducts.map((item, index) => (
              <div key={item.product} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-black text-sm">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-primary font-bold text-sm">{item.product}</p>
                </div>
                <span className="text-primary/60 font-bold text-sm">×{item.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-secondary rounded-2xl p-5 shadow-md"
        >
          <h3 className="font-black text-primary text-lg mb-4">סניפים מובילים</h3>
          <div className="space-y-3">
            {analytics.topBranches.map(([branch, amount]) => (
              <div key={branch} className="bg-primary/5 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <span className="text-primary font-bold">{branch}</span>
                  <span className="text-primary font-black text-lg">{formatPrice(amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-secondary rounded-2xl p-5 shadow-md"
        >
          <h3 className="font-black text-primary text-lg mb-4">הוצאות חודשיות</h3>
          <div className="space-y-2">
            <div className="bg-white rounded-2xl p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <DollarSign className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-primary/60 text-xs font-bold">הוצאות חודשיות</p>
                  <p className="text-primary font-black text-xl">
                    {analytics.monthlyExpenses.length > 0 
                      ? formatPrice(analytics.monthlyExpenses[analytics.monthlyExpenses.length - 1].expenses)
                      : '₪0'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {analytics.monthlyExpenses.slice(-3).reverse().map((item, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-primary/60 font-bold">{item.month}</span>
                    <span className="text-primary font-bold">{formatPrice(item.expenses)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
