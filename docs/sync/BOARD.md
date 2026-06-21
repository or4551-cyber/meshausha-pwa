# לוח עבודה (BOARD) — מצב חי

> עדכן את השורה שלך **לפני** שאתה נוגע בקוד. ערוך רק קבצים שמופיעים תחת ה-`Now` שלך.
> כללים מלאים: `docs/sync/PROTOCOL.md`.

**סבב נוכחי:** `claude` מחזיק את הטוקן (OR אישר — בונה Task 9a: כתיבות אדמין → קטלוג מרכזי).

## Now (בעבודה כרגע)
| Agent  | משימה | קבצים/אזור נתבע (claimed) | Branch | עודכן (local) |
|--------|-------|---------------------------|--------|----------------|
| claude | Task 9a — מסך אדמין כותב לקטלוג (preview/apply, session ממיחזור PIN 9999) | `src/lib/priceAdminSession.ts`, `src/lib/priceCatalogWrites.ts`, `src/lib/priceCatalogApi.ts`, `src/hooks/usePriceAdminSession.ts`, `src/pages/admin/PriceManagementPage.tsx`, `src/pages/admin/AddSupplierPage.tsx`, `src/pages/LoginPage.tsx`, `src/stores/suppliersStore.ts`, `src/stores/authStore.ts`, `tests/priceCatalog/*` | main | 2026-06-21 |
| codex  | — | — | — | — |

## Next (תור — לא התחיל)
- [ ] _(ריק — OR יוסיף משימות כאן)_

## Done (הושלם ואומת — החדש למעלה)
- [x] 2026-06-20 — איתור+ייבוא התוכנית המאושרת המלאה (spec+roadmap+plan-1, 1696 שורות) מ-`GPT מחירונים` ל-`docs/sdd/` — `claude`
- [x] 2026-06-20 — מערכת מחירוני ספקים Task 2 (Pure Catalog Change Engine: normalization + engine preview/apply/revert) — `claude` — אומת: 8/8 טסטים, tsc+shared typecheck נקי
- [x] 2026-06-20 — מערכת מחירוני ספקים Task 1 (test runner Vitest + סכמות Zod לקטלוג) — כתב `codex`, אומת+קובע `claude` (npm test 3/3 עובר מחוץ ל-sandbox, build ירוק). חסמי ה-sandbox היו סביבתיים בלבד.
- [x] 2026-06-20 — עדכון מחירון טרה פלסט יוני 2026 (88 פריטים + 4 כפפות סלטים + migrateCatalog) — `claude` (review: `codex` תפס BLOCKER כפילות → תוקן) — אומת: build ירוק, tsc נקי, בדיקת ריצה (0 דופים, אידמפוטנטי)
- [x] 2026-06-20 — הקמת פרוטוקול שיתוף פעולה v1 (docs/sync + CLAUDE/AGENTS stubs) — `claude` — אומת: קבצים נוצרו, build לא הושפע
