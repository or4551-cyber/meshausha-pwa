import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
}

/** placeholder עם pulse ל-loading states. השימוש: <Skeleton className="h-12 w-full" /> */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-secondary/20 rounded-xl', className)}
      aria-hidden
    />
  )
}

/** קלוד מובנה לרשימת כרטיסים — שימושי ב-OrdersPage / HistoryPage / Dashboard בעת fetch */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-secondary/10 rounded-3xl p-5">
          <Skeleton className="h-5 w-2/3 mb-3" />
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
