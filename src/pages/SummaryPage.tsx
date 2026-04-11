import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Trash2, Send, Save, X, Plus, FileDown } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { useOrdersStore } from '../stores/ordersStore'
import { usePriceHistoryStore } from '../stores/priceHistoryStore'
import { formatPrice, calculateVAT, calculateTotal } from '../lib/utils'
import { notifyNewOrder } from '../lib/notifications'
import { printOrderAsPDF } from '../lib/pdfExport'
import { motion, AnimatePresence } from 'framer-motion'

export default function SummaryPage() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore()
  const { user } = useAuthStore()
  const { addOrder, saveTemplate, updateTemplate, templates } = useOrdersStore()
  const { recordOrderPrices } = usePriceHistoryStore()
  const [notes, setNotes] = useState('')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.supplier]) {
      acc[item.supplier] = []
    }
    acc[item.supplier].push(item)
    return acc
  }, {} as Record<string, typeof items>)

  const totalBeforeVAT = getTotalPrice()
  const vat = calculateVAT(totalBeforeVAT)
  const totalWithVAT = calculateTotal(totalBeforeVAT)

  const handleSendOrder = async () => {
    const orderedAt = new Date().toISOString()
    addOrder({
      branch: user?.branch || '',
      branchCode: user?.branchCode || '',
      items,
      notes,
      totalPrice: totalWithVAT
    })
    recordOrderPrices(items, user?.branchCode || '', orderedAt)

    // שליחת התראה לאדמין
    try {
      await notifyNewOrder({
        branch: user?.branch || '',
        itemCount: items.length,
        totalPrice: totalWithVAT
      })
    } catch (error) {
      console.log('Notification not sent:', error)
    }

    const orderText = generateOrderText()
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(orderText)}`
    window.open(whatsappUrl, '_blank')
    
    clearCart()
    setTimeout(() => {
      navigate('/')
    }, 500)
  }

  const handleSaveAsNewTemplate = () => {
    if (!newTemplateName.trim()) return
    saveTemplate(newTemplateName.trim(), items)
    setNewTemplateName('')
    setShowTemplateModal(false)
  }

  const handleUpdateTemplate = (templateId: string) => {
    updateTemplate(templateId, items)
    setShowTemplateModal(false)
  }

  const generateOrderText = () => {
    let text = `🛒 הזמנה חדשה - ${user?.branch}\n`
    text += `📅 ${new Date().toLocaleDateString('he-IL')}\n\n`

    Object.entries(groupedItems).forEach(([supplier, supplierItems]) => {
      text += `📦 ${supplier}\n`
      text += `${'─'.repeat(30)}\n`
      supplierItems.forEach(item => {
        text += `• ${item.name}\n`
        text += `  כמות: ${item.quantity}\n`
        if (user?.isAdmin) {
          text += `  מחיר: ${formatPrice(item.price * item.quantity)}\n`
        }
      })
      text += `\n`
    })

    if (user?.isAdmin) {
      text += `💰 סיכום כספי:\n`
      text += `סה"כ לפני מע"מ: ${formatPrice(totalBeforeVAT)}\n`
      text += `מע"מ (17%): ${formatPrice(vat)}\n`
      text += `סה"כ כולל מע"מ: ${formatPrice(totalWithVAT)}\n`
    }

    if (notes) {
      text += `\n📝 הערות: ${notes}`
    }

    return text
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-primary p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary font-bold text-xl mb-6">הסל ריק</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-secondary text-primary font-bold py-3 px-6 rounded-xl"
          >
            חזרה להזמנה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary pb-32">
      <div className="sticky top-0 z-10 bg-primary p-4 sm:p-6 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate('/orders')}
                className="text-primary hover:text-primary/70 active:text-primary/50 transition-colors p-1 touch-manipulation"
              >
                <ChevronRight size={24} className="sm:hidden" />
                <ChevronRight size={28} className="hidden sm:block" />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-black text-primary text-xl sm:text-2xl">סיכום הזמנה</h2>
              </div>
              <div className="w-6 sm:w-7" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
        {Object.entries(groupedItems).map(([supplier, supplierItems]) => (
          <motion.div
            key={supplier}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary rounded-2xl p-4 shadow-md"
          >
            <h3 className="font-black text-primary text-lg mb-3 pb-2 border-b-2 border-primary/10">
              {supplier}
            </h3>
            <div className="space-y-2">
              {supplierItems.map(item => (
                <div key={item.productId} className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <p className="font-bold text-primary text-sm">{item.name}</p>
                    {user?.isAdmin && (
                      <p className="text-primary/60 text-xs">
                        {formatPrice(item.price)} × {item.quantity} = {formatPrice(item.price * item.quantity)}
                      </p>
                    )}
                    {!user?.isAdmin && (
                      <p className="text-primary/60 text-xs">כמות: {item.quantity}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                      className="w-16 bg-primary/5 text-primary text-center font-bold rounded-lg py-1 px-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <div className="bg-secondary rounded-2xl p-4 shadow-md">
          <textarea
            placeholder="הערות להזמנה (אופציונלי)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-primary/5 text-primary placeholder:text-primary/40 rounded-xl p-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none"
          />
        </div>

        {user?.isAdmin && (
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-md text-white">
            <h3 className="font-black text-lg mb-3">סיכום כספי</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-bold">סה"כ לפני מע"מ:</span>
                <span className="font-black">{formatPrice(totalBeforeVAT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">מע"מ (17%):</span>
                <span className="font-black">{formatPrice(vat)}</span>
              </div>
              <div className="flex justify-between text-xl pt-2 border-t-2 border-white/20">
                <span className="font-black">סה"כ כולל מע"מ:</span>
                <span className="font-black">{formatPrice(totalWithVAT)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-primary/95 backdrop-blur-sm border-t-2 border-secondary/20">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex-1 bg-secondary/20 text-secondary font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform touch-manipulation"
            >
              <Save size={20} />
              <span>תבנית</span>
            </button>
            <button
              onClick={() => printOrderAsPDF(
                { branch: user?.branch || '', branchCode: user?.branchCode || '', items, notes },
                user?.isAdmin ?? false
              )}
              className="flex-1 bg-secondary/20 text-secondary font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform touch-manipulation"
            >
              <FileDown size={20} />
              <span>PDF</span>
            </button>
            <button
              onClick={() => {
                if (confirm('האם למחוק את כל ההזמנה?')) {
                  clearCart()
                  navigate('/orders')
                }
              }}
              className="bg-red-500/20 text-red-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center active:scale-[0.98] transition-transform touch-manipulation"
            >
              <Trash2 size={20} />
            </button>
          </div>
          <button
            onClick={handleSendOrder}
            className="w-full bg-green-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-xl touch-manipulation"
          >
            <Send size={24} />
            <span>שלח הזמנה</span>
          </button>
        </div>
      </div>

      {/* Modal שמירת תבנית */}
      <AnimatePresence>
        {showTemplateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowTemplateModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-secondary rounded-t-3xl p-5 shadow-2xl"
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-primary text-xl">שמור תבנית</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 text-primary/40 active:text-primary transition-colors touch-manipulation"
                >
                  <X size={22} />
                </button>
              </div>

              {/* שמירה כתבנית חדשה */}
              <div className="mb-5">
                <label className="block text-primary font-bold text-sm mb-2">תבנית חדשה</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveAsNewTemplate()}
                    placeholder="שם התבנית..."
                    className="flex-1 bg-primary/5 text-primary placeholder:text-primary/30 rounded-xl py-3 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveAsNewTemplate}
                    disabled={!newTemplateName.trim()}
                    className="bg-primary text-secondary font-bold px-4 rounded-xl disabled:opacity-40 active:scale-95 transition-transform touch-manipulation flex items-center gap-1"
                  >
                    <Plus size={18} />
                    <span>צור</span>
                  </button>
                </div>
              </div>

              {/* עדכון תבנית קיימת */}
              {templates.length > 0 && (
                <div>
                  <p className="text-primary/50 font-bold text-sm mb-2">או עדכן תבנית קיימת</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleUpdateTemplate(t.id)}
                        className="w-full bg-primary/5 text-right rounded-xl px-4 py-3 flex items-center justify-between active:bg-primary/10 transition-colors touch-manipulation"
                      >
                        <span className="font-bold text-primary text-sm">{t.name}</span>
                        <span className="text-primary/40 text-xs">{t.items.length} פריטים</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
