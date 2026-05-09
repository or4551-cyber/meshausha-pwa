import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, TrendingUp, TrendingDown, Minus,
  Trophy, Award, Search, Building2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAdminOrders } from '../../hooks/useAdminOrders'
import { isActiveOrder } from '../../stores/ordersStore'
import { BRANCHES } from '../../data/branches'
import { formatPrice } from '../../lib/utils'

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysAgoStart(days: number): number {
  const d = startOfDay(new Date())
  d.setDate(d.getDate() - days)
  return d.getTime()
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0
  return ((curr - prev) / prev) * 100
}

interface BranchRow {
  code: string
  name: string
  thisWeek: number
  lastWeek: number
  thisWeekOrders: number
  delta: number
}

interface SupplierRow {
  name: string
  thisMonth: number
  orders: number
}

export default function ExecutiveDashboardPage() {
  const navigate = useNavigate()
  const orders = useAdminOrders()

  const stats = useMemo(() => {
    const activeOrders = orders.filter(isActiveOrder)
    const week1Start = daysAgoStart(7)
    const week2Start = daysAgoStart(14)
    const monthStart = (() => {
      const d = new Date()
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    })()

    const thisWeekOrders = activeOrders.filter(o => new Date(o.createdAt).getTime() >= week1Start)
    const lastWeekOrders = activeOrders.filter(o => {
      const t = new Date(o.createdAt).getTime()
      return t >= week2Start && t < week1Start
    })
    const thisMonthOrders = activeOrders.filter(o => new Date(o.createdAt).getTime() >= monthStart)

    const thisWeekSpend = thisWeekOrders.reduce((s, o) => s + (o.totalPrice || 0), 0)
    const lastWeekSpend = lastWeekOrders.reduce((s, o) => s + (o.totalPrice || 0), 0)

    const activeBranches = new Set(thisWeekOrders.map(o => o.branchCode))

    // 4-week trend (oldest → newest)
    const weeks: { label: string; spend: number; orders: number }[] = []
    for (let i = 3; i >= 0; i--) {
      const startOfWeek = daysAgoStart((i + 1) * 7)
      const endOfWeek = daysAgoStart(i * 7)
      const slice = activeOrders.filter(o => {
        const t = new Date(o.createdAt).getTime()
        return t >= startOfWeek && t < endOfWeek
      })
      const label = i === 0 ? 'השבוע' : i === 1 ? 'שבוע שעבר' : `לפני ${i} שבועות`
      weeks.push({
        label,
        spend: slice.reduce((s, o) => s + (o.totalPrice || 0), 0),
        orders: slice.length,
      })
    }

    // Branch ranking (this week)
    const branchRows: BranchRow[] = BRANCHES.map(b => {
      const tw = thisWeekOrders.filter(o => o.branchCode === b.code)
      const lw = lastWeekOrders.filter(o => o.branchCode === b.code)
      const twSpend = tw.reduce((s, o) => s + (o.totalPrice || 0), 0)
      const lwSpend = lw.reduce((s, o) => s + (o.totalPrice || 0), 0)
      return {
        code: b.code,
        name: b.name,
        thisWeek: twSpend,
        lastWeek: lwSpend,
        thisWeekOrders: tw.length,
        delta: pct(twSpend, lwSpend),
      }
    }).sort((a, b) => b.thisWeek - a.thisWeek)

    // Top suppliers this month
    const supplierMap = new Map<string, { spend: number; orders: Set<string> }>()
    for (const o of thisMonthOrders) {
      for (const it of o.items) {
        const key = it.supplier
        const entry = supplierMap.get(key) ?? { spend: 0, orders: new Set() }
        entry.spend += (it.price || 0) * (it.quantity || 0)
        entry.orders.add(o.id)
        supplierMap.set(key, entry)
      }
    }
    const topSuppliers: SupplierRow[] = Array.from(supplierMap.entries())
      .map(([name, info]) => ({ name, thisMonth: info.spend * 1.17, orders: info.orders.size }))
      .sort((a, b) => b.thisMonth - a.thisMonth)
      .slice(0, 5)

    // Avg order size + frequency
    const avgOrderSize = thisMonthOrders.length > 0
      ? thisMonthOrders.reduce((s, o) => s + (o.totalPrice || 0), 0) / thisMonthOrders.length
      : 0

    return {
      thisWeekSpend,
      thisWeekOrdersCount: thisWeekOrders.length,
      activeBranchesCount: activeBranches.size,
      delta: pct(thisWeekSpend, lastWeekSpend),
      weeks,
      branchRows,
      topSuppliers,
      avgOrderSize,
      thisMonthOrdersCount: thisMonthOrders.length,
    }
  }, [orders])

  const maxWeekSpend = Math.max(...stats.weeks.map(w => w.spend), 1)
  const maxBranchSpend = Math.max(...stats.branchRows.map(b => b.thisWeek), 1)
  const maxSupplierSpend = Math.max(...stats.topSuppliers.map(s => s.thisMonth), 1)

  const TrendIcon = stats.delta > 1 ? TrendingUp : stats.delta < -1 ? TrendingDown : Minus
  const trendColor = stats.delta > 1 ? 'text-emerald-600' : stats.delta < -1 ? 'text-red-600' : 'text-primary/50'

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary p-1 touch-manipulation"
                aria-label="חזרה"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-lg">דשבורד הנהלה</h2>
                <p className="text-primary/50 text-xs font-bold mt-0.5">מבט תפעולי על כל הרשת</p>
              </div>
              <button
                onClick={() => navigate('/admin/search')}
                className="text-primary p-2 touch-manipulation"
                aria-label="חיפוש"
              >
                <Search size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* KPI hero card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-[#7a2f2f] rounded-3xl p-5 shadow-xl text-white"
        >
          <p className="text-white/70 text-xs font-bold mb-1">הוצאות השבוע</p>
          <div className="flex items-end gap-2 mb-3">
            <p className="font-black text-3xl">{formatPrice(stats.thisWeekSpend)}</p>
            <div className={`flex items-center gap-0.5 mb-1 ${trendColor}`}>
              <TrendIcon size={14} />
              <span className="font-black text-xs">{Math.abs(stats.delta).toFixed(0)}%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20">
            <div>
              <p className="text-white/60 text-[10px] font-bold">הזמנות</p>
              <p className="font-black text-lg">{stats.thisWeekOrdersCount}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-bold">סניפים פעילים</p>
              <p className="font-black text-lg">{stats.activeBranchesCount}/{BRANCHES.length}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-bold">ממוצע להזמנה</p>
              <p className="font-black text-lg">{formatPrice(stats.avgOrderSize)}</p>
            </div>
          </div>
        </motion.div>

        {/* Weekly trend */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-secondary rounded-3xl p-5 shadow-md"
        >
          <h3 className="font-black text-primary text-base mb-4">מגמה שבועית — 4 שבועות</h3>
          <div className="grid grid-cols-4 gap-2 items-end h-32 mb-2">
            {stats.weeks.map((w, i) => {
              const h = (w.spend / maxWeekSpend) * 100
              const isCurrent = i === stats.weeks.length - 1
              return (
                <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-primary/50 text-[10px] font-black">
                    {w.spend > 0 ? `${(w.spend / 1000).toFixed(0)}K` : '0'}
                  </span>
                  <div
                    className={`w-full rounded-t-lg transition-all ${isCurrent ? 'bg-primary' : 'bg-primary/30'}`}
                    style={{ height: `${Math.max(2, h)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {stats.weeks.map((w, i) => (
              <p key={i} className="text-primary/60 text-[10px] font-bold leading-tight">{w.label}</p>
            ))}
          </div>
        </motion.div>

        {/* Branch ranking */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-secondary rounded-3xl p-5 shadow-md"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-primary text-base flex items-center gap-2">
              <Trophy className="text-amber-500" size={18} />
              דירוג סניפים — השבוע
            </h3>
            <button
              onClick={() => navigate('/admin/branch-overview')}
              className="text-primary/60 text-xs font-bold hover:text-primary touch-manipulation"
            >
              פרטים →
            </button>
          </div>
          <div className="space-y-2">
            {stats.branchRows.map((b, idx) => {
              const w = (b.thisWeek / maxBranchSpend) * 100
              const dColor = b.delta > 5 ? 'text-emerald-600' : b.delta < -5 ? 'text-red-600' : 'text-primary/40'
              const dIcon = b.delta > 5 ? '↑' : b.delta < -5 ? '↓' : '·'
              return (
                <div key={b.code} className="flex items-center gap-2">
                  <span className="text-primary/40 text-[10px] font-black w-4 text-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="font-bold text-primary text-xs truncate">{b.name}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-black ${dColor}`}>
                          {dIcon} {Math.abs(b.delta).toFixed(0)}%
                        </span>
                        <span className="font-black text-primary text-xs whitespace-nowrap">
                          {formatPrice(b.thisWeek)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.max(1, w)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Top suppliers */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-secondary rounded-3xl p-5 shadow-md"
        >
          <h3 className="font-black text-primary text-base flex items-center gap-2 mb-4">
            <Award className="text-emerald-600" size={18} />
            ספקים מובילים — החודש
          </h3>
          {stats.topSuppliers.length === 0 ? (
            <p className="text-primary/40 text-sm text-center py-4 font-bold">אין הזמנות החודש</p>
          ) : (
            <div className="space-y-2">
              {stats.topSuppliers.map((s, idx) => {
                const w = (s.thisMonth / maxSupplierSpend) * 100
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-primary/40 text-[10px] font-black w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-bold text-primary text-xs truncate">{s.name}</p>
                        <span className="font-black text-primary text-xs whitespace-nowrap">
                          {formatPrice(s.thisMonth)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.max(1, w)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/admin/search')}
            className="bg-secondary rounded-2xl p-4 shadow-md active:scale-[0.98] transition-transform touch-manipulation"
          >
            <Search className="text-primary mx-auto mb-2" size={20} />
            <p className="font-black text-primary text-xs">חיפוש בהזמנות</p>
          </button>
          <button
            onClick={() => navigate('/admin/branch-overview')}
            className="bg-secondary rounded-2xl p-4 shadow-md active:scale-[0.98] transition-transform touch-manipulation"
          >
            <Building2 className="text-primary mx-auto mb-2" size={20} />
            <p className="font-black text-primary text-xs">מבט-על סניפים</p>
          </button>
        </div>
      </div>
    </div>
  )
}
