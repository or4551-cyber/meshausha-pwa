interface SparklineProps {
  /** ערכים לפי חודש מהישן לחדש (אורך זהה למספר העמודות) */
  data: number[]
  width?: number
  height?: number
  className?: string
  /** האם להציג tooltip עם הערך האחרון */
  showLastValue?: boolean
}

/**
 * SVG sparkline קטן בלי תלויות חיצוניות. שימוש: בכרטיס מוצר —
 * מציג כמה הוזמן מהמוצר הזה ב-N חודשים אחרונים. אורך הdata קובע את מספר העמודות.
 * אם כל הערכים אפס, מחזיר null (לא מציג כלום).
 */
export default function Sparkline({
  data,
  width = 60,
  height = 18,
  className = '',
  showLastValue = false,
}: SparklineProps) {
  if (data.length === 0) return null
  const max = Math.max(...data)
  if (max === 0) return null

  const barWidth = width / data.length
  const gap = Math.min(1.5, barWidth * 0.18)

  return (
    <span className={`inline-flex items-end gap-1 ${className}`} aria-hidden>
      <svg width={width} height={height} className="block flex-shrink-0">
        {data.map((v, i) => {
          const h = max > 0 ? Math.max(1, (v / max) * height) : 0
          const isLast = i === data.length - 1
          return (
            <rect
              key={i}
              x={i * barWidth + gap / 2}
              y={height - h}
              width={Math.max(1, barWidth - gap)}
              height={h}
              rx={1}
              className={isLast ? 'fill-primary' : 'fill-primary/40'}
            />
          )
        })}
      </svg>
      {showLastValue && (
        <span className="text-xs font-bold text-primary/70 leading-none">
          {data[data.length - 1]}
        </span>
      )}
    </span>
  )
}
