import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, Send, RefreshCw, CheckCircle2, XCircle,
  Clock, AlertTriangle, Settings, Mail, Users, Calendar,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAutomationStore, type AutomationConfig, type SupplierEmailConfig } from '../../stores/automationStore'
import { useSuppliersStore } from '../../stores/suppliersStore'

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
]

// 9 הסניפים — שמות מה-authStore
const BRANCH_NAMES = [
  'עין המפרץ', 'ביאליק קרן היסוד', 'מוצקין הילדים', 'צור שלום',
  'גושן 60', 'נהריה הגעתון', 'ההסתדרות', 'משכנות האומנים', 'רון קריית ביאליק'
]

function currentMonth(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return `${HEBREW_MONTHS[parseInt(m) - 1]} ${year}`
}

function StatusBadge({ status }: { status: 'sent' | 'responded' | 'failed' }) {
  if (status === 'responded') return (
    <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
      <CheckCircle2 size={13} /> ענה
    </span>
  )
  if (status === 'failed') return (
    <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
      <XCircle size={13} /> נכשל
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
      <Clock size={13} /> ממתין
    </span>
  )
}

export default function AutomationPage() {
  const navigate = useNavigate()
  const { fetchConfig, saveConfig, sendNow, checkResponses, config, log, loading, error } = useAutomationStore()
  const { getAllSuppliers } = useSuppliersStore()

  const [tab, setTab] = useState<'status' | 'settings'>('status')
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showLog, setShowLog] = useState(false)

  // הגדרות עריכה
  const [draftConfig, setDraftConfig] = useState<AutomationConfig | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    if (config && !draftConfig) {
      setDraftConfig(config)
    }
  }, [config])

  // בנה רשימת ספקים עם מיילים מה-store (מסנכרן עם הגדרות קיימות)
  const suppliersWithEmail = useMemo(() => {
    const allSuppliers = getAllSuppliers().filter(s => s.email)
    const existing = config?.suppliers ?? []

    return allSuppliers.map(s => {
      const found = existing.find(e => e.supplierId === s.id)
      return found ?? {
        supplierId: s.id,
        supplierName: s.name,
        email: s.email!,
        contactPerson: s.contactPerson ?? '',
        branchNames: BRANCH_NAMES,
        included: true,
      } satisfies SupplierEmailConfig
    })
  }, [getAllSuppliers, config])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // סטטיסטיקות חודש נוכחי
  const thisMonth = currentMonth()
  const thisMonthLog = log.filter(e => e.month === thisMonth)
  const sentCount = thisMonthLog.filter(e => e.type === 'initial').length
  const respondedCount = thisMonthLog.filter(e => e.status === 'responded').length
  const pendingCount = sentCount - respondedCount - thisMonthLog.filter(e => e.status === 'failed').length

  const handleSendNow = async (isFollowup = false) => {
    const suppliers = draftConfig?.suppliers ?? suppliersWithEmail
    const toSend = suppliers.filter(s => s.included && s.email)
    if (toSend.length === 0) {
      showToast('אין ספקים עם מייל לשליחה', false)
      return
    }
    if (!confirm(`שלח ${isFollowup ? 'תזכורות' : 'בקשות חשבוניות'} ל-${toSend.length} ספקים?`)) return

    setSending(true)
    try {
      const result = await sendNow(toSend, thisMonth, isFollowup)
      showToast(`נשלחו ${result.sent} מיילים${result.failed > 0 ? `, ${result.failed} נכשלו` : ''}`, result.sent > 0)
    } catch (err: any) {
      showToast(`שגיאה: ${err.message}`, false)
    } finally {
      setSending(false)
    }
  }

  const handleCheckResponses = async () => {
    setChecking(true)
    try {
      const gmailData = localStorage.getItem('meshausha-gmail')
      const accessToken = gmailData ? JSON.parse(gmailData)?.accessToken : undefined
      const result = await checkResponses(accessToken, thisMonth)
      showToast(
        result.updated > 0
          ? `${result.updated} ספקים סומנו כ"ענו"`
          : 'לא נמצאו תגובות חדשות',
        true
      )
    } catch (err: any) {
      showToast(`שגיאה: ${err.message}`, false)
    } finally {
      setChecking(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!draftConfig) return
    const merged: AutomationConfig = {
      ...draftConfig,
      suppliers: suppliersWithEmail,
    }
    await saveConfig(merged)
    showToast('הגדרות נשמרו', true)
  }


  return (
    <div className="min-h-screen bg-primary pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary px-4 pt-4 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary rounded-[2rem] p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">אוטומציית חשבוניות</h2>
                <p className="text-primary/50 text-xs font-bold mt-0.5">
                  {config?.enabled ? '✅ פעיל' : '⏸ כבוי'}
                </p>
              </div>
              <div className="w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`rounded-2xl px-4 py-3 text-sm font-bold text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="bg-red-900/40 border border-red-500/40 rounded-2xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
            <p className="text-red-300 text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-secondary/50 p-1 rounded-2xl">
          {(['status', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${tab === t ? 'bg-secondary shadow text-primary' : 'text-primary/40'}`}
            >
              {t === 'status' ? '📊 סטטוס' : '⚙️ הגדרות'}
            </button>
          ))}
        </div>

        {/* ===== TAB: STATUS ===== */}
        {tab === 'status' && (
          <div className="space-y-4">
            {/* KPI */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary rounded-2xl p-4 text-center shadow">
                <p className="text-2xl font-black text-primary">{sentCount}</p>
                <p className="text-primary/50 text-xs font-bold mt-1">נשלחו</p>
              </div>
              <div className="bg-green-900/40 rounded-2xl p-4 text-center shadow border border-green-600/30">
                <p className="text-2xl font-black text-green-400">{respondedCount}</p>
                <p className="text-green-400/70 text-xs font-bold mt-1">ענו</p>
              </div>
              <div className="bg-amber-900/30 rounded-2xl p-4 text-center shadow border border-amber-600/30">
                <p className="text-2xl font-black text-amber-400">{pendingCount}</p>
                <p className="text-amber-400/70 text-xs font-bold mt-1">ממתינים</p>
              </div>
            </div>

            {/* חודש */}
            <div className="bg-secondary/60 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Calendar className="text-primary/40" size={16} />
              <p className="text-primary/60 text-sm font-bold">
                חודש נוכחי לבקשות: <span className="text-primary">{formatMonth(thisMonth)}</span>
              </p>
            </div>

            {/* כפתורי פעולה */}
            <div className="space-y-2">
              <button
                onClick={() => handleSendNow(false)}
                disabled={sending || checking}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 flex items-center gap-3 shadow-lg disabled:opacity-50 active:scale-[0.98] touch-manipulation transition-all"
              >
                {sending ? <RefreshCw className="text-white animate-spin flex-shrink-0" size={20} /> : <Send className="text-white flex-shrink-0" size={20} />}
                <div className="flex-1 text-right">
                  <p className="font-black text-white text-base">
                    {sending ? 'שולח...' : '📧 שלח בקשות חשבוניות עכשיו'}
                  </p>
                  <p className="text-white/70 text-xs">שליחה ידנית לכל הספקים הפעילים</p>
                </div>
              </button>

              <button
                onClick={() => handleSendNow(true)}
                disabled={sending || checking || pendingCount === 0}
                className="w-full bg-secondary rounded-2xl p-4 flex items-center gap-3 shadow disabled:opacity-50 active:scale-[0.98] touch-manipulation transition-all"
              >
                <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
                <div className="flex-1 text-right">
                  <p className="font-black text-primary text-base">שלח תזכורות לממתינים</p>
                  <p className="text-primary/50 text-xs">{pendingCount} ספקים שלא ענו עדיין</p>
                </div>
              </button>

              <button
                onClick={handleCheckResponses}
                disabled={checking || sending}
                className="w-full bg-secondary rounded-2xl p-4 flex items-center gap-3 shadow disabled:opacity-50 active:scale-[0.98] touch-manipulation transition-all"
              >
                {checking ? <RefreshCw className="text-primary animate-spin flex-shrink-0" size={20} /> : <RefreshCw className="text-primary flex-shrink-0" size={20} />}
                <div className="flex-1 text-right">
                  <p className="font-black text-primary text-base">
                    {checking ? 'בודק Gmail...' : '🔍 בדוק מי ענה ב-Gmail'}
                  </p>
                  <p className="text-primary/50 text-xs">סורק תיבת דואר לחשבוניות שהתקבלו</p>
                </div>
              </button>
            </div>

            {/* לוג שליחות */}
            {log.length > 0 && (
              <div className="bg-secondary rounded-2xl shadow overflow-hidden">
                <button
                  onClick={() => setShowLog(v => !v)}
                  className="w-full flex items-center justify-between p-4 touch-manipulation"
                >
                  <span className="font-black text-primary text-base">היסטוריית שליחות ({log.length})</span>
                  {showLog ? <ChevronUp className="text-primary/40" size={18} /> : <ChevronDown className="text-primary/40" size={18} />}
                </button>
                <AnimatePresence>
                  {showLog && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-primary/10 max-h-80 overflow-y-auto">
                        {log.map(entry => (
                          <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-primary text-sm truncate">{entry.supplierName}</p>
                              <p className="text-primary/40 text-xs mt-0.5">
                                {formatMonth(entry.month)} ·{' '}
                                {entry.type === 'followup' ? '🔁 תזכורת' : '📧 ראשוני'} ·{' '}
                                {new Date(entry.sentAt).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                            <StatusBadge status={entry.status} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {log.length === 0 && !loading && (
              <div className="text-center py-10">
                <Mail className="mx-auto text-secondary/20 mb-3" size={48} />
                <p className="text-secondary/40 font-bold">טרם נשלחו בקשות</p>
                <p className="text-secondary/30 text-sm mt-1">לחץ "שלח בקשות" כדי להתחיל</p>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: SETTINGS ===== */}
        {tab === 'settings' && draftConfig && (
          <div className="space-y-4">
            {/* Enable toggle */}
            <div className="bg-secondary rounded-2xl p-5 shadow flex items-center justify-between">
              <div>
                <p className="font-black text-primary text-base">הפעל אוטומציה</p>
                <p className="text-primary/50 text-xs mt-0.5">שליחה אוטומטית בתאריך שנקבע</p>
              </div>
              <button
                onClick={() => setDraftConfig({ ...draftConfig, enabled: !draftConfig.enabled })}
                className="touch-manipulation"
              >
                {draftConfig.enabled
                  ? <ToggleRight className="text-green-500" size={36} />
                  : <ToggleLeft className="text-primary/30" size={36} />}
              </button>
            </div>

            {/* Send day */}
            <div className="bg-secondary rounded-2xl p-5 shadow">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="text-primary" size={18} />
                <p className="font-black text-primary text-base">יום שליחה בחודש</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={28}
                  value={draftConfig.sendDayOfMonth}
                  onChange={e => setDraftConfig({ ...draftConfig, sendDayOfMonth: parseInt(e.target.value) })}
                  className="flex-1 accent-amber-600"
                />
                <span className="font-black text-primary text-xl w-8 text-center">{draftConfig.sendDayOfMonth}</span>
              </div>
              <p className="text-primary/40 text-xs mt-2">
                בקשות יישלחו ב-{draftConfig.sendDayOfMonth} לכל חודש (חודש קודם)
              </p>
            </div>

            {/* Followup days */}
            <div className="bg-secondary rounded-2xl p-5 shadow">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="text-primary" size={18} />
                <p className="font-black text-primary text-base">ימי המתנה לתזכורת</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={draftConfig.followupAfterDays}
                  onChange={e => setDraftConfig({ ...draftConfig, followupAfterDays: parseInt(e.target.value) })}
                  className="flex-1 accent-amber-600"
                />
                <span className="font-black text-primary text-xl w-8 text-center">{draftConfig.followupAfterDays}</span>
              </div>
              <p className="text-primary/40 text-xs mt-2">
                תזכורת תישלח {draftConfig.followupAfterDays} ימים אחרי שלא קיבלנו תגובה
              </p>
            </div>

            {/* Suppliers list */}
            <div className="bg-secondary rounded-2xl shadow overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-primary/10">
                <Users className="text-primary" size={18} />
                <p className="font-black text-primary text-base">ספקים לשליחה</p>
              </div>
              {suppliersWithEmail.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-primary/40 text-sm font-bold">
                    אין ספקים עם כתובת מייל.
                    <br />הוסף מיילים ב"פרטי קשר ספקים"
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-primary/10">
                  {suppliersWithEmail.map(s => {
                    const inDraft = draftConfig.suppliers.find(d => d.supplierId === s.supplierId)
                    const included = inDraft?.included ?? s.included
                    return (
                      <div key={s.supplierId} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-primary text-sm truncate">{s.supplierName}</p>
                          <p className="text-primary/40 text-xs truncate">{s.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            const suppliers = draftConfig.suppliers.some(d => d.supplierId === s.supplierId)
                              ? draftConfig.suppliers.map(d => d.supplierId === s.supplierId ? { ...d, included: !d.included } : d)
                              : [...draftConfig.suppliers, { ...s, included: false }]
                            setDraftConfig({ ...draftConfig, suppliers })
                          }}
                          className="touch-manipulation"
                        >
                          {included
                            ? <ToggleRight className="text-green-500" size={28} />
                            : <ToggleLeft className="text-primary/30" size={28} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-4 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-[0.98] touch-manipulation transition-all"
            >
              {loading
                ? <RefreshCw className="text-white animate-spin" size={18} />
                : <Settings className="text-white" size={18} />}
              <span className="font-black text-white text-base">
                {loading ? 'שומר...' : 'שמור הגדרות'}
              </span>
            </button>

            <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl px-4 py-3">
              <p className="text-blue-300 text-xs font-bold leading-relaxed">
                <strong>הערה:</strong> כדי שהאוטומציה תעבוד, יש להתחבר ל-Gmail תחילה בדף "Gmail - משיכה אוטומטית".
                ה-token נשמר בשרת ומשמש לשליחה גם ללא פתיחת האפליקציה.
              </p>
            </div>
          </div>
        )}

        {loading && !draftConfig && (
          <div className="text-center py-16">
            <RefreshCw className="mx-auto animate-spin text-secondary/40 mb-3" size={32} />
            <p className="text-secondary/40 font-bold">טוען...</p>
          </div>
        )}
      </div>
    </div>
  )
}
