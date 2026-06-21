# שלב: ליבת מערכת מחירוני ספקים (Plan 1, Tasks 1–7) — 2026-06-21

## מטרת השלב
לבנות את שכבת ה-backend של "מערכת מחירוני הספקים" — מנגנון מתוקנן (versioned) לניהול קטלוג המחירים של כל הספקים, עם preview/apply/revert של שינויים, הרשאות, אחסון בענן וייצוא Excel. זו תשתית ל-Plan 2 (סוכן GPT שמעדכן מחירים) ו-Plan 3 (ייבוא מחירונים מ-XLSX/PDF). השלב הזה **לא נוגע באפליקציה החיה** — הכול אינרטי עד החיבור ב-Task 8.

הרקע: Codex התחיל את המשימה (Task 1) אך נחסם ע"י ה-sandbox (ACL על `C:\Users\OR`, אין כתיבה ל-`.git/index.lock`) והמליץ ש-claude ימשיך. claude מצא את התוכנית המאושרת המלאה ב-`GPT מחירונים` (1696 שורות), ייבא ל-`docs/sdd/`, ובנה את Tasks 2–7 ברצף ב-TDD לפי המלצת OR ("המשך לפי המלצתך").

## מה נבנה בפועל (קבצים עיקריים)
**shared/priceCatalog/** (לוגיקה טהורה, חוצת-סביבה):
- `types.ts` (Codex, Task 1) — סכמות Zod: CatalogSnapshot, CatalogProduct/Supplier, ChangeSet, ChangeOperation (discriminatedUnion: addSupplier/addProduct/updateProduct/deactivateProduct), source ∈ admin|gpt|import|revert. ChangeSet דורש operations min(1).
- `normalization.ts` — `normalizeCatalogName` (NFKC, מסיר ׳'/פסיקים, מכווץ רווחים, lowercase), `calculateUnitPrice`.
- `engine.ts` — `snapshotChecksum` (sha256), `createChangeSet` (preview, אזהרות >20%), `applyChangeSet` (אימוטבילי, guards של status/expiry/base-version, מחשב נגזרות, אינווריאנטים), `createRevertChangeSet` (diff active↔target), `verifySnapshotIntegrity`.
- `legacySeed.ts` — `createCatalogSeed` בונה snapshot v1 מ-270 המוצרים / 8 הספקים הקיימים, משמר ids/מחירים.

**netlify/functions/** (תשתית):
- `_priceCatalogStore.ts` — `PriceCatalogRepository` (interface) + מימוש Blob (`createBlobPriceCatalogRepository`, מפתחות `active/`, `versions/NNNNNNNN.json`, `changes/`, `idempotency/{sha256}`) + מימוש Memory לטסטים. saveVersion מסרב לדרוס גרסה עם checksum שונה.
- `_priceCatalogAuth.ts` — `authorizePriceRequest` (app=read-only, gpt=read+write, admin-session=read+write, **fail-closed**), `issueAdminSession`/`verifyAdminSession` (HMAC, 8h), `issueExportToken`/`verifyExportToken` (5 דק').
- `_priceRateLimit.ts` — 5 כשלונות/15 דק', מפתחות blob מבוססי hash של IP.
- `price-auth.ts` — handler לוגין אדמין (POST, timing-safe, 429+Retry-After).
- `_priceCatalogRouter.ts` — `routePriceCatalog` (פונקציה טהורה): GET products(search)/products/{id}/history/suppliers/catalog/version; POST changes/preview / changes/{id}/apply (idempotent) / revert-preview / export-link.
- `price-catalog.ts` — handler מבוסס Blob, seed-on-first-read, אימות תפקיד.
- `_priceCatalogExcel.ts` — `buildCatalogWorkbook` (גיליון סיכום + גיליון/ספק = 9 גיליונות).
- `price-export.ts` — GET export.xlsx (אימות token, attachment).
- `netlify.toml` — redirects ל-`/api/prices/*`, `/api/prices/export.xlsx`, `/api/price-auth` (force=true, לפני SPA `/*`).

**tests/priceCatalog/** — 8 קבצים, 30 טסטים (types, engine, legacySeed, reconciliation, store, auth, router, excel).

**docs/sdd/** — spec-gpt-design, roadmap (4 plans), plan-1-catalog-core (10 משימות), progress.md (tracker).

## הדרך: מה נוסה, מה עבד, מה נכשל ולמה
1. **ייבוא התוכנית:** התוכנית המאושרת נבנתה במקור ב-`GPT מחירונים` (בלי git). מצאתי אותה, ייבאתי ל-`docs/sdd/` כמקור-אמת משותף, ומילאתי progress.md.
2. **TDD ברצף (Tasks 2–7):** כל משימה RED→GREEN, אימות `npm test` + typecheck בכל אחת. נבנו 25 טסטים בשלב הראשון.
3. **פער ה-typecheck:** `tsconfig.json` כולל `include:["src"]` בלבד — לכן `shared/` ו-`netlify/` **לא** נבדקים ע"י ה-tsc של ה-build. הפתרון: `tsconfig.check.json` (extends הבסיס, `types:["node"]`, כולל shared+netlify+tests). הקובץ ב-`.gitignore` (כלי מקומי). זה פער ידוע שכדאי בעתיד להפוך ל-`npm run typecheck:api` קבוע.
4. **GATE לפני frontend:** אחרי Task 7 עצרתי וביקשתי review בלתי-תלוי של Codex על כל הליבה — כי Task 8 נוגע באפליקציה החיה. OR הריץ את Codex.
5. **Codex תפס 4 blockers אמיתיים + race** (ראה למטה). תיקנתי הכול עם טסט לכל תיקון (25→30 טסטים), Codex עשה re-review ו**אישר** ("מאשר להמשיך ל-Task 8").

חסמי הסביבה של Codex (sandbox/ACL) נמשכים — `npm test` הרגיל נכשל אצלו ב-config loader; הוא מריץ דרך fallback Vitest עם config inline. אצל claude (מחוץ ל-sandbox) הכול עובר רגיל.

## כיוונים שעלו בשיחה ולא מומשו (+ למה)
- **חיבור ה-frontend (Tasks 8–10)** — נדחה בכוונה אחרי הגייט: Task 8 (Catalog Adapter + Foreground Sync) נוגע ב-`src/lib/`, `suppliersStore.ts`, `App.tsx` — קוד שרץ אצל הסניפים. נכנס לסבב הבא.
- **Plan 2 (GPT Actions), Plan 3 (ייבוא מחירונים), Plan 4 (Production Hardening)** — ב-roadmap, אחרי Plan 1.
- **`npm run typecheck:api` קבוע** — נשקל; כרגע `tsconfig.check.json` מקומי בלבד כדי לשמור על diff ממוקד.

## באגים שהתגלו ותוקנו
כל אלה נתפסו ב-review של Codex על הליבה ותוקנו ב-`7eb1afc`:
1. **seed כותב לפני auth** (`price-catalog.ts`): `repo.getActive`→`saveVersion/activateVersion` רצו **לפני** `authorizePriceRequest` → בקשה לא-מאומתת יכלה לגרום לכתיבה ראשונה (מפר fail-closed). **תיקון:** אימות רץ ראשון; אין auth → 401 לפני יצירת ה-repo.
2. **idempotency replay לא מאומת ל-changeId** (`_priceCatalogRouter.ts`): replay החזיר snapshot לפי key בלבד → אותו key על change אחר החזיר 200/גרסה ישנה. **תיקון:** בודק `replay.changeSetId !== changeId` → 409 `idempotency_key_conflict`.
3. **revert ריק → 500** (`engine.ts`): `createRevertChangeSet` קרא `createChangeSet` גם עם 0 operations, אבל הסכמה דורשת min(1) → Zod זרק → 500 לא מטופל. **תיקון:** זורק `nothing to revert` → ה-router ממפה ל-409 `nothing_to_revert`.
4. **השוואת סוד לא constant-time** (`_priceCatalogAuth.ts`, `price-auth.ts`): `safeEqual` חזר מוקדם על אורך שונה (מדליף אורך) + gate `length>=8`. **תיקון:** `createHash('sha256').digest()` קבוע-32B לכל צד ואז `timingSafeEqual`, בלי early-return ובלי gate תלוי-קלט.
5. **(race) version conflict → 500 במקום 409**: `saveVersion/activateVersion` ב-apply לא היו עטופים. **תיקון:** try/catch שממפה 'refusing to overwrite' → 409 `version_conflict`.

(רקע: ב-review הקודם — עדכון טרה פלסט — Codex תפס באג כפילות כפפות; ראה הרשומה מ-2026-06-20.)

## החלטות שהתקבלו (+ נימוק)
- **Relay עם gate לפני frontend:** claude בונה את כל ה-backend ברצף, Codex עושה review בלתי-תלוי לפני שנוגעים בקוד החי. נימוק: backend אינרטי = בטוח לבנות מהר; הסיכון מתחיל בחיבור, ושם מודל שני קריטי. הוכיח את עצמו — Codex תפס 4 באגי נכונות/אבטחה אמיתיים.
- **push רק אחרי אישור re-review + GO של OR:** push ל-main = deploy לכל הסניפים. גם כשהקוד אינרטי, הפרוטוקול (§6) דורש אישור OR לפני deploy.
- **נורמליזציות שמות קוסמטיות נשמרות קריאות:** לא משנות מחיר/הזמנה.

## קומיטים רלוונטיים
- `7eb1afc` [claude] fix: address codex core review — 4 blockers + race
- `f9ceed0` [claude] docs(sync): backend gate — Tasks 1-7 done, awaiting Codex core review
- `8e844af` [claude] feat: export central supplier price workbook (Task 7)
- `cf0ef1a` [claude] feat: expose versioned price catalog API (Task 6)
- `3432d9e` [claude] feat: secure price catalog reads and writes (Task 5)
- `efa07ca` [claude] feat: add versioned price catalog repository (Task 4)
- `3456501` [claude] feat: reconcile existing products into catalog seed (Task 3)
- `28daf1c` [claude] feat: immutable price catalog change engine (Task 2)
- `a3f0152` [claude] docs(sdd): import approved supplier price-catalog plan
- `160738c` [codex] chore: add price catalog schemas and test runner (Task 1)

(10 קומיטים מקומיים, **לא נדחפו** — ממתינים ל-GO של OR ל-push.)

## לקחים לשלב הבא (Task 8 — חיבור ה-frontend)
- **Task 8 נוגע באפליקציה החיה.** קבצים צפויים: `src/lib/priceCatalogAdapter.ts` (חדש, המרת CatalogProduct→Product), `src/stores/suppliersStore.ts`, `src/App.tsx`, hook `useCatalogSync`. כל שינוי שם משפיע על 9 סניפים — review + GO לפני deploy.
- **המרת מודל:** ה-CatalogProduct החדש (snapshot מתוקנן) צריך להתמפות ל-`Product` הקיים של ה-store בלי לשבור את מנגנון ה-seed/migration הקיים (`CATALOG_VERSION`/`migrateCatalog`). שים לב לאינטראקציה בין שני המנגנונים.
- **הרצת טסטים:** מחוץ ל-sandbox — `npm test` (30/30). אם אתה Codex/סוכן ב-sandbox — fallback Vitest עם config inline.
- **typecheck מלא של ה-backend:** `npx tsc -p tsconfig.check.json --noEmit` (הקובץ ב-gitignore; צור אם חסר — extends tsconfig.json, types:["node"], include shared/netlify/tests).
- **env vars נדרשים ב-Netlify לפני שה-API באמת עובד בפרודקשן:** `API_TOKEN`, `PRICE_GPT_TOKEN`, `PRICE_SESSION_SECRET`, `PRICE_ADMIN_SECRET`. בלעדיהם הפונקציות fail-closed (401) — בטוח, אבל לא פעיל.
