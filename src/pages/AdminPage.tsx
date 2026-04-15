import { useNavigate } from 'react-router-dom'
import { ChevronRight, DollarSign, FileText, BarChart3, Plus, Mail, Upload, TrendingUp, Bell, BellOff, BellRing, Zap, Eye, Calendar, CreditCard, PlayCircle, Send, Cloud } from 'lucide-react'
import { VideoModal, ADMIN_VIDEO_URL } from '../components/VideoModal'
import { useSuppliersStore } from '../stores/suppliersStore'
import { useState, useEffect } from 'react'
import { sendBulkInvoiceRequests } from '../lib/emailService'
import { saveSuppliersToCloud, getOrdersFromCloud } from '../lib/cloudApi'
import { useAdminOrders } from '../hooks/useAdminOrders'
import {
  isNotificationSupported,
  subscribeToPushNotifications,
  ensurePushSubscription,
  sendLocalNotification,
} from '../lib/notifications'

export default function AdminPage() {
  const navigate = useNavigate()
  const { getAllSuppliers } = useSuppliersStore()
  const allOrders = useAdminOrders()
  const totalOrders = allOrders.length
  const totalSuppliers = getAllSuppliers().length
  const [pendingCount, setPendingCount] = useState(0)

  // טוען ספירת הזמנות ממתינות מהענן (כולל הזמנות מכל הסניפים)
  useEffect(() => {
    getOrdersFromCloud().then(orders => {
      setPendingCount(orders.filter(o => o.status === 'pending').length)
    })
  }, [])
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, supplier: '' })
  const [showVideo, setShowVideo] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if (isNotificationSupported()) {
      setPushPermission(Notification.permission)
      // בדוק אם יש מנוי קיים
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => {
          setPushSubscribed(!!sub)
          if (sub) ensurePushSubscription() // שמור מחדש בשרת
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
      alert('במכשיר זה אין ספקים עם לוחות זמנים — לא ניתן לסנכרן. השתמש במחשב שבו הוגדרו הספקים.')
      return
    }
    const ok = confirm(`מכשיר זה יעלה ${suppliers.length} ספקים לענן ויחליף את כל הנתונים הקיימים שם.\nלהמשיך?`)
    if (!ok) return
    setSyncing(true)
    setSyncMsg('')
    try {
      await saveSuppliersToCloud({ suppliers, products })
      setSyncMsg(`✓ ${suppliers.length} ספקים ו-${products.length} מוצרים נשמרו בענן`)
      setTimeout(() => setSyncMsg(''), 4000)
    } catch (e: any) {
      setSyncMsg(`✗ שגיאה: ${e?.message || 'לא ידוע'}`)
      setTimeout(() => setSyncMsg(''), 8000)
    } finally {
      setSyncing(false)
    }
  }

  const handleSendInvoiceRequests = async () => {
    const suppliers = getAllSuppliers()
    const suppliersWithEmail = suppliers.filter(s => s.email)
    
    if (suppliersWithEmail.length === 0) {
      alert('אין ספקים עם כתובת מייל. נא להגדיר מיילים בדף "פרטי קשר ספקים"')
      return
    }

    const confirmed = confirm(`האם לשלוח בקשה לחשבוניות ל-${suppliersWithEmail.length} ספקים?`)
    if (!confirmed) return

    setSending(true)
    
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
    
    const emailData = suppliersWithEmail.map(s => ({
      name: s.name,
      email: s.email!,
      contactPerson: s.contactPerson || s.name,
      branches: ['תל אביב', 'חיפה', 'באר שבע']
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
    alert(`נשלחו ${result.success} בקשות בהצלחה, ${result.failed} נכשלו`)
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl mb-1">פאנל אדמין</h2>
              <p className="text-primary/60 text-xs font-bold">{totalOrders} הזמנות • {totalSuppliers} ספקים</p>
            </div>
            <div className="w-8" />
          </div>
        </header>

        <div className="space-y-3">
          {/* סנכרון ספקים לענן */}
          <button
            onClick={handleSyncToCloud}
            disabled={syncing}
            className="w-full bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden disabled:opacity-70"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <Cloud className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">סנכרן ספקים לענן</h3>
                <p className="text-white/80 text-xs font-bold">
                  {syncMsg || (syncing ? 'שומר...' : 'לחץ כדי שכל המכשירים יראו את הנתונים העדכניים')}
                </p>
              </div>
            </div>
          </button>

          {/* שליחה לספקים */}
          <button
            onClick={() => navigate('/admin/dispatch')}
            className="w-full bg-gradient-to-br from-green-600 to-green-800 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
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

          {/* התראות Push לאדמין */}
          {isNotificationSupported() && (
            <div className={`w-full rounded-3xl shadow-lg overflow-hidden ${
              pushPermission === 'granted' && pushSubscribed
                ? 'bg-gradient-to-br from-emerald-600 to-emerald-800'
                : pushPermission === 'denied'
                  ? 'bg-gradient-to-br from-gray-500 to-gray-700'
                  : 'bg-gradient-to-br from-amber-500 to-amber-700'
            }`}>
              <div className="flex items-center gap-4 p-5">
                <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                  {pushPermission === 'granted' && pushSubscribed
                    ? <Bell className="text-white" size={24} />
                    : pushPermission === 'denied'
                      ? <BellOff className="text-white" size={24} />
                      : <BellRing className="text-white" size={24} />
                  }
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-black text-white text-base mb-1">
                    {pushPermission === 'granted' && pushSubscribed
                      ? 'התראות Push פעילות'
                      : pushPermission === 'denied'
                        ? 'התראות חסומות בדפדפן'
                        : 'הפעל התראות Push'}
                  </h3>
                  <p className="text-white/80 text-xs font-bold">
                    {pushPermission === 'granted' && pushSubscribed
                      ? 'תקבל התראה על כל הזמנה חדשה'
                      : pushPermission === 'denied'
                        ? 'יש לאפשר בהגדרות הדפדפן'
                        : 'לקבל התראה כשמגיעה הזמנה חדשה'}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
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
            </div>
          )}

          {/* מדריך וידאו */}
          <button
            onClick={() => setShowVideo(true)}
            className="w-full bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <PlayCircle className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">מדריך וידאו לאדמין</h3>
                <p className="text-white/80 text-xs font-bold">סרטון הסבר על כל פיצ'רי המערכת</p>
              </div>
            </div>
          </button>

          {/* תזכורות ביומן גוגל */}
          <button
            onClick={() => navigate('/admin/calendar-reminders')}
            className="w-full bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <Bell className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">תזכורות Push לסניפים</h3>
                <p className="text-white/80 text-xs font-bold">Google Calendar • Push אמיתי לטלפון</p>
              </div>
            </div>
          </button>

          {/* מבט-על סניפים */}
          <button
            onClick={() => navigate('/admin/branch-overview')}
            className="w-full bg-gradient-to-br from-primary to-[#7a2f2f] rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <Eye className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">מבט-על סניפים</h3>
                <p className="text-white/80 text-xs font-bold">מי הזמין היום • הוצאות • זיכויים</p>
              </div>
            </div>
          </button>

          {/* לוח שבועי */}
          <button
            onClick={() => navigate('/admin/weekly-schedule')}
            className="w-full bg-gradient-to-br from-violet-600 to-violet-800 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <Calendar className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">לוח שבועי</h3>
                <p className="text-white/80 text-xs font-bold">מי מזמין מי בכל יום בשבוע</p>
              </div>
            </div>
          </button>

          {/* מעקב זיכויים */}
          <button
            onClick={() => navigate('/admin/credits')}
            className="w-full bg-gradient-to-br from-amber-500 to-amber-700 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <CreditCard className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">מעקב זיכויים</h3>
                <p className="text-white/80 text-xs font-bold">פריטים שלא סופקו • זיכויים פתוחים</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full bg-gradient-to-br from-accent to-[#7a6348] rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <BarChart3 className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">דשבורד אנליטי מתקדם</h3>
                <p className="text-white/80 text-xs font-bold">גרפים אינטראקטיביים וסטטיסטיקות</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/add-supplier')}
            className="w-full bg-gradient-to-br from-bot to-[#96a556] rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <Plus className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">הוספת ספק חדש</h3>
                <p className="text-white/80 text-xs font-bold">ספק + מוצרים + ימי הזמנה</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin/prices')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <DollarSign className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">ניהול מחירים</h3>
                <p className="text-primary/60 text-xs font-bold">עדכון מחירי מוצרים</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/reports')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <FileText className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">דוחות כלכליים</h3>
                <p className="text-primary/60 text-xs font-bold">דוחות לפי סניף וספק</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/notifications')}
            className="w-full bg-secondary rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-primary/10 p-3 rounded-2xl">
                <Bell className="text-primary" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-primary text-lg mb-1">התראות לסניפים</h3>
                <p className="text-primary/60 text-xs font-bold">שליחת הודעות לסניפים ספציפיים</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/automation')}
            className="w-full bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation overflow-hidden"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="flex-shrink-0 bg-white/20 p-3 rounded-2xl">
                <Zap className="text-white" size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="font-black text-white text-lg mb-1">אוטומציית חשבוניות</h3>
                <p className="text-white/80 text-xs font-bold">שליחה אוטומטית + תזכורות לספקים</p>
              </div>
            </div>
          </button>

          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-5 shadow-xl mt-6">
            <h3 className="font-black text-white text-lg mb-3">ניהול חשבוניות</h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/admin/gmail-settings')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <Mail className="text-white" size={20} />
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-white text-sm">🔥 Gmail - משיכה אוטומטית</h4>
                    <p className="text-white/90 text-xs">חיבור ל-Gmail למשיכת חשבוניות</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/admin/suppliers-contact')}
                className="w-full bg-white/20 hover:bg-white/30 rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <Mail className="text-white" size={20} />
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-white text-sm">פרטי קשר ספקים</h4>
                    <p className="text-white/70 text-xs">ניהול מיילים ואנשי קשר</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={handleSendInvoiceRequests}
                disabled={sending}
                className="w-full bg-white/20 hover:bg-white/30 rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Mail className="text-white" size={20} />
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-white text-sm">
                      {sending ? `שולח... (${progress.current}/${progress.total})` : '📧 בקש חשבוניות חודשיות'}
                    </h4>
                    <p className="text-white/70 text-xs">
                      {sending ? progress.supplier : 'שליחת בקשה אוטומטית לכל הספקים'}
                    </p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/admin/invoices')}
                className="w-full bg-white/20 hover:bg-white/30 rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <Upload className="text-white" size={20} />
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-white text-sm">העלאת חשבוניות</h4>
                    <p className="text-white/70 text-xs">ניהול חשבוניות שהתקבלו</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/invoice-analysis')}
                className="w-full bg-white/20 hover:bg-white/30 rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-white" size={20} />
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-white text-sm">ניתוח חשבוניות</h4>
                    <p className="text-white/70 text-xs">השוואת מחירים והפרשים</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/price-history')}
                className="w-full bg-white/20 hover:bg-white/30 rounded-2xl p-4 transition-all active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-white" size={20} />
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-white text-sm">מעקב מחירים לאורך זמן</h4>
                    <p className="text-white/70 text-xs">מגמות מחיר לפי מוצר</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
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
