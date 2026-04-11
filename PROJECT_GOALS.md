# PROJECT_GOALS.md - Meshausha | נקודת התייחסות מלאה

---

## מהי האפליקציה - הקונספט המלא

**משאוושה** היא מערכת PWA לניהול הזמנות רכש לרשת החומוסיות **"משאוושה"** - 9 סניפים בצפון ישראל,
עם פוטנציאל גדילה לסניפים נוספים בעתיד.

### זרימת העבודה הבסיסית
```
מנהל סניף נכנס עם PIN
  → בוחר ספק → בוחר מוצרים → שולח ב-WhatsApp
  → ההזמנה נשמרת במערכת

אדמין
  → רואה כל הזמנות כל הסניפים
  → מנהל ספקים + מחירים + חשבוניות
  → שולח מיילים לספקים לבקש חשבוניות
  → מנתח הפרשי מחירים
  → שולח Push notifications לסניפים
```

### 9 סניפים (PINs 1001-1009)
עין המפרץ, ביאליק קרן היסוד, מוצקין הילדים, צור שלום, גושן 60,
נהריה הגעתון, ההסתדרות, משכנות האומנים, רון קריית ביאליק
אדמין: PIN 9999

### ספקים קיימים (מ-products.ts)
- **טרה פלסט** - 156 מוצרים (אריזות, כלים, ניקיון)
- **יבולי שדה תמרה** - 41 מוצרים (תוצרת, שמנים)
- **תפוכן** - 4 מוצרים (קפואים)
- **חטיפי אלקיים** - 2 מוצרים
- **מוטיפוד** - 1 מוצר

