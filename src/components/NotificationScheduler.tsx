import { useEffect, useState } from 'react'
import { Bell, Clock, Calendar } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { 
  scheduleAllNotifications, 
  getTodaySuppliers,
  getUpcomingNotifications,
  formatNotificationTime
} from '../lib/scheduledNotifications'
import { motion, AnimatePresence } from 'framer-motion'

export default function NotificationScheduler() {
  const { user, isAuthenticated } = useAuthStore()
  const [isScheduled, setIsScheduled] = useState(false)
  const [showUpcoming, setShowUpcoming] = useState(false)
  const todaySuppliers = user ? getTodaySuppliers(user.branchCode) : []
  const upcomingNotifications = user ? getUpcomingNotifications(user.branchCode) : []

  useEffect(() => {
    if (isAuthenticated && user && !user.isAdmin && !isScheduled) {
      // הפעל התראות מתוזמנות
      const setupNotifications = async () => {
        try {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            await scheduleAllNotifications(user.branch, user.branchCode)
            setIsScheduled(true)
          }
        } catch (error) {
          console.error('Failed to schedule notifications:', error)
        }
      }
      
      setupNotifications()
    }
  }, [isAuthenticated, user, isScheduled])

  if (!isAuthenticated || user?.isAdmin) {
    return null
  }

  return (
    <>
      {/* הודעה על ספקים להזמנה היום */}
      {todaySuppliers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-2rem)]"
        >
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
                <Calendar className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-black text-sm mb-1">📋 הזמנות להיום</h3>
                <div className="space-y-1">
                  {todaySuppliers.map(supplier => (
                    <p key={supplier.name} className="text-white/90 text-xs">
                      • {supplier.name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* כפתור להצגת התראות קרובות */}
      <button
        onClick={() => setShowUpcoming(!showUpcoming)}
        className="fixed top-4 left-4 z-40 bg-secondary p-2 rounded-full shadow-lg hover:shadow-xl transition-all touch-manipulation"
        title="התראות קרובות"
      >
        <Bell className="text-primary" size={18} />
      </button>

      {/* חלון התראות קרובות */}
      <AnimatePresence>
        {showUpcoming && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-16 left-4 z-40 w-80 max-w-[calc(100vw-2rem)] bg-secondary rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-primary p-4">
              <h3 className="text-secondary font-black text-lg flex items-center gap-2">
                <Clock size={20} />
                התראות קרובות
              </h3>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {upcomingNotifications.slice(0, 5).map((notification, index) => (
                <div
                  key={index}
                  className="bg-primary/5 rounded-xl p-3"
                >
                  <div className="flex items-start gap-2">
                    <Bell className="text-primary flex-shrink-0 mt-0.5" size={16} />
                    <div className="flex-1">
                      <p className="text-primary font-bold text-sm">{notification.supplier}</p>
                      <p className="text-primary/60 text-xs mt-1">
                        {formatNotificationTime(notification.time)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-3 bg-primary/5 border-t border-primary/10">
              <button
                onClick={() => setShowUpcoming(false)}
                className="w-full bg-primary text-secondary font-bold py-2 rounded-xl text-sm active:scale-95 transition-transform"
              >
                סגור
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
