import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useOrdersStore } from '../stores/ordersStore'
import { 
  isNotificationSupported, 
  requestNotificationPermission,
  notifyNewOrder 
} from '../lib/notifications'
import { motion, AnimatePresence } from 'framer-motion'

export default function NotificationManager() {
  const { user } = useAuthStore()
  const { orders } = useOrdersStore()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showPrompt, setShowPrompt] = useState(false)
  const [lastOrderCount, setLastOrderCount] = useState(0)

  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    if (!user?.isAdmin) return
    
    // בדיקה אם יש הזמנה חדשה
    if (orders.length > lastOrderCount && lastOrderCount > 0 && permission === 'granted') {
      const newOrder = orders[0]
      notifyNewOrder({
        branch: newOrder.branch,
        itemCount: newOrder.items.length,
        totalPrice: newOrder.totalPrice
      })
    }
    setLastOrderCount(orders.length)
  }, [orders, lastOrderCount, permission, user?.isAdmin])

  useEffect(() => {
    if (user?.isAdmin && permission === 'default' && isNotificationSupported()) {
      // הצגת prompt אחרי 3 שניות
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [user?.isAdmin, permission])

  const handleEnableNotifications = async () => {
    try {
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)
      setShowPrompt(false)
      
      if (newPermission === 'granted') {
        // שליחת התראת בדיקה
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification('התראות הופעלו! 🔔', {
          body: 'תקבל התראות על הזמנות חדשות',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png'
        })
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    }
  }

  if (!user?.isAdmin || !isNotificationSupported()) {
    return null
  }

  return (
    <>
      <AnimatePresence>
        {showPrompt && permission === 'default' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]"
          >
            <div className="bg-gradient-to-r from-bot to-[#96a556] rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
                  <Bell className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-black text-sm mb-1">הפעל התראות</h3>
                  <p className="text-white/90 text-xs mb-3">
                    קבל התראות על הזמנות חדשות בזמן אמת
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnableNotifications}
                      className="flex-1 bg-white text-bot font-bold py-2 px-3 rounded-xl text-xs active:scale-95 transition-transform"
                    >
                      הפעל עכשיו
                    </button>
                    <button
                      onClick={() => setShowPrompt(false)}
                      className="flex-1 bg-white/20 text-white font-bold py-2 px-3 rounded-xl text-xs active:scale-95 transition-transform"
                    >
                      אולי מאוחר יותר
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* אינדיקטור סטטוס התראות */}
      <div className="fixed top-4 right-4 z-40">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`p-2 rounded-full ${
            permission === 'granted' 
              ? 'bg-bot/20 text-bot' 
              : 'bg-gray-200 text-gray-400'
          }`}
          title={permission === 'granted' ? 'התראות פעילות' : 'התראות כבויות'}
        >
          {permission === 'granted' ? (
            <Bell size={18} />
          ) : (
            <BellOff size={18} />
          )}
        </motion.div>
      </div>
    </>
  )
}
