import { X, PlayCircle } from 'lucide-react'

// ─── החלף כאן את ה-URL לאחר העלאה ל-YouTube ───────────────────────────────
export const BRANCH_VIDEO_URL = 'https://youtu.be/a_vgR3wdpds'
export const ADMIN_VIDEO_URL  = 'https://youtu.be/-toKVN0UvJA'
// ────────────────────────────────────────────────────────────────────────────

function toEmbedUrl(url: string): string {
  if (!url) return ''
  // https://www.youtube.com/watch?v=ID  →  embed/ID
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&rel=0`
  // https://youtu.be/ID  →  embed/ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&rel=0`
  return url
}

interface VideoModalProps {
  url: string
  title: string
  onClose: () => void
}

export function VideoModal({ url, title, onClose }: VideoModalProps) {
  const embedUrl = toEmbedUrl(url)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-primary rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-secondary">
          <button
            onClick={onClose}
            className="text-primary hover:text-primary/70 active:scale-90 transition-all touch-manipulation"
            aria-label="סגור"
          >
            <X size={22} />
          </button>
          <h3 className="font-black text-primary text-base">{title}</h3>
          <div className="w-6" />
        </div>

        {/* Video area */}
        {embedUrl ? (
          <div className="relative" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PlayCircle className="text-secondary/30" size={64} />
            <p className="text-secondary/50 font-bold text-center px-6">
              הסרטון יהיה זמין בקרוב
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
