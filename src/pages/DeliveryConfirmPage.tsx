import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, CheckCircle, XCircle, AlertCircle, Package, Save } from 'lucide-react'
import { useOrdersStore } from '../stores/ordersStore'
import { useDeliveriesStore } from '../stores/deliveriesStore'
import type { DeliveryItem } from '../stores/deliveriesStore'
import { formatPrice } from '../lib/utils'

const STATUS_CONFIG = {
  received: { label: 'התקבל', color: 'bg-green-500', icon: CheckCircle },
  partial:  { label: 'חלקי',  color: 'bg-amber-500', icon: AlertCircle },
  missing:  { label: 'חסר',   color: 'bg-red-500',   icon: XCircle },
}

export default function DeliveryConfirmPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { orders } = useOrdersStore()
  const { createDelivery, confirmDelivery, getDeliveryForOrder } = useDeliveriesStore()

  const order = orders.find(o => o.id === orderId)
  const [items, setItems] = useState<DeliveryItem[]>([])
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!order) return
    const existing = getDeliveryForOrder(order.id)
    if (existing) {
      setItems(existing.items)
      setNotes(existing.notes ?? '')
    } else {
      const created = createDelivery(order)
      setItems(created.items)
    }
  }, [order?.id])

  if (!order) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="bg-secondary rounded-3xl p-8 text-center">
          <Package className="mx-auto text-primary/30 mb-3" size={48} />
          <p className="font-bold text-primary">הזמנה לא נמצאה</p>
          <button onClick={() => navigate('/history')} className="mt-4 text-primary/60 underline text-sm">חזור להיסטוריה</button>
        </div>
      </div>
    )
  }

  const delivery = getDeliveryForOrder(order.id)

  const updateItemStatus = (idx: number, status: DeliveryItem['status']) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return {
        ...item,
        status,
        receivedQty: status === 'missing' ? 0 : status === 'received' ? item.orderedQty : item.receivedQty,
        creditStatus: (status === 'missing' || status === 'partial') ? 'pending_credit' : undefined,
      }
    }))
  }

  const updateReceivedQty = (idx: number, qty: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const clamped = Math.max(0, Math.min(qty, item.orderedQty))
      return {
        ...item,
        receivedQty: clamped,
        status: clamped === 0 ? 'missing' : clamped < item.orderedQty ? 'partial' : 'received',
        creditStatus: clamped < item.orderedQty ? 'pending_credit' : undefined,
      }
    }))
  }

  const handleSave = () => {
    if (!delivery) return
    confirmDelivery(delivery.id, items, notes)
    setSaved(true)
    setTimeout(() => navigate('/history'), 1200)
  }

  const missingValue = items
    .filter(i => i.status !== 'received')
    .reduce((sum, i) => sum + (i.orderedQty - i.receivedQty) * i.price, 0)

  // קבוצות לפי ספק
  const suppliers = [...new Set(items.map(i => i.supplier))]

  return (
    <div className="min-h-screen bg-primary pb-24">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/history')} className="text-primary p-1 touch-manipulation">
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">אישור קבלת סחורה</h2>
                <p className="text-primary/60 text-xs mt-0.5">
                  {order.branch} • {new Date(order.createdAt).toLocaleDateString('he-IL')}
                </p>
              </div>
              <div className="w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* סטטוס */}
        {delivery?.status !== 'pending' && (
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${
            delivery?.status === 'confirmed' ? 'bg-green-500/20' : 'bg-amber-500/20'
          }`}>
            {delivery?.status === 'confirmed'
              ? <CheckCircle className="text-green-600" size={22} />
              : <AlertCircle className="text-amber-600" size={22} />
            }
            <div>
              <p className="font-black text-primary text-sm">
                {delivery?.status === 'confirmed' ? 'אספקה אושרה' : 'אספקה חלקית - יש פריטים לזיכוי'}
              </p>
              {delivery?.confirmedAt && (
                <p className="text-primary/50 text-xs">{new Date(delivery.confirmedAt).toLocaleString('he-IL')}</p>
              )}
            </div>
          </div>
        )}

        {/* פריטים לפי ספק */}
        {suppliers.map(supplier => {
          const supplierItems = items
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => item.supplier === supplier)

          return (
            <div key={supplier} className="bg-secondary rounded-3xl p-4 shadow-md">
              <h3 className="font-black text-primary text-base mb-3 pb-2 border-b border-primary/10">{supplier}</h3>
              <div className="space-y-3">
                {supplierItems.map(({ item, idx }) => {
                  return (
                    <div key={item.productId} className="bg-primary/5 rounded-2xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-primary text-sm flex-1 ml-2">{item.productName}</p>
                        <p className="text-primary/50 text-xs">×{item.orderedQty}</p>
                      </div>

                      {/* כפתורי סטטוס */}
                      <div className="flex gap-1.5 mb-2">
                        {(Object.entries(STATUS_CONFIG) as [DeliveryItem['status'], typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, c]) => (
                          <button
                            key={key}
                            onClick={() => updateItemStatus(idx, key)}
                            className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all touch-manipulation ${
                              item.status === key ? `${c.color} text-white` : 'bg-primary/10 text-primary/60'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>

                      {/* קמות שהתקבלה (רק אם חלקי) */}
                      {item.status === 'partial' && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-primary/60 text-xs font-bold">כמות שהתקבלה:</span>
                          <input
                            type="number"
                            min={0}
                            max={item.orderedQty}
                            value={item.receivedQty}
                            onChange={e => updateReceivedQty(idx, Number(e.target.value))}
                            className="w-16 bg-white text-primary text-center font-black rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="text-primary/40 text-xs">מתוך {item.orderedQty}</span>
                        </div>
                      )}

                      {/* ערך חסר */}
                      {item.status !== 'received' && (
                        <p className="text-red-500 text-xs font-bold mt-1">
                          זיכוי צפוי: {formatPrice((item.orderedQty - item.receivedQty) * item.price)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* סיכום זיכויים */}
        {missingValue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="text-red-500" size={18} />
              <p className="font-black text-red-700 text-sm">סה"כ לזיכוי: {formatPrice(missingValue)}</p>
            </div>
            <p className="text-red-500 text-xs">הפריטים יועברו למעקב זיכויים לאדמין</p>
          </div>
        )}

        {/* הערות */}
        <div className="bg-secondary rounded-2xl p-4 shadow-sm">
          <label className="block text-primary font-bold text-sm mb-2">הערות אספקה</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="בעיות במשלוח, הערות כלליות..."
            rows={2}
            className="w-full bg-primary/5 text-primary placeholder:text-primary/30 rounded-xl py-2.5 px-3 font-bold text-sm focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* כפתור שמירה */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-primary/90 backdrop-blur-sm" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saved}
            className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all touch-manipulation ${
              saved ? 'bg-green-500 text-white' : 'bg-secondary text-primary'
            }`}
          >
            {saved ? (
              <><CheckCircle size={20} /> נשמר בהצלחה!</>
            ) : (
              <><Save size={20} /> אשר קבלת סחורה</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
