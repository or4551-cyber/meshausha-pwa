import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Percent } from 'lucide-react'
import { useInvoicesStore } from '../../stores/invoicesStore'
import { useSuppliersStore } from '../../stores/suppliersStore'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function InvoiceAnalysisPage() {
  const navigate = useNavigate()
  const { invoices } = useInvoicesStore()
  const { products } = useSuppliersStore()
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')

  const discrepancies = useMemo(() => {
    const results: Array<{
      productName: string
      supplierName: string
      branchName: string
      month: string
      priceInApp: number
      priceInInvoice: number
      difference: number
      percentageDiff: number
    }> = []

    invoices.forEach(invoice => {
      if (selectedMonth && invoice.month !== selectedMonth) return
      if (selectedSupplier && invoice.supplierName !== selectedSupplier) return

      invoice.items.forEach(item => {
        const productInApp = products.find(
          p => p.name.toLowerCase() === item.productName.toLowerCase() && 
               p.supplier === invoice.supplierName
        )

        if (productInApp) {
          const diff = item.unitPrice - productInApp.price
          const percentDiff = (diff / productInApp.price) * 100

          if (Math.abs(percentDiff) > 1) {
            results.push({
              productName: item.productName,
              supplierName: invoice.supplierName,
              branchName: invoice.branchName,
              month: invoice.month,
              priceInApp: productInApp.price,
              priceInInvoice: item.unitPrice,
              difference: diff,
              percentageDiff: percentDiff
            })
          }
        }
      })
    })

    return results.sort((a, b) => Math.abs(b.percentageDiff) - Math.abs(a.percentageDiff))
  }, [invoices, products, selectedMonth, selectedSupplier])

  const stats = useMemo(() => {
    const total = discrepancies.length
    const increases = discrepancies.filter(d => d.difference > 0).length
    const decreases = discrepancies.filter(d => d.difference < 0).length
    const avgDiff = discrepancies.reduce((sum, d) => sum + d.percentageDiff, 0) / total || 0
    const totalMoneyDiff = discrepancies.reduce((sum, d) => sum + d.difference, 0)

    return { total, increases, decreases, avgDiff, totalMoneyDiff }
  }, [discrepancies])

  const chartData = useMemo(() => {
    const supplierMap = new Map<string, { increases: number; decreases: number }>()
    
    discrepancies.forEach(d => {
      if (!supplierMap.has(d.supplierName)) {
        supplierMap.set(d.supplierName, { increases: 0, decreases: 0 })
      }
      const data = supplierMap.get(d.supplierName)!
      if (d.difference > 0) {
        data.increases++
      } else {
        data.decreases++
      }
    })

    return Array.from(supplierMap.entries()).map(([name, data]) => ({
      name,
      עליות: data.increases,
      ירידות: data.decreases
    }))
  }, [discrepancies])

  const pieData = [
    { name: 'עליות מחיר', value: stats.increases, color: '#ef4444' },
    { name: 'ירידות מחיר', value: stats.decreases, color: '#22c55e' }
  ]

  const uniqueMonths = [...new Set(invoices.map(inv => inv.month))].sort().reverse()
  const uniqueSuppliers = [...new Set(invoices.map(inv => inv.supplierName))].sort()

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl">ניתוח חשבוניות</h2>
              <p className="text-primary/60 text-xs mt-1">השוואת מחירים והפרשים</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div>
            <label className="block text-secondary font-bold text-sm mb-2">סינון לפי חודש</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-secondary text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="">כל החודשים</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-secondary font-bold text-sm mb-2">סינון לפי ספק</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full bg-secondary text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-secondary/20"
            >
              <option value="">כל הספקים</option>
              {uniqueSuppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-secondary rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-primary" size={20} />
              <span className="text-primary/60 text-xs font-bold">סה״כ הפרשים</span>
            </div>
            <p className="text-primary font-black text-2xl">{stats.total}</p>
          </div>

          <div className="bg-secondary rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-red-500" size={20} />
              <span className="text-primary/60 text-xs font-bold">עליות מחיר</span>
            </div>
            <p className="text-red-500 font-black text-2xl">{stats.increases}</p>
          </div>

          <div className="bg-secondary rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="text-green-500" size={20} />
              <span className="text-primary/60 text-xs font-bold">ירידות מחיר</span>
            </div>
            <p className="text-green-500 font-black text-2xl">{stats.decreases}</p>
          </div>

          <div className="bg-secondary rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="text-primary" size={20} />
              <span className="text-primary/60 text-xs font-bold">ממוצע הפרש</span>
            </div>
            <p className="text-primary font-black text-2xl">{stats.avgDiff.toFixed(1)}%</p>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-secondary rounded-3xl p-5">
              <h3 className="font-black text-primary text-lg mb-4">הפרשים לפי ספק</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="עליות" fill="#ef4444" />
                  <Bar dataKey="ירידות" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-secondary rounded-3xl p-5">
              <h3 className="font-black text-primary text-lg mb-4">פילוח עליות/ירידות</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-secondary rounded-3xl p-5 mb-6">
          <h3 className="font-black text-primary text-lg mb-4">הפרשי מחירים מפורטים</h3>
          
          {discrepancies.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto text-primary/30 mb-3" size={48} />
              <p className="text-primary/60 font-bold">אין הפרשי מחירים משמעותיים</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {discrepancies.map((disc, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-xl ${
                    disc.difference > 0 ? 'bg-red-50' : 'bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-primary text-sm">{disc.productName}</h4>
                      <p className="text-primary/60 text-xs mt-1">
                        {disc.supplierName} • {disc.branchName} • {formatMonth(disc.month)}
                      </p>
                    </div>
                    <div className="text-left">
                      <div className={`flex items-center gap-1 ${
                        disc.difference > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {disc.difference > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span className="font-black text-sm">
                          {disc.percentageDiff > 0 ? '+' : ''}{disc.percentageDiff.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-primary/60 text-xs mt-1">
                        ₪{disc.priceInApp.toFixed(2)} → ₪{disc.priceInInvoice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
