import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'

// בדיקת-עדכון תקופתית — כדי לזהות deploy חדש גם בלי לסגור/לפתוח את האפליקציה.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000 // כל שעה

/**
 * באנר "יש גרסה חדשה — רענן". מופיע כשה-service worker מזהה בנדל חדש שממתין.
 * הפתרון הקבוע ל"בנדל ישן תקוע בשקט" (באג 2): במקום עדכון-שקט, המשתמש רואה ולוחץ.
 * מותקן פעם אחת ב-App (top-level) — גם רושם את ה-SW וגם מציג את הבאנר.
 */
export default function PWAUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      if (reg) setRegistration(reg)
    },
  })

  // בדיקת-עדכון: תקופתית + בכל חזרה לפוקוס (חזרה מ-WhatsApp / פתיחת ה-PWA).
  useEffect(() => {
    if (!registration) return
    const check = () => { registration.update().catch(() => {}) }
    const id = setInterval(check, UPDATE_CHECK_INTERVAL_MS)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [registration])

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed inset-x-0 bottom-0 z-[120] px-4 pb-4 pointer-events-none"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          role="status"
          aria-live="polite"
        >
          <div className="max-w-md mx-auto bg-primary text-secondary rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-3 p-3.5">
            <div className="flex-shrink-0 bg-secondary/15 p-2 rounded-xl">
              <RefreshCw size={18} className="text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm leading-tight">יש גרסה חדשה של האפליקציה</p>
              <p className="text-secondary/70 text-xs font-bold mt-0.5">לחץ רענן כדי לטעון את הגרסה העדכנית</p>
            </div>
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-shrink-0 bg-secondary text-primary font-black text-sm px-4 py-2 rounded-xl active:scale-95 transition-transform touch-manipulation"
            >
              רענן
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              aria-label="סגור"
              className="flex-shrink-0 text-secondary/60 hover:text-secondary active:scale-90 transition-all touch-manipulation -m-1 p-1"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
