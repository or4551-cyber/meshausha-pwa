import { Clock, Plus, Send, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  supplier: string
  existingOrderTime: string  // ISO string
  itemsCount: number
  onMerge: () => void
  onSendNew: () => void
  onClose: () => void
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'הרגע'
  if (minutes < 60) return `לפני ${minutes} דקות`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `לפני ${hours} שע'`
  return `לפני ${Math.floor(hours / 24)} ימים`
}

export default function DuplicateOrderModal({
  open,
  supplier,
  existingOrderTime,
  itemsCount,
  onMerge,
  onSendNew,
  onClose,
}: Props) {
  if (!open) return null

  const formatted = new Date(existingOrderTime).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  })

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
                <Clock size={22} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-primary text-lg leading-tight">
                  כבר שלחת הזמנה ל-{supplier}
                </h3>
                <p className="text-primary/60 text-xs mt-0.5 font-bold">
                  {timeAgo(existingOrderTime)} (ב-{formatted}) · {itemsCount} פריטים
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
              מה לעשות עם הפריטים החדשים?
            </p>
          </div>

          <div className="p-4 space-y-2 border-t border-primary/10 mt-2">
            <button
              onClick={onMerge}
              className="w-full flex items-center gap-3 bg-green-500 text-white font-black py-3.5 px-4 rounded-2xl text-sm active:scale-95 touch-manipulation shadow-md"
            >
              <Plus size={18} />
              <div className="flex-1 text-right">
                <div>הוסף לאותה הזמנה</div>
                <div className="text-xs font-bold opacity-80 mt-0.5">מומלץ — אור יקבל רק את התוספת</div>
              </div>
            </button>
            <button
              onClick={onSendNew}
              className="w-full flex items-center gap-3 bg-amber-500/15 text-amber-800 font-black py-3 px-4 rounded-2xl text-sm active:scale-95 touch-manipulation"
            >
              <Send size={16} />
              <div className="flex-1 text-right">
                <div>שלח כהזמנה חדשה</div>
                <div className="text-xs font-bold opacity-70 mt-0.5">תיוצר הזמנה נפרדת לאותו ספק</div>
              </div>
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
