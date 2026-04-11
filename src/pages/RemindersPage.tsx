import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Trash2, Calendar, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRemindersStore } from '../stores/remindersStore'

export default function RemindersPage() {
  const navigate = useNavigate()
  const { reminders, addReminder, deleteReminder } = useRemindersStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    date: '',
    time: ''
  })

  const handleAddReminder = () => {
    if (!newReminder.title || !newReminder.date || !newReminder.time) {
      alert('נא למלא את כל השדות הנדרשים')
      return
    }

    addReminder({
      title: newReminder.title,
      description: newReminder.description,
      date: newReminder.date,
      time: newReminder.time,
    })
    setNewReminder({ title: '', description: '', date: '', time: '' })
    setShowAddForm(false)
  }

  const handleDeleteReminder = (id: string) => {
    deleteReminder(id)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('he-IL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
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
              <h2 className="font-black text-primary text-xl">תזכורות</h2>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
            >
              <Plus size={24} />
            </button>
          </div>
        </header>

        <div className="space-y-3">
          {reminders.length === 0 && !showAddForm && (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-secondary/30 mb-4" size={64} />
              <p className="text-secondary/60 font-bold text-lg mb-4">אין תזכורות</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-secondary text-primary font-bold py-3 px-6 rounded-xl active:scale-95 transition-transform"
              >
                הוסף תזכורת ראשונה
              </button>
            </div>
          )}

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-secondary rounded-3xl p-5 shadow-lg"
              >
                <h3 className="font-black text-primary text-lg mb-4">תזכורת חדשה</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-primary font-bold text-sm mb-2">כותרת *</label>
                    <input
                      type="text"
                      value={newReminder.title}
                      onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                      className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="לדוגמה: הזמנת ירקות"
                    />
                  </div>

                  <div>
                    <label className="block text-primary font-bold text-sm mb-2">תיאור</label>
                    <textarea
                      value={newReminder.description}
                      onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                      className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                      placeholder="פרטים נוספים..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-primary font-bold text-sm mb-2">תאריך *</label>
                      <input
                        type="date"
                        value={newReminder.date}
                        onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                        className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-primary font-bold text-sm mb-2">שעה *</label>
                      <input
                        type="time"
                        value={newReminder.time}
                        onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                        className="w-full bg-primary/5 text-primary rounded-xl py-2.5 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleAddReminder}
                      className="flex-1 bg-primary text-secondary font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
                    >
                      שמור
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setNewReminder({ title: '', description: '', date: '', time: '' })
                      }}
                      className="flex-1 bg-primary/10 text-primary font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {reminders.map((reminder) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-secondary rounded-3xl p-4 shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-black text-primary text-base mb-1">{reminder.title}</h3>
                  {reminder.description && (
                    <p className="text-primary/60 text-sm">{reminder.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="text-red-500 hover:text-red-600 p-2 active:scale-95 transition-transform"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex items-center gap-4 text-primary/70 text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{formatDate(reminder.date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>{reminder.time}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
