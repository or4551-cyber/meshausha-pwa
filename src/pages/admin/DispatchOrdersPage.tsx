import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Send, CheckCircle, Phone, Package, Clock, Loader2 } from 'lucide-react'
import { useOrdersStore } from '../../stores/ordersStore'
import { useSuppliersStore } from '../../stores/suppliersStore'
import type { Order } from '../../stores/ordersStore'
import { getOrdersFromCloud, markOrdersDispatchedInCloud, getAdminPhoneFromCloud, saveAdminPhoneToCloud } from '../../lib/cloudApi'
import { motion } from 'framer-motion'

export default function DispatchOrdersPage() {
  const navigate = useNavigate()
  const { markOrderDispatched } = useOrdersStore()
  const { getAllSuppliers, adminPhone, setAdminPhone } = useSuppliersStore()

  const [cloudOrders, setCloudOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [editPhone, setEditPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState(adminPhone)
  const [showAll, setShowAll] = useState(false)

  // טעינת הזמנות מהענן
  useEffect(() => {
    getOrdersFromCloud().then(orders => {
      setCloudOrders(orders)
      setLoading(false)
    })
  }, [])

  // טעינת adminPhone מהענן (אם ריק מקומית)
  useEffect(() => {
    if (!adminPhone) {
      getAdminPhoneFromCloud().then(phone => {
        if (phone) {
          setAdminPhone(phone)
          setPhoneInput(phone)
        }
      })
    }
  }, [])

  const displayOrders = showAll
    ? cloudOrders
    : cloudOrders.filter(o => o.status === 'pending')

  const pendingCount = cloudOrders.filter(o => o.status === 'pending').length

  // קיבוץ לפי ספק
  type SupplierGroup = {
    supplierName: string
    phone: string
    orderIds: string[]
    items: { name: string; totalQty: number; byBranch: { branch: string; qty: number }[] }[]
    branches: string[]
    notes: string[]
  }

  const groups: Record<string, SupplierGroup> = {}

  displayOrders.forEach(order => {
    order.items.forEach(item => {
      if (!groups[item.supplier]) {
        const supplier = getAllSuppliers().find(s => s.name === item.supplier)
        groups[item.supplier] = {
          supplierName: item.supplier,
          phone: supplier?.phone || '',
          orderIds: [],
          items: [],
          branches: [],
          notes: [],
        }
      }
      const g = groups[item.supplier]
      if (!g.orderIds.includes(order.id)) {
        g.orderIds.push(order.id)
        if (!g.branches.includes(order.branch)) g.branches.push(order.branch)
        if (order.notes && !g.notes.includes(order.notes)) g.notes.push(order.notes)
      }
      let entry = g.items.find(i => i.name === item.name)
      if (!entry) {
        entry = { name: item.name, totalQty: 0, byBranch: [] }
        g.items.push(entry)
      }
      entry.totalQty += item.quantity
      const branchEntry = entry.byBranch.find(b => b.branch === order.branch)
      if (branchEntry) branchEntry.qty += item.quantity
      else entry.byBranch.push({ branch: order.branch, qty: item.quantity })
    })
  })

  const getWhatsAppUrl = (group: SupplierGroup) => {
    let text = `🛒 הזמנה - ${group.supplierName}\n`
    text += `📅 ${new Date().toLocaleDateString('he-IL')}\n\n`

    const branchItems: Record<string, { name: string; qty: number }[]> = {}
    group.items.forEach(item => {
      item.byBranch.forEach(({ branch, qty }) => {
        if (!branchItems[branch]) branchItems[branch] = []
        branchItems[branch].push({ name: item.name, qty })
      })
    })

    Object.entries(branchItems).forEach(([branch, items]) => {
      text += `📍 ${branch}:\n`
      items.forEach(({ name, qty }) => { text += `• ${name} × ${qty}\n` })
      text += '\n'
    })

    if (group.notes.length > 0) text += `📝 ${group.notes.join(' | ')}`

    const digits = group.phone.replace(/\D/g, '')
    const wa = digits.startsWith('972') ? digits
      : digits.startsWith('0') ? '972' + digits.slice(1)
      : digits ? '972' + digits : ''

    return wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  const handleDispatch = (group: SupplierGroup) => {
    window.open(getWhatsAppUrl(group), '_blank')
    // עדכון מקומי
    group.orderIds.forEach(id => markOrderDispatched(id))
    // עדכון ענן + רענון
    markOrdersDispatchedInCloud(group.orderIds).then(() => {
      setCloudOrders(prev =>
        prev.map(o => group.orderIds.includes(o.id) ? { ...o, status: 'dispatched' } : o)
      )
    })
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
            <button
              onClick={() => navigate('/admin')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl">שליחה לספקים</h2>
              <p className="text-primary/60 text-xs mt-1">
                {loading ? 'טוען...' : `${pendingCount} הזמנות ממתינות לשליחה`}
              </p>
            </div>
          </div>
        </header>

        {/* הגדרת מספר אדמין */}
        <div className="bg-secondary rounded-3xl p-4 mb-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <p className="font-black text-primary text-sm">מספר WhatsApp שלי (לקבלת הזמנות מסניפים)</p>
            {!editPhone && (
              <button
                onClick={() => { setPhoneInput(adminPhone); setEditPhone(true) }}
                className="text-xs text-primary/50 font-bold underline touch-manipulation"
              >
                ערוך
              </button>
            )}
          </div>
          {editPhone ? (
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="050-1234567"
                className="flex-1 bg-primary/5 text-primary rounded-xl py-2 px-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <button
                onClick={handleSavePhone}
                className="bg-primary text-secondary font-bold px-4 rounded-xl active:scale-95 touch-manipulation"
              >
                שמור
              </button>
              <button
                onClick={() => setEditPhone(false)}
                className="bg-primary/10 text-primary font-bold px-3 rounded-xl active:scale-95 touch-manipulation"
              >
                ביטול
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-primary/70">
              <Phone size={14} />
              <span className="font-bold text-sm">{adminPhone || 'לא הוגדר — הזמנות יישלחו ללא מספר נמען'}</span>
            </div>
          )}
        </div>

        {/* פילטר */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowAll(false)}
            className={`flex-1 py-2 rounded-2xl font-bold text-sm touch-manipulation transition-colors ${
              !showAll ? 'bg-secondary text-primary' : 'bg-secondary/40 text-primary/50'
            }`}
          >
            ממתינות ({pendingCount})
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`flex-1 py-2 rounded-2xl font-bold text-sm touch-manipulation transition-colors ${
              showAll ? 'bg-secondary text-primary' : 'bg-secondary/40 text-primary/50'
            }`}
          >
            כל ההזמנות ({cloudOrders.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-secondary animate-spin" size={40} />
          </div>
        ) : Object.keys(groups).length === 0 ? (
          <div className="text-center py-16 bg-secondary rounded-3xl">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
            <p className="font-black text-primary text-lg">
              {showAll ? 'אין הזמנות במערכת' : 'אין הזמנות ממתינות'}
            </p>
            {!showAll && (
              <p className="text-primary/50 text-sm mt-1">כל ההזמנות כבר נשלחו לספקים</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(groups).map(group => (
              <motion.div
                key={group.supplierName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary rounded-3xl p-5 shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-primary" />
                      <h3 className="font-black text-primary text-lg">{group.supplierName}</h3>
                    </div>
                    <p className="text-primary/50 text-xs mt-0.5">
                      {group.branches.length} סניפים • {group.orderIds.length} הזמנות
                    </p>
                    {!group.phone && (
                      <p className="text-amber-600 text-xs font-bold mt-0.5">
                        ⚠️ אין מספר טלפון לספק — WhatsApp ייפתח ללא נמען
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDispatch(group)}
                    className="flex items-center gap-2 bg-green-500 text-white font-bold px-4 py-2.5 rounded-2xl active:scale-95 touch-manipulation shadow-md"
                  >
                    <Send size={16} />
                    שלח
                  </button>
                </div>

                <div className="space-y-2 border-t border-primary/10 pt-3">
                  {group.branches.map(branch => (
                    <div key={branch}>
                      <p className="text-primary/60 font-black text-xs mb-1">📍 {branch}:</p>
                      <div className="space-y-0.5 pl-3">
                        {group.items
                          .filter(item => item.byBranch.some(b => b.branch === branch))
                          .map(item => {
                            const qty = item.byBranch.find(b => b.branch === branch)?.qty || 0
                            return (
                              <p key={item.name} className="text-primary font-bold text-sm">
                                • {item.name} <span className="text-primary/50">× {qty}</span>
                              </p>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>

                {group.notes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-primary/10">
                    <p className="text-primary/50 text-xs font-bold">📝 {group.notes.join(' | ')}</p>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-1 text-primary/30 text-xs">
                  <Clock size={11} />
                  <span>
                    {cloudOrders
                      .filter(o => group.orderIds.includes(o.id))
                      .map(o => new Date(o.createdAt).toLocaleString('he-IL', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      }))
                      .join(' • ')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
