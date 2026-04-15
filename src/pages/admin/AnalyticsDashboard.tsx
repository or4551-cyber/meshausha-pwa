import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, TrendingUp, Package, DollarSign, ShoppingCart } from 'lucide-react'
import { useAdminOrders } from '../../hooks/useAdminOrders'
import { formatPrice } from '../../lib/utils'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const COLORS = ['#9d4444', '#8b7355', '#a8b968', '#96a556', '#7a6348']

export default function AnalyticsDashboard() {
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

    const thisMonthExpenses = thisMonthOrders.reduce((sum, order) => sum + order.totalPrice, 0)
    const lastMonthExpenses = lastMonthOrders.reduce((sum, order) => sum + order.totalPrice, 0)
    const expensesChange = lastMonthExpenses > 0 
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : 0

    const avgOrderValue = thisMonthOrders.length > 0 
      ? thisMonthExpenses / thisMonthOrders.length 
      : 0

    // נתונים לגרף מגמות (7 ימים אחרונים)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date
    })

    const trendData = last7Days.map(date => {
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt)
        return orderDate.toDateString() === date.toDateString()
      })
      
      return {
        date: date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
        orders: dayOrders.length,
        expenses: dayOrders.reduce((sum, order) => sum + order.totalPrice, 0)
      }
    })

    // נתונים לגרף סניפים
    const branchData: Record<string, number> = {}
    orders.forEach(order => {
      branchData[order.branch] = (branchData[order.branch] || 0) + order.totalPrice
    })

    const branchChartData = Object.entries(branchData)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    // נתונים לגרף ספקים
    const supplierData: Record<string, number> = {}
    orders.forEach(order => {
      order.items.forEach(item => {
        supplierData[item.supplier] = (supplierData[item.supplier] || 0) + (item.price * item.quantity)
      })
    })

    const supplierChartData = Object.entries(supplierData).map(([name, value]) => ({
      name,
      value
    }))

    return {
      thisMonthExpenses,
      expensesChange,
      thisMonthOrderCount: thisMonthOrders.length,
      avgOrderValue,
      totalOrders: orders.length,
      trendData,
      branchChartData,
      supplierChartData
    }
  }, [orders])

  return (
    <div className="min-h-screen bg-primary pb-safe">
      <div className="sticky top-0 z-10 bg-primary p-4 sm:p-6 pb-3">
        <div className="max-w-6xl mx-auto">
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
                <h2 className="font-black text-primary text-xl sm:text-2xl">דשבורד אנליטי מתקדם</h2>
              </div>
              <div className="w-6 sm:w-7" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-5 shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="text-primary" size={24} />
              <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                analytics.expensesChange <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {analytics.expensesChange >= 0 ? '+' : ''}{analytics.expensesChange.toFixed(1)}%
              </div>
            </div>
            <p className="text-primary/60 text-xs font-bold mb-1">הוצאות החודש</p>
            <p className="text-primary font-black text-2xl">{formatPrice(analytics.thisMonthExpenses)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg text-white"
          >
            <ShoppingCart size={24} className="mb-2" />
            <p className="text-2xl font-black">{analytics.thisMonthOrderCount}</p>
            <p className="text-white/80 text-xs font-bold">הזמנות החודש</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-accent to-[#7a6348] rounded-2xl p-4 shadow-lg text-white"
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

        {/* גרף מגמות */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-secondary rounded-2xl p-5 shadow-md"
        >
          <h3 className="font-black text-primary text-lg mb-4">מגמות - 7 ימים אחרונים</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f0e8" />
              <XAxis 
                dataKey="date" 
                stroke="#9d4444"
                style={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <YAxis 
                stroke="#9d4444"
                style={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#f5f0e8', 
                  border: '2px solid #9d4444',
                  borderRadius: '12px',
                  fontWeight: 'bold'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="#9d4444" 
                strokeWidth={3}
                name="הזמנות"
                dot={{ fill: '#9d4444', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#8b7355" 
                strokeWidth={3}
                name="הוצאות (₪)"
                dot={{ fill: '#8b7355', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* גרף סניפים */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-secondary rounded-2xl p-5 shadow-md"
          >
            <h3 className="font-black text-primary text-lg mb-4">סניפים מובילים</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.branchChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#9d4444" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9d4444" 
                  style={{ fontSize: '11px', fontWeight: 'bold' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9d4444" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#f5f0e8', 
                    border: '2px solid #9d4444',
                    borderRadius: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar dataKey="value" fill="#9d4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* גרף ספקים */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-secondary rounded-2xl p-5 shadow-md"
          >
            <h3 className="font-black text-primary text-lg mb-4">התפלגות לפי ספקים</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.supplierChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.supplierChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#f5f0e8', 
                    border: '2px solid #9d4444',
                    borderRadius: '12px',
                    fontWeight: 'bold'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
