# משאוושה (Meshausha) — תמונת מצב

> **כל סוכן שמצטרף: התחל כאן.** הקובץ הזה הוא תמונת המצב העדכנית; ההיסטוריה המלאה — כולל כישלונות וכיוונים שננטשו — נמצאת ב-[JOURNAL/](JOURNAL/).
> **עובדים פה שניים:** Claude ו-Codex. לפני נגיעה בקוד קרא גם את `docs/sync/BOARD.md` ו-`docs/sync/PROTOCOL.md`.

- **עודכן:** 2026-06-21 | **שלב נוכחי:** Plan 2 (GPT Actions) — **backend פרוס+אומת** | **סטטוס:** חי בפרודקשן; ממתין ל-OR שיבנה את ה-GPT ב-ChatGPT

## מה הפרויקט
מערכת ניהול הזמנות רכש (PWA) לרשת מסעדות חומוס בצפון (9 סניפים). כניסה ב-PIN לכל סניף + אדמין (9999), ניהול הזמנות מספקים, חיפוש, היסטוריה ותבניות, התראות Push, ייצוא PDF/Excel, ועבודה offline.
**טכנולוגיה:** React 18 + TypeScript (strict) + Vite + Tailwind + Zustand + Dexie/IndexedDB + פונקציות Netlify + Web Push.

## איפה עומדים עכשיו
- **🎉 Task 9a פרוס ואומת (2026-06-21, deploy `6a37f4b8`).** מסך האדמין כותב עכשיו לקטלוג המרכזי דרך
  preview/apply (מגורסן + הפיך) במקום ל-settings-api. **חוב Task 9 נסגר.**
  - **אומת חי מקצה-לקצה:** OR ערך פטל בגלון 1→2 מהטלפון → `catalog/version=2`, `פטל=2`, history `v1:1→v2:2`.
    גם בדיקת Playwright (login 9999 → /admin/prices בשחזור-persist → session token תקף).
- **תיקון post-deploy (`a9c5bc8`):** ה-price-session הונפק רק ב-LoginPage → אדמין משוחזר מ-"זכור אותי" נשאר בלי
  session וכתיבות נכשלו. הועבר ל-`App.tsx` (useEffect על `user.isAdmin`, מנפיק מ-`user.branchCode`).
- **🤖 Plan 2 — backend פרוס+אומת (2026-06-21, deploy `6a38212d`).** חבילת GPT Actions ב-`docs/gpt/`
  (`openapi.yaml` 9 פעולות, `gpt-instructions.md`, `SETUP.md`). `PRICE_GPT_TOKEN` הוגדר ב-Netlify (context=all,
  scope functions) + redeploy (functions קולטים env רק ב-deploy). **אומת חי מול ה-API עם הטוקן:**
  `catalog/version`=2 OK, `suppliers`=8 OK, `search פטל`→price=2 OK, **טוקן-שגוי→401** (fail-closed),
  **preview→201 status=pending** (write-role עובד; לא בוצע apply — טיוטה פגה לבד). **נשאר:** OR בונה את ה-GPT
  ב-ChatGPT לפי `docs/gpt/SETUP.md` ומריץ בדיקת-קבלה (שאלת מחיר → שינוי מאושר → ביטול).
- **לפני זה (אותו יום):** Tasks 1–8 נפרסו (קריאה מהקטלוג); פיוס 291 מוצרים; מחירון טרה פלסט יוני 2026 חי; Task 9a (כתיבת אדמין).
- **הבא:** OR מסיים את בניית ה-GPT (צד ChatGPT) → בדיקת-קבלה → Plan 3 (ייבוא מחירונים).

## ארכיטקטורה והחלטות בתוקף
- **mobile-first:** 375px, בלי overflow-x, RTL/עברית.
- **מקור מוצרים — הקטלוג המרכזי הוא מקור-אמת יחיד.** קריאה: `useCatalogSync` מסנכרן בהפעלה + focus/visibility,
  `replaceCatalogProducts` הוא **full-replace מונוטוני** (מחליף רק אם `version > catalogVersion` המקומי). כתיבה:
  כל פעולות-האדמין (edit/toggle/delete/add product, add supplier) עוברות `commitCatalogOperations` →
  preview/apply. לוחות-זמנים/סניפים של ספקים **נשארים ב-settings-api** (אינם חלק מהקטלוג).
- **session-אדמין לכתיבה:** כניסה ב-9999 → `/api/price-auth` ממיר את ה-PIN ל-token חתום (HMAC, 8h). הסוד
  (`PRICE_ADMIN_SECRET=9999`) בשרת בלבד, **לא בבאנדל**. הטוקן נשמר ב-localStorage רק כש"זכור אותי" דולק.
  **ההנפקה ב-`App.tsx`** (useEffect על `user.isAdmin`, מ-`user.branchCode`) — מכסה גם כניסה טרייה וגם שחזור
  מ-persist. **PWA:** ניקוי cache לא מנקה localStorage; commit לקטלוג מקפיץ version → סנכרון מונוטוני דורס stale local.
- **idempotency:** `CommitAttempt {idempotencyKey, changeSetId?}` יציב על-פני ניסיונות-חוזרים; ניסיון-חוזר עושה
  **resume** מאותו changeSet (apply ישיר) → replay/recovery בשרת. preview חדש רק אם ה-changeSet לא-ישים
  (404/410/stale_version/version_conflict), לא על not_pending/idempotency_key_conflict.
