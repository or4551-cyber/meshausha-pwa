import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  /** "compact" — לרשימות קטנות. "default" — מסך מלא. */
  size?: 'default' | 'compact'
}

/**
 * רכיב אחיד למצבים ריקים. השתמש כאשר API מחזיר רשימה ריקה
 * או כשהמשתמש עדיין לא יצר כלום. מחליף את הטקסט הריק שקיים בכמה דפים.
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = 'default',
}: EmptyStateProps) {
  const isCompact = size === 'compact'

  return (
    <div className={`text-center ${isCompact ? 'py-6' : 'py-12'}`}>
      <Icon
        className="mx-auto text-secondary/30 mb-4"
        size={isCompact ? 40 : 64}
        aria-hidden
      />
      <p className={`text-secondary font-black ${isCompact ? 'text-base' : 'text-lg'} mb-1`}>
        {title}
      </p>
      {description && (
        <p className={`text-secondary/60 font-bold ${isCompact ? 'text-xs' : 'text-sm'} max-w-xs mx-auto`}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 bg-secondary text-primary font-black py-3 px-6 rounded-xl active:scale-95 transition-transform touch-manipulation"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
