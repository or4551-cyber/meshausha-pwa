# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-07-04 | **שלב נוכחי:** שדרוג GPT — סבב 2 (תובנות הזמנות) | **סטטוס:** **הושלם, נפרס ואומת חי + אומת ע"י OR ב-ChatGPT.** deploy `6a47ee24`, commit `d3e937c`. הבא: סבב 3 של ה-GPT (מודיעין-מחיר) *או* שכבה 2 של הרודמאפ (GPT אמיתי בתוך האפליקציה) — לבחירת OR.

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין (9999), ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline. בנוסף — מערכת מחירוני ספקים מרכזית (מקור-אמת יחיד, מגורסן) + GPT פרטי (ChatGPT) שמחובר אליה (מחירים + ייבוא-מחירונים + תובנות-הזמנות).
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + Web Push.

## איפה עומדים עכשיו
**ארבעה שלבים אחרונים — כולם נפרסו, נוקמטו ואומתו חי:**
- **✅ 3 באגים של האדמין (2026-07-01):** דליפת-מחירים, חיפוש (bundle ישן ב-SW), כפילות-טרה-פלסט. deploy `6a45da9f`, commit `238da0c`.
- **✅ שכבה 1 — אמינות (2026-07-02):** באנר "יש גרסה חדשה — רענן" + מגני-כפילויות. deploy `6a461e88`, commit `5198fff`.
- **✅ שדרוג GPT סבב 1 — ייבוא מחירונים (2026-07-02):** `POST /api/prices/imports/preview` + מנוע-התאמה טהור. deploy `6a4649c5`, commit `d547bd9`.
- **✅ שדרוג GPT סבב 2 — תובנות הזמנות (2026-07-04):** 3 endpoints קריאה (`/api/insights/summary|top-products|overview`) + מנוע-חישוב טהור `shared/orderInsights/`. ה-GPT עונה על "כמה הוצאנו/על מי/מה מזמינים/מגמות". deploy `6a47ee24`, commit `d3e937c`. **OR עדכן ב-ChatGPT ואישר: "כמה הוצאנו החודש על קוקה קולה?" → 7,646.52 לפני מע"מ, תואם בול לאימות-השרת.**

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** 375px, בלי overflow-x, RTL/עברית.
- **מקור מוצרים — הקטלוג המרכזי הוא מקור-אמת יחיד.** `useCatalogSync` (בהפעלה + focus/visibility); `replaceCatalogProducts` full-replace מונוטוני + reconcile-on-initial. כתיבה: אדמין+GPT דרך preview→apply.
- **מקור הזמנות — Netlify Blobs store `meshausha-orders`** (הפונקציה `orders-api.ts`). כל הזמנה: `{ id, branch, branchCode, items[{productId,name,supplier,price,quantity}], notes, createdAt, totalPrice, status }`. `item.price` לפני מע"מ; `totalPrice` כולל מע"מ 17%. active=pending|dispatched; deleted/merged מוחרגות.
- **session-אדמין לכתיבה:** 9999 → `/api/price-auth` → token חתום (HMAC, 8h). הסוד בשרת בלבד.
- **🤖 GPT פרטי (ChatGPT):** Action ל-`https://meshaushapp.netlify.app`, Bearer `PRICE_GPT_TOKEN`. **מגבלות Actions:** OpenAPI 3.1.x; description ≤300; בלי `nullable`; תשובה ≤~100KB; Action אחד לדומיין; `x-openai-isConsequential` רק על כתיבה. **13 operations** (מחיר/היסטוריה/עריכה/ייצוא + previewImport + 3 תובנות).
- **🆕 תובנות הזמנות (סבב 2) — עיקרון-העל:** השרת מחשב, ה-GPT מציג. מנוע טהור `shared/orderInsights/` (types/period/engine/router) + פונקציה `insights-api.ts`. **פילוח לפי ספק = ברמת-פריט** (הזמנה יכולה לכלול כמה ספקים). **spend לפני מע"מ** אחיד + spendWithVat=×1.17. presets בשעון Asia/Jerusalem (DST-aware). **קריאה בלבד**, `authorizePriceRequest('read')`, **app→403** (סניפים לא רואים אנליטיקת חוצת-סניפים).
- **ייבוא מחירונים (סבב 1):** ChangeSet `source:'import'` דרך ה-apply הקיים; endpoint אחד `imports/preview`; precision-over-recall; ספק לא-מזוהה=200 שיחתי.
- **קונפיג ה-GPT ל-OR:** `docs/gpt/openapi.yaml` (Schema) + `docs/gpt/gpt-instructions.md` (Instructions). לכל שינוי — OR מדביק ידנית ל-ChatGPT; אימות = הפעולות החדשות מופיעות ברשימת ה-Actions. עותקים מוכנים: `C:\Users\OR\Desktop\gpt-update\`. **⚠️ תמיד לבדוק בשיחה חדשה** — שינוי-GPT לא חל על שיחה שכבר פתוחה.
- **backend:** לוגיקה טהורה ב-`shared/`; API+אחסון+הרשאות ב-`netlify/functions/`. הרשאות fail-closed.
- **שיתוף סוכנים:** SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); **רק claude עושה deploy**. **OR מריץ כתיבות-כסף/דאטה-פרודקשן, Claude מאמת מהשרת (קריאה בלבד).**

## מה נשאר לעשות / חסמים
1. **הבא לבחירת OR:**
   - **סבב 3 של ה-GPT — מודיעין-מחיר:** התראות קפיצת-מחיר, ספק-זול-ביותר למוצר שקול, השוואת חשבונית-מול-מחירון. יכול לשלב קטלוג (סבב 1) + הזמנות (סבב 2). תוכנית-אב: `C:\Users\OR\.claude\plans\proud-twirling-sedgewick.md`.
   - **שכבה 2 של הרודמאפ — GPT אמיתי בתוך האפליקציה:** `src/lib/chatbotAI.ts` הוא כרגע keyword-matching. (שכבה 3 = n8n · שכבה 4 = אנליטיקה.)
2. **אופציונלי — ניקוי settings-api:** מחיקת ~41 מוצרי-טרה ישנים (כתיבת-דאטה — OR מריץ). היגיינה בלבד.

## איך מריצים ובודקים
- פיתוח: `npm run dev`. כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test` (**121 ירוקים**). typecheck: `npx tsc --noEmit`. build: `npm run build`.
- **בדיקת תובנות חיה (קריאה):** token ב-`docs/gpt/SETUP.md` (PRICE_GPT_TOKEN). `GET /api/insights/overview` · `/api/insights/summary?period=this_month&groupBy=supplier` · `/api/insights/top-products?by=quantity`. טוקן-אפליקציה → 403.
- **בדיקת ייבוא-GPT ללא סיכון:** שיחה חדשה → מחירון מדומה → previewImport → אל תאשר.
- **Deploy לפרודקשן (ידני, CLI — claude בלבד, אחרי GO מפורש):**
  ```
  npm run build
  npx --yes netlify-cli@latest deploy --prod --no-build --dir dist --functions netlify/functions --site 62cbac42-9bb2-4814-808b-0ef4b78928b5
  ```
  (VITE_API_TOKEN נטען מ-.env בזמן build; env השרת כבר מוגדר.)