- **backend מחירונים:** לוגיקה טהורה ב-`shared/priceCatalog/`; API+אחסון+הרשאות ב-`netlify/functions/_priceCatalog*`
  + `price-*.ts`. הרשאות fail-closed. `price-auth.ts` מנפיק session (rate-limited 5/15דק').
- **שיתוף סוכנים:** SEQUENTIAL; Relay (claude מתכנן/מבקר/פורס, codex מממש/מבקר); **רק claude עושה deploy**.
  review אדוורסרי (ultracode) + review של Codex ב-milestones נוגעי-כסף.

## מה נשאר לעשות / חסמים
1. **Plan 2 — בניית ה-GPT (צד OR, ב-ChatGPT):** הוסף Action עם הסכמה מ-`docs/gpt/openapi.yaml`, הוראות מ-
   `gpt-instructions.md`, ו-Bearer token = `PRICE_GPT_TOKEN`. ואז בדיקת-קבלה (שאלת מחיר → שינוי מאושר → ביטול).
   **חסם הוסר:** `PRICE_GPT_TOKEN` כבר ב-Netlify + נפרס. אין משימת-קוד פתוחה לסוכנים.
2. **בדיקת-עשן UI ל-Task 9a:** Playwright — login 9999 → עריכת מחיר → שמירה → אימות גרסה חדשה.
3. **ניקוי מינורי (לא חוסם):** באנר warnings (#8), auto-retry apply על 429 (#7), הודעת no_session על rate-limit (#14).
4. עתידי: Plan 3 (ייבוא מחירונים), Plan 4 (Hardening + שקילת auto-deploy).

## איך מריצים ובודקים
- פיתוח: `npm run dev`. כניסה: 1001–1009 (סניפים), 9999 (אדמין).
- טסטים: `npm test` (**71/71**). typecheck: `npx tsc --noEmit` (src) + `npx tsc -p tsconfig.check.json --noEmit`
  (gitignored; types:["node","vite/client"], include shared/netlify/tests).
- **Deploy לפרודקשן (ידני, CLI — claude בלבד, אחרי GO):**
  ```
  $env:VITE_API_TOKEN = "<Netlify env VITE_API_TOKEN>"   # חובה לפני build, אחרת auth נשבר
  $env:NETLIFY_AUTH_TOKEN = "<Netlify env NETLIFY_TOKEN>"
  npm run build
  npx --yes netlify-cli@latest deploy --prod --no-build --dir dist --functions netlify/functions --site 62cbac42-9bb2-4814-808b-0ef4b78928b5
  ```
  אימות: `GET /api/prices/catalog/version`, `/api/prices/products?limit=1&includeInactive=true` (total),
  `POST /api/price-auth {"secret":"9999"}` (token), ו-preview-write עם הטוקן.
- **env ב-Netlify (siteId 62cbac42-...):** קיימים API_TOKEN/VITE_API_TOKEN/NETLIFY_TOKEN/GOOGLE_*,
  `PRICE_ADMIN_SECRET=9999`, `PRICE_SESSION_SECRET`, **`PRICE_GPT_TOKEN`** (הוגדר 2026-06-21, context=all, scope functions).
- remote: `github.com/or4551-cyber/meshausha-pwa`. פרודקשן: `meshaushapp.netlify.app`. תוכנית PRO.

## מצב גיט
- ענף: `main`. קומיט אחרון: `6fff41b` ([claude] feat(plan2): GPT Actions package) + עדכון handoff/BOARD זה.
- פרודקשן: deploy אחרון `6a38212d` (2026-06-21) — backend זהה ל-Task 9a; מטרת ה-deploy הייתה רק לקלוט את
  `PRICE_GPT_TOKEN` (functions snapshot env ב-deploy). אומת חי. עדיין לדחוף `git push origin main`.

## יומן שלבים (מהחדש לישן)
- [2026-06-21 — Task 9a: מסך אדמין כותב לקטלוג](JOURNAL/2026-06-21-task9a-admin-catalog-writes.md) — preview/apply, session ממיחזור 9999; Codex תפס BLOCKER ב-idempotency → resume מ-changeSet; נפרס+אומת; סאגת env (PRICE_SESSION_SECRET ידני + redeploy).
- [2026-06-21 — פריסה ראשונה + פיוס + גילוי חסם billing](JOURNAL/2026-06-21-first-deploy-and-reconciliation.md) — הכל עלה לאוויר; 21 מוצרים חיים נשמרו בפיוס; סיבת השורש לאי-פריסה: חריגת קרדיט Netlify.
- [2026-06-21 — Task 8: חיבור frontend לקטלוג המרכזי](JOURNAL/2026-06-21-task8-frontend-catalog-sync.md) — adapter+api+useCatalogSync; review כפול תפס BLOCKER race → תוקן.
- [2026-06-21 — ליבת מערכת מחירוני ספקים (Plan 1, Tasks 1–7)](JOURNAL/2026-06-21-price-catalog-backend-core.md) — engine/store/auth/router/excel ב-TDD; review של Codex תפס 4 blockers + race → תוקנו.
- [2026-06-20 — עדכון מחירון טרה פלסט יוני 2026](JOURNAL/2026-06-20-terraplast-price-update.md) — קטלוג 88 פריטים + catalog-version migration; codex תפס באג כפילות שתוקן.
- [2026-06-20 — הקמת פרוטוקול שיתוף-פעולה Claude × Codex × OR (v1)](JOURNAL/2026-06-20-collab-protocol-v1.md) — שכבת תיאום מבוססת-קבצים + תיקוני תשתית גלובליים.
