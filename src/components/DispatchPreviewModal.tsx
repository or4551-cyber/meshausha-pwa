import { useEffect, useId, useRef, useState } from 'react'
import { X, Send, Download, Loader2, MessageSquare, Image as ImageIcon } from 'lucide-react'
import { generateOrderImage } from '../lib/orderImage'

interface BranchItems {
  branch: string
  items: { name: string; quantity: number }[]
  notes?: string
}

interface Props {
  open: boolean
  supplier: string
  supplierPhone: string
  branches: BranchItems[]
  adminPhone: string
  messageText: string
  onClose: () => void
  onSent: () => void
}

function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  const wa = digits.startsWith('972')
    ? digits
    : digits.startsWith('0')
    ? '972' + digits.slice(1)
    : digits
    ? '972' + digits
    : ''
  return wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`
}

export default function DispatchPreviewModal({
  open,
  supplier,
  supplierPhone,
  branches,
  adminPhone,
  messageText,
  onClose,
  onSent,
}: Props) {
  const [adminNote, setAdminNote] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const genSeq = useRef(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const noteId = useId()
  const titleId = useId()

  useEffect(() => {
    if (!open) {
      setAdminNote('')
      setPreviewUrl(null)
      setBlob(null)
      setError(null)
      return
    }
  }, [open])

  // Regenerate image when note changes (debounced)
  useEffect(() => {
    if (!open) return
    const seq = ++genSeq.current
    setLoading(true)
    setError(null)
    const t = setTimeout(async () => {
      try {
        const b = await generateOrderImage({
          supplier,
          branches,
          adminPhone,
          adminNote,
        })
        if (seq !== genSeq.current) return
        setBlob(b)
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(b)
        })
      } catch (e) {
        if (seq === genSeq.current) setError('שגיאה ביצירת התמונה')
      } finally {
        if (seq === genSeq.current) setLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [open, adminNote, supplier, branches, adminPhone])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Escape to close + focus trap
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const finalText = adminNote.trim()
    ? `📢 *הודעה חשובה:* ${adminNote.trim()}\n\n${messageText}`
    : messageText

  const handleShare = async () => {
    if (!blob) return
    const file = new File([blob], `order-${supplier}-${Date.now()}.png`, {
      type: 'image/png',
    })
    try {
      const nav = navigator as Navigator & {
        canShare?: (d: { files?: File[] }) => boolean
      }
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text: finalText, title: `הזמנה - ${supplier}` })
        onSent()
        return
      }
    } catch {
      // user cancelled or unsupported — fall through
    }
    // Fallback: download image, open WhatsApp with text
    downloadImage(file)
    window.open(buildWhatsAppUrl(supplierPhone, finalText), '_blank')
    onSent()
  }

  const handleDownload = () => {
    if (!blob) return
    downloadImage(new File([blob], `order-${supplier}-${Date.now()}.png`, { type: 'image/png' }))
  }

  const handleTextOnly = () => {
    window.open(buildWhatsAppUrl(supplierPhone, finalText), '_blank')
    onSent()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[95vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
          <div>
            <h3 id={titleId} className="font-black text-primary text-base">תצוגה מקדימה</h3>
            <p className="text-primary/50 text-xs">{supplier}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="p-2 text-primary/50 hover:text-primary active:scale-90 touch-manipulation"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Admin note */}
          <div>
            <label htmlFor={noteId} className="flex items-center gap-1.5 text-primary font-black text-sm mb-1.5">
              <MessageSquare size={14} aria-hidden="true" />
              הערה אישית לספק (אופציונלי)
            </label>
            <textarea
              id={noteId}
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="לדוגמה: נא לוודא טריות העגבניות, חסר מלפפון מהמשלוח הקודם..."
              rows={3}
              maxLength={200}
              className="w-full bg-primary/5 text-primary rounded-xl p-3 text-sm font-bold resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-primary/30 placeholder:font-medium"
            />
            <p className="text-primary/40 text-xs mt-1 text-left">{adminNote.length}/200</p>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center gap-1.5 text-primary font-black text-sm mb-1.5">
              <ImageIcon size={14} />
              תצוגה מקדימה של התמונה
            </div>
            <div className="bg-primary/5 rounded-2xl p-3 flex items-center justify-center min-h-[260px]">
              {loading && !previewUrl ? (
                <Loader2 size={28} className="text-primary/40 animate-spin" />
              ) : error ? (
                <p className="text-red-600 text-sm font-bold">{error}</p>
              ) : previewUrl ? (
                <div className="relative w-full">
                  <img
                    src={previewUrl}
                    alt="תצוגה מקדימה"
                    className="w-full rounded-xl shadow-md"
                  />
                  {loading && (
                    <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow">
                      <Loader2 size={16} className="text-primary animate-spin" />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-primary/10 space-y-2">
          <button
            onClick={handleShare}
            disabled={!blob || loading}
            className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-black py-3.5 rounded-2xl text-base active:scale-95 touch-manipulation disabled:opacity-50 shadow-md"
          >
            <Send size={18} />
            שלח לוואטסאפ (תמונה + טקסט)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              disabled={!blob || loading}
              className="flex items-center justify-center gap-1.5 bg-primary/10 text-primary font-bold py-2.5 rounded-xl text-sm active:scale-95 touch-manipulation disabled:opacity-50"
            >
              <Download size={15} />
              הורד תמונה
            </button>
            <button
              onClick={handleTextOnly}
              className="flex items-center justify-center gap-1.5 bg-primary/10 text-primary font-bold py-2.5 rounded-xl text-sm active:scale-95 touch-manipulation"
            >
              <MessageSquare size={15} />
              טקסט בלבד
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function downloadImage(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
