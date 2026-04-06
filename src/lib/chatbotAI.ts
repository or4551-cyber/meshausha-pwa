// מערכת זיהוי כוונות פשוטה לבוט

export interface Intent {
  name: string
  confidence: number
  keywords: string[]
}

// מילות מפתח לכל כוונה
const INTENTS = {
  ORDER_NEW: {
    keywords: ['הזמנה', 'להזמין', 'רוצה להזמין', 'הזמנה חדשה', 'לקנות', 'לרכוש', 'מוצרים', 'ספק'],
    response: 'מעולה! אני מעביר אותך לדף ההזמנות 📦',
    action: 'navigate:/orders'
  },
  HISTORY: {
    keywords: ['היסטוריה', 'הזמנות קודמות', 'מה הזמנתי', 'הזמנות שעברו', 'היסטוריית הזמנות'],
    response: 'אני מעביר אותך להיסטוריית ההזמנות 📋',
    action: 'navigate:/history'
  },
  FAVORITES: {
    keywords: ['מועדפים', 'כוכבים', 'איך לשמור', 'שמירת מוצרים', 'מוצרים מועדפים'],
    response: 'כדי להשתמש במועדפים:\n\n1️⃣ בדף המוצרים, לחץ על הכוכב ליד המוצר\n2️⃣ המוצר יישמר במועדפים שלך\n3️⃣ לחץ על כפתור "מועדפים" כדי לראות רק מוצרים מועדפים\n\nזה חוסך זמן בהזמנות הבאות! ⚡',
    action: 'info'
  },
  TEMPLATES: {
    keywords: ['תבנית', 'תבניות', 'לשמור הזמנה', 'הזמנה חוזרת', 'איך לשמור'],
    response: 'כדי לשמור תבנית הזמנה:\n\n1️⃣ צור הזמנה רגילה\n2️⃣ בדף הסיכום, לחץ על "שמור תבנית"\n3️⃣ תן שם לתבנית\n4️⃣ בפעם הבאה תוכל לטעון אותה מהר!\n\nמושלם להזמנות חוזרות 🔄',
    action: 'info'
  },
  REORDER: {
    keywords: ['להזמין שוב', 'הזמנה חוזרת', 'כמו בפעם הקודמת', 'אותה הזמנה', 'שוב'],
    response: 'כדי להזמין שוב:\n\n1️⃣ עבור להיסטוריית הזמנות\n2️⃣ בחר הזמנה\n3️⃣ לחץ על "הזמן שוב" או "ערוך והזמן"\n\nזה מהיר וקל! 🚀',
    action: 'info'
  },
  HELP: {
    keywords: ['עזרה', 'לא מבין', 'איך', 'מה עושים', 'תעזור לי', 'צריך עזרה'],
    response: 'אני כאן לעזור! במה אתה צריך עזרה?',
    action: 'main_menu'
  },
  ADMIN_DASHBOARD: {
    keywords: ['דשבורד', 'אנליטיקה', 'סטטיסטיקות', 'גרפים', 'נתונים'],
    response: 'מעביר אותך לדשבורד האנליטי המתקדם 📊',
    action: 'navigate:/admin/dashboard'
  },
  ADMIN_PRICES: {
    keywords: ['מחירים', 'לעדכן מחיר', 'שינוי מחיר', 'ניהול מחירים'],
    response: 'מעביר אותך לניהול מחירים 💰',
    action: 'navigate:/admin/prices'
  },
  ADMIN_REPORTS: {
    keywords: ['דוחות', 'דוח', 'כלכלי', 'הכנסות', 'הוצאות'],
    response: 'מעביר אותך לדוחות כלכליים 📈',
    action: 'navigate:/admin/reports'
  },
  GREETING: {
    keywords: ['שלום', 'היי', 'הי', 'בוקר טוב', 'ערב טוב', 'מה קורה'],
    response: 'שלום! 👋 שמח לעזור לך היום!',
    action: 'main_menu'
  },
  THANKS: {
    keywords: ['תודה', 'תודה רבה', 'אחלה', 'מעולה', 'יפה'],
    response: 'בכיף! 😊 יש עוד משהו שאוכל לעזור בו?',
    action: 'main_menu'
  }
}

// זיהוי כוונה מטקסט
export const detectIntent = (text: string): Intent | null => {
  const normalizedText = text.toLowerCase().trim()
  
  let bestMatch: { name: string; confidence: number } | null = null
  
  for (const [intentName, intentData] of Object.entries(INTENTS)) {
    let matchCount = 0
    const keywords = intentData.keywords
    
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchCount++
      }
    }
    
    if (matchCount > 0) {
      const confidence = matchCount / keywords.length
      
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { name: intentName, confidence }
      }
    }
  }
  
  if (bestMatch && bestMatch.confidence > 0.2) {
    return {
      name: bestMatch.name,
      confidence: bestMatch.confidence,
      keywords: INTENTS[bestMatch.name as keyof typeof INTENTS].keywords
    }
  }
  
  return null
}

// קבלת תגובה לכוונה
export const getIntentResponse = (intentName: string): { response: string; action: string } => {
  const intent = INTENTS[intentName as keyof typeof INTENTS]
  if (intent) {
    return {
      response: intent.response,
      action: intent.action
    }
  }
  
  return {
    response: 'מצטער, לא הבנתי. אתה יכול לבחור מהאופציות למטה 😊',
    action: 'main_menu'
  }
}

// הצעות חכמות על בסיס היסטוריה
export const getSmartSuggestions = (orderHistory: any[], currentTime: Date): string[] => {
  const suggestions: string[] = []
  
  // בדיקה אם זה יום ראשון (יום הזמנות טיפוסי)
  if (currentTime.getDay() === 0) {
    suggestions.push('💡 היום יום ראשון - זמן טוב להזמנה שבועית!')
  }
  
  // בדיקה אם עבר זמן מההזמנה האחרונה
  if (orderHistory.length > 0) {
    const lastOrder = new Date(orderHistory[0].createdAt)
    const daysSinceLastOrder = Math.floor((currentTime.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceLastOrder >= 7) {
      suggestions.push(`⏰ עברו ${daysSinceLastOrder} ימים מההזמנה האחרונה`)
    }
  }
  
  // זיהוי דפוס הזמנות
  if (orderHistory.length >= 3) {
    const recentOrders = orderHistory.slice(0, 3)
    const commonItems = findCommonItems(recentOrders)
    
    if (commonItems.length > 0) {
      suggestions.push(`🔄 מוצרים שאתה מזמין לעיתים קרובות: ${commonItems.slice(0, 3).join(', ')}`)
    }
  }
  
  return suggestions
}

// מציאת מוצרים נפוצים
const findCommonItems = (orders: any[]): string[] => {
  const itemCounts: Record<string, number> = {}
  
  orders.forEach(order => {
    order.items.forEach((item: any) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + 1
    })
  })
  
  return Object.entries(itemCounts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name)
}

// קיצורי דרך חכמים
export const SMART_SHORTCUTS = {
  'הזמן כמו בשבוע שעבר': {
    description: 'העתק את ההזמנה האחרונה',
    action: 'copy_last_order'
  },
  'הוסף מוצרים פופולריים': {
    description: 'הוסף את המוצרים הנפוצים שלך',
    action: 'add_popular_items'
  },
  'צור תבנית מהיסטוריה': {
    description: 'שמור הזמנה קודמת כתבנית',
    action: 'create_template_from_history'
  }
}
