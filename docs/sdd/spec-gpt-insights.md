# שדרוג GPT — סבב 2: תובנות הזמנות (Order Insights) — מסמך עיצוב

> סטטוס: מאושר עקרונית ע"י OR (2026-07-03). זהו ה-spec; אחריו תוכנית-מימוש (writing-plans) ואז TDD.

## הקשר ומטרה
ה-GPT הפרטי הקיים ב-ChatGPT ("מחירוני משאוושה") יודע כרגע לקרוא ולעדכן **מחירים**. סבב 2 מוסיף לו יכולת **לענות על שאלות על ההזמנות** של הרשת (9 סניפים) — כמה הוצאנו, על מי, מה מזמינים, ומגמות — **קריאה בלבד**. זה שדרוג-מידע לבעלים (OR/אדמין), לא תכונה לסניפים.

**מטרת-על עמידות (זהה לסבב הייבוא):** **השרת מחשב, ה-GPT רק מציג.** לא חושפים ל-GPT הזמנות גולמיות (גדול + חישוב-GPT = טעויות); השרת מסכם ומחזיר מספרים מוכנים וזעירים.

## מציאות-הנתונים (אומת חי, 2026-07-03)
מקור-האמת: Netlify Blobs store `meshausha-orders` (הפונקציה `orders-api.ts`). נמדד מול הפרודקשן:
- **425 הזמנות** (12/04/2026 → היום), 9 סניפים, 8 ספקים.
- **424/425 נושאות מחיר לכל פריט + `totalPrice`** → פירוט-כסף לפי ספק/מוצר אפשרי ואמין.
- מבנה פריט: `{ productId, name, supplier, price, quantity }`. מבנה הזמנה: `{ id, branch, branchCode, items[], notes, createdAt, totalPrice, status }`.
- סטטוסים: `pending` (94), `dispatched` (328), `merged` (1), `deleted` (2).

**מוסכמות עסקיות:**
- `item.price` = מחיר-מחירון **לפני מע"מ**. `order.totalPrice` = סכום הפריטים **כולל מע"מ 17%** (`×1.17`).
- **"הוצאה/spend" = סכום פריטים לפני מע"מ** (`Σ price×quantity`) — אחיד לכל הפילוחים. נציג גם `spendWithVat = round(spendExVat×1.17, 2)` בסכומים הכוללים. כל תשובה תסומן "לפני מע"מ".
- **הזמנה פעילה = status ∈ {pending, dispatched}**. `deleted`/`merged` מוחרגות מכל חישוב.
- הזמנה יכולה לכלול **כמה ספקים** → פילוח-לפי-ספק מחושב **ברמת-פריט**, לא ברמת-הזמנה.

## ארכיטקטורה
שלוש שכבות, מבודדות:
1. **מנוע-חישוב טהור** `shared/orderInsights/` — פונקציות דטרמיניסטיות מעל `OrderRecord[]` (זמן `now` מוזרק). בלי I/O, בלי תלות ב-`src/`. נבדק ב-TDD.
2. **Netlify function** `netlify/functions/insights-api.ts` — קורא את store ההזמנות, מאמת (מפתח-GPT), מנתב לפי הנתיב, מזריק `now`, קורא למנוע, מחזיר JSON תמצתי. **קריאה בלבד (GET).**
3. **צד ה-GPT** — 3 operations ב-`openapi.yaml` (אותו server, אותו Bearer, **אותה פעולת-Action קיימת** — בלי Action שני) + סעיף הוראות עברית.

**הרשאות:** מיחזור `authorizePriceRequest(..., 'read', ...)`. מותר רק `role ∈ {gpt, admin}`. `role==='app'` (הלקוח בסניפים) → **403** (אין לסניפים גישה לאנליטיקת חוצת-סניפים). בלי טוקן → 401. fail-closed.

**ניתוב** (`netlify.toml`, לפני redirect ה-SPA של `/*`, בתבנית של `/api/prices/*`):
```
[[redirects]]
  from = "/api/insights/*"
  to = "/.netlify/functions/insights-api/:splat"
  status = 200
  force = true
```

## חוזי ה-endpoints (3)

