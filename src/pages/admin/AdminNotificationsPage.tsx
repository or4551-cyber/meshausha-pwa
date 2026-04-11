import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Trash2, Bell, AlertTriangle, Info, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminNotificationsStore } from '../../stores/adminNotificationsStore'
import type { NotificationPriority } from '../../stores/adminNotificationsStore'

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

const PRIORITY_CONFIG: Record<NotificationPriority, { label: string; color: string; icon: typeof Bell }> = {
  info:    { label: 'מידע',   color: 'bg-blue-500',   icon: Info },
  warning: { label: 'אזהרה', color: 'bg-amber-500',  icon: AlertTriangle },
  urgent:  { label: 'דחוף',  color: 'bg-red-500',    icon: Bell },
}

export default function AdminNotificationsPage() {
  const navigate = useNavigate()
  const { notifications, addNotification, deleteNotification } = useAdminNotificationsStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'info' as NotificationPriority,
    targetAll: true,
    selectedBranches: [] as string[],
    expiresAt: '',
  })

  const handleSubmit = () => {
    if (!form.title.trim() || !form.message.trim()) return
    addNotification({
      title: form.title.trim(),
      message: form.message.trim(),
      priority: form.priority,
      targetBranchCodes: form.targetAll ? ['all'] : form.selectedBranches,
      expiresAt: form.expiresAt || undefined,
    })
    setForm({ title: '', message: '', priority: 'info', targetAll: true, selectedBranches: [], expiresAt: '' })
    setShowForm(false)
  }

  const toggleBranch = (code: string) => {
    setForm(f => ({
      ...f,
      selectedBranches: f.selectedBranches.includes(code)
        ? f.selectedBranches.filter(c => c !== code)
        : [...f.selectedBranches, code],
    }))
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 mb-3 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">התראות לסניפים</h2>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="text-primary hover:text-primary/70 active:text-primary/50 p-1 touch-manipulation"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-3">
        {notifications.length === 0 && !showForm && (
          <div className="text-center py-16">
            <Bell className="mx-auto text-secondary/30 mb-4" size={56} />
            <p className="text-secondary/60 font-bold text-lg mb-4">אין התראות פעילות</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-secondary text-primary font-bold py-3 px-6 rounded-xl active:scale-95 transition-transform touch-manipulation"
            >
              צור התראה ראשונה
            </button>
          </div>
        )}

        {notifications.map((n) => {
          const cfg = PRIORITY_CONFIG[n.priority]
          const Icon = cfg.icon
          const isExpired = n.expiresAt ? new Date(n.expiresAt) < new Date() : false
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-secondary rounded-2xl p-4 shadow-md ${isExpired ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${cfg.color} p-2 rounded-xl`}>
                  <Icon className="text-white" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-primary text-base leading-tight">{n.title}</h3>
                    <button
                      onClick={() => deleteNotification(n.id)}
                      className="text-red-400 hover:text-red-500 active:scale-90 transition-all p-1 touch-manipulation flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-primary/70 text-sm mt-1">{n.message}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs font-bold text-white ${cfg.color} px-2 py-0.5 rounded-full`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-primary/50 font-bold">
                      {n.targetBranchCodes.includes('all') ? 'כל הסניפים' : `${n.targetBranchCodes.length} סניפים`}
                    </span>
                    {n.expiresAt && (
                      <span className={`text-xs font-bold ${isExpired ? 'text-red-400' : 'text-primary/50'}`}>
                        {isExpired ? 'פג תוקף' : `עד ${new Date(n.expiresAt).toLocaleDateString('he-IL')}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Bottom sheet - טופס יצירת התראה */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-secondary rounded-t-3xl max-h-[90vh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="flex items-center justify-between p-5 border-b border-primary/10 flex-shrink-0">
                <h3 className="font-black text-primary text-xl">התראה חדשה</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-primary/40 active:text-primary transition-colors touch-manipulation"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* כותרת */}
                <div>
                  <label className="block text-primary font-bold text-sm mb-2">כותרת *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="לדוגמה: שינוי שעות הזמנה"
                    className="w-full bg-primary/5 text-primary placeholder:text-primary/30 rounded-xl py-3 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                </div>

                {/* הודעה */}
                <div>
                  <label className="block text-primary font-bold text-sm mb-2">הודעה *</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="תוכן ההתראה..."
                    rows={3}
                    className="w-full bg-primary/5 text-primary placeholder:text-primary/30 rounded-xl py-3 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                {/* עדיפות */}
                <div>
                  <label className="block text-primary font-bold text-sm mb-2">עדיפות</label>
                  <div className="flex gap-2">
                    {(Object.entries(PRIORITY_CONFIG) as [NotificationPriority, typeof PRIORITY_CONFIG[NotificationPriority]][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setForm(f => ({ ...f, priority: key }))}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all touch-manipulation ${
                          form.priority === key
                            ? `${cfg.color} text-white`
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* יעד */}
                <div>
                  <label className="block text-primary font-bold text-sm mb-2">יעד</label>
                  <button
                    onClick={() => setForm(f => ({ ...f, targetAll: !f.targetAll, selectedBranches: [] }))}
                    className={`w-full py-3 rounded-xl font-bold text-sm mb-2 transition-all touch-manipulation ${
                      form.targetAll ? 'bg-primary text-secondary' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    כל הסניפים
                  </button>
                  {!form.targetAll && (
                    <div className="grid grid-cols-2 gap-2">
                      {BRANCHES.map(b => (
                        <button
                          key={b.code}
                          onClick={() => toggleBranch(b.code)}
                          className={`py-2 px-3 rounded-xl font-bold text-xs transition-all touch-manipulation text-right ${
                            form.selectedBranches.includes(b.code)
                              ? 'bg-primary text-secondary'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* תאריך תפוגה */}
                <div>
                  <label className="block text-primary font-bold text-sm mb-2">
                    תאריך תפוגה <span className="text-primary/40 font-normal">(אופציונלי)</span>
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full bg-primary/5 text-primary rounded-xl py-3 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!form.title.trim() || !form.message.trim() || (!form.targetAll && form.selectedBranches.length === 0)}
                  className="w-full bg-primary text-secondary font-black py-4 rounded-2xl active:scale-[0.98] transition-transform touch-manipulation disabled:opacity-40"
                >
                  שלח התראה
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
