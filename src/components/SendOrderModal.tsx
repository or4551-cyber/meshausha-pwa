import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Send, Trash2, CheckCircle2, Plus, Minus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore, CartItem } from '../stores/cartStore'
import { formatPrice } from '../lib/utils'
import { formatSingleSupplierOrder } from '../lib/orderFormat'

interface Props {
  open: boolean
  isAdmin: boolean
  branch: string
  notes: string
  onNotesChange: (n: string) => void
  adminPhone: string
  getSupplierPhone: (supplierName: string) => string
  showFinancial?: { totalBeforeVAT: number; vat: number; totalWithVAT: number }
  onClose: () => void
  onPersist: () => void
  onComplete: () => void
}

function toWaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('972')) return digits
  if (digits.startsWith('0')) return '972' + digits.slice(1)
  return '972' + digits
}

export default function SendOrderModal({
  open,
  isAdmin,
  branch,
  notes,
  onNotesChange,
  adminPhone,
  getSupplierPhone,
  showFinancial,
  onClose,
  onPersist,
  onComplete,
}: Props) {
  const { items, updateQuantity, removeItem } = useCartStore()
  const [sent, setSent] = useState<Set<string>>(new Set())
  const persistedRef = useRef(false)

  const grouped = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.supplier]) acc[item.supplier] = []
      acc[item.supplier].push(item)
      return acc
    }, {} as Record<string, CartItem[]>)
  }, [items])

  const supplierNames = Object.keys(grouped)
  const allSent = supplierNames.length > 0 && supplierNames.every(s => sent.has(s))

  useEffect(() => {
    if (!open) {
      setSent(new Set())
      persistedRef.current = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const ensurePersisted = () => {
    if (persistedRef.current) return
    persistedRef.current = true
    onPersist()
  }

  const handleSendSupplier = (supplier: string, supplierItems: CartItem[]) => {
    ensurePersisted()
    const text = formatSingleSupplierOrder({
      branch,
      supplier,
      items: supplierItems,
      notes,
      showPrice: isAdmin,
    })
    const targetRaw = isAdmin ? getSupplierPhone(supplier) : adminPhone
    const wa = toWaNumber(targetRaw)
    const url = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    setSent(prev => new Set(prev).add(supplier))
  }

  const handleFinish = () => {
    onComplete()
  }

  if (!open) return null

  const isEmpty = items.length === 0

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
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
          className="bg-secondary rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[95vh] flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
            <div>
              <h3 className="font-black text-primary text-lg">אישור ושליחת הזמנה</h3>
              <p className="text-primary/50 text-xs">
                {isAdmin ? 'כל ספק נשלח ישירות' : `${supplierNames.length} ${supplierNames.length === 1 ? 'ספק — נשלח לאדמין' : 'ספקים — הודעה נפרדת לאדמין לכל ספק'}`}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="סגור"
              className="p-2 text-primary/50 hover:text-primary active:scale-90 touch-manipulation"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {isEmpty && (
              <div className="text-center py-8 text-primary/50 font-bold">
                הסל ריק
              </div>
            )}

            {Object.entries(grouped).map(([supplier, supplierItems]) => {
              const isSent = sent.has(supplier)
              const totalQty = supplierItems.reduce((s, i) => s + i.quantity, 0)
              return (
                <div key={supplier} className="bg-primary/5 rounded-2xl p-3 border border-primary/10">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-primary/10">
                    <div>
                      <h4 className="font-black text-primary text-base">{supplier}</h4>
                      <p className="text-primary/50 text-xs">{supplierItems.length} פריטים · {totalQty} יחידות</p>
                    </div>
                    {isSent && (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                        <CheckCircle2 size={14} />
                        <span>נשלח</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {supplierItems.map(item => (
                      <div key={item.productId} className="flex items-center gap-2 py-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-primary text-sm leading-tight truncate">{item.name}</p>
                          {isAdmin && (
                            <p className="text-primary/50 text-xs">{formatPrice(item.price)} × {item.quantity}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg active:scale-90 touch-manipulation"
                            aria-label="הורד כמות"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="w-12 bg-secondary text-primary text-center font-bold rounded-lg py-1 px-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg active:scale-90 touch-manipulation"
                            aria-label="הוסף כמות"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg active:scale-90 touch-manipulation mr-1"
                            aria-label="הסר פריט"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSendSupplier(supplier, supplierItems)}
                    className={`w-full flex items-center justify-center gap-2 font-black py-2.5 rounded-xl text-sm active:scale-95 touch-manipulation shadow-sm ${
                      isSent
                        ? 'bg-green-100 text-green-700'
                        : 'bg-green-500 text-white'
                    }`}
                  >
                    {isSent ? (
                      <>
                        <Send size={15} />
                        <span>שלח שוב</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>{isAdmin ? `שלח ל-${supplier}` : 'שלח לאדמין'}</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })}

            {!isEmpty && (
              <div>
                <label className="block text-primary font-bold text-sm mb-1.5">הערות (משותף לכל הספקים)</label>
                <textarea
                  value={notes}
                  onChange={e => onNotesChange(e.target.value)}
                  placeholder="הערות אופציונליות..."
                  rows={2}
                  className="w-full bg-primary/5 text-primary placeholder:text-primary/30 rounded-xl p-3 text-sm font-bold resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {showFinancial && !isEmpty && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-primary">
                <h4 className="font-black text-sm mb-2">סיכום כספי</h4>
                <div className="space-y-1 text-xs font-bold">
                  <div className="flex justify-between">
                    <span>לפני מע"מ</span>
                    <span>{formatPrice(showFinancial.totalBeforeVAT)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>מע"מ 17%</span>
                    <span>{formatPrice(showFinancial.vat)}</span>
                  </div>
                  <div className="flex justify-between text-base pt-1 border-t border-amber-200">
                    <span>סה"כ</span>
                    <span>{formatPrice(showFinancial.totalWithVAT)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-primary/10 space-y-2">
            <button
              onClick={handleFinish}
              disabled={isEmpty}
              className={`w-full flex items-center justify-center gap-2 font-black py-3.5 rounded-2xl text-base active:scale-95 touch-manipulation shadow-md disabled:opacity-50 ${
                allSent
                  ? 'bg-primary text-secondary'
                  : 'bg-primary/15 text-primary'
              }`}
            >
              <CheckCircle2 size={18} />
              <span>{allSent ? 'סיים — שמור הזמנה' : 'סיים'}</span>
            </button>
            <p className="text-primary/40 text-xs text-center">
              {allSent
                ? 'כל הספקים נשלחו · לחץ סיים לשמירה'
                : isEmpty
                  ? 'הוסף פריטים לסל לפני שליחה'
                  : 'שלח כל ספק בנפרד, ואז לחץ סיים'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
