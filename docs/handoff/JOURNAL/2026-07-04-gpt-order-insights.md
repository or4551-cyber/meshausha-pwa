# שלב: שדרוג GPT — סבב 2: תובנות הזמנות (Order Insights) — 2026-07-04

## מטרת השלב
להעניק ל-GPT הפרטי הקיים ב-ChatGPT יכולת **לענות על שאלות על ההזמנות** של הרשת (9 סניפים) — כמה הוצאנו, על מי, מה מזמינים, ומגמות — **קריאה בלבד**, למנהל. הסבב השני מתוך שלושה בשדרוג ה-GPT (1=ייבוא, 2=תובנות, 3=מודיעין-מחיר).

## מה נבנה בפועל (קבצים עיקריים)
- **`shared/orderInsights/types.ts`** — *חדש*. `OrderRecord`/`OrderItemRecord` + כל טיפוסי ה-query/response.
- **`shared/orderInsights/period.ts`** — *חדש*. `resolvePeriod`/`resolveExplicit` בשעון **Asia/Jerusalem** (Intl, בלי ספריות; DST-aware) + `israelParts`/`HE_MONTHS`/`HE_WEEKDAYS`. presets: today/yesterday/this_week/last_week/this_month/last_month/last_30d/last_90d/this_quarter/last_quarter/ytd/all.
- **`shared/orderInsights/engine.ts`** — *חדש*. מנוע-חישוב טהור: `computeSummary` (totals + פילוח supplier/branch/month/weekday, **ברמת-פריט** לספק), `computeTopProducts` (לפי quantity/spend), `computeOverview` (ממתינות/היום/שבוע/חודש + פירוט-סניפים + ספקים-מובילים). מוסכמות: active=pending|dispatched; deleted/merged מוחרגות; spend לפני מע"מ; spendWithVat=×1.17.
- **`shared/orderInsights/router.ts`** — *חדש*. `routeInsights(req, orders, nowISO)` טהור — role-gate (app→403), אימות פרמטרים (period/groupBy/by/limit), ניתוב ל-3 ה-endpoints.
- **`netlify/functions/insights-api.ts`** — *חדש*. עטיפה: OPTIONS/CORS, `authorizePriceRequest('read')` (gpt/admin; app→403; ללא→401), טעינת store `meshausha-orders`, קריאה ל-router.
- **`netlify.toml`** — redirect `/api/insights/*` → `insights-api` (לפני ה-SPA).
- **`docs/gpt/openapi.yaml`** — 3 operations קריאה: `getInsightsSummary`, `getTopProducts`, `getInsightsOverview` (3.1.0, descriptions 276/218/170≤300, בלי nullable, בלי isConsequential). סה"כ 13 operations.
- **`docs/gpt/gpt-instructions.md`** — סעיף "שאלות על הזמנות ותובנות (קריאה בלבד)".
- **טסטים**: `tests/orderInsights/{period,engine,router}.test.ts` — 19 חדשים (סה"כ 121 ירוקים).
- מסמכים: `docs/sdd/spec-gpt-insights.md` (עיצוב) + `docs/sdd/plan-gpt-insights.md` (תוכנית-מימוש).

## הדרך: מה נוסה, מה עבד, מה נכשל ולמה
- **תהליך מלא brainstorming → spec → plan → TDD → deploy**, לבקשת המשתמש ("תעשה מה שאתה ממליץ").
- **הבדיקה הקריטית לפני הכל:** לאמת שההזמנות **נשמרות בשרת** (ולא רק ב-IndexedDB מקומי בכל מכשיר). אומת חי: `orders-api.ts` → Netlify Blobs store `meshausha-orders`, **425 הזמנות** (אפר'–יולי 2026), 9 סניפים, 8 ספקים, **424/425 עם מחיר לכל פריט** → פירוט-כסף לפי ספק/מוצר אמין. בלי האימות הזה כל הסבב לא היה ישים.
- **עיקרון-העל (זהה לסבב הייבוא):** השרת מחשב, ה-GPT מציג. לא חושפים 425 הזמנות גולמיות (גדול + חישוב-GPT שגוי) — endpoints מצטברים שמחזירים מספרים זעירים ומדויקים.
- **הכרעת-מפתח:** ספק לא-מזוהה/פילוח לפי ספק חייב להיות **ברמת-פריט** כי הזמנה יכולה לכלול כמה ספקים. פילוח ברמת-הזמנה היה שוגה.
- **TZ/DST:** נכתב `resolvePeriod` טהור שמזריק `now` ומשתמש ב-Intl 'Asia/Jerusalem' לחישוב גבולות — טסט מאמת גם קיץ (יולי, UTC+3) וגם חורף (ינואר, UTC+2).
- **נתיב עברי משבש Write/Edit** — כל הקבצים נכתבו דרך scratchpad + `cp`, וה-openapi/instructions דרך סקריפטי Python (patch_*.py). תועד כאילוץ-על בתוכנית.
- **אימות חי אחרי deploy (`6a47ee24`):** overview→200, 1688B (<100KB), 97 ממתינות; summary(this_month, לפי ספק)→24,414.41 לפני מע"מ, 28,564.86 כולל (×1.17 מדויק), 6 ספקים; טוקן-אפליקציה→**403**. המספרים מצטלבים (overview.thisMonth == summary.totals).
- **בדיקת-קבלה של המשתמש ב-ChatGPT:** הדבקת openapi+instructions → 3 הפעולות נקלטו. תקלה ראשונית: ה-GPT "לא ראה" את הכלי — הסיבה: **שינוי GPT לא חל על שיחה שכבר פתוחה**. פתיחת שיחה חדשה פתרה. שאלה "כמה הוצאנו החודש על קוקה קולה?" → **7,646.52 לפני מע"מ / 8,946.43 כולל / 2 הזמנות / 104 יח'** — תואם בול לאימות-השרת. הסבב נסגר.

## כיוונים שעלו בשיחה ולא מומשו (+ למה)
- **caching/precompute** — YAGNI; 425 הזמנות מצטברות מהר על-פי-דרישה. להוסיף רק אם יאט.
- **פילוח לפי מוצר/מותג ב-summary** — ה-GPT עצמו הבחין שזה שייך ל-`getTopProducts`, לא ל-summary. תקין לפי העיצוב.
- **חשבוניות/הוצאות מעבר להזמנות** — מחוץ להיקף; "הוצאות" כאן = הזמנות.

## באגים שהתגלו ותוקנו
- בזמן כתיבת התוכנית: תווי-\u לא-חוקיים בשדות YAML לא-מצוטטים (היו הופכים לטקסט מילולי) + backslash תועה ב-instructions patch — תוקנו לפני הרצה (Hebrew literals + double-quote). לא הגיעו לפרודקשן.

## החלטות שהתקבלו (+ נימוק)
- **Reuse `authorizePriceRequest`** + store קיים — שטח-תקיפה מינימלי, אותו טוקן/Action ל-GPT (בלי Action שני).
- **app→403:** לסניפים אין גישה לאנליטיקת חוצת-סניפים; רק gpt/admin.
- **spend לפני מע"מ** אחיד לכל הפילוחים (item.price לפני מע"מ), עם spendWithVat לצד totals.

## קומיטים רלוונטיים
- `daa4b50` types + period (Asia/Jerusalem)
- `7f92103` engine (summary/top-products/overview)
- `33e71cd` pure router
- `bd2254b` Netlify function + routing
- `d3e937c` GPT read operations + instructions
- (deploy פרודקשן: `6a47ee24`)
- קדימה: `cf19b54` spec, `d12e010` plan.

## לקחים לשלב הבא
- **סבב 3 (מודיעין-מחיר)** הוא הבא ל-GPT: התראות קפיצת-מחיר, ספק-זול-ביותר למוצר שקול, השוואת חשבונית-מול-מחירון. חלקו יכול להתבסס על שילוב הקטלוג (סבב קודם) + ההזמנות (סבב זה).
- **טיפ תפעולי חשוב למשתמש:** אחרי עדכון ה-GPT ב-ChatGPT — **תמיד לבדוק בשיחה חדשה** (שינוי לא חל על שיחה פתוחה).
- לכל שינוי-GPT: הדבקת `docs/gpt/openapi.yaml` (Schema) + `gpt-instructions.md` (Instructions); אימות = 3 הפעולות מופיעות ברשימת ה-Actions.
