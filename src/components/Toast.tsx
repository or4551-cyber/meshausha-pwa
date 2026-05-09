import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore, type ToastVariant } from '../lib/toast'

const VARIANT_STYLE: Record<ToastVariant, { bg: string; iconColor: string; Icon: typeof CheckCircle }> = {
  success: { bg: 'bg-emerald-600',  iconColor: 'text-emerald-100', Icon: CheckCircle },
  error:   { bg: 'bg-red-600',      iconColor: 'text-red-100',     Icon: AlertCircle },
  info:    { bg: 'bg-sky-600',      iconColor: 'text-sky-100',     Icon: Info },
  warning: { bg: 'bg-amber-600',    iconColor: 'text-amber-100',   Icon: AlertTriangle },
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none px-4 pt-4 flex flex-col items-center gap-2"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const { bg, iconColor, Icon } = VARIANT_STYLE[t.variant]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`${bg} text-white rounded-2xl shadow-xl pointer-events-auto w-full max-w-md`}
              role={t.variant === 'error' ? 'alert' : 'status'}
            >
              <div className="flex items-start gap-3 p-3.5">
                <Icon className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm leading-tight">{t.title}</p>
                  {t.description && (
                    <p className="text-white/85 text-xs font-bold mt-0.5 break-words">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-white/70 hover:text-white active:scale-90 transition-all flex-shrink-0 touch-manipulation -m-1 p-1"
                  aria-label="סגור"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
