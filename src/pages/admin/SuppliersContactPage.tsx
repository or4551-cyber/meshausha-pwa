import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Mail, Phone, User, Save, Edit2, Calendar, X, Plus, Trash2 } from 'lucide-react'
import { useSuppliersStore } from '../../stores/suppliersStore'
import type { DaySchedule } from '../../stores/suppliersStore'
import { motion } from 'framer-motion'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

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

export default function SuppliersContactPage() {
  const navigate = useNavigate()
  const { suppliers, updateSupplier } = useSuppliersStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ email: '', contactPerson: '', phone: '' })
  const [schedules, setSchedules] = useState<DaySchedule[]>([])

  const handleEditContact = (supplier: any) => {
    setEditingId(supplier.id)
    setEditingScheduleId(null)
    setEditForm({
      email: supplier.email || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || ''
    })
  }

  const handleSaveContact = (id: string) => {
    updateSupplier(id, editForm)
    setEditingId(null)
  }

  const handleEditSchedule = (supplier: any) => {
    setEditingScheduleId(supplier.id)
    setEditingId(null)
    setSchedules(supplier.schedules ? JSON.parse(JSON.stringify(supplier.schedules)) : [])
  }

  const handleSaveSchedule = (id: string) => {
    updateSupplier(id, { schedules })
    setEditingScheduleId(null)
  }

  const addDay = () => {
    // מוסיף יום שעוד לא קיים
    const usedDays = new Set(schedules.map(s => s.day))
    const nextDay = [0,1,2,3,4,5,6].find(d => !usedDays.has(d))
    if (nextDay === undefined) return
    setSchedules(prev => [...prev, { day: nextDay, branchCodes: [], notificationTime: '08:00' }])
  }

  const removeDay = (idx: number) => {
    setSchedules(prev => prev.filter((_, i) => i !== idx))
  }

  const updateDay = (idx: number, field: keyof DaySchedule, value: any) => {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const toggleBranch = (idx: number, code: string) => {
    setSchedules(prev => prev.map((s, i) => {
      if (i !== idx) return s
      const codes = s.branchCodes.includes(code)
        ? s.branchCodes.filter(c => c !== code)
        : [...s.branchCodes, code]
      return { ...s, branchCodes: codes }
    }))
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="bg-secondary rounded-3xl p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <ChevronRight size={24} />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-black text-primary text-xl">פרטי קשר ספקים</h2>
              <p className="text-primary/60 text-xs mt-1">מייל, טלפון ולוחות זמנים</p>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {suppliers.length === 0 ? (
            <div className="text-center py-12 bg-secondary rounded-3xl">
              <Mail className="mx-auto text-primary/30 mb-4" size={64} />
              <p className="text-primary/60 font-bold text-lg">אין ספקים במערכת</p>
            </div>
          ) : (
            suppliers.map((supplier) => (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary rounded-3xl p-5 shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-black text-primary text-lg">{supplier.name}</h3>
                    <p className="text-primary/60 text-sm">{supplier.description}</p>
                    {supplier.schedules?.length > 0 && (
                      <p className="text-green-600 text-xs font-bold mt-1">
                        {supplier.schedules.length} ימי אספקה מוגדרים
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editingId !== supplier.id && editingScheduleId !== supplier.id && (
                      <>
                        <button
                          onClick={() => handleEditContact(supplier)}
                          className="text-primary hover:text-primary/70 p-2 active:scale-95 transition-transform"
                          title="ערוך פרטי קשר"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleEditSchedule(supplier)}
                          className="text-primary hover:text-primary/70 p-2 active:scale-95 transition-transform"
                          title="ערוך לוח זמנים"
                        >
                          <Calendar size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* עריכת פרטי קשר */}
                {editingId === supplier.id && (
                  <div className="space-y-3 border-t border-primary/10 pt-4">
                    <p className="font-black text-primary text-sm">פרטי קשר</p>
                    <div>
                      <label className="block text-primary/60 font-bold text-xs mb-1 flex items-center gap-1">
                        <Mail size={13} /> כתובת מייל
                      </label>
                      <input type="email" value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="supplier@example.com" />
                    </div>
                    <div>
                      <label className="block text-primary/60 font-bold text-xs mb-1 flex items-center gap-1">
                        <User size={13} /> איש קשר
                      </label>
                      <input type="text" value={editForm.contactPerson}
                        onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                        className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="שם מלא" />
                    </div>
                    <div>
                      <label className="block text-primary/60 font-bold text-xs mb-1 flex items-center gap-1">
                        <Phone size={13} /> טלפון / WhatsApp
                      </label>
                      <input type="tel" value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="050-1234567" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleSaveContact(supplier.id)}
                        className="flex-1 bg-primary text-secondary font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95">
                        <Save size={16} /> שמור
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="flex-1 bg-primary/10 text-primary font-bold py-2.5 rounded-xl active:scale-95">
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {/* עריכת לוח זמנים */}
                {editingScheduleId === supplier.id && (
                  <div className="border-t border-primary/10 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-primary text-sm">ימי אספקה לפי סניף</p>
                      <button onClick={() => setEditingScheduleId(null)}
                        className="text-primary/40 p-1 touch-manipulation"><X size={18} /></button>
                    </div>

                    {schedules.map((sch, idx) => (
                      <div key={idx} className="bg-primary/5 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          {/* בחירת יום */}
                          <select
                            value={sch.day}
                            onChange={(e) => updateDay(idx, 'day', Number(e.target.value))}
                            className="bg-primary text-secondary font-bold rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                          >
                            {DAY_NAMES.map((d, i) => (
                              <option key={i} value={i}>{d}</option>
                            ))}
                          </select>
                          {/* שעת תזכורת */}
                          <div className="flex items-center gap-2">
                            <span className="text-primary/50 text-xs font-bold">שעה</span>
                            <input type="time" value={sch.notificationTime}
                              onChange={(e) => updateDay(idx, 'notificationTime', e.target.value)}
                              className="bg-primary/10 text-primary font-bold rounded-xl px-2 py-1 text-sm focus:outline-none" />
                          </div>
                          <button onClick={() => removeDay(idx)}
                            className="text-red-400 p-1 active:scale-90 touch-manipulation">
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* בחירת סניפים */}
                        <div>
                          <p className="text-primary/50 text-xs font-bold mb-1.5">סניפים:</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => updateDay(idx, 'branchCodes', sch.branchCodes.length === BRANCHES.length ? [] : BRANCHES.map(b => b.code))}
                              className={`px-2 py-1 rounded-lg text-xs font-bold touch-manipulation transition-colors ${
                                sch.branchCodes.length === BRANCHES.length
                                  ? 'bg-primary text-secondary'
                                  : 'bg-primary/15 text-primary'
                              }`}
                            >
                              הכל
                            </button>
                            {BRANCHES.map(b => (
                              <button key={b.code}
                                onClick={() => toggleBranch(idx, b.code)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold touch-manipulation transition-colors ${
                                  sch.branchCodes.includes(b.code)
                                    ? 'bg-primary text-secondary'
                                    : 'bg-primary/15 text-primary'
                                }`}
                              >
                                {b.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {schedules.length < 7 && (
                      <button onClick={addDay}
                        className="w-full border-2 border-dashed border-primary/20 text-primary/50 font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation hover:border-primary/40 transition-colors">
                        <Plus size={16} /> הוסף יום
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => handleSaveSchedule(supplier.id)}
                        className="flex-1 bg-primary text-secondary font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95">
                        <Save size={16} /> שמור לוח זמנים
                      </button>
                      <button onClick={() => setEditingScheduleId(null)}
                        className="flex-1 bg-primary/10 text-primary font-bold py-2.5 rounded-xl active:scale-95">
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {/* תצוגת פרטים (כשלא בעריכה) */}
                {editingId !== supplier.id && editingScheduleId !== supplier.id && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary/70 text-sm">
                      <Mail size={14} />
                      <span>{supplier.email || 'לא הוגדר מייל'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary/70 text-sm">
                      <Phone size={14} />
                      <span>{supplier.phone || 'לא הוגדר טלפון'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary/70 text-sm">
                      <User size={14} />
                      <span>{supplier.contactPerson || 'לא הוגדר איש קשר'}</span>
                    </div>
                    {supplier.schedules?.length > 0 && (
                      <div className="flex items-start gap-2 text-primary/70 text-sm mt-2 pt-2 border-t border-primary/10">
                        <Calendar size={14} className="mt-0.5 flex-shrink-0" />
                        <span>
                          {supplier.schedules
                            .sort((a, b) => a.day - b.day)
                            .map(s => `${DAY_NAMES[s.day]} ${s.notificationTime}`)
                            .join(' • ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
