# שלב: שדרוג GPT — סבב 1: ייבוא מחירונים (Price-List Import) — 2026-07-02

## מטרת השלב
OR ביקש לשדרג את ה-GPT הפרטי הקיים ב-ChatGPT ("מחירוני משאוושה") — "הכל, מדורג, כשהמומלץ מוביל, בנייה עמידה". סבב 1 (המומלץ ראשון) = **ייבוא מחירון שלם בפעולה אחת**: OR מצרף מחירון ספק (Excel/PDF/צילום/טקסט) ל-GPT → ה-GPT קורא, מתאים מול הקטלוג, ומראה diff (שונה/חדש/נעלם/לא-ודאי) → OR מאשר → גרסה אחת מתפשטת לכל הסניפים. זה הכאב האמיתי (סיפור טרה פלסט) — עד היום העדכון היה ידני.

## מה נבנה בפועל (קבצים עיקריים)
- **`shared/priceCatalog/import.ts`** — *חדש*. מנוע-התאמה טהור ודטרמיניסטי (id/now מוזרקים). `ImportRowSchema`/`ImportPreviewRequestSchema` (Zod) + `buildImportPlan(active, request, ctx)`. התאמה מדורגת precision-over-recall: SKU מדויק→בטוח · שם-מנורמל יחיד→בטוח, ריבוי→uncertain · alias יחיד→בטוח · חלקי→**תמיד uncertain (לא מוחל אוטומטית)** · אין מועמד→new. מחיר זהה→unchanged (בלי op, לא מונה בפירוט). `detectMissing` (ברירת-מחדל false)→deactivate. מחיר ≤0/לא-סופי→invalid. **`confidentOperations` לעולם לא כולל uncertain/invalid** (ערובת-ברזל). מגני-כפילות: dup-sku בין שורות-new, dup-target, exclude.
- **`netlify/functions/_priceCatalogRouter.ts`** — *שונה*. route חדש `imports/preview` → `handleImportPreview`: safeParse→400 · getActive→404 · baseVersion≠active→409 · resolve supplier (unknown/ambiguous → **200 סטטוס שיחתי**, לא שגיאה) · buildImportPlan · 0 בטוחות→200 `no_confident_changes` (נמנע מ-`createChangeSet` שזורק על ריק) · אחרת `createChangeSet(source:'import')`+save→**201** תשובה תמצתית (CAP=60, truncated, <100KB). **ה-apply הקיים לא נגע** — הייבוא מייצר ChangeSet סטנדרטי שמוחל דרך `POST /changes/{id}/apply` הבדוק.
- **`docs/gpt/openapi.yaml`** — *שונה*. path `previewImport` (description 251 תווים, בלי `x-openai-isConsequential` כי preview לא כותב) + סכמות `ImportRow`/`ImportPreviewResponse`. אומת: 3.1.0, 10 operations, בלי nullable.
- **`docs/gpt/gpt-instructions.md`** — *שונה*. סעיף עברית "ייבוא מחירון (זרימה מחייבת)": קרא קובץ→חלץ שורות+rowIds→זהה ספק→getCatalogVersion→previewImport→ענף לפי status→הצג ספירות/שינויים/אזהרות/review→הכרע uncertain→APPROVE→applyChange+Idempotency-Key→דווח+הצע ביטול.
- **טסטים** — `tests/priceCatalog/import.test.ts` *חדש* (16) + `router.test.ts` הורחב (+4). סה"כ ~102 ירוקים.
- **קבצים ל-OR** — `C:\Users\OR\Desktop\gpt-update\{openapi.yaml, gpt-instructions.md}` להדבקה ב-ChatGPT.

