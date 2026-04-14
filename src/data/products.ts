export interface Product {
  id: string
  name: string
  supplier: string
  price: number
  category?: string
}

export const PRODUCTS: Product[] = [
  { id: 'ea1', name: 'קובה במילוי צמחי מטוגן בד"צ', supplier: 'חטיפי אלקיים', price: 82.5 },
  { id: 'ea2', name: 'קובה אמיתי 100 גרם במילוי בשר בד"צ', supplier: 'חטיפי אלקיים', price: 82.5 },
  
  { id: 'mf1', name: 'דלי 18 ק"ג טחינה גולמית', supplier: 'מוטיפוד בע"מ', price: 238.45 },
  
  // גביעים ומכסים
  { id: 'tp1', name: 'גביע 1000מ"ק - רחב (174) ל500 יח\' (מחיר לקרטון)', supplier: 'טרה פלסט (משאוושה)', price: 150.0 },
  { id: 'tp2', name: 'גביע 500 רחב מודפס 1000 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 287.17 },
  { id: 'tp3', name: 'מכסה לגביע רחב מודפס 1000 יח\' A30', supplier: 'טרה פלסט (משאוושה)', price: 219.35 },
  { id: 'tp4', name: 'גביע 250מ"ק - צר (247) (ארוז 2000 יח\')', supplier: 'טרה פלסט (משאוושה)', price: 230.0 },
  { id: 'tp5', name: 'מכסה לגביע צר מודפס 239 לבן 1000 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 294.4 },
  { id: 'tp6', name: 'קסרל פלסט-לבן-רגיל 20 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 1.8 },
  { id: 'tp7', name: 'גביע רוטב 1.5 אוז 2500 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 120.0 },
  { id: 'tp8', name: 'מכסה לגביע רוטב oz1.5-2 שקוף 2500 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 120.0 },
  { id: 'tp9', name: 'גביע 120 גנוב 2000 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 240.0 },
  { id: 'tp10', name: 'גביע אמריקאי 500 אור 300 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 180.0 },
  // כוסות
  { id: 'tp11', name: 'כוס יהלום 1000 יח\' (25חב\'*40יח\')', supplier: 'טרה פלסט (משאוושה)', price: 100.0 },
  { id: 'tp12', name: 'כוס/גביע 97 כוס 1/3 (1000n) (כוס 533)', supplier: 'טרה פלסט (משאוושה)', price: 180.0 },
  { id: 'tp13', name: 'מכסה לכוס (95) כיפתי 1/3 1/2 (97+98) ל1000 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 100.0 },
  { id: 'tp14', name: 'כוס קרטון oz2 ל1000 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 40.0 },
  // קערות ירושלמיות
  { id: 'tp15', name: 'קערה ירושלמית שחורה 500 מ"ל (ארוז 350 יח\')', supplier: 'טרה פלסט (משאוושה)', price: 176.42 },
  { id: 'tp16', name: 'קערה ירושלמית שחורה 1000 מ"ל (ארוז 200 יח\')', supplier: 'טרה פלסט (משאוושה)', price: 153.0 },
  { id: 'tp17', name: 'מכסה לקערה ירושלמית שחורה 750-500 מ"ל (ארוז 350 יח\')', supplier: 'טרה פלסט (משאוושה)', price: 127.4 },
  // סכו"ם ופריטי שולחן
  { id: 'tp18', name: 'מזלגות קשיחים M שקוף/קרם 50 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 3.2 },
  { id: 'tp19', name: 'כפות פלסטיק קשיחות 50 יח\' M', supplier: 'טרה פלסט (משאוושה)', price: 3.3 },
  { id: 'tp20', name: 'סכום קשיח ארוז 5 פריטים 500 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 100.0 },
  { id: 'tp21', name: 'פלסמנט 1000 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 36.0 },
  { id: 'tp22', name: 'קש בודד חד פעמי 400 יח\' ארומה', supplier: 'טרה פלסט (משאוושה)', price: 9.8 },
  // שקיות
  { id: 'tp23', name: 'שקית נייר פיתה מודפסת 2000 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 178.0 },
  { id: 'tp24', name: 'שקית גופיה מודפסת גדולה 2500 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 287.5 },
  { id: 'tp25', name: 'שקית גופיה מודפסת קטנה 4000 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 280.0 },
  { id: 'tp26', name: 'שקיות למשלוחים נייר דליה+ידית מלבנית 32/16/38 (גיילורד) 200 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 134.0 },
  // תבניות אלומיניום
  { id: 'tp27', name: 'תבנית אלומיניום 5 (ארוז 1000 יח\') ל-ח\'', supplier: 'טרה פלסט (משאוושה)', price: 0.33 },
  // אשפה
  { id: 'tp28', name: 'אשפתון שחור 75 יח\' בגליל כ-20 גלילים', supplier: 'טרה פלסט (משאוושה)', price: 125.0 },
  // ניקיון
  { id: 'tp29', name: 'נייר ניגוב תעשייתי 400מטר-חצלה', supplier: 'טרה פלסט (משאוושה)', price: 70.0 },
  { id: 'tp30', name: 'מגבונים בודד לניקוי 400 מגבות (פז/גומץ)', supplier: 'טרה פלסט (משאוושה)', price: 15.0 },
  { id: 'tp31', name: 'נוזל ניקוי רצפות 4 ליטר PRO SA 100 / בריצת X4', supplier: 'טרה פלסט (משאוושה)', price: 34.0 },
  { id: 'tp32', name: 'מסיר שומנים 4 ליטר X4', supplier: 'טרה פלסט (משאוושה)', price: 60.0 },
  { id: 'tp33', name: 'כלור תקני גלון 4 ליטר X4', supplier: 'טרה פלסט (משאוושה)', price: 27.6 },
  { id: 'tp34', name: 'סבון נוזלי 500 מ"ל+משאבה (פאל/שחת)', supplier: 'טרה פלסט (משאוושה)', price: 11.46 },
  { id: 'tp35', name: 'משחת כלים 18 ל\' (15 ק"ג)', supplier: 'טרה פלסט (משאוושה)', price: 68.0 },
  { id: 'tp36', name: 'מטליות ברזל 30 גר\' 12 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 14.9 },
  { id: 'tp37', name: 'כרית ענקית איכותית עבה (שיין/טייפון) 36 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 28.8 },
  // כפפות
  { id: 'tp38', name: 'כפפות ניטרל מידה S מארז 100 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 22.0 },
  { id: 'tp39', name: 'כפפות ניטרל מידה M מארז 100 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 22.0 },
  { id: 'tp40', name: 'כפפות ניטרל מידה L מארז 100 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 22.0 },
  { id: 'tp41', name: 'כפפות ניטרל מידה XL מארז 100 יח\'', supplier: 'טרה פלסט (משאוושה)', price: 22.0 },
  
  // יבולי שדה תמרה — מחירון מעודכן
  { id: 'ys1',  name: 'חומוס מקומי 25 קג בר',            supplier: 'יבולי שדה תמרה', price: 150.0 },
  { id: 'ys2',  name: 'פול אנגלי 25 קג',                supplier: 'יבולי שדה תמרה', price: 120.0 },
  { id: 'ys3',  name: 'מלפפון במלח 176-200 ליטר',       supplier: 'יבולי שדה תמרה', price: 50.0  },
  { id: 'ys4',  name: 'פלפל שיפקה 9 ליטר',              supplier: 'יבולי שדה תמרה', price: 38.0  },
  { id: 'ys5',  name: 'לפת דלי 10 קג',                  supplier: 'יבולי שדה תמרה', price: 60.0  },
  { id: 'ys6',  name: 'זיתים סורי דלי 10 קג',           supplier: 'יבולי שדה תמרה', price: 115.0 },
  { id: 'ys7',  name: 'שמן סויה גלון 16 קג',            supplier: 'יבולי שדה תמרה', price: 115.0 },
  { id: 'ys8',  name: 'מיץ לימון יכין 4 ליטר',          supplier: 'יבולי שדה תמרה', price: 13.0  },
  { id: 'ys9',  name: 'מלח לימון לפי קג',               supplier: 'יבולי שדה תמרה', price: 25.0  },
  { id: 'ys10', name: 'מלח שולחן 12 קג',                supplier: 'יבולי שדה תמרה', price: 25.0  },
  { id: 'ys11', name: 'ספריי חלנות אגקס 750 מ"ל',       supplier: 'יבולי שדה תמרה', price: 12.4  },
  { id: 'ys12', name: 'סוכר חבילה 10 קג',               supplier: 'יבולי שדה תמרה', price: 48.0  },
  { id: 'ys13', name: "ספריי נגד ג'וקים",               supplier: 'יבולי שדה תמרה', price: 25.0  },
  { id: 'ys14', name: 'קיסמי שיניים עטופים',            supplier: 'יבולי שדה תמרה', price: 10.0  },
  { id: 'ys15', name: 'סמרטוט ריצפה',                   supplier: 'יבולי שדה תמרה', price: 4.5   },
  { id: 'ys16', name: 'כפפות לטקס 100 יח\'',            supplier: 'יבולי שדה תמרה', price: 17.0  },
  { id: 'ys17', name: 'אשפתון שחור בגליל',              supplier: 'יבולי שדה תמרה', price: 20.0  },
  { id: 'ys18', name: 'משחת כלים דלי 16 קג',            supplier: 'יבולי שדה תמרה', price: 65.0  },
  { id: 'ys19', name: 'גופיה צבעונית 15 קג',             supplier: 'יבולי שדה תמרה', price: 120.0 },
  { id: 'ys20', name: 'נילון נצמד מוסדי',               supplier: 'יבולי שדה תמרה', price: 20.0  },
  { id: 'ys21', name: 'אקונומיקה 4 ליטר רגיל',         supplier: 'יבולי שדה תמרה', price: 8.9   },
  { id: 'ys22', name: 'ברזלית 1/24',                    supplier: 'יבולי שדה תמרה', price: 36.0  },
  { id: 'ys23', name: 'שקיות סנדוויץ\'',               supplier: 'יבולי שדה תמרה', price: 10.0  },
  { id: 'ys24', name: 'מטאטא דק',                       supplier: 'יבולי שדה תמרה', price: 10.0  },
  { id: 'ys25', name: 'מקל עץ',                         supplier: 'יבולי שדה תמרה', price: 10.0  },
  { id: 'ys26', name: 'מגב סטנדרטי',                    supplier: 'יבולי שדה תמרה', price: 15.0  },
  { id: 'ys27', name: 'יעה פלסטיק',                     supplier: 'יבולי שדה תמרה', price: 55.0  },
  { id: 'ys28', name: 'סינר חד פעמי',                   supplier: 'יבולי שדה תמרה', price: 7.0   },
  { id: 'ys29', name: 'סודה לשתייה לפי קג',             supplier: 'יבולי שדה תמרה', price: 15.0  },
  { id: 'ys30', name: 'קטשופ מנות הלמנס 1000 יח\'',    supplier: 'יבולי שדה תמרה', price: 135.0 },
  { id: 'ys31', name: 'אבקת אפייה לפי קג',              supplier: 'יבולי שדה תמרה', price: 15.0  },
  { id: 'ys32', name: 'צנובר סיני בנוני לפי קג',        supplier: 'יבולי שדה תמרה', price: 95.0  },
  { id: 'ys33', name: 'פלפל שטה חריף',                  supplier: 'יבולי שדה תמרה', price: 28.0  },
  { id: 'ys34', name: 'כמון טחון לפי קג',               supplier: 'יבולי שדה תמרה', price: 28.0  },
  { id: 'ys35', name: 'תבלין גריל עוף ברמן',            supplier: 'יבולי שדה תמרה', price: 22.0  },
  { id: 'ys36', name: 'בוטנים מטוגנים גרוסים',          supplier: 'יבולי שדה תמרה', price: 1.2   },
  { id: 'ys37', name: 'כריות יפניות סנו',               supplier: 'יבולי שדה תמרה', price: 25.0  },
  { id: 'ys38', name: 'מיונז מנות 1000 יח\'',           supplier: 'יבולי שדה תמרה', price: 120.0 },
  { id: 'ys39', name: 'פלפל שחור גרוס',                 supplier: 'יבולי שדה תמרה', price: 38.0  },
  { id: 'ys40', name: 'מלח מנות 1000 יח\'',             supplier: 'יבולי שדה תמרה', price: 18.0  },
  { id: 'ys41', name: 'פלפל שחור מנות 1000 יח\' 15 גר', supplier: 'יבולי שדה תמרה', price: 20.0  },
  
  { id: 'tf1', name: 'ציפס סטייק 17.5 ק"ג בקרטון', supplier: 'תפוכן', price: 148.75 },
  { id: 'tf2', name: 'כרובית סנפרוסט 10 ק"ג בקרטון', supplier: 'תפוכן', price: 149.0 },
  { id: 'tf3', name: 'בצל קלוף שורש', supplier: 'תפוכן', price: 5.4 },
  { id: 'tf4', name: 'כרובית קפואה מהדרין 10 קג בקרטון', supplier: 'תפוכן', price: 220.0 }
]

export const SUPPLIERS = Array.from(new Set(PRODUCTS.map(p => p.supplier)))

// ספקים ראשוניים עם ID קבוע — יוזרעו לstore בהפעלה ראשונה
export const INITIAL_SUPPLIERS = [
  {
    id: 'static_supplier_alkayim',
    name: 'חטיפי אלקיים',
    description: 'חטיפים ומאפים',
    schedules: [],
    email: '',
    contactPerson: '',
    phone: '',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'static_supplier_motifood',
    name: 'מוטיפוד בע"מ',
    description: 'טחינה ומוצרי מזון',
    schedules: [],
    email: '',
    contactPerson: '',
    phone: '',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'static_supplier_teraplast',
    name: 'טרה פלסט (משאוושה)',
    description: 'אריזות, כלים וניקיון',
    schedules: [],
    email: '',
    contactPerson: '',
    phone: '',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'static_supplier_yevulei',
    name: 'יבולי שדה תמרה',
    description: 'ירקות, פירות, תבלינים ושמנים',
    schedules: [],
    email: '',
    contactPerson: '',
    phone: '',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'static_supplier_tapuchen',
    name: 'תפוכן',
    description: 'ירקות קפואים',
    schedules: [],
    email: '',
    contactPerson: '',
    phone: '',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]
