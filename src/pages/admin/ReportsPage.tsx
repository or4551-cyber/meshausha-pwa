import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Calendar, Download, TrendingUp } from 'lucide-react'
import { useAdminOrders } from '../../hooks/useAdminOrders'
import { formatPrice, calculateVAT, calculateTotal } from '../../lib/utils'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const BRANCHES = [
  'עין המפרץ',
  'ביאליק קרן היסוד',
  'מוצקין הילדים',
  'צור שלום',
  'גושן 60',
  'נהריה הגעתון',
  'ההסתדרות',
  'משכנות האומנים',
  'רון קריית ביאליק'
]

export default function ReportsPage() {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')

  const orders = useAdminOrders()

  const filteredOrders = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      
      let dateMatch = true
      switch (dateRange) {
        case 'today':
          dateMatch = orderDate >= today
          break
        case 'week':
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          dateMatch = orderDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          dateMatch = orderDate >= monthAgo
          break
        default:
          dateMatch = true
      }
      
      const branchMatch = selectedBranch === 'all' || order.branch === selectedBranch
      
      return dateMatch && branchMatch
    })
  }, [orders, dateRange, selectedBranch])

  const summary = useMemo(() => {
    const totalExpenses = filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0)
    const totalOrders = filteredOrders.length
    const avgOrderValue = totalOrders > 0 ? totalExpenses / totalOrders : 0

    return {
      totalExpenses,
      totalOrders,
      avgOrderValue
    }
  }, [filteredOrders])

  const branchComparisonData = useMemo(() => {
    const branchStats: Record<string, { expenses: number; orders: number }> = {}
    
    const ordersToAnalyze = selectedBranch === 'all' 
      ? orders.filter(order => {
          const orderDate = new Date(order.createdAt)
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          
          switch (dateRange) {
            case 'today':
              return orderDate >= today
            case 'week':
              const weekAgo = new Date(today)
              weekAgo.setDate(weekAgo.getDate() - 7)
              return orderDate >= weekAgo
            case 'month':
              const monthAgo = new Date(today)
              monthAgo.setMonth(monthAgo.getMonth() - 1)
              return orderDate >= monthAgo
            default:
              return true
          }
        })
      : filteredOrders
    
    ordersToAnalyze.forEach(order => {
      if (!branchStats[order.branch]) {
        branchStats[order.branch] = { expenses: 0, orders: 0 }
      }
      branchStats[order.branch].expenses += order.totalPrice
      branchStats[order.branch].orders += 1
    })
    
    return BRANCHES
      .filter(branch => branchStats[branch])
      .map(branch => ({
        branch: branch.length > 15 ? branch.substring(0, 12) + '...' : branch,
        fullBranch: branch,
        expenses: branchStats[branch].expenses,
        orders: branchStats[branch].orders
      }))
      .sort((a, b) => b.expenses - a.expenses)
  }, [orders, dateRange, selectedBranch, filteredOrders])

  const reportData = useMemo(() => {
    const byBranch: Record<string, {
      totalBeforeVAT: number
      totalWithVAT: number
      orderCount: number
      bySupplier: Record<string, number>
    }> = {}

    filteredOrders.forEach(order => {
      if (!byBranch[order.branch]) {
        byBranch[order.branch] = {
          totalBeforeVAT: 0,
          totalWithVAT: 0,
          orderCount: 0,
          bySupplier: {}
        }
      }

      const branchData = byBranch[order.branch]
      branchData.orderCount++
      
      order.items.forEach(item => {
        const itemTotal = item.price * item.quantity
        branchData.totalBeforeVAT += itemTotal
        
        if (!branchData.bySupplier[item.supplier]) {
          branchData.bySupplier[item.supplier] = 0
        }
        branchData.bySupplier[item.supplier] += itemTotal
      })
      
      branchData.totalWithVAT = calculateTotal(branchData.totalBeforeVAT)
    })

    return byBranch
  }, [filteredOrders])

  const handleExport = () => {
    let csvContent = 'סניף,ספק,סכום לפני מע"מ,מע"מ,סכום כולל מע"מ\n'
    
    Object.entries(reportData).forEach(([branch, data]) => {
      Object.entries(data.bySupplier).forEach(([supplier, amount]) => {
        const vat = calculateVAT(amount)
        const total = calculateTotal(amount)
        csvContent += `${branch},${supplier},${amount.toFixed(2)},${vat.toFixed(2)},${total.toFixed(2)}\n`
      })
    })

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `דוח_כלכלי_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-primary pb-safe">
      <div className="sticky top-0 z-10 bg-primary p-4 sm:p-6 pb-3">
        <div className="max-w-6xl mx-auto">
          <div className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 mb-3 shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4 mb-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} className="sm:hidden" />
                <ChevronRight size={28} className="hidden sm:block" />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl sm:text-2xl">דוחות כלכליים</h2>
              </div>
              <div className="w-6 sm:w-7" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {[
                { value: 'today', label: 'היום' },
                { value: 'week', label: 'שבוע' },
                { value: 'month', label: 'חודש' },
                { value: 'all', label: 'הכל' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value as any)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all touch-manipulation ${
                    dateRange === option.value
                      ? 'bg-primary text-secondary'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-primary font-bold text-xs mb-2">סינון לפי סניף</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-white text-primary rounded-xl py-2 px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">כל הסניפים</option>
                {BRANCHES.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        {selectedBranch === 'all' && branchComparisonData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary rounded-2xl p-5 shadow-md"
          >
            <h3 className="font-black text-primary text-lg mb-4">השוואה בין סניפים</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f0e8" />
                <XAxis 
                  dataKey="branch" 
                  stroke="#9d4444"
                  style={{ fontSize: '11px', fontWeight: 'bold' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
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
                  formatter={(value: number) => `₪${value.toFixed(2)}`}
                  labelFormatter={(label) => {
                    const item = branchComparisonData.find(d => d.branch === label)
                    return item?.fullBranch || label
                  }}
                />
                <Legend />
                <Bar dataKey="expenses" fill="#9d4444" name="הוצאות (₪)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="orders" fill="#8b7355" name="מספר הזמנות" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 shadow-xl text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={28} />
            <h3 className="font-black text-2xl">
              {selectedBranch === 'all' ? 'סיכום כללי' : `סיכום - ${selectedBranch}`}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/20 rounded-xl p-4">
              <p className="text-white/80 text-xs font-bold mb-1">סה"כ הוצאות</p>
              <p className="text-white font-black text-xl">{formatPrice(summary.totalExpenses)}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-4">
              <p className="text-white/80 text-xs font-bold mb-1">מספר הזמנות</p>
              <p className="text-white font-black text-xl">{summary.totalOrders}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-4">
              <p className="text-white/80 text-xs font-bold mb-1">ממוצע הזמנה</p>
              <p className="text-white font-black text-xl">{formatPrice(summary.avgOrderValue)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="w-full bg-secondary text-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-lg touch-manipulation"
        >
          <Download size={24} />
          <span>ייצא לאקסל</span>
        </button>

        {Object.entries(reportData).map(([branch, data]) => (
          <motion.div
            key={branch}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary rounded-2xl p-5 shadow-md"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-primary/10">
              <div>
                <h3 className="font-black text-primary text-xl">{branch}</h3>
                <p className="text-primary/60 text-sm">{data.orderCount} הזמנות</p>
              </div>
              <div className="text-left">
                <p className="font-black text-primary text-xl">{formatPrice(data.totalWithVAT)}</p>
                <p className="text-primary/60 text-xs">כולל מע"מ</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-primary/70 font-bold text-sm mb-2">פירוט לפי ספק:</p>
              {Object.entries(data.bySupplier).map(([supplier, amount]) => (
                <div key={supplier} className="flex justify-between items-center bg-primary/5 rounded-lg p-3">
                  <span className="text-primary font-bold text-sm">{supplier}</span>
                  <div className="text-left">
                    <p className="text-primary font-black">{formatPrice(calculateTotal(amount))}</p>
                    <p className="text-primary/50 text-xs">
                      ({formatPrice(amount)} + {formatPrice(calculateVAT(amount))} מע"מ)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {Object.keys(reportData).length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-secondary/30 mb-4" size={64} />
            <p className="text-secondary/60 font-bold text-lg">אין נתונים לתקופה זו</p>
          </div>
        )}
      </div>
    </div>
  )
}