- remote: `github.com/or4551-cyber/meshausha-pwa`. פרודקשן: `meshaushapp.netlify.app`. תוכנית PRO.

## מצב גיט
- ענף: `main`. **פרודקשן: deploy אחרון `6a47ee24`** (סבב 2 — תובנות, אומת חי). commit אחרון: `d3e937c`. **קומיטים מקומיים לא-דחופים ל-remote** (6 קומיטי-פיצ'ר + spec/plan + handoff) — לדחוף בבקשת OR.
- קבצי סבב-2: `shared/orderInsights/{types,period,engine,router}.ts` (חדשים), `netlify/functions/insights-api.ts` (חדש), `netlify.toml`, `docs/gpt/{openapi.yaml,gpt-instructions.md}`, `tests/orderInsights/*` (3 חדשים). typecheck נקי, build עובר, 121 טסטים ירוקים.

## יומן שלבים (מהחדש לישן)
- [2026-07-04 — שדרוג GPT סבב 2: תובנות הזמנות](JOURNAL/2026-07-04-gpt-order-insights.md) — 3 endpoints קריאה + מנוע-חישוב טהור (`shared/orderInsights/`); השרת מחשב, ה-GPT מציג; פילוח-ספק ברמת-פריט; שעון ישראל DST; app→403; 19 טסטים. נפרס `6a47ee24`, OR אישר (קוקה קולה 7,646.52).
- [2026-07-02 — שדרוג GPT סבב 1: ייבוא מחירונים](JOURNAL/2026-07-02-gpt-price-import.md) — endpoint `imports/preview` + מנוע-התאמה טהור; reuse על צינור-הכתיבה הקיים; precision-over-recall; 16+4 טסטים. נפרס `6a4649c5`.
- [2026-07-02 — שדרוג שכבה 1: אמינות](JOURNAL/2026-07-02-reliability-layer.md) — באנר PWA update + מגן-כפילויות. נפרס `6a461e88`.
- [2026-07-01 — תיקון 3 באגים שדיווח האדמין](JOURNAL/2026-07-01-admin-bugfixes-search-price-duplicates.md) — מחירים/חיפוש(SW ישן)/כפילות. + רודמאפ שדרוג.
- [2026-06-21 — Plan 2: חיבור GPT פרטי לקטלוג](JOURNAL/2026-06-21-plan2-gpt-integration.md) — GPT Actions (read+preview/apply); סאגת הקמה ב-ChatGPT.
- [2026-06-21 — Task 9a: מסך אדמין כותב לקטלוג](JOURNAL/2026-06-21-task9a-admin-catalog-writes.md) — preview/apply; Codex תפס BLOCKER ב-idempotency.
- [2026-06-21 — פריסה ראשונה + פיוס + חסם billing](JOURNAL/2026-06-21-first-deploy-and-reconciliation.md) — הכל עלה לאוויר; 21 מוצרים חיים נשמרו בפיוס.
- [2026-06-21 — Task 8: חיבור frontend לקטלוג](JOURNAL/2026-06-21-task8-frontend-catalog-sync.md) — adapter+api+useCatalogSync; review תפס race.
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD.
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + migration.
- [2026-06-20 — הקמת פרוטוקול שיתוף Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים.
