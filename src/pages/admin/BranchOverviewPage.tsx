import { useNavigate } from 'react-router-dom'
import { ChevronRight, CheckCircle, XCircle, AlertTriangle, TrendingUp, Package, CreditCard } from 'lucide-react'
import { useOrdersStore } from '../../stores/ordersStore'
import { useSuppliersStore } from '../../stores/suppliersStore'
import { useDeliveriesStore } from '../../stores/deliveriesStore'
import { formatPrice } from '../../lib/utils'

const BRANCHES = [
  { code: '1001', name: 'עין המפרץ' },
  { code: '1002', name: 'ביאליק קרן היסוד' },
  { code: '1003', name: 'מוצקין הילדים' },
  { code: '1004', name: 'צור שלום' },
  { code: '1005', name: 'גושן 60' },
  { code: '1006', name: 'נהריה הגעתון' },
  { code: '1007', name: 'ההסתדרות' },
  { code: '1008', name: 'משכנות האומנים' },
  { code: '1009', name: 'רון קריית ביאליק' },
]

const today = new Date()
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

export default function BranchOverviewPage() {
  const navigate = useNavigate()
  const { getAllOrders } = useOrdersStore()
  const { suppliers } = useSuppliersStore()
  const { getAllDeliveries, getPendingCredits } = useDeliveriesStore()

  const allOrders = getAllOrders()
  const allDeliveries = getAllDeliveries()
  const pendingCredits = getPendingCredits()
  const todayDay = today.getDay()

  // ספקים שמזמינים היום לכל קוד סניף
  const suppliersForToday = (branchCode: string) =>
    suppliers.filter(s => s.schedules.some(sch => sch.day === todayDay && sch.branchCodes.includes(branchCode)))

  // נתונים לכל סניף
  const branchData = BRANCHES.map(branch => {
    const branchOrders = allOrders.filter(o => o.branchCode === branch.code)

    // הזמין היום?
    const orderedToday = branchOrders.some(o => o.createdAt.startsWith(todayKey))

    // הוצאות החודש
    const monthlySpend = branchOrders
      .filter(o => o.createdAt.startsWith(currentMonth))
      .reduce((sum, o) => sum + o.totalPrice, 0)

    // זיכויים פתוחים לסניף
    const openCredits = pendingCredits.filter(({ delivery }) => delivery.branchCode === branch.code)

    // סניפים שאמורים להזמין היום (יש להם ספקים ביום הזה) אבל לא הזמינו
    const todaySuppliers = suppliersForToday(branch.code)
    const shouldOrderToday = todaySuppliers.length > 0
    const needsAlert = shouldOrderToday && !orderedToday

    // מספר הזמנות החודש
    const monthlyOrders = branchOrders.filter(o => o.createdAt.startsWith(currentMonth)).length

    return {
      ...branch,
      orderedToday,
      monthlySpend,
      monthlyOrders,
      openCredits: openCredits.length,
      openCreditsValue: openCredits.reduce(
        (sum, { item }) => sum + (item.orderedQty - item.receivedQty) * item.price, 0
      ),
      shouldOrderToday,
      needsAlert,
      todaySuppliers,
    }
  })

  const totalMonthlySpend = branchData.reduce((sum, b) => sum + b.monthlySpend, 0)
  const alertBranches = branchData.filter(b => b.needsAlert)
  const totalOpenCredits = pendingCredits.length

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin')} className="text-primary p-1 touch-manipulation">
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">מבט-על סניפים</h2>
                <p className="text-primary/60 text-xs mt-0.5">
                  {today.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-3">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary rounded-2xl p-3 text-center shadow-sm">
            <TrendingUp className="mx-auto text-primary/60 mb-1" size={18} />
            <p className="font-black text-primary text-base">{formatPrice(totalMonthlySpend)}</p>
            <p className="text-primary/50 text-xs">הוצאות החודש</p>
          </div>
          <div className={`rounded-2xl p-3 text-center shadow-sm ${alertBranches.length > 0 ? 'bg-red-50' : 'bg-secondary'}`}>
            <AlertTriangle className={`mx-auto mb-1 ${alertBranches.length > 0 ? 'text-red-500' : 'text-primary/60'}`} size={18} />
            <p className={`font-black text-base ${alertBranches.length > 0 ? 'text-red-600' : 'text-primary'}`}>{alertBranches.length}</p>
            <p className={`text-xs ${alertBranches.length > 0 ? 'text-red-400' : 'text-primary/50'}`}>לא הזמינו היום</p>
          </div>
          <div className={`rounded-2xl p-3 text-center shadow-sm ${totalOpenCredits > 0 ? 'bg-amber-50' : 'bg-secondary'}`}>
            <CreditCard className={`mx-auto mb-1 ${totalOpenCredits > 0 ? 'text-amber-500' : 'text-primary/60'}`} size={18} />
            <p className={`font-black text-base ${totalOpenCredits > 0 ? 'text-amber-600' : 'text-primary'}`}>{totalOpenCredits}</p>
            <p className={`text-xs ${totalOpenCredits > 0 ? 'text-amber-400' : 'text-primary/50'}`}>זיכויים פתוחים</p>
          </div>
        </div>

        {/* התראות - סניפים שאמורים להזמין היום */}
        {alertBranches.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-500" size={18} />
              <p className="font-black text-red-700 text-sm">סניפים שלא הזמינו היום</p>
            </div>
            <div className="space-y-1.5">
              {alertBranches.map(b => (
                <div key={b.code} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-red-700">{b.name}</span>
                  <span className="text-red-400">{b.todaySuppliers.map(s => s.name).join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* כרטיסי סניפים */}
        {branchData.map(branch => (
          <div key={branch.code} className={`bg-secondary rounded-3xl p-4 shadow-md ${branch.needsAlert ? 'ring-1 ring-red-200' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-black text-primary text-base">{branch.name}</h3>
                <p className="text-primary/50 text-xs">סניף {branch.code}</p>
              </div>
              <div className="flex items-center gap-2">
                {branch.openCredits > 0 && (
                  <button
                    onClick={() => navigate('/admin/credits')}
                    className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-1 rounded-lg flex items-center gap-1 active:scale-95 touch-manipulation"
                  >
                    <CreditCard size={11} />
                    {branch.openCredits} זיכויים
                  </button>
                )}
                {branch.orderedToday ? (
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-black px-2 py-1 rounded-lg">
                    <CheckCircle size={12} />
                    הזמין היום
                  </span>
                ) : branch.shouldOrderToday ? (
                  <span className="flex items-center gap-1 bg-red-100 text-red-600 text-xs font-black px-2 py-1 rounded-lg">
                    <XCircle size={12} />
                    לא הזמין
                  </span>
                ) : (
                  <span className="text-primary/30 text-xs font-bold">אין הזמנה היום</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-primary/5 rounded-xl p-2.5 text-center">
                <p className="font-black text-primary text-sm">{formatPrice(branch.monthlySpend)}</p>
                <p className="text-primary/50 text-xs">הוצאות החודש</p>
              </div>
              <div className="bg-primary/5 rounded-xl p-2.5 text-center">
                <p className="font-black text-primary text-sm">{branch.monthlyOrders}</p>
                <p className="text-primary/50 text-xs">הזמנות החודש</p>
              </div>
            </div>

            {branch.shouldOrderToday && branch.todaySuppliers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {branch.todaySuppliers.map(s => (
                  <span key={s.id} className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* קישור לזיכויים */}
        {totalOpenCredits > 0 && (
          <button
            onClick={() => navigate('/admin/credits')}
            className="w-full bg-amber-500 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation"
          >
            <CreditCard size={18} />
            ניהול {totalOpenCredits} זיכויים פתוחים
          </button>
        )}
      </div>
    </div>
  )
}
