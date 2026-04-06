// פרסור קבצי Excel/CSV למוצרים

export interface ParsedProduct {
  name: string
  price: number
  category?: string
}

// פרסור קובץ CSV
export const parseCSV = (content: string): ParsedProduct[] => {
  const lines = content.split('\n').filter(line => line.trim())
  const products: ParsedProduct[] = []

  // דלג על שורת הכותרת
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // תמיכה בפסיקים ונקודה-פסיק
    const values = line.split(/[,;]/).map(v => v.trim())
    
    if (values.length >= 2) {
      const name = values[0]
      const priceStr = values[1].replace(/[^\d.]/g, '') // הסר תווים לא מספריים
      const price = parseFloat(priceStr)
      const category = values[2] || undefined

      if (name && !isNaN(price) && price > 0) {
        products.push({ name, price, category })
      }
    }
  }

  return products
}

// פרסור קובץ טקסט פשוט
export const parseText = (content: string): ParsedProduct[] => {
  const lines = content.split('\n').filter(line => line.trim())
  const products: ParsedProduct[] = []

  for (const line of lines) {
    // חיפוש דפוס: שם מוצר + מחיר
    // תומך בפורמטים: "חלב 15.90", "חלב - 15.90", "חלב: 15.90"
    const match = line.match(/^(.+?)[\s\-:]+(\d+\.?\d*)/)
    
    if (match) {
      const name = match[1].trim()
      const price = parseFloat(match[2])

      if (name && !isNaN(price) && price > 0) {
        products.push({ name, price })
      }
    }
  }

  return products
}

// פרסור אוטומטי לפי סוג הקובץ
export const parseFile = async (file: File): Promise<ParsedProduct[]> => {
  const content = await file.text()
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'csv':
      return parseCSV(content)
    case 'txt':
      return parseText(content)
    default:
      // נסה CSV כברירת מחדל
      try {
        const csvProducts = parseCSV(content)
        if (csvProducts.length > 0) return csvProducts
      } catch (e) {
        // אם נכשל, נסה טקסט פשוט
        return parseText(content)
      }
      return []
  }
}

// ולידציה של מוצרים
export const validateProducts = (products: ParsedProduct[]): {
  valid: ParsedProduct[]
  errors: string[]
} => {
  const valid: ParsedProduct[] = []
  const errors: string[] = []

  products.forEach((product, index) => {
    if (!product.name || product.name.length < 2) {
      errors.push(`שורה ${index + 1}: שם מוצר לא תקין`)
    } else if (!product.price || product.price <= 0) {
      errors.push(`שורה ${index + 1}: מחיר לא תקין`)
    } else {
      valid.push(product)
    }
  })

  return { valid, errors }
}

// יצירת קובץ דוגמה
export const generateSampleCSV = (): string => {
  return `שם מוצר,מחיר,קטגוריה
חלב 3%,15.90,חלב
לחם לבן,8.50,מאפים
עגבניות ק"ג,12.90,ירקות
עוף שלם ק"ג,24.90,בשר
גבינה צהובה,32.90,חלב
מלפפון,5.90,ירקות
חזה עוף ק"ג,39.90,בשר
יוגורט,4.90,חלב`
}

// הורדת קובץ דוגמה
export const downloadSampleCSV = () => {
  const content = generateSampleCSV()
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'דוגמה_מוצרים.csv'
  link.click()
}