טווחי-זמן: פרמטר `period` (preset שהשרת מחשב **בשעון Asia/Jerusalem**, כולל שעון-קיץ) או `from`+`to` מפורשים (תאריך ISO) שגוברים. presets: `today, yesterday, this_week, last_week, this_month, last_month, last_30d, last_90d, this_quarter, last_quarter, ytd, all`. ברירת-מחדל: `this_month`. `this_week` = ראשון→שבת (שבוע ישראלי).

### 1. `GET /api/insights/summary`
סיכום כסף/כמויות בטווח, עם פילוח אופציונלי.
- **Query:** `period` | (`from`,`to`); `groupBy ∈ {none, supplier, branch, month, weekday}` (ברירת-מחדל `none`); `branchCode?`; `supplier?`; `limit?` (קבוצות, ברירת-מחדל 50).
- **Response:**
```json
{
  "range": { "from": "...", "to": "...", "label": "יולי 2026" },
  "groupBy": "supplier",
  "filters": {},
  "totals": { "spendExVat": 0, "spendWithVat": 0, "orders": 0, "units": 0 },
  "groups": [ { "key": "טרה פלסט", "label": "טרה פלסט", "spendExVat": 0, "spendWithVat": 0, "orders": 0, "units": 0 } ],
  "note": "סכומים לפני מע\"מ; spendWithVat = ×1.17"
}
```
- **סמנטיקה:** `supplier` → צבירה ברמת-פריט (מחיר×כמות לפי `item.supplier`); `orders` = מס' הזמנות ייחודיות המכילות ספק זה. `branch` → subtotal הזמנה לפי `branchCode`. `month`/`weekday` → subtotal הזמנה לפי דלי-זמן. `groups` ממוין יורד לפי `spendExVat`. `groupBy=none` → `groups` ריק (רק `totals`). הפילטרים `branchCode`/`supplier` מצמצמים את הנתונים לפני הצבירה.

