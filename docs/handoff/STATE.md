# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-07-02 | **שלב נוכחי:** שדרוג GPT — סבב 1 (ייבוא מחירונים) | **סטטוס:** **הושלם, נפרס ואומת חי + אומת ע"י OR ב-ChatGPT.** deploy `6a4649c5`, commit `d547bd9`. הבא: סבב 2 של ה-GPT (הזמנות/תובנות-קריאה) *או* שכבה 2 של הרודמאפ (GPT אמיתי בתוך האפליקציה) — לבחירת OR.

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין (9999), ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline. בנוסף — מערכת מחירוני ספקים מרכזית (מקור-אמת יחיד, מגורסן) עם מסך אדמין ו-GPT פרטי (ChatGPT) שמחובר אליה.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + Web Push.

## איפה עומדים עכשיו
**שלושה שלבים אחרונים — כולם נפרסו, נוקמטו ואומתו חי:**
- **✅ 3 באגים של האדמין (2026-07-01):** דליפת-מחירים (`SendOrderModal` showPrice:false), חיפוש-לא-מסנן (אובחן כ-bundle ישן ב-SW; הקוד תקין; +תיקון-לוואי adminOnly), כפילות-טרה-פלסט (`useCatalogSync` הפסיק למזג מוצרי settings-api + reconcile-on-initial). deploy `6a45da9f`, commit `238da0c`.
- **✅ שכבה 1 — אמינות (2026-07-02):** באנר "יש גרסה חדשה — רענן" (`PWAUpdatePrompt.tsx`, registerType:'prompt') שסוגר לתמיד את משפחת באג-2; מגן-כפילויות בטסט; +טסטי reconcile. deploy `6a461e88`, commit `5198fff`.
- **✅ שדרוג GPT סבב 1 — ייבוא מחירונים (2026-07-02):** endpoint `POST /api/prices/imports/preview` + מנוע-התאמה טהור `shared/priceCatalog/import.ts`. ה-GPT מקבל מחירון (קובץ/טקסט) → מתאים מול הקטלוג → מציג diff → OR מאשר → גרסה אחת לכל הסניפים. deploy `6a4649c5`, commit `d547bd9`. **OR עדכן את ה-GPT ב-ChatGPT (Instructions+Schema) ואישר שעובד (הודעת-בדיקה מדומה → previewImport → diff).**

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** 375px, בלי overflow-x, RTL/עברית.
- **מקור מוצרים — הקטלוג המרכזי הוא מקור-אמת יחיד.** קריאה: `useCatalogSync` מסנכרן בהפעלה + focus/visibility; `replaceCatalogProducts` = full-replace מונוטוני (מחליף רק אם `version > catalogVersion` המקומי) + reconcile-on-initial שמחיל תמיד את הקטלוג הטרי. כתיבה: כל פעולות-האדמין וה-GPT עוברות preview→apply. **⚠️** `catalogVersion` משותף לשני מנגנונים (הקטלוג המרכזי + `migrateCatalog`) — אסור לבלבל.
- **session-אדמין לכתיבה:** כניסה ב-9999 → `/api/price-auth` ממיר PIN ל-token חתום (HMAC, 8h). הסוד (`PRICE_ADMIN_SECRET`) בשרת בלבד.
- **🤖 GPT פרטי (ChatGPT):** Action ל-`https://meshaushapp.netlify.app`, אימות Bearer עם `PRICE_GPT_TOKEN`. **מגבלות ChatGPT Actions:** OpenAPI 3.1.x; description ≤300 תווים; בלי `nullable`; תשובה ≤~100KB; Action אחד לדומיין; `x-openai-isConsequential` רק על כתיבה.
- **🆕 ייבוא מחירונים (סבב 1) — עיקרון-העל:** הייבוא מייצר **ChangeSet סטנדרטי `source:'import'`** ומוחל דרך ה-**apply הקיים** — **לא** נבנה נתיב-כתיבה שני. יורש בחינם idempotency/גרסאות/409/revert. נוסף **endpoint אחד בלבד** (`imports/preview`). "אישור חלקי" בלי endpoint שני: preview מקבל `excludeRowIds`/`excludeProductIds`. **precision-over-recall:** התאמה חלקית/רב-משמעית → review (לעולם לא מוחלת אוטומטית). ספק לא-מזוהה/דו-משמעי → **200 סטטוס שיחתי** (לא 4xx) כדי שה-GPT ישאל. `detectMissing` כבוי כברירת-מחדל (מחירון חלקי לא משבית מוצרים).
- **backend מחירונים:** לוגיקה טהורה ב-`shared/priceCatalog/`; API+אחסון+הרשאות ב-`netlify/functions/_priceCatalog*` + `price-*.ts`. הרשאות fail-closed (app=read, gpt/admin=write).
- **קונפיג ה-GPT ל-OR:** `docs/gpt/openapi.yaml` (Schema) + `docs/gpt/gpt-instructions.md` (Instructions). לכל שינוי — OR מדביק ידנית ל-ChatGPT; אימות = לוודא שהפעולה החדשה מופיעה ברשימת הפעולות. עותקים מוכנים בשולחן-העבודה: `C:\Users\OR\Desktop\gpt-update\`.
- **שיתוף סוכנים:** SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); **רק claude עושה deploy**. **OR מריץ כתיבות-כסף/דאטה-פרודקשן (דרך ה-GPT/UI), Claude מאמת מהשרת (קריאה בלבד).**

## מה נשאר לעשות / חסמים
1. **הבא לבחירת OR — שתי אופציות מקבילות:**
   - **סבב 2 של ה-GPT (ChatGPT) — הזמנות/תובנות (קריאה):** endpoints קריאה + פעולות-GPT לשאלות על הזמנות/הוצאות/מגמות לפי סניף/ספק. סיכון נמוך. (סבב 3 = מודיעין-מחיר.) תוכנית: `C:\Users\OR\.claude\plans\proud-twirling-sedgewick.md`.
   - **שכבה 2 של הרודמאפ — GPT אמיתי בתוך האפליקציה:** `src/lib/chatbotAI.ts` הוא כרגע keyword-matching; שדרוג ל-LLM אמיתי בצ'אט הפנימי. (שכבה 3 = אוטומציות n8n · שכבה 4 = תובנות/אנליטיקה.)
2. **אופציונלי — ניקוי settings-api:** מחיקת ~41 מוצרי-טרה ישנים (כתיבת-דאטה — OR מריץ). היגיינה בלבד; הקוד כבר לא ממזג אותם.

## איך מריצים ובודקים
- פיתוח: `npm run dev`. כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test` (~102 ירוקים). typecheck: `npx tsc --noEmit`. build: `npm run build`.
- **בדיקת ייבוא-GPT ללא סיכון:** שיחה חדשה ל-GPT → הודעת-מחירון מדומה (2-3 שורות של ספק קיים) → הוא מריץ `previewImport` ומציג diff; אל תאשר → הקטלוג לא זז. לאימות מלא: אשר → "בטל את הייבוא האחרון" (revert).
- **בדיקת קטלוג חי (קריאה):** token ב-`docs/gpt/SETUP.md`. endpoints: `GET /api/prices/catalog/version`, `/api/prices/products?supplierId=…`, `POST /api/prices/imports/preview`.
- **Deploy לפרודקשן (ידני, CLI — claude בלבד, אחרי GO מפורש):**
  ```
  $env:VITE_API_TOKEN = "<Netlify env VITE_API_TOKEN>"
  $env:NETLIFY_AUTH_TOKEN = "<Netlify env NETLIFY_TOKEN>"
  npm run build
  npx --yes netlify-cli@latest deploy --prod --no-build --dir dist --functions netlify/functions --site 62cbac42-9bb2-4814-808b-0ef4b78928b5
  ```