### ארכיטקטורה
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand (5 stores) + localStorage persistence
- **Backend**: Netlify Functions (serverless)
- **DB מקומי**: Dexie/IndexedDB (מותקן, לא בשימוש עדיין)
- **עיצוב**: Maroon primary (#9d4444), Cream secondary (#f5f0e8)
- **שפה**: עברית RTL לכל ממשק משתמש

---

## סדר עדיפויות לפיתוח

### שלב 1 - תיקון בגים קיימים
- [ ] **RemindersPage** - תזכורות לא נשמרות (צריך remindersStore)
- [ ] **EmailJS** - credentials הם placeholders ב-emailService.ts, מיילים לא נשלחים
- [ ] **VAPID Key** - מזויף ב-notifications.ts, Push לא עובד
- [ ] **Invoice Analysis** - `analyzeInvoice()` מחזיר [] ריק, לא ממומש ב-invoicesStore.ts
- [ ] **AnalyticsPage שורה 139** - className שבור: `bg-gradient-to-baccmntent`
- [ ] **PriceManagementPage** - מוצרים מ-products.ts לא נשמרים ב-suppliersStore

### שלב 2 - הזמנה מהירה מתבנית (Dashboard)
- [ ] תבניות שמורות מוצגות ישר בדשבורד הראשי
- [ ] לחיצה על תבנית → טעינה לסל + מעבר לסיכום
- [ ] עריכה לפני שליחה (שינוי כמויות, הסרת פריטים)
- [ ] הוספת מוצרים לתבנית קיימת

### שלב 3 - לוח שנה להזמנות
- [ ] תצוגת לוח חודשי אינטראקטיבי
- [ ] כל יום מסומן עם: ספקים שהוזמנו + סכום כולל
- [ ] לחיצה על יום → פירוט ההזמנות של אותו יום
- [ ] לאדמין: כל הסניפים; למשתמש: הסניף שלו בלבד

---

### כלים לאדמין

#### אדמין 1 - ייצוא הזמנה ל-PDF
- [ ] PDF מסודר: לוגו, פרטי ספק, פריטים, כמויות, מחירים, חתימה
- [ ] מקצועי לשליחה לספקים כחלופה/תוספת ל-WhatsApp

#### אדמין 2 - דשבורד "מה להזמין היום"
- [ ] לפי לוח הזמנים של הספקים → "היום: טרה פלסט, יבולי שדה"
- [ ] כפתור יצירת הזמנה ריקה מהספק הרלוונטי
- [ ] מוצג לכל משתמש לפי הסניף שלו

#### אדמין 3 - תזכורות מהאדמין לסניפים
- [ ] אדמין יוצר תזכורת → נשלחת לסניפים נבחרים
- [ ] מוסיפה יומן פנימי בRemindersPage של הסניף
- [ ] שולחת Push notification לסניף

#### אדמין 4 - הודעות Push מותאמות ומתוזמנות
- [ ] אדמין כותב הודעה + בוחר סניפים + קובע זמן
- [ ] שליחה מיידית או מתוזמנת
- [ ] היסטוריית הודעות שנשלחו

---

### נוחות

#### נוחות 1 - מצב אופליין מלא
- [ ] שימוש ב-Dexie + dexie-react-hooks (כבר מותקנים!)
- [ ] כל הנתונים נשמרים מקומית ב-IndexedDB
- [ ] סנכרון עם localStorage כשחוזר אינטרנט

#### נוחות 2 - גרף צריכה למוצר
- [ ] בכל מוצר: גרף עמודות לפי חודשים (כמה הוזמן)
- [ ] עוזר לתכנן כמויות עתידיות

---

## ספריות ו-Skills לשימוש

### קיימות בפרויקט (לנצל!)
| ספרייה | שימוש |
|---------|--------|
| `jspdf` + `jspdf-autotable` | ייצוא PDF - **כבר מותקן** |
| `dexie` + `dexie-react-hooks` | אופליין DB - **כבר מותקן** |
| `recharts` | גרפים - **כבר מותקן** |
| `framer-motion` | אנימציות - **כבר מותקן** |
| `xlsx` | ייצוא Excel - **כבר מותקן** |

### להוסיף
| ספרייה | שימוש | מקור |
|---------|--------|-------|
| `react-day-picker` | לוח שנה - RTL תמיכה מובנית, 6M downloads | npmjs.com |
| `web-push` (Netlify function) | שליחת Push notifications אמיתיות | npmjs.com |

### הנחיות קידוד
- **jsPDF**: להשתמש עם `jspdf-autotable` לטבלאות, לוודא עברית RTL בPDF
- **react-day-picker**: להעביר `dir="rtl"` + locale עברי
- **Push**: VAPID keys לייצר עם `web-push generateVAPIDKeys()`, לשמור ב-Netlify env vars
- **Dexie**: להשתמש ב-`useLiveQuery` hook לreactivity אוטומטי

---

## עיצוב נייד - עקרון על (NON-NEGOTIABLE)

> **האפליקציה מיועדת בראש ובראשונה לשימוש על נייד.**
> כל פיצ'ר, כל דף, כל רכיב - חייב להיות מושלם על מסך טלפון לפני כל דבר אחר.

### חוקי נייד מחייבים לכל רכיב
| נושא | דרישה |
|------|--------|
| **כפתורים** | גובה מינימום 48px, אזור לחיצה נוח לאצבע |
| **טקסט** | מינימום 16px לגוף, 14px להערות - אין קטן יותר |
| **ריווח** | padding מינימום 16px בצידדים, אין דחיסת תוכן |
| **גלילה** | גלילה חלקה, ללא overflow אופקי |
| **Modals / Drawers** | Bottom sheet על נייד (לא popup מרכזי), גובה max 90vh |
| **טפסים** | שדות גדולים (min-h 48px), label ברור מעל כל שדה |
| **רשימות** | פריטים לא צפופים, padding מספיק בין שורות |
| **ניווט** | כפתורי ניווט תמיד נגישים (sticky/fixed כשנדרש) |
| **לוח שנה** | תאים גדולים מספיק ללחיצה על נייד |
| **גרפים** | גלילה אופקית או תצוגה מותאמת - לא קיצוץ |
| **RTL** | direction: rtl על כל container, text-align: right כברירת מחדל |
| **Safe Areas** | padding-bottom לחשבון notch/home-bar (env(safe-area-inset-bottom)) |
| **Touch feedback** | active states ברורים (scale/opacity) על כל אלמנט לחיץ |

### בדיקת נייד אחרי כל שינוי
- לפתוח ב-DevTools → Mobile view (375px = iPhone SE, הנייד הקטן ביותר הנפוץ)
- לוודא שאין overflow אופקי (`overflow-x: hidden` על body)
- לוודא שכל כפתור נגיש ללא zoom
- לוודא ש-modal/drawer לא חוסם ניווט

---

## כללי עבודה קבועים (חובה לכל תיקון/פיצ'ר)

### לפני כל שינוי
1. לקרוא את הקבצים הרלוונטיים לפני כל עריכה
2. לוודא שהשינוי לא שובר פונקציונליות קיימת
3. לבדוק חיבורים: store ↔ component ↔ service

### בזמן כתיבת קוד
- לשמור על TypeScript מלא - אין `any` ללא סיבה
- לחבר imports נכון - לא להשאיר פונקציות תלויות שלא קיימות
- כל טקסט ממשק משתמש בעברית
- שמירת עיצוב קיים (צבעים, RTL, mobile-first)
- **כל רכיב חדש: mobile-first, לבדוק ב-375px לפני desktop**

### אחרי כל שינוי - Checklist
- [ ] TypeScript לא מדווח שגיאות (`tsc --noEmit`)
- [ ] הפיצ'ר עובד מקצה לקצה (מהUI עד הstore)
- [ ] לא נשברה פונקציונליות אחרת
- [ ] **נבדק על נייד 375px - אין overflow, כפתורים נגישים, טקסט קריא**
- [ ] עיצוב RTL תקין
- [ ] נתונים נשמרים ברענון הדף

---

## מפת כל הקבצים

### Pages
| קובץ | תפקיד |
|------|--------|
| LoginPage.tsx | מסך כניסה - מקלדת PIN |
| DashboardPage.tsx | לוח בקרה ראשי |
| OrdersPage.tsx | בחירת ספק + מוצרים + סל |
| SummaryPage.tsx | סיכום + שליחה ב-WhatsApp |
| HistoryPage.tsx | היסטוריית הזמנות + הזמן שוב |
| RemindersPage.tsx | תזכורות (בגים - לא נשמר!) |
| AdminPage.tsx | פאנל ניהול ראשי |
| admin/AddSupplierPage.tsx | אשף 3-שלבים להוספת ספק |
| admin/PriceManagementPage.tsx | עדכון מחירים |
| admin/ReportsPage.tsx | דוחות כלכליים + CSV |
| admin/AnalyticsPage.tsx | אנליטיקה (יש CSS שבור!) |
| admin/AnalyticsDashboard.tsx | דשבורד גרפים מתקדם |
| admin/InvoicesPage.tsx | העלאת חשבוניות |
| admin/InvoiceAnalysisPage.tsx | ניתוח הפרשי מחירים |
| admin/GmailSettingsPage.tsx | הגדרות Gmail OAuth |
| admin/GmailCallbackPage.tsx | OAuth callback |
| admin/SuppliersContactPage.tsx | פרטי קשר ספקים |

### Stores (Zustand)
| Store | מה שומר |
|-------|---------|
| authStore.ts | משתמש, isAdmin, PIN |
| cartStore.ts | סל + מועדפים |
| ordersStore.ts | היסטוריה + תבניות |
| suppliersStore.ts | ספקים + מוצרים + לוחות |
| invoicesStore.ts | חשבוניות (analysis לא ממומש!) |

### Services
| קובץ | תפקיד |
|------|--------|
| gmailService.ts | OAuth + שליפת מיילים |
| emailService.ts | שליחת מייל (לא מוגדר!) |
| chatbotAI.ts | כוונות + תשובות בעברית |
| fileParser.ts | CSV/TXT → מוצרים |
| notifications.ts | Push (VAPID מזויף!) |
| scheduledNotifications.ts | תזכורות לפי לוח ספקים |

### Components
| קובץ | תפקיד |
|------|--------|
| ChatBot.tsx | ווידג'ט צ'אטבוט |
| ProductCard.tsx | כרטיס מוצר עם כמות |
| NotificationManager.tsx | הרשאות Push (אדמין) |
| NotificationScheduler.tsx | תזכורות קרובות (משתמש) |

### Netlify Functions
| קובץ | תפקיד |
|------|--------|
| gmail-auth.ts | OAuth code → tokens |
| check-gmail.ts | חיפוש חשבוניות בGmail |
