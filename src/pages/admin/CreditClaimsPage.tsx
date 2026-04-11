import { useNavigate } from 'react-router-dom'
import { ChevronRight, AlertCircle, CheckCircle, Clock, Truck } from 'lucide-react'
import { useDeliveriesStore } from '../../stores/deliveriesStore'
import type { CreditStatus } from '../../stores/deliveriesStore'
import { formatPrice } from '../../lib/utils'

const CREDIT_STATUS_CONFIG: Record<CreditStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending_credit:    { label: 'ממתין לזיכוי',      color: 'text-red-500',    icon: AlertCircle },
  credit_received:   { label: 'זיכוי התקבל',        color: 'text-green-600',  icon: CheckCircle },
  pending_delivery:  { label: 'השלמה בדרך',          color: 'text-amber-500',  icon: Truck },
  resolved:          { label: 'טופל',                color: 'text-primary/40', icon: CheckCircle },
}

export default function CreditClaimsPage() {
  const navigate = useNavigate()
  const { getPendingCredits, resolveCredit, getAllDeliveries } = useDeliveriesStore()

  const pendingCredits = getPendingCredits()

  // כל הפריטים עם זיכויים (כולל פתורים) לסיכום
  const allCreditItems = getAllDeliveries().flatMap(d =>
    d.items
      .filter(i => i.status !== 'received')
      .map(i => ({ delivery: d, item: i }))
  )

  const totalPending = pendingCredits.reduce(
    (sum, { item }) => sum + (item.orderedQty - item.receivedQty) * item.price, 0
  )

  const handleResolve = (deliveryId: string, productId: string, status: CreditStatus) => {
    resolveCredit(deliveryId, productId, status)
  }

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
                <h2 className="font-black text-primary text-xl">מעקב זיכויים</h2>
                <p className="text-primary/60 text-xs mt-0.5">
                  {pendingCredits.length} פריטים פתוחים • {formatPrice(totalPending)}
                </p>
              </div>
              <div className="w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-3">
        {pendingCredits.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle className="mx-auto text-green-400 mb-3" size={56} />
            <p className="text-secondary/60 font-bold text-lg">אין זיכויים פתוחים</p>
            <p className="text-secondary/40 text-sm mt-1">כל הפריטים טופלו</p>
          </div>
        )}

        {/* זיכויים ממתינים */}
        {pendingCredits.map(({ delivery, item }) => (
          <div key={`${delivery.id}-${item.productId}`} className="bg-secondary rounded-2xl p-4 shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-black text-primary text-sm">{item.productName}</p>
                <p className="text-primary/60 text-xs mt-0.5">{item.supplier}</p>
              </div>
              <span className="bg-red-100 text-red-600 text-xs font-black px-2 py-1 rounded-lg">
                {formatPrice((item.orderedQty - item.receivedQty) * item.price)}
              </span>
            </div>

            <div className="bg-primary/5 rounded-xl p-2.5 mb-3 text-xs flex items-center gap-3">
              <div>
                <p className="text-primary/50 font-bold">סניף</p>
                <p className="text-primary font-black">{delivery.branchName}</p>
              </div>
              <div className="w-px h-8 bg-primary/10" />
              <div>
                <p className="text-primary/50 font-bold">הוזמן</p>
                <p className="text-primary font-black">×{item.orderedQty}</p>
              </div>
              <div className="w-px h-8 bg-primary/10" />
              <div>
                <p className="text-primary/50 font-bold">התקבל</p>
                <p className="text-primary font-black">×{item.receivedQty}</p>
              </div>
              <div className="w-px h-8 bg-primary/10" />
              <div>
                <p className="text-primary/50 font-bold">תאריך</p>
                <p className="text-primary font-black">
                  {new Date(delivery.orderDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                </p>
              </div>
            </div>

            {/* כפתורי פעולה */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleResolve(delivery.id, item.productId, 'credit_received')}
                className="flex flex-col items-center gap-1 py-2 px-2 bg-green-50 text-green-700 rounded-xl font-bold text-xs active:scale-95 touch-manipulation"
              >
                <CheckCircle size={16} />
                זיכוי התקבל
              </button>
              <button
                onClick={() => handleResolve(delivery.id, item.productId, 'pending_delivery')}
                className="flex flex-col items-center gap-1 py-2 px-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs active:scale-95 touch-manipulation"
              >
                <Truck size={16} />
                השלמה בדרך
              </button>
              <button
                onClick={() => handleResolve(delivery.id, item.productId, 'resolved')}
                className="flex flex-col items-center gap-1 py-2 px-2 bg-primary/10 text-primary rounded-xl font-bold text-xs active:scale-95 touch-manipulation"
              >
                <Clock size={16} />
                טופל אחרת
              </button>
            </div>
          </div>
        ))}

        {/* היסטוריית זיכויים פתורים */}
        {allCreditItems.filter(({ item }) => item.creditStatus && item.creditStatus !== 'pending_credit').length > 0 && (
          <div className="mt-4">
            <p className="text-secondary/50 font-black text-sm mb-2 px-1">זיכויים שטופלו</p>
            {allCreditItems
              .filter(({ item }) => item.creditStatus && item.creditStatus !== 'pending_credit')
              .map(({ delivery, item }) => {
                const cfg = CREDIT_STATUS_CONFIG[item.creditStatus!]
                const Icon = cfg.icon
                return (
                  <div key={`${delivery.id}-${item.productId}-resolved`} className="bg-secondary/60 rounded-2xl p-3 mb-2 flex items-center gap-3">
                    <Icon size={18} className={cfg.color} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary text-sm truncate">{item.productName}</p>
                      <p className="text-primary/50 text-xs">{delivery.branchName} • {item.supplier}</p>
                    </div>
                    <span className={`text-xs font-black ${cfg.color}`}>{cfg.label}</span>
                  </div>
                )
              })
            }
          </div>
        )}
      </div>
    </div>
  )
}
