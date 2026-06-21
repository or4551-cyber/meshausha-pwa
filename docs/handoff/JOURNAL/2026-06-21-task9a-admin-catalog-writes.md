# שלב: Task 9a — מסך אדמין כותב לקטלוג המרכזי — 2026-06-21

## מטרת השלב
לסגור את "חוב Task 9": עד עכשיו מסך האדמין כתב מחירים ל-`settings-api` הישן בלבד, ו-`replaceCatalogProducts`
(full-replace בעדכון גרסת-קטלוג) היה **מוחק** עריכות אדמין כשתפורסם v2. המטרה: כל כתיבות-האדמין על
מוצרים יעברו ל**קטלוג המרכזי** דרך preview/apply (מגורסן + הפיך), כך שהקטלוג יהיה מקור-אמת יחיד.

## מה נבנה בפועל (קבצים עיקריים)
- `src/lib/priceAdminSession.ts` (חדש) — ניהול session: ממיר PIN→token דרך `/api/price-auth`, cache בזיכרון +
  localStorage (רק כש"זכור אותי" דולק), re-mint שקט מ-PIN זכור, מאזין `storage` cross-tab, `freshToken` שלא
  מחזיר טוקן פג, `setSessionPersistence`/`primeAdminPin`/`clearPriceSession`.
- `src/lib/priceCatalogWrites.ts` (חדש) — בוני `ChangeOperation` טהורים (buildPriceUpdate/AdminOnly/Deactivate/
  AddProduct/AddSupplier) + `commitCatalogOperations(operations, attempt)` עם **resume מ-changeSet שמור**.
- `src/lib/priceCatalogApi.ts` — נוסף write client: `previewChanges`/`applyChange` (מחזירים שגיאה מובנית, לא null
  כמו הקריאה), `getCatalogSuppliers` (לפתרון supplierId לפי שם).
- `src/hooks/usePriceAdminSession.ts` (חדש) — hook: committing/error/warnings, נעילת re-entrancy (useRef),
  מיפוי קודי-שגיאה לעברית, מחיל snapshot ל-store בהצלחה.
- `src/pages/admin/PriceManagementPage.tsx` — edit/toggle/delete/add → commit; אישור על שינוי >20%; באנר מצב.
- `src/pages/admin/AddSupplierPage.tsx` — ספק+מוצרים → addSupplier+addProduct[] בקטלוג; catalogDone guard;
  awaitable schedules ל-settings-api; מגן שם-ספק-כפול.
- `src/pages/LoginPage.tsx` — כניסת אדמין מנפיקה session (primeAdminPin + authenticateWithPin + setSessionPersistence).
- `src/stores/authStore.ts` — logout מנקה session.
- `src/stores/suppliersStore.ts` — הוסרו ה-mutators העוקפים (addProducts/updateProduct/deleteProduct);
  `replaceCatalogProducts` עכשיו **מונוטוני** (מחליף רק אם version>current); `addSupplier` מחזיר Promise.
