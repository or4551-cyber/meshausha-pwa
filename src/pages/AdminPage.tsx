import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronDown, DollarSign, FileText, BarChart3, Plus, Mail,
  Upload, TrendingUp, Bell, BellOff, BellRing, Zap, Eye, Calendar, CreditCard,
  PlayCircle, Send, Cloud, Briefcase, Package, MessageCircle, Receipt, HelpCircle,
  Search, Trophy,
  type LucideIcon,
} from 'lucide-react'
import { VideoModal, ADMIN_VIDEO_URL } from '../components/VideoModal'
import { useSuppliersStore } from '../stores/suppliersStore'
import { useState, useEffect, type ReactNode } from 'react'
import { sendBulkInvoiceRequests } from '../lib/emailService'
import { saveSuppliersToCloud, getOrdersFromCloud } from '../lib/cloudApi'
import { useAdminOrders } from '../hooks/useAdminOrders'
import { BRANCH_NAMES } from '../data/branches'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '../lib/toast'
import { showConfirm } from '../lib/confirm'
import {
  isNotificationSupported,
  subscribeToPushNotifications,
  ensurePushSubscription,
  sendLocalNotification,
} from '../lib/notifications'

interface AdminSectionProps {
  id: string
  title: string
  description: string
  icon: LucideIcon
  expanded: boolean
  onToggle: (id: string) => void
  children: ReactNode
}

