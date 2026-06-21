// Hook לפעולות-כתיבה של האדמין על הקטלוג המרכזי (Task 9). עוטף את commitCatalogOperations:
// מנהל מצב committing/error/warnings, ומחיל את ה-snapshot החדש על ה-store בהצלחה (full-replace
// סמכותי — הקטלוג הוא מקור-האמת). ה-session עצמו (PIN→token) מנוהל ב-priceAdminSession.

import { useCallback, useRef, useState } from 'react'
import type { ChangeOperation } from '../../shared/priceCatalog/types'
import { commitCatalogOperations, type CommitAttempt } from '../lib/priceCatalogWrites'
import { useSuppliersStore } from '../stores/suppliersStore'

// קודי שגיאה מהשרת/הלקוח → עברית ידידותית.
const ERROR_HE: Record<string, string> = {
  no_session: 'פג תוקף הרשאת האדמין — היכנס מחדש עם 9999',
  no_version: 'אין חיבור לקטלוג המרכזי — בדוק חיבור ונסה שוב',
  stale_version: 'הקטלוג עודכן במקביל — נסה שוב',
  version_conflict: 'עדכון מקביל התנגש — נסה שוב',
  expired: 'תוקף הפעולה פג — נסה שוב',
  not_found: 'המוצר לא קיים בקטלוג המרכזי',
  not_pending: 'הפעולה כבר טופלה — רענן ונסה שוב',
  idempotency_key_conflict: 'השינוי כבר נשמר — רענן את המסך',
  forbidden: 'אין הרשאת כתיבה',
  invalid_request: 'בקשה שגויה — נסה שוב',
  unauthorized: 'פג תוקף הרשאת האדמין — היכנס מחדש עם 9999',
  network_error: 'תקלת רשת — נסה שוב',
}

function toHebrew(error: string): string {
  return ERROR_HE[error] ?? `השמירה נכשלה (${error})`
}

export interface PriceAdminSession {
  committing: boolean
  error: string | null
  warnings: string[]
  // attempt: אובייקט-ניסיון יציב (idempotencyKey + changeSetId שמתעדכן). לפעולות-הוספה יש להעביר
  // אובייקט שנשמר ב-ref כדי שניסיון-חוזר ימשיך מאותו changeSet. לעדכון/השבתה אפשר להשמיט.
  commit: (operations: ChangeOperation[], attempt?: CommitAttempt) => Promise<boolean>
  clearError: () => void
}

export function usePriceAdminSession(): PriceAdminSession {
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  // נעילת re-entrancy סינכרונית — committing (state) מתעדכן אסינכרונית, כך ש-Enter כפול/לחיצה
  // כפולה יכלו להריץ שני commits במקביל. ה-ref חוסם זאת מיד, ומכסה את כל הקוראים.
  const inFlight = useRef(false)

  const commit = useCallback(async (operations: ChangeOperation[], attempt?: CommitAttempt): Promise<boolean> => {
    if (inFlight.current) return false
    inFlight.current = true
    setCommitting(true)
    setError(null)
    setWarnings([])
    try {
      const result = await commitCatalogOperations(operations, attempt)
      if (!result.ok) {
        setError(toHebrew(result.error))
        return false
      }
      // החלה סמכותית: ה-snapshot שחזר (כולל השינוי) מחליף את ה-products המקומיים.
      useSuppliersStore.getState().replaceCatalogProducts(result.products, result.version)
      setWarnings(result.warnings)
      return true
    } finally {
      inFlight.current = false
      setCommitting(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])
  return { committing, error, warnings, commit, clearError }
}
