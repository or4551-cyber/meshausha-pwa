import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search, Calendar, Filter, X, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAdminOrders } from '../../hooks/useAdminOrders'
import { isActiveOrder, type Order } from '../../stores/ordersStore'
import { useSuppliersStore } from '../../stores/suppliersStore'
import { BRANCHES } from '../../data/branches'
import { formatPrice } from '../../lib/utils'
import EmptyState from '../../components/ui/EmptyState'

type DateRange = '7' | '30' | '90' | 'all'

const DATE_LABELS: Record<DateRange, string> = {
  '7': '7 ימים',
  '30': '30 יום',
  '90': '3 חודשים',
  'all': 'הכל',
}

function highlight(text: string, query: string): JSX.Element {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-300 text-primary rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function OrdersSearchPage() {
  const navigate = useNavigate()
  const allOrders = useAdminOrders()
  const { suppliers } = useSuppliersStore()

  const [query, setQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('30')
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set())
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const supplierNames = useMemo(
    () => Array.from(new Set(suppliers.map(s => s.name))).sort(),
    [suppliers]
  )

  const cutoffMs = useMemo(() => {
    if (dateRange === 'all') return 0
    return Date.now() - parseInt(dateRange) * 24 * 3600 * 1000
  }, [dateRange])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allOrders
      .filter(isActiveOrder)
      .filter(o => new Date(o.createdAt).getTime() >= cutoffMs)
      .filter(o => selectedBranches.size === 0 || selectedBranches.has(o.branchCode))
      .filter(o => {
        if (selectedSuppliers.size === 0) return true
        return o.items.some(i => selectedSuppliers.has(i.supplier))
      })
      .filter(o => {
        if (!q) return true
        if (o.branch.toLowerCase().includes(q)) return true
        if (o.notes?.toLowerCase().includes(q)) return true
        return o.items.some(i =>
          i.name.toLowerCase().includes(q) ||
          i.supplier.toLowerCase().includes(q)
        )
      })
  }, [allOrders, query, cutoffMs, selectedBranches, selectedSuppliers])

  const totalAmount = useMemo(
    () => results.reduce((s, o) => s + (o.totalPrice || 0), 0),
    [results]
  )

  const toggleBranch = (code: string) => {
    setSelectedBranches(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleSupplier = (name: string) => {
    setSelectedSuppliers(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const clearFilters = () => {
    setSelectedBranches(new Set())
    setSelectedSuppliers(new Set())
    setDateRange('30')
  }

  const activeFilterCount =
    selectedBranches.size + selectedSuppliers.size + (dateRange !== '30' ? 1 : 0)

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary p-1 touch-manipulation"
                aria-label="חזרה"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-lg">חיפוש בהזמנות</h2>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl transition-colors touch-manipulation relative ${
                  showFilters ? 'bg-primary text-secondary' : 'text-primary'
                }`}
                aria-label="פילטרים"
              >
                <Filter size={20} />
                {activeFilterCount > 0 && !showFilters && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" size={18} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="שם מוצר / סניף / ספק / הערות..."
                autoFocus
                className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl py-2.5 pr-10 pl-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-primary/40 p-1 touch-manipulation"
                  aria-label="נקה"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filters panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-3 overflow-hidden"
              >
                {/* Date range */}
                <div>
                  <p className="text-primary/60 text-xs font-bold mb-1.5 flex items-center gap-1">
                    <Calendar size={12} />
                    תקופה
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(DATE_LABELS) as DateRange[]).map(r => (
                      <button
                        key={r}
                        onClick={() => setDateRange(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors touch-manipulation ${
                          dateRange === r
                            ? 'bg-primary text-secondary'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {DATE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Branches */}
                <div>
                  <p className="text-primary/60 text-xs font-bold mb-1.5">סניפים ({selectedBranches.size || 'כולם'})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BRANCHES.map(b => (
                      <button
                        key={b.code}
                        onClick={() => toggleBranch(b.code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors touch-manipulation ${
                          selectedBranches.has(b.code)
                            ? 'bg-primary text-secondary'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Suppliers */}
                {supplierNames.length > 0 && (
                  <div>
                    <p className="text-primary/60 text-xs font-bold mb-1.5">ספקים ({selectedSuppliers.size || 'כולם'})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {supplierNames.map(name => (
                        <button
                          key={name}
                          onClick={() => toggleSupplier(name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors touch-manipulation ${
                            selectedSuppliers.has(name)
                              ? 'bg-primary text-secondary'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-primary/60 text-xs font-bold hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <X size={12} />
                    נקה את כל הפילטרים
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-3">
        {/* Results header */}
        <div className="flex items-center justify-between text-secondary/80 text-xs font-bold px-1">
          <span>{results.length} הזמנות</span>
          {results.length > 0 && <span>סה"כ: {formatPrice(totalAmount)}</span>}
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="לא נמצאו תוצאות"
            description={
              query
                ? `אין הזמנות שתואמות "${query}" בתקופה שנבחרה`
                : 'נסה לשנות את הפילטרים או התקופה'
            }
          />
        ) : (
          results.map(o => <ResultCard key={o.id} order={o} query={query} />)
        )}
      </div>
    </div>
  )
}

function ResultCard({ order, query }: { order: Order; query: string }) {
  const q = query.trim().toLowerCase()
  // הצג קודם פריטים שתואמים את החיפוש (אם יש)
  const matching = q
    ? order.items.filter(i => i.name.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q))
    : []
  const others = q
    ? order.items.filter(i => !matching.includes(i))
    : order.items

  const date = new Date(order.createdAt).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const time = new Date(order.createdAt).toLocaleTimeString('he-IL', {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-secondary rounded-2xl p-4 shadow-md"
    >
      <div className="flex items-start justify-between mb-3 pb-2 border-b-2 border-primary/10">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-primary text-base leading-tight">
            {highlight(order.branch, query)}
          </h3>
          <p className="text-primary/50 text-xs font-bold mt-0.5">{date} · {time}</p>
        </div>
        <div className="text-left">
          <p className="font-black text-primary text-sm">{formatPrice(order.totalPrice || 0)}</p>
          <p className="text-primary/50 text-xs font-bold">{order.items.length} פריטים</p>
        </div>
      </div>

      <div className="space-y-1">
        {matching.length > 0 && (
          <>
            <p className="text-amber-700 text-[10px] font-black uppercase tracking-wider">תואמים</p>
            {matching.map((i, idx) => (
              <ItemRow key={`m-${idx}`} item={i} query={query} highlighted />
            ))}
            {others.length > 0 && (
              <p className="text-primary/40 text-[10px] font-black uppercase tracking-wider mt-2">שאר הפריטים</p>
            )}
          </>
        )}
        {others.slice(0, 6).map((i, idx) => (
          <ItemRow key={`o-${idx}`} item={i} query={query} />
        ))}
        {others.length > 6 && (
          <p className="text-primary/40 text-xs font-bold pt-1">+{others.length - 6} פריטים נוספים</p>
        )}
      </div>

      {order.notes && (
        <div className="mt-3 pt-2 border-t border-primary/10 flex items-start gap-1.5">
          <Package size={12} className="text-primary/40 mt-0.5 flex-shrink-0" />
          <p className="text-primary/60 text-xs">{highlight(order.notes, query)}</p>
        </div>
      )}
    </motion.div>
  )
}

function ItemRow({
  item,
  query,
  highlighted,
}: {
  item: { name: string; supplier: string; quantity: number; price: number }
  query: string
  highlighted?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 text-xs ${
        highlighted ? 'bg-amber-50 -mx-2 px-2 py-1 rounded-lg' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold text-primary leading-tight truncate">
          {highlight(item.name, query)}
        </p>
        <p className="text-primary/40 text-[10px] truncate">{highlight(item.supplier, query)}</p>
      </div>
      <span className="text-primary/60 font-black whitespace-nowrap">×{item.quantity}</span>
    </div>
  )
}
