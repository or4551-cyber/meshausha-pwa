import { useNavigate } from 'react-router-dom'
import { ChevronRight, Calendar } from 'lucide-react'
import { useSuppliersStore } from '../../stores/suppliersStore'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const DAY_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-slate-400',
]

const TODAY = new Date().getDay()

export default function WeeklySchedulePage() {
  const navigate = useNavigate()
  const { suppliers } = useSuppliersStore()

  // ספקים שיש להם לפחות יום הזמנה אחד
  const activeSuppliers = suppliers.filter(s => s.schedules && s.schedules.length > 0)

  // מפה: יום → [{supplierName, branches, time}]
  const dayMap: Record<number, Array<{ supplierName: string; branches: string[]; time: string }>> = {}
  for (let d = 0; d < 7; d++) dayMap[d] = []

  for (const supplier of activeSuppliers) {
    for (const schedule of supplier.schedules) {
      dayMap[schedule.day].push({
        supplierName: supplier.name,
        branches: schedule.branchCodes,
        time: schedule.notificationTime,
      })
    }
  }

  // מיון לפי שעה
  for (let d = 0; d < 7; d++) {
    dayMap[d].sort((a, b) => a.time.localeCompare(b.time))
  }

  if (activeSuppliers.length === 0) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl mb-4 flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="text-primary p-1 touch-manipulation">
              <ChevronRight size={24} />
            </button>
            <h2 className="flex-1 text-center font-black text-primary text-xl">לוח שבועי</h2>
            <div className="w-8" />
          </div>
          <div className="text-center py-16">
            <Calendar className="mx-auto text-secondary/30 mb-4" size={56} />
            <p className="text-secondary/60 font-bold text-lg">אין ספקים עם ימי הזמנה</p>
            <p className="text-secondary/40 text-sm mt-1">הגדר ספקים עם לוח זמנים בהוספת ספק</p>
            <button
              onClick={() => navigate('/admin/add-supplier')}
              className="mt-4 bg-secondary text-primary font-bold py-2.5 px-5 rounded-xl active:scale-95 touch-manipulation"
            >
              הוסף ספק
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="sticky top-0 z-10 bg-primary pt-4 pb-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-secondary rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin')} className="text-primary p-1 touch-manipulation">
                <ChevronRight size={24} />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl">לוח שבועי</h2>
                <p className="text-primary/60 text-xs mt-0.5">{activeSuppliers.length} ספקים פעילים</p>
              </div>
              <div className="w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-3">

        {/* גריד שבועי - תצוגה לפי יום */}
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_SHORT.map((name, d) => (
            <div
              key={d}
              className={`rounded-xl p-1.5 text-center ${d === TODAY ? 'ring-2 ring-white ring-offset-2 ring-offset-primary' : ''}`}
            >
              <div className={`${DAY_COLORS[d]} rounded-lg py-1.5`}>
                <p className="text-white font-black text-xs">{name}</p>
              </div>
              <p className="text-secondary/60 font-bold text-xs mt-1">
                {dayMap[d].length > 0 ? `${dayMap[d].length} ספקים` : '—'}
              </p>
            </div>
          ))}
        </div>

        {/* פירוט לפי יום */}
        {DAY_NAMES.map((dayName, d) => {
          const entries = dayMap[d]
          if (entries.length === 0) return null
          return (
            <div key={d} className="bg-secondary rounded-3xl overflow-hidden shadow-md">
              {/* כותרת יום */}
              <div className={`${DAY_COLORS[d]} px-5 py-3 flex items-center justify-between`}>
                <h3 className="font-black text-white text-base">יום {dayName}</h3>
                {d === TODAY && (
                  <span className="bg-white/30 text-white text-xs font-black px-2 py-0.5 rounded-full">היום</span>
                )}
              </div>

              {/* ספקים ביום זה */}
              <div className="divide-y divide-primary/5">
                {entries.map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-shrink-0 text-center">
                      <p className="font-black text-primary text-sm">{entry.time}</p>
                      <p className="text-primary/40 text-xs">תזכורת</p>
                    </div>
                    <div className="w-px self-stretch bg-primary/10" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-primary text-sm">{entry.supplierName}</p>
                      <p className="text-primary/50 text-xs mt-0.5">
                        {entry.branches.length === 0
                          ? 'כל הסניפים'
                          : `${entry.branches.length} סניפים`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* אגדה / סיכום */}
        <div className="bg-secondary rounded-3xl p-4 shadow-md">
          <p className="font-black text-primary text-sm mb-3">סיכום שבועי</p>
          <div className="space-y-2">
            {activeSuppliers.map(supplier => (
              <div key={supplier.id} className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary">{supplier.name}</span>
                <div className="flex gap-1">
                  {DAY_SHORT.map((d, idx) => {
                    const hasDay = supplier.schedules.some(s => s.day === idx)
                    return (
                      <span
                        key={idx}
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-black ${
                          hasDay ? `${DAY_COLORS[idx]} text-white` : 'bg-primary/5 text-primary/20'
                        }`}
                      >
                        {d}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