- remote: `github.com/or4551-cyber/meshausha-pwa`. פרודקשן: `meshaushapp.netlify.app`. תוכנית PRO.

## מצב גיט
- ענף: `main`. **פרודקשן: deploy אחרון `6a4649c5`** (סבב 1 — ייבוא, אומת חי). commit אחרון: `d547bd9` (feat(gpt): price-list import). קומיט handoff נוסף בסשן זה.
- קבצי סבב-1: `shared/priceCatalog/import.ts` (חדש), `_priceCatalogRouter.ts`, `docs/gpt/openapi.yaml`, `docs/gpt/gpt-instructions.md`, `tests/priceCatalog/{import,router}.test.ts`. typecheck נקי, build עובר, 102 טסטים ירוקים.
- הקטלוג המרכזי על גרסה 4 (נקי; preview לא מטט).

## יומן שלבים (מהחדש לישן)
- [2026-07-02 — שדרוג GPT סבב 1: ייבוא מחירונים](JOURNAL/2026-07-02-gpt-price-import.md) — endpoint `imports/preview` + מנוע-התאמה טהור (`import.ts`); reuse על צינור-הכתיבה הקיים (ChangeSet source:'import'); precision-over-recall; ספק-לא-מזוהה=200; 16+4 טסטים. נפרס `6a4649c5`, OR אישר ב-ChatGPT.
- [2026-07-02 — שדרוג שכבה 1: אמינות](JOURNAL/2026-07-02-reliability-layer.md) — באנר "יש גרסה חדשה — רענן" (PWA prompt) שסוגר את משפחת באג 2; מגן-כפילויות (טסט) שסוגר את מקור באג 1; +טסטים ל-reconcile. נפרס `6a461e88`, אומת חי (terra 90, חיפוש, 0 errors).
- [2026-07-01 — תיקון 3 באגים שדיווח האדמין](JOURNAL/2026-07-01-admin-bugfixes-search-price-duplicates.md) — באג 3 (מחירים) תוקן+אומת; באג 2 (חיפוש) אובחן כ-bundle ישן (הקוד תקין)+תיקון adminOnly; באג 1 (כפילות) — סיבת-שורש בנתונים חיים. + רודמאפ שדרוג.
- [2026-06-21 — Plan 2: חיבור GPT פרטי לקטלוג](JOURNAL/2026-06-21-plan2-gpt-integration.md) — GPT Actions (read+preview/apply); סאגת הקמה ב-ChatGPT (3.1+300char+dup-domain); באג apply 130KB → תשובה קלה לפי role; אומת פטל 3→2 גרסה 4.
- [2026-06-21 — Task 9a: מסך אדמין כותב לקטלוג](JOURNAL/2026-06-21-task9a-admin-catalog-writes.md) — preview/apply, session ממיחזור 9999; Codex תפס BLOCKER ב-idempotency → resume מ-changeSet.
- [2026-06-21 — פריסה ראשונה + פיוס + חסם billing](JOURNAL/2026-06-21-first-deploy-and-reconciliation.md) — הכל עלה לאוויר; 21 מוצרים חיים נשמרו בפיוס; סיבת אי-פריסה: חריגת קרדיט Netlify.
- [2026-06-21 — Task 8: חיבור frontend לקטלוג](JOURNAL/2026-06-21-task8-frontend-catalog-sync.md) — adapter+api+useCatalogSync; review תפס BLOCKER race → תוקן.
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD; 4 blockers + race → תוקנו.
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + catalog-version migration; codex תפס באג כפילות שתוקן.
- [2026-06-20 — הקמת פרוטוקול שיתוף Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים + תיקוני תשתית גלובליים.