## הדרך: מה נוסה, מה עבד, מה נכשל ולמה
- **הכרעת-העיצוב המרכזית (עמידות):** לא בונים נתיב-כתיבה שני. הייבוא מסתיים ב-ChangeSet `source:'import'` (הenum כבר תמך בזה) → יורש בחינם idempotency, גרסאות מונוטוניות, 409, revert, תשובת-GPT קלה. נוסף **endpoint אחד בלבד** (preview). "אישור חלקי" בלי endpoint שני: preview מקבל `excludeRowIds`/`excludeProductIds`, ה-GPT מריץ preview מחדש בלי השורות שנדחו.
- **ספק לא-מזוהה = 200, לא 4xx** — כדי שה-GPT ינהל שיחה ("איזה ספק?") במקום להיכשל. הוחזר כ-status `unknown_supplier`/`ambiguous_supplier`.
- **TDD:** נכתב אדום→ירוק. 16 טסטי מנוע כיסו: התאמת שם-חלקי/alias בעברית, שינוי-מחיר+אחוז, new/missing, uncertain על ריבוי, פסילת מחיר-שגוי, exclude, dup-sku, ואי-מנייה של unchanged (שמירת גודל-תשובה).
- **נתיב עברי משבש Write** — קרה שוב; עקפתי עם Bash heredoc / סקריפטי Python (patch_router.py, patch_gpt.py) בסקרצ'פאד.
- **אימות חי בפרודקשן:** אחרי deploy, `imports/preview` על טרה פלסט → 201, changeSetId, diff נכון (tp42 51.8→52.8, 1.93%), 493 bytes, הגרסה הפעילה (4) לא זזה (preview לא ממש מוטט).
- **בדיקת-קבלה של OR (2026-07-02):** OR עדכן את ה-GPT ב-ChatGPT (Instructions + Schema), ואז הרצנו הודעת-בדיקה מדומה (3 שורות טרה פלסט: 2 שינויים + 1 חדש, בלי אישור). OR: "נראה שעובד" — ה-GPT זיהה ספק, קרא previewImport, הציג diff. **השלב נסגר.**

## כיוונים שעלו בשיחה ולא מומשו (+ למה)
- **פענוח-שרת של Excel/CSV** (דיוק גבוה יותר מחילוץ ע"י ה-GPT) — נדחה ל-שדרוג-דיוק עתידי. ל-MVP ה-GPT מחלץ שורות מכל פורמט ושולח JSON מובנה (אחיד, בלי צנרת-בינארי).
- **אחסון קובץ-מקור בינארי / רשומת ImportBatch ל-audit** (spec §6.6) — מחוץ להיקף ל-MVP (Actions לא שולח בינארי).
- **endpoint `imports/{id}/apply` נפרד** (נרמז ב-spec §8) — נדחה במכוון; ה-apply הקיים מספיק.

## באגים שהתגלו ותוקנו
אין באגים בקוד החדש. סיכון שנמנע מראש: dup-sku בין שורות-new היה מפר invariant ב-apply → נותב ל-review לפני שהגיע ל-createChangeSet (יש טסט).

## החלטות שהתקבלו (+ נימוק)
- **Reuse על צינור-הכתיבה הקיים** במקום נתיב שני — עמידות מקסימלית, שטח-תקיפה מינימלי.
- **precision-over-recall** — טוב יותר לשלוח שורה מפוקפקת ל-review מאשר לעדכן מחיר לא-נכון אוטומטית.
- **detectMissing כבוי כברירת-מחדל** — מחירון חלקי לא ישבית מוצרים בטעות.
- **סבבים 2-3 של ה-GPT מופו אך לא נבנו** (הזמנות/תובנות-קריאה; מודיעין-מחיר).

## קומיטים רלוונטיים
- `d547bd9` [claude] feat(gpt): price-list import (Round 1 of GPT upgrade)
- (deploy פרודקשן: `6a4649c5`)

## לקחים לשלב הבא
- ה-GPT מעודכן וחי. סבב 2 (הזמנות/תובנות-קריאה) הוא הבא ההגיוני ל-GPT — סיכון נמוך, endpoints קריאה בלבד.
- לכל שינוי ב-GPT: OR מדביק ידנית ל-ChatGPT את `docs/gpt/openapi.yaml` (Schema) + `gpt-instructions.md` (Instructions). האימות = לוודא ש-`previewImport` (וכל operation חדש) מופיע ברשימת הפעולות אחרי הדבקה.
- דפוס-אימות ללא סיכון: הודעת-בדיקה מדומה שמפעילה previewImport בלי apply (preview לא ממוטט). לאימות מלא — apply ואז "בטל את הייבוא האחרון" (revert).
