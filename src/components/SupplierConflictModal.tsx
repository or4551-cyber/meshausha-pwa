import { AlertTriangle, Send, Trash2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore'

interface Props {
  open: boolean
  conflictSupplier: string
  newSupplier: string
  onClose: () => void
  /** קריאה אחרי clearCart — כדי שהקומפוננטה האב תוכל להוסיף את הפריט החדש */
  onClearedAndContinue?: () => void
}

export default function SupplierConflictModal({
  open,
  conflictSupplier,
  newSupplier,
  onClose,
  onClearedAndContinue,
}: Props) {
  const navigate = useNavigate()
  const clearCart = useCartStore(s => s.clearCart)

  if (!open) return null

  const handleSendFirst = () => {
    onClose()
    navigate('/summary')
  }

  const handleClearAndStart = () => {
    clearCart()
    onClose()
    onClearedAndContinue?.()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          key="panel"
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-secondary rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 rounded-full p-2.5">
                <AlertTriangle size={22} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-primary text-lg leading-tight">
                  הסל מכיל ספק אחר
                </h3>
                <p className="text-primary/60 text-xs mt-0.5 font-bold">
                  כל הזמנה תכלול ספק אחד בלבד
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="סגור"
              className="p-2 text-primary/40 active:text-primary touch-manipulation -mt-1 -mr-1"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-5 pb-3">
            <p className="text-primary text-sm font-bold leading-relaxed">
              בסל יש כבר פריטים מ-<span className="text-amber-700">{conflictSupplier}</span>.
              {' '}לא ניתן להוסיף פריט מ-<span className="text-amber-700">{newSupplier}</span>{' '}
              לאותה הזמנה.
            </p>
            <p className="text-primary/60 text-xs font-bold mt-2 leading-relaxed">
              שלח קודם את ההזמנה הקיימת — או רוקן את הסל והתחל הזמנה חדשה ל-{newSupplier}.
            </p>
          </div>

          <div className="p-4 space-y-2 border-t border-primary/10 mt-2">
            <button
              onClick={handleSendFirst}
              className="w-full flex items-center justify-center gap-2 bg-primary text-secondary font-black py-3.5 rounded-2xl text-sm active:scale-95 touch-manipulation shadow-md"
            >
              <Send size={17} />
              <span>שלח קודם את {conflictSupplier}</span>
            </button>
            <button
              onClick={handleClearAndStart}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-600 font-black py-3 rounded-2xl text-sm active:scale-95 touch-manipulation"
            >
              <Trash2 size={16} />
              <span>רוקן את הסל ופתח חדש</span>
            </button>
            <button
              onClick={onClose}
              className="w-full text-primary/50 font-bold py-2 text-xs active:text-primary touch-manipulation"
            >
              ביטול
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
