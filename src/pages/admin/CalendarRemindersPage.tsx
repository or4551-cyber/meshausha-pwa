import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Calendar, Plus, Trash2, Share2, RefreshCw, Bell, X, AlertCircle } from 'lucide-react'

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

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const REC_LABELS: Record<string, string> = {
  once: 'חד פעמי', daily: 'יומי', weekly: 'שבועי', monthly: 'חודשי'
}

type BranchData = {
  calendar: { calendarId: string; shareLink: string; branchName: string } | null
  reminders: Array<{
    eventId: string; title: string; description: string
    recurrence: string; dayOfWeek?: number; dayOfMonth?: number
    time: string; date?: string
  }>
}

const API = '/.netlify/functions/calendar-manager'

export default function CalendarRemindersPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, BranchData>>({})
  const [loading, setLoading] = useState(true)
  const [notConnected, setNotConnected] = useState(false)
  const [activeBranch, setActiveBranch] = useState<string | null>(null)
  const [working, setWorking] = useState<string | null>(null) // branchCode during operation
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    recurrence: 'weekly',
    dayOfWeek: 0,
    dayOfMonth: 1,
    time: '08:00',
    date: '',
  })

  const loadAll = async () => {
    setLoading(true)
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-all' })
      })
      if (res.status === 401) { setNotConnected(true); return }
      const json = await res.json()
      setData(json)
    } catch {
      setNotConnected(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const createCalendar = async (branchCode: string, branchName: string) => {
    setWorking(branchCode)
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-calendar', branchCode, branchName })
    })
    const json = await res.json()
    if (json.shareLink) {
      setData(prev => ({
        ...prev,
        [branchCode]: {
          calendar: { calendarId: json.calendarId, shareLink: json.shareLink, branchName },
          reminders: []
        }
      }))
    }
    setWorking(null)
  }

  const addReminder = async (branchCode: string) => {
    if (!form.title.trim()) return
    setWorking(branchCode)
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-reminder',
        branchCode,
        reminder: {
          title: form.title.trim(),
          description: form.description.trim(),
          recurrence: form.recurrence,
          dayOfWeek: form.dayOfWeek,
          dayOfMonth: form.dayOfMonth,
          time: form.time,
          date: form.date,
        }
      })
    })
    const json = await res.json()
    if (json.eventId) {
      setData(prev => ({
        ...prev,
        [branchCode]: {
          ...prev[branchCode],
          reminders: [...(prev[branchCode]?.reminders ?? []), {
            eventId: json.eventId,
            title: form.title.trim(),
            description: form.description.trim(),
            recurrence: form.recurrence,
            dayOfWeek: form.dayOfWeek,
            dayOfMonth: form.dayOfMonth,
            time: form.time,
            date: form.date,
          }]
        }
      }))
      setShowForm(false)
      setForm({ title: '', description: '', recurrence: 'weekly', dayOfWeek: 0, dayOfMonth: 1, time: '08:00', date: '' })
    }
    setWorking(null)
  }

  const deleteReminder = async (branchCode: string, eventId: string) => {
    setWorking(eventId)
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-reminder', branchCode, reminder: { eventId } })
    })
    setData(prev => ({
      ...prev,
      [branchCode]: {
        ...prev[branchCode],
        reminders: prev[branchCode].reminders.filter(r => r.eventId !== eventId)
      }
    }))
    setWorking(null)
  }

  const shareViaWhatsApp = (branchName: string, link: string) => {
    const text = `שלום, זהו יומן ההזמנות של סניף ${branchName}.\nלחץ על הקישור כדי להוסיף לגוגל קלנדר שלך ולקבל תזכורות:\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const formatReminder = (r: BranchData['reminders'][0]) => {
    const time = r.time
    if (r.recurrence === 'daily')   return `כל יום בשעה ${time}`
    if (r.recurrence === 'weekly')  return `כל ${DAY_NAMES[r.dayOfWeek ?? 0]} בשעה ${time}`
    if (r.recurrence === 'monthly') return `כל חודש בתאריך ${r.dayOfMonth} בשעה ${time}`
    if (r.recurrence === 'once')    return `${r.date} בשעה ${time}`
    return time
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto text-secondary/50 mb-3" size={32} />
          <p className="text-secondary/60 font-bold">טוען נתוני יומן...</p>
        </div>
      </div>
    )
  }

  if (notConnected) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl mb-4 flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="text-primary p-1 touch-manipulation">
              <ChevronRight size={24} />
            </button>
            <h2 className="flex-1 text-center font-black text-primary text-xl">תזכורות ביומן גוגל</h2>
            <div className="w-8" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
            <p className="font-black text-amber-800 text-lg mb-2">נדרש חיבור מחדש ל-Google</p>
            <p className="text-amber-700 text-sm mb-4">
              הוספנו הרשאות יומן לאפליקציה. יש להתחבר שוב ל-Gmail כדי לאשר את ההרשאה החדשה.
            </p>
            <button
              onClick={() => navigate('/admin/gmail-settings')}
              className="bg-amber-500 text-white font-black py-3 px-6 rounded-xl active:scale-95 touch-manipulation"
            >
              התחבר שוב ל-Google
            </button>
          </div>
        </div>
      </div>
    )
  }

  const active = activeBranch ? BRANCHES.find(b => b.code === activeBranch) : null
  const activeData = activeBranch ? data[activeBranch] : null

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => activeBranch ? setActiveBranch(null) : navigate('/admin')}
                className="text-primary p-1 touch-manipulation"
              >
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">
                  {active ? active.name : 'תזכורות ביומן גוגל'}
                </h2>
                <p className="text-primary/60 text-xs mt-0.5">
                  {active ? 'ניהול תזכורות' : 'Push אוטומטי לכל סניף'}
                </p>
              </div>
              <div className="w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">

        {/* תצוגת כל הסניפים */}
        {!activeBranch && (
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4 text-white text-sm">
              <p className="font-black mb-1">איך זה עובד?</p>
              <ol className="space-y-1 text-white/85 text-xs list-decimal list-inside">
                <li>צור יומן גוגל לכל סניף (פעם אחת)</li>
                <li>שלח את הקישור למנהל הסניף ב-WhatsApp</li>
                <li>המנהל מוסיף לטלפון שלו — סיום</li>
                <li>כל תזכורת שתגדיר תגיע אוטומטית לטלפון שלו</li>
              </ol>
            </div>

            {BRANCHES.map(branch => {
              const bd = data[branch.code]
              const hasCalendar = !!bd?.calendar
              const remCount = bd?.reminders?.length ?? 0
              return (
                <div key={branch.code} className="bg-secondary rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-primary text-sm">{branch.name}</p>
                      <p className="text-primary/50 text-xs mt-0.5">
                        {hasCalendar
                          ? remCount > 0 ? `${remCount} תזכורות פעילות` : 'יומן מוכן — אין תזכורות'
                          : 'יומן לא נוצר'
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {hasCalendar ? (
                        <>
                          <button
                            onClick={() => shareViaWhatsApp(branch.name, bd.calendar!.shareLink)}
                            className="p-2 bg-green-100 text-green-700 rounded-xl active:scale-90 touch-manipulation"
                            title="שלח קישור ב-WhatsApp"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => setActiveBranch(branch.code)}
                            className="px-3 py-2 bg-primary text-secondary font-bold text-xs rounded-xl active:scale-95 touch-manipulation flex items-center gap-1"
                          >
                            <Bell size={13} />
                            תזכורות
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => createCalendar(branch.code, branch.name)}
                          disabled={working === branch.code}
                          className="px-3 py-2 bg-blue-500 text-white font-bold text-xs rounded-xl active:scale-95 touch-manipulation flex items-center gap-1 disabled:opacity-50"
                        >
                          {working === branch.code
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <Calendar size={13} />
                          }
                          צור יומן
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* תצוגת סניף בודד */}
        {activeBranch && active && activeData && (
          <div className="space-y-3">
            {/* קישור יומן */}
            {activeData.calendar && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="font-black text-green-800 text-sm mb-2">קישור להצטרפות ליומן</p>
                <p className="text-green-700 text-xs mb-3 break-all">{activeData.calendar.shareLink}</p>
                <button
                  onClick={() => shareViaWhatsApp(active.name, activeData.calendar!.shareLink)}
                  className="w-full bg-green-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 touch-manipulation text-sm"
                >
                  <Share2 size={15} />
                  שלח למנהל הסניף ב-WhatsApp
                </button>
              </div>
            )}

            {/* רשימת תזכורות */}
            {activeData.reminders.length > 0 && (
              <div className="bg-secondary rounded-2xl p-4 shadow-sm">
                <p className="font-black text-primary text-sm mb-3">תזכורות פעילות</p>
                <div className="space-y-2">
                  {activeData.reminders.map(r => (
                    <div key={r.eventId} className="flex items-center justify-between bg-primary/5 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-primary text-sm truncate">{r.title}</p>
                        <p className="text-primary/50 text-xs">{formatReminder(r)}</p>
                      </div>
                      <button
                        onClick={() => deleteReminder(activeBranch, r.eventId)}
                        disabled={working === r.eventId}
                        className="p-1.5 text-red-400 hover:text-red-600 active:scale-90 touch-manipulation mr-2 disabled:opacity-40"
                      >
                        {working === r.eventId
                          ? <RefreshCw size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeData.reminders.length === 0 && !showForm && (
              <div className="text-center py-8">
                <Bell className="mx-auto text-secondary/30 mb-3" size={40} />
                <p className="text-secondary/50 font-bold">אין תזכורות עדיין</p>
              </div>
            )}

            {/* טופס הוספת תזכורת */}
            {showForm && (
              <div className="bg-secondary rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-black text-primary text-sm">תזכורת חדשה</p>
                  <button onClick={() => setShowForm(false)} className="text-primary/40 p-1 touch-manipulation">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="כותרת — לדוגמה: הזמן מטרה פלסט"
                    autoFocus
                    className="w-full bg-primary/5 text-primary placeholder:text-primary/30 rounded-xl py-2.5 px-4 font-bold text-sm focus:outline-none"
                  />

                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="פירוט (אופציונלי)"
                    className="w-full bg-primary/5 text-primary placeholder:text-primary/30 rounded-xl py-2.5 px-4 font-bold text-sm focus:outline-none"
                  />

                  {/* חזרה */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['once', 'daily', 'weekly', 'monthly'] as const).map(rec => (
                      <button
                        key={rec}
                        onClick={() => setForm(f => ({ ...f, recurrence: rec }))}
                        className={`py-2 rounded-xl font-bold text-xs transition-all touch-manipulation ${
                          form.recurrence === rec ? 'bg-primary text-secondary' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {REC_LABELS[rec]}
                      </button>
                    ))}
                  </div>

                  {/* יום בשבוע */}
                  {form.recurrence === 'weekly' && (
                    <div>
                      <p className="text-primary/50 text-xs font-bold mb-1.5">יום בשבוע</p>
                      <div className="grid grid-cols-7 gap-1">
                        {DAY_NAMES.map((d, i) => (
                          <button
                            key={i}
                            onClick={() => setForm(f => ({ ...f, dayOfWeek: i }))}
                            className={`py-1.5 rounded-lg font-bold text-xs touch-manipulation ${
                              form.dayOfWeek === i ? 'bg-primary text-secondary' : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {d.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* יום בחודש */}
                  {form.recurrence === 'monthly' && (
                    <div>
                      <p className="text-primary/50 text-xs font-bold mb-1.5">תאריך בחודש</p>
                      <input
                        type="number"
                        min={1} max={28}
                        value={form.dayOfMonth}
                        onChange={e => setForm(f => ({ ...f, dayOfMonth: Number(e.target.value) }))}
                        className="w-24 bg-primary/5 text-primary rounded-xl py-2 px-3 font-bold text-sm focus:outline-none text-center"
                      />
                    </div>
                  )}

                  {/* תאריך חד פעמי */}
                  {form.recurrence === 'once' && (
                    <input
                      type="date"
                      value={form.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold text-sm focus:outline-none"
                    />
                  )}

                  {/* שעה */}
                  <div>
                    <p className="text-primary/50 text-xs font-bold mb-1.5">שעה</p>
                    <input
                      type="time"
                      value={form.time}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className="w-32 bg-primary/5 text-primary rounded-xl py-2 px-3 font-bold text-sm focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => addReminder(activeBranch)}
                    disabled={!form.title.trim() || working === activeBranch}
                    className="w-full bg-primary text-secondary font-black py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 touch-manipulation disabled:opacity-40"
                  >
                    {working === activeBranch
                      ? <><RefreshCw size={16} className="animate-spin" /> מוסיף...</>
                      : <><Bell size={16} /> הוסף תזכורת ליומן</>
                    }
                  </button>
                </div>
              </div>
            )}

            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-secondary text-primary font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation shadow-md"
              >
                <Plus size={18} />
                הוסף תזכורת חדשה
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