- `tests/priceCatalog/` — נוספו writes/session/commit/suppliersStore + הרחבת api (סה"כ 71 טסטים).

## הדרך: מה נוסה, מה עבד, מה נכשל ולמה
1. **גילוי שה-backend כבר בנוי:** `netlify/functions/price-auth.ts` כבר היה ה-endpoint שמנפיק session
   מ-`PRICE_ADMIN_SECRET` (rate-limited). כלומר Task 9a הוא **frontend בלבד** — לא נדרש endpoint חדש.
2. **החלטת ארכיטקטורה — הגירה מלאה + full-replace:** שקלתי `merge-preserving` (לשמר מוצרים local-only),
   אבל הוכחתי שהוא יוצר באג **'מוצר-מחוק-חוזר'** על מכשירי old-seed (חסרים את שדה `supplierId` מקומית, אז
   לא ניתן להבחין "local-only" מ"קטלוג שנמחק"). לכן full-migration + full-replace נקי הוא הבחירה הנכונה.
   `createCatalogSeed` שימר id מקורי → `product.id` המקומי === id בקטלוג, אז update/deactivate לפי id תופסים.
3. **בחירת אבטחה (OR):** הוצגו שתי דרכים בלי סיסמה נפרדת — מיחזור PIN 9999 (סוד בשרת בלבד) מול סוד מוטמע
   בבאנדל. OR בחר **מיחזור 9999** (המאובטח: אין סוד בקוד הציבורי, אותו קוד ששומר על /admin, rate-limited).
4. **review אדוורסרי עצמי (Workflow, 5 ממדים + אימות לכל ממצא):** תפס **14 ממצאים (4 major)** — כולם תוקנו
   (ראה "באגים"). זה גם תפס דברים ש-Codex לא העיר עליהם בהמשך (rememberMe persist, monotonic, orphan).
5. **review של Codex (סבב 1):** אישר אבטחה/race/orphan, אבל תפס **BLOCKER** ב-idempotency: ה-fix שלי מנע
   כפילות אך לא איפשר לניסיון-חוזר *להצליח* — `commitCatalogOperations` עשה preview חדש כל פעם → changeId חדש →
   השרת החזיר `409 idempotency_key_conflict` (או המשתמש נתקע ולא יכול להשלים schedules אחרי שהקטלוג נשמר).
6. **תיקון ה-BLOCKER:** `CommitAttempt {idempotencyKey, changeSetId?}` יציב; אחרי preview שומרים את
   `changeSet.id`; ניסיון-חוזר מנסה `applyChange` **על אותו changeId+key** → מפעיל replay/recovery בשרת ומחזיר
   snapshot. preview חדש רק אם ה-changeSet לא-ישים.
7. **Codex סבב 2:** אישר ("אין blocker ל-deploy"), + הערת hardening: `changeSetUnusable` התייחס לכל 409 כ-
   re-preview; על `not_pending`/`idempotency_key_conflict` (השינוי כבר נחת) re-preview עלול ליפול duplicate-id.
   יישמתי — re-preview רק כשהשינוי בוודאות לא נחת (404/410/stale_version/version_conflict).
8. **פריסה + סאגת ה-env:** `PRICE_ADMIN_SECRET=9999` נשמר ועבד. אבל `PRICE_SESSION_SECRET` **סירב להישמר**
   דרך ה-API כשמסומן secret (החזיר "upserted" אך לא הופיע), וניסיון לא-מסומן **נחסם ע"י ה-classifier**
   (סוד-חתימה בפלטקסט). OR הגדיר אותו ידנית בדאשבורד (All scopes, לא-מסומן) — נשמר. נדרש **redeploy** כי
   Netlify Functions מצלמים env בזמן deploy (לא runtime). אחרי redeploy — עבד.
9. **אימות בפרודקשן:** catalog v1/291; `9999`→token (len 92); `0000`→401; preview-write יצר changeSet (לא-mutating).

## כיוונים שעלו בשיחה ולא מומשו (+ למה)
- **merge-preserving replaceCatalogProducts** — נפסל (באג מוצר-מחוק-חוזר על old-seed). במקום: full-replace מונוטוני.
- **סוד-כתיבה מוטמע בבאנדל** — נפסל לטובת מיחזור 9999 (אין סוד בקוד ציבורי).
- **סיסמת-מחירים נפרדת** — OR פסל עוד קודם (9999 מספיק).
- **פיצול ל-Task 9b** — במקור תוכנן לדחות add-product/add-supplier; בפועל מומשו עכשיו (כי full-replace דורש
  שכל כתיבות-המוצרים יעברו לקטלוג). "9b" שנותר = ניקוי קל בלבד.
- **ממצאים מינוריים שנותרו (לא חוסמים):** באנר warnings נמחק על פעולה תמימה (#8 — שער ה->20% הוא showConfirm,
  תקין); apply-time 409 לא עושה auto-retry (#7 — מציג "נסה שוב" ברור); הודעת no_session על 429 מתמיד (#14).
  כולם UX מינורי, לא נוגעי-נכונות.

## באגים שהתגלו ותוקנו
- **(major, אבטחה)** "זכור אותי=כבוי" השאיר טוקן-כתיבה ב-localStorage ל-8h → `persist` מותנה ב-rememberMe.
- **(major, כסף)** idempotency: ניסיון-חוזר אחרי apply-מוצלח+תשובה-אבודה → כפילות/תקיעה. תיקון דו-שלבי:
  (1) CommitAttempt יציב (key+ids), (2) resume מ-changeSet שמור (תיקון ה-BLOCKER של Codex).
- **(major, race)** `replaceCatalogProducts` לא-מונוטוני → sync ברקע יכל לדרוס commit טרי. → guard `version>current`.
- **(major, orphan)** AddSupplierPage כתב schedules ל-settings-api כ-fire-and-forget → ספק עם מוצרים חיים בלי
  לוח-זמנים. → addSupplier awaitable + חשיפת שגיאה + לא מנווט בשקט + catalogDone guard.
- **(minor)** re-entrancy (לחיצה כפולה), re-mint מחזיר טוקן פג, אין ניקוי cross-tab, שם-ספק-כפול, כפתורי ביטול
  לא מושבתים בזמן commit — כולם תוקנו.
- **(infra)** `PRICE_SESSION_SECRET` לא נשמר דרך ה-API → הוגדר ידנית בדאשבורד. functions לא קלטו env חדש →
  redeploy פתר.

## החלטות שהתקבלו (+ נימוק)
- **מיחזור PIN 9999 כ-`PRICE_ADMIN_SECRET`** (OR) — אין סוד בבאנדל, אותו קוד ששומר על /admin, rate-limited.
- **הגירה מלאה + full-replace מונוטוני** — מקור-אמת יחיד, בלי באגי-merge; apply תמיד מפיק version+1.
- **idempotency דרך CommitAttempt יציב + resume** — היחיד שמבטיח גם "בלי כפילות" וגם "ניסיון-חוזר מצליח".
- **`PRICE_SESSION_SECRET` לא-מסומן (All scopes)** — כך נשמר; עקבי לשאר הסודות באתר (Google/Netlify), scoped
  ל-functions בפועל, לעולם לא בבאנדל (אין VITE_ prefix).

## קומיטים רלוונטיים (מהחדש לישן)
- `7c1de04` docs: Task 9a deployed + verified
- `c35a3a1` fix: harden changeSetUnusable per Codex note
- `ef8ad6a` fix: resume apply from saved changeSet (Codex BLOCKER)
- `6eb8f4c` fix: address adversarial review (4 major + minors)
- `c098f5f` feat: Task 9a — admin price writes go through the central catalog
- (פרוס: deploy `6a37f4b8`; env: PRICE_ADMIN_SECRET=9999, PRICE_SESSION_SECRET ידני)

## לקחים לשלב הבא
- **env של functions:** PRICE_SESSION_SECRET הוגדר **ידנית בדאשבורד** (ה-API/MCP לא שמר secret-masked). כל שינוי
  env דורש **redeploy** (functions מצלמים env בזמן deploy, לא runtime). `PRICE_GPT_TOKEN` עדיין לא מוגדר —
  צריך אותו ל-Plan 2 (GPT Actions).
- **deploy:** ידני ב-CLI כמתואר ב-STATE; חובה `VITE_API_TOKEN` לפני build.
- **חוב Task 9 נסגר:** כל כתיבות-המוצרים בקטלוג. `replaceCatalogProducts` מונוטוני + full-replace בטוח.
- **הבא:** Plan 2 (GPT Actions — כאן ה-GPT מתחבר; צריך PRICE_GPT_TOKEN), ואז Plan 3/4. או ניקוי מינורי (#7/#8/#14).
- **בדיקת UI אמיתית:** טרם נבדק זרימת המשתמש המלאה ב-Playwright (login 9999 → עריכת מחיר → שמירה). האימות היה
  ברמת ה-API (preview-write OK). שווה בדיקת-עשן ב-UI לפני שמסתמכים על עריכה יומיומית.
