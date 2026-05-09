import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useConfirmStore } from '../lib/confirm'

export default function ConfirmDialog() {
  const pending = useConfirmStore((s) => s.pending)
  const close = useConfirmStore((s) => s.close)

  // ESC = ביטול
  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
      else if (e.key === 'Enter') close(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, close])

  return (
    <AnimatePresence>
      {pending && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-[90]"
            onClick={() => close(false)}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="bg-secondary rounded-3xl shadow-2xl max-w-sm w-full pointer-events-auto overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  {pending.destructive && (
                    <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 id="confirm-title" className="font-black text-primary text-lg mb-1">
                      {pending.title}
                    </h3>
                    {pending.description && (
                      <p className="text-primary/70 text-sm font-bold whitespace-pre-line">
                        {pending.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => close(false)}
                    className="flex-1 bg-primary/10 text-primary font-black py-3 rounded-xl active:scale-95 transition-transform touch-manipulation"
                  >
                    {pending.cancelLabel ?? 'ביטול'}
                  </button>
                  <button
                    onClick={() => close(true)}
                    autoFocus
                    className={`flex-1 font-black py-3 rounded-xl active:scale-95 transition-transform touch-manipulation ${
                      pending.destructive
                        ? 'bg-red-600 text-white'
                        : 'bg-primary text-secondary'
                    }`}
                  >
                    {pending.confirmLabel ?? (pending.destructive ? 'מחק' : 'אישור')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
