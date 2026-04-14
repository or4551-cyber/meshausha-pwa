import { useMemo, useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart, History, Bell, LogOut, BarChart3, Zap, Trash2,
  ChevronLeft, Package, Truck, Calendar, WifiOff, RefreshCw,
  AlertTriangle, Info, X, PlayCircle, Send
} from 'lucide-react'
import { VideoModal, BRANCH_VIDEO_URL, ADMIN_VIDEO_URL } from '../components/VideoModal'
import { useOrdersStore } from '../stores/ordersStore'
import { useCartStore } from '../stores/cartStore'
import { useSuppliersStore } from '../stores/suppliersStore'
import { getOrdersFromCloud } from '../lib/cloudApi'
import { useAdminNotificationsStore } from '../stores/adminNotificationsStore'
import type { NotificationPriority } from '../stores/adminNotificationsStore'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { motion, AnimatePresence } from 'framer-motion'

const PRIORITY_STYLE: Record<NotificationPriority, { bg: string; border: string; icon: typeof Bell; iconColor: string }> = {
  info:    { bg: 'bg-blue-900/30',   border: 'border-blue-500/40',   icon: Info,          iconColor: 'text-blue-400' },
  warning: { bg: 'bg-amber-900/30',  border: 'border-amber-500/40',  icon: AlertTriangle, iconColor: 'text-amber-400' },
  urgent:  { bg: 'bg-red-900/30',    border: 'border-red-500/40',    icon: Bell,          iconColor: 'text-red-400' },
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { templates, deleteTemplate, syncOfflineOrders } = useOrdersStore()
  const { clearCart, addItem } = useCartStore()
  const { getAllSuppliers } = useSuppliersStore()
  const { getNotificationsForBranch } = useAdminNotificationsStore()
  const isOnline = useOnlineStatus()

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // אדמין — טוען ספירת הזמנות ממתינות מהענן
  useEffect(() => {
    if (user?.isAdmin) {
      getOrdersFromCloud().then(orders => {
        setPendingCount(orders.filter(o => o.status === 'pending').length)
      })
    }
  }, [user?.isAdmin])
  const [syncedCount, setSyncedCount] = useState(0)
  const [showVideo, setShowVideo] = useState(false)

  // סנכרון הזמנות אופליין כשחוזרים לאינטרנט
  useEffect(() => {
    if (isOnline) {
      setSyncing(true)
      syncOfflineOrders().then(count => {
        setSyncing(false)
        if (count > 0) setSyncedCount(count)
      })
    }
  }, [isOnline])

  // התראות אדמין לסניף זה
  const adminNotifications = useMemo(() => {
    if (!user || user.isAdmin) return []
    return getNotificationsForBranch(user.branchCode).filter(n => !dismissed.has(n.id))
  }, [getNotificationsForBranch, user, dismissed])

  // ספקים שצריך להזמין היום לפי לוח הזמנים של הסניף
  const todaySuppliers = useMemo(() => {
    const today = new Date().getDay()
    const suppliers = getAllSuppliers()
    return suppliers
      .filter(s => {
        if (user?.isAdmin) return s.schedules.some(sch => sch.day === today)
        return s.schedules.some(
          sch => sch.day === today && sch.branchCodes.includes(user?.branchCode ?? '')
        )
      })
      .map(s => ({
        ...s,
        todaySchedule: s.schedules.find(sch =>
          sch.day === today &&
          (user?.isAdmin || sch.branchCodes.includes(user?.branchCode ?? ''))
        )!
      }))
  }, [getAllSuppliers, user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleLoadTemplate = (templateId: string) => {
    const { loadTemplate } = useOrdersStore.getState()
    const items = loadTemplate(templateId)
    if (!items || items.length === 0) return
    clearCart()
    items.forEach(item => {
      addItem(
        { productId: item.productId, name: item.name, supplier: item.supplier, price: item.price },
        item.quantity
      )
    })
    navigate('/summary')
  }

  const handleDeleteTemplate = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation()
    if (confirm('למחוק את התבנית?')) deleteTemplate(templateId)
  }

  const getTemplateSuppliers = (items: { supplier: string }[]) =>
    [...new Set(items.map(i => i.supplier))].join(' · ')

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <header className="bg-secondary rounded-3xl p-5 mb-4 shadow-xl relative">
          <button
            onClick={handleLogout}
            className="absolute top-4 left-4 text-primary/30 hover:text-primary/50 active:text-primary/60 transition-colors p-2 touch-manipulation"
            aria-label="התנתק"
          >
            <LogOut size={20} />
          </button>
          <button
            onClick={() => setShowVideo(true)}
            className="absolute top-4 right-4 text-primary/30 hover:text-primary/50 active:text-primary/60 transition-colors p-2 touch-manipulation"
            aria-label="מדריך וידאו"
          >
            <PlayCircle size={20} />
          </button>
          <div className="text-center pt-2">
            <h2 className="font-black text-primary text-2xl mb-2">משאוושה</h2>
            <span className="text-xs bg-primary text-secondary px-3 py-1 rounded-full font-bold inline-block">
              {user?.branch}
            </span>
          </div>
        </header>

        {/* אינדיקטור אופליין */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="bg-red-900/40 border border-red-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
                <WifiOff className="text-red-400 flex-shrink-0" size={18} />
                <p className="text-red-300 font-bold text-sm flex-1">אין חיבור לאינטרנט — הזמנות יישמרו ויסונכרנו בהתחברות</p>
              </div>
            </motion.div>
          )}
          {isOnline && syncing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <RefreshCw className="text-blue-400 animate-spin flex-shrink-0" size={16} />
                <p className="text-blue-300 font-bold text-sm">מסנכרן הזמנות...</p>
              </div>
            </motion.div>
          )}
          {syncedCount > 0 && !syncing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="bg-green-900/30 border border-green-500/30 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-green-300 font-bold text-sm">{syncedCount} הזמנות סונכרנו בהצלחה</p>
                <button onClick={() => setSyncedCount(0)} className="text-green-400 touch-manipulation">
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* התראות מהאדמין */}
        <AnimatePresence>
          {adminNotifications.map(n => {
            const style = PRIORITY_STYLE[n.priority]
            const Icon = style.icon
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="mb-3"
              >
                <div className={`${style.bg} border ${style.border} rounded-2xl px-4 py-3 flex items-start gap-3`}>
                  <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5`} size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-secondary text-sm">{n.title}</p>
                    <p className="text-secondary/70 text-xs mt-0.5">{n.message}</p>
                  </div>
                  <button
                    onClick={() => setDismissed(d => new Set([...d, n.id]))}
                    className="text-secondary/40 hover:text-secondary/70 active:scale-90 transition-all touch-manipulation flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        <div className="space-y-4">
          {/* כפתור הזמנה ראשי */}
          <button
            onClick={() => navigate('/orders')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-6">
              <div className="flex-shrink-0 bg-primary/10 p-4 rounded-2xl">
                <ShoppingCart className="text-primary" size={28} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-xl mb-1">הזמנה חדשה</h3>
                <p className="text-primary/60 text-sm font-bold">צור הזמנת רכש</p>
              </div>
            </div>
          </button>

          {/* מה להזמין היום */}
          {todaySuppliers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Calendar className="text-amber-500" size={18} />
                <h3 className="font-black text-amber-500 text-base">מה להזמין היום</h3>
              </div>
              <div className="space-y-2">
                {todaySuppliers.map(supplier => (
                  <button
                    key={supplier.id}
                    onClick={() => navigate(`/orders?supplier=${encodeURIComponent(supplier.name)}`)}
                    className="w-full bg-amber-900/30 border border-amber-600/40 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] touch-manipulation text-right"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex-shrink-0 bg-amber-600/20 p-2.5 rounded-xl">
                        <Truck className="text-amber-400" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-amber-200 text-base leading-tight">{supplier.name}</p>
                        {supplier.todaySchedule?.notificationTime && (
                          <p className="text-amber-500 text-xs font-bold mt-0.5">
                            שעת הזמנה: {supplier.todaySchedule.notificationTime}
                          </p>
                        )}
                        {user?.isAdmin && supplier.todaySchedule && (
                          <p className="text-amber-600 text-xs mt-0.5">
                            {supplier.todaySchedule.branchCodes.length} סניפים
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-amber-600/60">
                        <ChevronLeft size={18} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* תבניות שמורות */}
          {templates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Zap className="text-secondary" size={18} />
                <h3 className="font-black text-secondary text-base">הזמנה מהירה</h3>
              </div>
              <AnimatePresence>
                {templates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ delay: index * 0.05 }}
                    className="mb-2"
                  >
                    <button
                      onClick={() => handleLoadTemplate(template.id)}
                      className="w-full bg-secondary/80 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] touch-manipulation text-right"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="flex-shrink-0 bg-primary/10 p-2.5 rounded-xl">
                          <Package className="text-primary" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-primary text-base leading-tight">{template.name}</p>
                          <p className="text-primary/50 text-xs font-bold mt-0.5 truncate">
                            {getTemplateSuppliers(template.items)}
                          </p>
                          <p className="text-primary/40 text-xs mt-0.5">{template.items.length} פריטים</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => handleDeleteTemplate(e, template.id)}
                            className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-90 rounded-xl transition-all touch-manipulation"
                            aria-label="מחק תבנית"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="p-2 text-primary/30">
                            <ChevronLeft size={18} />
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* היסטוריה */}
          <button
            onClick={() => navigate('/history')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <History className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">היסטוריה</h3>
                <p className="text-primary/60 text-xs font-bold">הזמנות קודמות</p>
              </div>
            </div>
          </button>

          {/* תזכורות */}
          <button
            onClick={() => navigate('/reminders')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <Bell className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">תזכורות</h3>
                <p className="text-primary/60 text-xs font-bold">ניהול תזכורות</p>
              </div>
            </div>
          </button>

          {/* שליחה לספקים — לאדמין בלבד */}
          {user?.isAdmin && (
            <button
              onClick={() => navigate('/admin/dispatch')}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
            >
              <div className="flex items-center gap-4 p-5">
                <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                  <Send className="text-white" size={24} />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-black text-white text-lg mb-1">שליחה לספקים</h3>
                  <p className="text-white/80 text-xs font-bold">
                    {pendingCount > 0
                      ? `${pendingCount} הזמנות ממתינות לשליחה`
                      : 'אין הזמנות ממתינות כרגע'}
                  </p>
                </div>
                {pendingCount > 0 && (
                  <div className="bg-white text-green-700 font-black text-lg w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0">
                    {pendingCount}
                  </div>
                )}
              </div>
            </button>
          )}

          {/* פאנל אדמין */}
          {user?.isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
            >
              <div className="flex items-center gap-4 p-5">
                <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-black text-white text-lg mb-1">פאנל אדמין</h3>
                  <p className="text-white/80 text-xs font-bold">דוחות, מחירים, התראות</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {showVideo && (
        <VideoModal
          url={user?.isAdmin ? ADMIN_VIDEO_URL : BRANCH_VIDEO_URL}
          title={user?.isAdmin ? 'מדריך אדמין' : 'מדריך מנהל סניף'}
          onClose={() => setShowVideo(false)}
        />
      )}
    </div>
  )
}