### 2. `GET /api/insights/top-products`
מוצרים מובילים.
- **Query:** `period` | (`from`,`to`); `by ∈ {quantity, spend}` (ברירת-מחדל `spend`); `branchCode?`; `supplier?`; `limit?` (ברירת-מחדל 10, מקס' 50).
- **Response:** `{ range, by, filters, products: [ { productId, name, supplier, units, spendExVat, orders } ], note }`.
- **סמנטיקה:** צבירת פריטים לפי `productId` (נפילה ל-`name|supplier` אם אין `productId`) על הזמנות פעילות בטווח; מיון יורד לפי המדד הנבחר; חיתוך ל-`limit`.

### 3. `GET /api/insights/overview`
תמונת-מצב נקודתית (עכשיו). בלי פרמטרים.
- **Response:**
```json
{
  "now": "...",
  "pending": { "orders": 0, "spendExVat": 0 },
  "today": { "orders": 0, "spendExVat": 0 },
  "thisWeek": { "orders": 0, "spendExVat": 0 },
  "thisMonth": { "orders": 0, "spendExVat": 0 },
  "branches": [ { "branchCode": "1", "branch": "...", "lastOrderAt": "...", "pendingOrders": 0, "thisMonthSpendExVat": 0 } ],
  "topSuppliersThisMonth": [ { "supplier": "...", "spendExVat": 0 } ]
}
```
- `branches` = כל 9 הסניפים, ממוין לפי `lastOrderAt` יורד. `topSuppliersThisMonth` מוגבל ל-5.

## גודל-תשובה, שגיאות
- כל התשובות **מצטברות** → זעירות: `summary.groups` ≤ מס' ספקים(8)/סניפים(9)/חודשים-בטווח; `top-products` ≤ 50; `overview` קבוע. הרבה מתחת ל-100KB גם מעל 425 הזמנות. גולמי לעולם לא מוחזר.
- `period`/`groupBy`/`by` לא-חוקי → 400 `invalid_param`. בלי טוקן → 401. `role==='app'` → 403. נתיב לא מוכר → 404. שיטה ≠ GET → 405. חריגה → 500 `internal_error` (בלי דליפת פרטים).
- טווח ריק → מספרים אפס + `groups: []` (לא שגיאה) כדי שה-GPT יאמר "אין נתונים לתקופה".
- **כלל אחיד:** שדות אופציונליים ללא ערך **מושמטים** (לא `null`) — עקבי עם איסור `nullable` ב-openapi. למשל `filters` נושא רק מפתחות שסוננו; סניף בלי הזמנות משמיט `lastOrderAt`.

## בדיקות (TDD)
- **`shared/orderInsights/engine`** (טהור, `now` מוזרק): הזמנה רב-ספקית מתפצלת נכון לפי ספק; פילוח סניף; פילוח חודש על-פני אפר'–יולי; `deleted`/`merged` מוחרגות; `pending` נספרת בהוצאה; מע"מ ×1.17; `top` לפי quantity מול spend נותנים סדר שונה; פילטרי `branchCode`+`supplier`; **גבולות presets** (this_month מול last_month מול last_30d בשעון ישראל כולל DST); טווח ריק → אפסים; פריט בלי `productId` נופל ל-`name|supplier`.
- **`insights-api`** (ניתוב+אימות, store בזיכרון): role `gpt` → 200; role `app` → 403; בלי טוקן → 401; נתיב לא מוכר → 404; POST → 405; seed גדול (~450 הזמנות סינתטיות) → תשובה < 100KB.

## קבצים
- `shared/orderInsights/types.ts` — *חדש*. `OrderRecord`, טיפוסי query/response.
- `shared/orderInsights/period.ts` — *חדש*. `resolvePeriod(preset, nowISO)` בשעון Asia/Jerusalem (Intl, בלי ספריות).
- `shared/orderInsights/engine.ts` — *חדש*. `computeSummary` / `computeTopProducts` / `computeOverview`.
- `netlify/functions/insights-api.ts` — *חדש*. עטיפת ה-function (auth+store+routing+CORS+normalizePath).
- `netlify.toml` — redirect `/api/insights/*`.
- `docs/gpt/openapi.yaml` — 3 operations קריאה (`getInsightsSummary`, `getTopProducts`, `getInsightsOverview`); descriptions ≤300; בלי `nullable`; **בלי** `x-openai-isConsequential` (קריאה).
- `docs/gpt/gpt-instructions.md` — סעיף "שאלות על הזמנות ותובנות".
- `tests/orderInsights/engine.test.ts` + `tests/orderInsights/insights-api.test.ts` — *חדשים*.

## Reuse (לא לכתוב מחדש)
- `authorizePriceRequest` ([_priceCatalogAuth.ts](../../netlify/functions/_priceCatalogAuth.ts)) — אימות + תפקידים.
- תבנית `openStore` + `SITE_ID`/`NETLIFY_TOKEN` fallback ([orders-api.ts](../../netlify/functions/orders-api.ts)) — פתיחת ה-blob store.
- תבנית `normalizePath` + CORS ([price-catalog.ts](../../netlify/functions/price-catalog.ts)) — נורמול נתיב ל-`/api/insights/...`.
- מבנה ה-`Order` ([ordersStore.ts](../../src/stores/ordersStore.ts)) — מקור לטיפוס `OrderRecord` (מוגדר-מחדש ב-shared; shared לא מייבא מ-src).
- משמעת ה-compact-response + TDD מסבב הייבוא.

## אימות (verification)
1. `npx vitest run tests/orderInsights` ירוק + כל החבילה (`npm test`) ירוקה; `npx tsc --noEmit` נקי; `npm run build` עובר.
2. `openapi.yaml` נשאר 3.1.0, descriptions ≤300, בלי nullable.
3. חי מול הפרודקשן עם `PRICE_GPT_TOKEN`: `summary?period=this_month&groupBy=supplier` → מספרים שפויים, body<100KB; `top-products?by=quantity` → רשימה; `overview` → pending≈94; role `app` → 403.
4. פריסה (claude, אחרי GO) → אימות חי → OR מדביק openapi+instructions ל-ChatGPT → בדיקת-קבלה (שאלת-אמת) → handoff.

## מחוץ להיקף / עתידי
- **כתיבה** — הכל קריאה בלבד.
- **הצ'אט הפנימי באפליקציה** (`src/lib/chatbotAI.ts`) — זה שכבה 2 של הרודמאפ, פרויקט נפרד.
- **חשבוניות/הוצאות מעבר להזמנות** — לא כלול.
- **caching/precompute** — YAGNI; 425 הזמנות מצטברות מהר על-פי-דרישה. להוסיף רק אם יאט.
- **תחזיות/חיזוי** — סבב 3 (מודיעין-מחיר).