function AdminSection({ id, title, description, icon: Icon, expanded, onToggle, children }: AdminSectionProps) {
  return (
    <div className="bg-secondary/95 rounded-3xl shadow-lg overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-4 p-5 active:scale-[0.99] transition-transform touch-manipulation text-right"
        aria-expanded={expanded}
      >
        <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
          <Icon className="text-primary" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-primary text-base">{title}</h3>
          <p className="text-primary/55 text-xs font-bold mt-0.5">{description}</p>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="text-primary/50 flex-shrink-0" size={20} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-2 border-t-2 border-primary/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface AdminTileProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  onClick: () => void
  variant?: 'primary' | 'amber' | 'emerald' | 'indigo' | 'violet' | 'sky' | 'rose' | 'teal'
  badge?: number
  disabled?: boolean
}

function AdminTile({ icon: Icon, title, subtitle, onClick, variant = 'primary', badge, disabled }: AdminTileProps) {
  const variants: Record<NonNullable<AdminTileProps['variant']>, string> = {
    primary: 'bg-primary/5 text-primary',
    amber: 'bg-amber-500/15 text-amber-700',
    emerald: 'bg-emerald-600/15 text-emerald-700',
    indigo: 'bg-indigo-600/15 text-indigo-700',
    violet: 'bg-violet-600/15 text-violet-700',
    sky: 'bg-sky-500/15 text-sky-700',
    rose: 'bg-rose-500/15 text-rose-700',
    teal: 'bg-teal-600/15 text-teal-700',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full ${variants[variant]} rounded-2xl active:scale-[0.98] transition-transform touch-manipulation text-right disabled:opacity-50`}
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex-shrink-0 bg-white/40 p-2 rounded-xl">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-tight">{title}</p>
          {subtitle && <p className="opacity-70 text-xs font-bold mt-0.5 truncate">{subtitle}</p>}
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="bg-current text-white font-black text-xs min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
        <ChevronRight className="opacity-40 flex-shrink-0 rotate-180" size={16} />
      </div>
    </button>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { getAllSuppliers } = useSuppliersStore()
  const allOrders = useAdminOrders()
  const totalOrders = allOrders.length
  const totalSuppliers = getAllSuppliers().length
  const [pendingCount, setPendingCount] = useState(0)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, supplier: '' })
  const [showVideo, setShowVideo] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  // ברירת מחדל — "פעולות יומיות" פתוח
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['daily']))

  const toggleSection = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    getOrdersFromCloud().then(orders => {
      setPendingCount(orders.filter(o => o.status === 'pending').length)
    })
  }, [])

  useEffect(() => {
    if (isNotificationSupported()) {
      setPushPermission(Notification.permission)
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => {
          setPushSubscribed(!!sub)
          if (sub) ensurePushSubscription()
        })
      ).catch(() => {})
    }
  }, [])

  const handleSubscribePush = async () => {
    setPushLoading(true)
    const sub = await subscribeToPushNotifications()
    if (sub) {
      setPushPermission('granted')
      setPushSubscribed(true)
      await sendLocalNotification({
        title: 'התראות פעילות!',
        body: 'תקבל התראה על כל הזמנה חדשה מהסניפים',
      })
    } else {
      setPushPermission(Notification.permission as NotificationPermission)
    }
    setPushLoading(false)
  }

  const handleTestPush = async () => {
    await sendLocalNotification({
      title: '🛒 בדיקת התראה',
      body: 'אם אתה רואה את זה — ההתראות עובדות!',
      data: { url: '/admin/dispatch' },
    })
  }

  const handleSyncToCloud = async () => {
    const { suppliers, products } = useSuppliersStore.getState()
    const suppliersWithSchedules = suppliers.filter(s => s.schedules && s.schedules.length > 0)
    if (suppliersWithSchedules.length === 0) {
      toast.warning('אין ספקים עם לוחות זמנים', 'השתמש במחשב שבו הוגדרו הספקים.')
      return
    }
    const ok = await showConfirm({
      title: 'סנכרון ספקים לענן',
      description: `${suppliers.length} ספקים יועלו לענן ויחליפו את כל הנתונים הקיימים שם.\nלהמשיך?`,
      confirmLabel: 'סנכרן',
      destructive: true,
    })
    if (!ok) return
    setSyncing(true)
    try {
      await saveSuppliersToCloud({ suppliers, products })
      toast.success('הסנכרון הסתיים', `${suppliers.length} ספקים ו-${products.length} מוצרים נשמרו בענן`)
    } catch (e: any) {
      toast.error('הסנכרון נכשל', e?.message || 'שגיאה לא ידועה')
    } finally {
      setSyncing(false)
    }
  }

  const handleSendInvoiceRequests = async () => {
    const suppliers = getAllSuppliers()
    const suppliersWithEmail = suppliers.filter(s => s.email)
    if (suppliersWithEmail.length === 0) {
      toast.warning('אין ספקים עם מייל', 'נא להגדיר מיילים בדף "פרטי קשר ספקים"')
      return
    }
    const confirmed = await showConfirm({
      title: 'שליחת בקשת חשבוניות',
      description: `תישלח בקשה לחשבוניות ל-${suppliersWithEmail.length} ספקים`,
      confirmLabel: 'שלח',
    })
    if (!confirmed) return
    setSending(true)
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
    const emailData = suppliersWithEmail.map(s => ({
      name: s.name,
      email: s.email!,
      contactPerson: s.contactPerson || s.name,
      branches: BRANCH_NAMES,
    }))
    const result = await sendBulkInvoiceRequests(
      emailData,
      month,
      lastMonth.getFullYear(),
      (current, total, supplierName) => {
        setProgress({ current, total, supplier: supplierName })
      }
    )
    setSending(false)
    if (result.failed === 0) {
      toast.success(`נשלחו ${result.success} בקשות`, 'כל הבקשות נשלחו בהצלחה')
    } else if (result.success === 0) {
      toast.error('שליחת המיילים נכשלה', `${result.failed} מיילים לא נשלחו — בדוק הגדרות EmailJS`)
    } else {
      toast.warning(`${result.success} נשלחו, ${result.failed} נכשלו`, 'בדוק את התוצאות')
    }
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="bg-secondary rounded-3xl p-5 mb-4 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl mb-1">פאנל אדמין</h2>
              <p className="text-primary/60 text-xs font-bold">{totalOrders} הזמנות · {totalSuppliers} ספקים</p>
            </div>
            <div className="w-8" />
          </div>
        </header>

        {/* כפתור-על: שליחה לספקים — תמיד גלוי כי הוא הקריטי ביומי */}
        <button
          onClick={() => navigate('/admin/dispatch')}
          className="w-full bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl shadow-lg active:scale-[0.98] transition-transform touch-manipulation overflow-hidden mb-4"
        >
          <div className="flex items-center gap-4 p-5">
            <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
              <Send className="text-white" size={26} />
            </div>
            <div className="flex-1 text-right">
              <h3 className="font-black text-white text-lg mb-1">שליחה לספקים</h3>
              <p className="text-white/85 text-sm font-bold">
                {pendingCount > 0
                  ? `${pendingCount} הזמנות ממתינות לשליחה`
                  : 'אין הזמנות ממתינות'}
              </p>
            </div>
            {pendingCount > 0 && (
              <div className="bg-white text-emerald-700 font-black text-lg w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                {pendingCount}
              </div>
            )}
          </div>
        </button>

        <div className="space-y-3">
          {/* קטגוריה 1: פעולות יומיות */}
          <AdminSection
            id="daily"
            title="פעולות יומיות"
            description="מבט-על, דירוג סניפים, חיפוש"
            icon={Briefcase}
            expanded={expanded.has('daily')}
            onToggle={toggleSection}
          >
            <AdminTile
              icon={Trophy}
              title="דשבורד הנהלה"
              subtitle="מבט תפעולי על הרשת · דירוג סניפים · ספקים מובילים"
              onClick={() => navigate('/admin/executive')}
              variant="rose"
            />
            <AdminTile
              icon={Search}
              title="חיפוש בהזמנות"
              subtitle="מצא הזמנה / מוצר בכל הסניפים"
              onClick={() => navigate('/admin/search')}
              variant="emerald"
            />
            <AdminTile
              icon={Eye}
              title="מבט-על סניפים"
              subtitle="מי הזמין היום · הוצאות · זיכויים"
              onClick={() => navigate('/admin/branch-overview')}
              variant="primary"
            />
            <AdminTile
              icon={Calendar}
              title="לוח שבועי"
              subtitle="מי מזמין מי בכל יום בשבוע"
              onClick={() => navigate('/admin/weekly-schedule')}
              variant="violet"
            />
            <AdminTile
              icon={Calendar}
              title="לוח שנה — הזמנות"
              subtitle="פירוט לפי יום + סיכום חודשי"
              onClick={() => navigate('/calendar')}
              variant="sky"
            />
            <AdminTile
              icon={BarChart3}
              title="דשבורד אנליטי מתקדם"
              subtitle="גרפים אינטראקטיביים וסטטיסטיקות"
              onClick={() => navigate('/admin/dashboard')}
              variant="amber"
            />
          </AdminSection>

          {/* קטגוריה 2: ספקים ומחירים */}
          <AdminSection
            id="suppliers"
            title="ספקים ומחירים"
            description="הוספה, עדכון, סנכרון לענן"
            icon={Package}
            expanded={expanded.has('suppliers')}
            onToggle={toggleSection}
          >
            <AdminTile
              icon={Plus}
              title="הוספת ספק חדש"
              subtitle="ספק + מוצרים + ימי הזמנה"
              onClick={() => navigate('/admin/add-supplier')}
              variant="emerald"
            />
            <AdminTile
              icon={DollarSign}
              title="ניהול מחירים"
              subtitle="עדכון מחירי מוצרים"
              onClick={() => navigate('/admin/prices')}
              variant="primary"
            />
            <AdminTile
              icon={TrendingUp}
              title="מעקב מחירים לאורך זמן"
              subtitle="מגמות מחיר לפי מוצר"
              onClick={() => navigate('/admin/price-history')}
              variant="primary"
            />
            <AdminTile
              icon={Mail}
              title="פרטי קשר ספקים"
              subtitle="מיילים, אנשי קשר, טלפונים"
              onClick={() => navigate('/admin/suppliers-contact')}
              variant="primary"
            />
            <AdminTile
              icon={Cloud}
              title={syncing ? 'מסנכרן...' : 'סנכרון ספקים לענן'}
              subtitle="גורם לכל המכשירים לראות את הנתונים העדכניים"
              onClick={handleSyncToCloud}
              variant="indigo"
              disabled={syncing}
            />
          </AdminSection>

          {/* קטגוריה 3: התראות ותזכורות */}
          <AdminSection
            id="notifications"
            title="התראות ותזכורות"
            description="Push, תזכורות לסניפים, הודעות"
            icon={Bell}
            expanded={expanded.has('notifications')}
            onToggle={toggleSection}
          >
            {/* Push notifications card */}
            {isNotificationSupported() && (
              <div className={`w-full rounded-2xl shadow-md overflow-hidden ${
                pushPermission === 'granted' && pushSubscribed
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700'
                  : pushPermission === 'denied'
                    ? 'bg-gradient-to-br from-gray-500 to-gray-700'
                    : 'bg-gradient-to-br from-amber-500 to-amber-600'
              }`}>
                <div className="flex items-center gap-3 p-3.5">
                  <div className="flex-shrink-0 bg-white/20 p-2 rounded-xl">
                    {pushPermission === 'granted' && pushSubscribed
                      ? <Bell className="text-white" size={18} />
                      : pushPermission === 'denied'
                        ? <BellOff className="text-white" size={18} />
                        : <BellRing className="text-white" size={18} />}
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    <h3 className="font-black text-white text-sm">
                      {pushPermission === 'granted' && pushSubscribed
                        ? 'התראות Push פעילות'
                        : pushPermission === 'denied'
                          ? 'התראות חסומות'
                          : 'הפעל התראות Push'}
                    </h3>
                    <p className="text-white/80 text-xs font-bold">
                      {pushPermission === 'granted' && pushSubscribed
                        ? 'תקבל התראה על כל הזמנה חדשה'
                        : pushPermission === 'denied'
                          ? 'יש לאפשר בהגדרות הדפדפן'
                          : 'התראה על כל הזמנה חדשה'}
                    </p>
                  </div>
                  {pushPermission === 'granted' && pushSubscribed ? (
                    <button
                      onClick={handleTestPush}
                      className="bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl active:scale-95 touch-manipulation whitespace-nowrap"
                    >
                      בדיקה
                    </button>
                  ) : pushPermission !== 'denied' && (
                    <button
                      onClick={handleSubscribePush}
                      disabled={pushLoading}
                      className="bg-white text-amber-700 font-bold text-xs px-3 py-2 rounded-xl active:scale-95 touch-manipulation disabled:opacity-60 whitespace-nowrap"
                    >
                      {pushLoading ? '...' : 'הפעל'}
                    </button>
                  )}
                </div>
              </div>
            )}
            <AdminTile
              icon={Bell}
              title="תזכורות Push לסניפים"
              subtitle="Google Calendar · Push אמיתי לטלפון"
              onClick={() => navigate('/admin/calendar-reminders')}
              variant="sky"
            />
            <AdminTile
              icon={MessageCircle}
              title="התראות לסניפים"
              subtitle="שליחת הודעות לסניפים ספציפיים"
              onClick={() => navigate('/admin/notifications')}
              variant="primary"
            />
          </AdminSection>

          {/* קטגוריה 4: חשבוניות וכספים */}
          <AdminSection
            id="finance"
            title="חשבוניות וכספים"
            description="דוחות, אוטומציה, זיכויים, חשבוניות"
            icon={Receipt}
            expanded={expanded.has('finance')}
            onToggle={toggleSection}
          >
            <AdminTile
              icon={FileText}
              title="דוחות כלכליים"
              subtitle="דוחות לפי סניף וספק"
              onClick={() => navigate('/admin/reports')}
              variant="primary"
            />
            <AdminTile
              icon={CreditCard}
              title="מעקב זיכויים"
              subtitle="פריטים שלא סופקו · זיכויים פתוחים"
              onClick={() => navigate('/admin/credits')}
              variant="amber"
            />
            <AdminTile
              icon={Zap}
              title="אוטומציית חשבוניות"
              subtitle="שליחה אוטומטית + תזכורות לספקים"
              onClick={() => navigate('/admin/automation')}
              variant="indigo"
            />
            <AdminTile
              icon={Mail}
              title={sending ? `שולח... (${progress.current}/${progress.total})` : 'בקש חשבוניות חודשיות'}
              subtitle={sending ? progress.supplier : 'שליחת בקשה אוטומטית לכל הספקים'}
              onClick={handleSendInvoiceRequests}
              variant="violet"
              disabled={sending}
            />
            <AdminTile
              icon={Mail}
              title="Gmail — משיכה אוטומטית"
              subtitle="חיבור ל-Gmail למשיכת חשבוניות"
              onClick={() => navigate('/admin/gmail-settings')}
              variant="sky"
            />
            <AdminTile
              icon={Upload}
              title="העלאת חשבוניות"
              subtitle="ניהול חשבוניות שהתקבלו"
              onClick={() => navigate('/admin/invoices')}
              variant="primary"
            />
            <AdminTile
              icon={TrendingUp}
              title="ניתוח חשבוניות"
              subtitle="השוואת מחירים והפרשים"
              onClick={() => navigate('/admin/invoice-analysis')}
              variant="primary"
            />
          </AdminSection>

          {/* קטגוריה 5: עזרה */}
          <AdminSection
            id="help"
            title="עזרה"
            description="מדריכים והדרכה"
            icon={HelpCircle}
            expanded={expanded.has('help')}
            onToggle={toggleSection}
          >
            <AdminTile
              icon={PlayCircle}
              title="מדריך וידאו לאדמין"
              subtitle="סרטון הסבר על כל פיצ'רי המערכת"
              onClick={() => setShowVideo(true)}
              variant="teal"
            />
          </AdminSection>
        </div>
      </div>

      {showVideo && (
        <VideoModal
          url={ADMIN_VIDEO_URL}
          title="מדריך אדמין"
          onClose={() => setShowVideo(false)}
        />
      )}
    </div>
  )
}
