import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, Send, CheckCircle, Phone, Package,
  Loader2, ChevronDown, ChevronUp, Edit2, Check, RefreshCw
} from 'lucide-react'
import { useOrdersStore } from '../../stores/ordersStore'
import { useSuppliersStore } from '../../stores/suppliersStore'
import type { Order } from '../../stores/ordersStore'
import type { CartItem } from '../../stores/cartStore'
import {
  getOrdersFromCloud, markOrdersDispatchedInCloud,
  getAdminPhoneFromCloud, saveAdminPhoneToCloud
} from '../../lib/cloudApi'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDispatchOrder } from '../../lib/orderFormat'

export default function DispatchOrdersPage() {
  const navigate = useNavigate()
  const { markOrderDispatched } = useOrdersStore()
  const { getAllSuppliers, adminPhone, setAdminPhone } = useSuppliersStore()

  const [cloudOrders, setCloudOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [editPhone, setEditPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState(adminPhone)

  // סימון הזמנות: selected[supplierName] = Set<orderId>
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})
  // הזמנות פתוחות: expanded[orderId_supplier]
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // עריכת כמויות: editedQty[orderId_itemName] = qty
  const [editedQty, setEditedQty] = useState<Record<string, number>>({})
  // מצב עריכה פעיל: editingKey = orderId_supplier
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const loadOrders = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    const orders = await getOrdersFromCloud()
    setCloudOrders(orders)
    setLoading(false)
    if (isRefresh) setRefreshing(false)
  }

  useEffect(() => {
    loadOrders()
    // רענון אוטומטי כל 30 שניות
    intervalRef.current = setInterval(() => loadOrders(), 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [refreshKey])

  useEffect(() => {
    if (!adminPhone) {
      getAdminPhoneFromCloud().then(phone => {
        if (phone) { setAdminPhone(phone); setPhoneInput(phone) }
      })
    } else {
      setPhoneInput(adminPhone)
    }
  }, [adminPhone])

  const displayOrders = showAll
    ? cloudOrders
    : cloudOrders.filter(o => o.status === 'pending')

  const pendingCount = cloudOrders.filter(o => o.status === 'pending').length

  // קיבוץ הזמנות לפי ספק
  const supplierGroups = (() => {
    const groups: Record<string, { supplier: string; phone: string; orders: Order[] }> = {}
    displayOrders.forEach(order => {
      const suppliers = [...new Set(order.items.map(i => i.supplier))]
      suppliers.forEach(sup => {
        if (!groups[sup]) {
          const s = getAllSuppliers().find(s => s.name === sup)
          groups[sup] = { supplier: sup, phone: s?.phone || '', orders: [] }
        }
        groups[sup].orders.push(order)
      })
    })
    return groups
  })()

  // toggle checkbox
  const toggleOrder = (supplier: string, orderId: string) => {
    setSelected(prev => {
      const next = { ...prev }
      const set = new Set(next[supplier] || [])
      if (set.has(orderId)) set.delete(orderId)
      else set.add(orderId)
      next[supplier] = set
      return next
    })
  }

  // toggle הרחבה
  const toggleExpand = (orderId: string, supplier: string) => {
    const key = `${orderId}_${supplier}`
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // קריאת כמות (עם fallback לערך מקורי)
  const getQty = (orderId: string, item: CartItem) => {
    const key = `${orderId}_${item.name}`
    return editedQty[key] ?? item.quantity
  }

  const setQty = (orderId: string, item: CartItem, qty: number) => {
    const key = `${orderId}_${item.name}`
    setEditedQty(prev => ({ ...prev, [key]: Math.max(0, qty) }))
  }

  // בניית הודעת WhatsApp לספק
  const buildMessage = (supplier: string, orders: Order[]) => {
    const branches = orders.map(order => ({
      branch: order.branch,
      notes: order.notes,
      items: order.items
        .filter(i => i.supplier === supplier)
        .map(i => ({ name: i.name, quantity: getQty(order.id, i) })),
    }))
    return formatDispatchOrder({ supplier, branches })
  }

  const getWhatsAppUrl = (supplier: string, phone: string, orders: Order[]) => {
    const text = buildMessage(supplier, orders)
    const digits = phone.replace(/\D/g, '')
    const wa = digits.startsWith('972') ? digits
      : digits.startsWith('0') ? '972' + digits.slice(1)
      : digits ? '972' + digits : ''
    return wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  // שליחה לספק
  const handleDispatch = (supplier: string, phone: string) => {
    const sel = selected[supplier]
    if (!sel || sel.size === 0) return

    const group = supplierGroups[supplier]
    const selectedOrders = group.orders.filter(o => sel.has(o.id))
    const url = getWhatsAppUrl(supplier, phone, selectedOrders)

    window.open(url, '_blank')

    const ids = [...sel]
    ids.forEach(id => markOrderDispatched(id))
    markOrdersDispatchedInCloud(ids).then(() => {
      setCloudOrders(prev =>
        prev.map(o => ids.includes(o.id) ? { ...o, status: 'dispatched' } : o)
      )
    })
    setSelected(prev => ({ ...prev, [supplier]: new Set() }))
  }

  const handleSavePhone = async () => {
    setAdminPhone(phoneInput)
    setEditPhone(false)
    await saveAdminPhoneToCloud(phoneInput)
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation">
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl">שליחה לספקים</h2>
              <p className="text-primary/60 text-xs mt-1">
                {loading ? 'טוען...' : `${pendingCount} הזמנות ממתינות`}
              </p>
            </div>
            <button
              onClick={() => { setRefreshKey(k => k + 1) }}
              disabled={refreshing || loading}
              className="text-primary/60 hover:text-primary active:scale-90 transition-all p-1 touch-manipulation disabled:opacity-40"
              title="רענן"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* מספר אדמין */}
        <div className="bg-secondary rounded-3xl p-4 mb-4 shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-black text-primary text-sm">מספר WhatsApp שלי</p>
            {!editPhone && (
              <button onClick={() => { setPhoneInput(adminPhone); setEditPhone(true) }}
                className="text-xs text-primary/50 font-bold underline touch-manipulation">ערוך</button>
            )}
          </div>
          {editPhone ? (
            <div className="flex gap-2">
              <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
                placeholder="050-1234567" autoFocus
                className="flex-1 bg-primary/5 text-primary rounded-xl py-2 px-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <button onClick={handleSavePhone}
                className="bg-primary text-secondary font-bold px-4 rounded-xl active:scale-95 touch-manipulation">שמור</button>
              <button onClick={() => setEditPhone(false)}
                className="bg-primary/10 text-primary font-bold px-3 rounded-xl active:scale-95 touch-manipulation">ביטול</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-primary/70">
              <Phone size={14} />
              <span className="font-bold text-sm">{adminPhone || 'לא הוגדר'}</span>
            </div>
          )}
        </div>

        {/* פילטר */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setShowAll(false)}
            className={`flex-1 py-2 rounded-2xl font-bold text-sm touch-manipulation transition-colors ${
              !showAll ? 'bg-secondary text-primary' : 'bg-secondary/40 text-primary/50'}`}>
            ממתינות ({pendingCount})
          </button>
          <button onClick={() => setShowAll(true)}
            className={`flex-1 py-2 rounded-2xl font-bold text-sm touch-manipulation transition-colors ${
              showAll ? 'bg-secondary text-primary' : 'bg-secondary/40 text-primary/50'}`}>
            כל ההזמנות ({cloudOrders.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-secondary animate-spin" size={40} />
          </div>
        ) : Object.keys(supplierGroups).length === 0 ? (
          <div className="text-center py-16 bg-secondary rounded-3xl">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
            <p className="font-black text-primary text-lg">
              {showAll ? 'אין הזמנות' : 'אין הזמנות ממתינות'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.values(supplierGroups).map(({ supplier, phone, orders }) => {
              const selCount = selected[supplier]?.size || 0
              return (
                <div key={supplier} className="bg-secondary rounded-3xl shadow-md overflow-hidden">
                  {/* כותרת ספק */}
                  <div className="flex items-center justify-between p-4 border-b border-primary/10">
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-primary" />
                      <div>
                        <h3 className="font-black text-primary text-base">{supplier}</h3>
                        <p className="text-primary/50 text-xs">
                          {orders.length} הזמנות •{' '}
                          {phone || <span className="text-amber-600">אין טלפון</span>}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDispatch(supplier, phone)}
                      disabled={selCount === 0}
                      className={`flex items-center gap-2 font-bold px-4 py-2 rounded-2xl text-sm transition-all active:scale-95 touch-manipulation ${
                        selCount > 0
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-primary/10 text-primary/30 cursor-not-allowed'
                      }`}
                    >
                      <Send size={14} />
                      שלח {selCount > 0 ? `(${selCount})` : ''}
                    </button>
                  </div>

                  {/* רשימת הזמנות */}
                  <div className="divide-y divide-primary/5">
                    {orders.map(order => {
                      const expandKey = `${order.id}_${supplier}`
                      const isExpanded = expanded.has(expandKey)
                      const isSelected = selected[supplier]?.has(order.id) || false
                      const isEditing = editingKey === expandKey
                      const supplierItems = order.items.filter(i => i.supplier === supplier)

                      return (
                        <div key={order.id}
                          className={`transition-colors ${isSelected ? 'bg-green-50/50' : ''}`}>
                          {/* שורת הזמנה */}
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-primary/5 touch-manipulation"
                            onClick={() => toggleExpand(order.id, supplier)}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleOrder(supplier, order.id) }}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all touch-manipulation ${
                                isSelected
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-primary/30 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={13} className="text-white" />}
                            </button>

                            {/* פרטים */}
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-primary text-sm">{order.branch}</p>
                              <p className="text-primary/50 text-xs">
                                {new Date(order.createdAt).toLocaleString('he-IL', {
                                  day: '2-digit', month: '2-digit',
                                  hour: '2-digit', minute: '2-digit'
                                })} • {supplierItems.length} פריטים
                              </p>
                            </div>

                            {/* עריכה + פתיחה */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const key = expandKey
                                  setExpanded(prev => {
                                    const next = new Set(prev); next.add(key); return next
                                  })
                                  setEditingKey(isEditing ? null : key)
                                }}
                                className="p-1.5 text-primary/40 hover:text-primary active:scale-90 touch-manipulation transition-colors"
                                title="ערוך כמויות"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleExpand(order.id, supplier) }}
                                className="p-1.5 text-primary/40 hover:text-primary active:scale-90 touch-manipulation transition-colors"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* פרטי הזמנה מורחבת */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-3 pt-1 bg-primary/3">
                                  <div className="space-y-2">
                                    {supplierItems.map(item => (
                                      <div key={item.name}
                                        className="flex items-center justify-between gap-3">
                                        <span className="text-primary font-bold text-sm flex-1">
                                          {item.name}
                                        </span>
                                        {isEditing ? (
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              onClick={() => setQty(order.id, item, getQty(order.id, item) - 1)}
                                              className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center active:scale-90 touch-manipulation">
                                              −
                                            </button>
                                            <input
                                              type="number"
                                              min="0"
                                              value={getQty(order.id, item)}
                                              onChange={e => setQty(order.id, item, parseInt(e.target.value) || 0)}
                                              className="w-12 text-center bg-white border border-primary/20 text-primary font-black rounded-lg py-1 text-sm focus:outline-none"
                                            />
                                            <button
                                              onClick={() => setQty(order.id, item, getQty(order.id, item) + 1)}
                                              className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center active:scale-90 touch-manipulation">
                                              +
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-primary/60 font-bold text-sm">
                                            × {getQty(order.id, item)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  {order.notes && (
                                    <p className="text-amber-700 text-xs font-bold mt-2 pt-2 border-t border-primary/10">
                                      📝 {order.notes}
                                    </p>
                                  )}

                                  {isEditing && (
                                    <button
                                      onClick={() => setEditingKey(null)}
                                      className="mt-2 w-full flex items-center justify-center gap-1.5 bg-primary text-secondary font-bold py-2 rounded-xl text-sm active:scale-95 touch-manipulation"
                                    >
                                      <Check size={14} /> סיום עריכה
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>

                  {/* תצוגה מקדימה של ההודעה */}
                  {selCount > 0 && (
                    <div className="m-4 mt-0 bg-primary/5 rounded-2xl p-3">
                      <p className="text-primary/50 font-black text-xs mb-1.5">תצוגה מקדימה של ההודעה:</p>
                      <pre className="text-primary text-xs font-mono whitespace-pre-wrap leading-relaxed">
                        {buildMessage(supplier,
                          orders.filter(o => selected[supplier]?.has(o.id))
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
