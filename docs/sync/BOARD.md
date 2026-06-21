# לוח עבודה (BOARD) — מצב חי

> עדכן את השורה שלך **לפני** שאתה נוגע בקוד. ערוך רק קבצים שמופיעים תחת ה-`Now` שלך.
> כללים מלאים: `docs/sync/PROTOCOL.md`.

**סבב נוכחי:** פנוי — אף סוכן לא מחזיק את הטוקן. **Plan 2 הושלם ואומת חי** (ה-GPT הפרטי מחובר ועובד). אין משימת-קוד פתוחה; הבא Plan 3 (ייבוא מחירונים) כש-OR יחליט.

## Now (בעבודה כרגע)
| Agent  | משימה | קבצים/אזור נתבע (claimed) | Branch | עודכן (local) |
|--------|-------|---------------------------|--------|----------------|
| claude | — | — | — | — |
| codex  | — | — | — | — |

## Next (תור — לא התחיל)
- [ ] Plan 3 — ייבוא מחירונים (xlsx → ChangeSet → preview/apply)
- [ ] _(OR יוסיף משימות נוספות כאן)_

## Done (הושלם ואומת — החדש למעלה)
- [x] 2026-06-21 — **פרוטוקול v2** (`docs/sync/PROTOCOL.md`) — 4 שערים מלקחי הפרויקט: Claude=שער-אימות-סמכותי (§2/§7), runbook ל-deploy/env (§9), שער בדיקה-חיה לכסף/auth/קטלוג (§2 שלב 10ב), טריגרים מפורשים ל-review של Codex (§7) + היגיינת-BOM (§5). הוחל גם על התבנית הגלובלית `~/.claude/templates/collab/` (+ CODEX-PLAYBOOK סטאב + init). אומת: init dry-run 6 קבצים ללא BOM. — `claude` (לבקשת OR).
- [x] 2026-06-21 — **`docs/sync/CODEX-PLAYBOOK.md`** — לקחים ל-Codex מהפרויקט (sandbox=דפוס-הכשל; review סטטי=החוזקה; דפוסי-נכונות לכסף/קטלוג) + הפנייה מ-`AGENTS.md` (שלב 5 בטעינת-הפעלה) — `claude` (לבקשת OR).
- [x] 2026-06-21 — **Plan 2 — GPT פרטי מחובר לקטלוג (הושלם ואומת חי)** — `claude` — GPT Actions (9 פעולות, OpenAPI 3.1) + `PRICE_GPT_TOKEN` + 2 deploys (`6a38212d`, `6a382d3f`). באג חי שנתפס: `apply` החזיר snapshot מלא (~130KB) → ChatGPT "תקלה בקבלת התשובה" למרות הצלחה → תוקן (תשובה קלה לפי role, `e7e3776`). אומת מקצה-לקצה: OR ביקש מה-GPT "פטל→2" → version 4, פטל=2, history v1→v4. 73/73 tests.
- [x] 2026-06-21 — Plan 2 backend: חבילת GPT Actions + `PRICE_GPT_TOKEN` + redeploy (`6a38212d`) — `claude` — אומת מול ה-API: version/suppliers/search OK, טוקן-שגוי→401, preview→201 (write-role).
- [x] 2026-06-21 — מערכת מחירוני ספקים Task 9a (מסך אדמין כותב לקטלוג דרך preview/apply; session ממיחזור PIN 9999) — `claude` — review של `codex` תפס BLOCKER ב-idempotency → תוקן (resume מ-changeSet) + אישר. אומת בפרודקשן: auth 9999→token, bad→401, preview-write OK. 71/71 tests
- [x] 2026-06-20 — איתור+ייבוא התוכנית המאושרת המלאה (spec+roadmap+plan-1, 1696 שורות) מ-`GPT מחירונים` ל-`docs/sdd/` — `claude`
- [x] 2026-06-20 — מערכת מחירוני ספקים Task 2 (Pure Catalog Change Engine: normalization + engine preview/apply/revert) — `claude` — אומת: 8/8 טסטים, tsc+shared typecheck נקי
- [x] 2026-06-20 — מערכת מחירוני ספקים Task 1 (test runner Vitest + סכמות Zod לקטלוג) — כתב `codex`, אומת+קובע `claude` (npm test 3/3 עובר מחוץ ל-sandbox, build ירוק). חסמי ה-sandbox היו סביבתיים בלבד.
- [x] 2026-06-20 — עדכון מחירון טרה פלסט יוני 2026 (88 פריטים + 4 כפפות סלטים + migrateCatalog) — `claude` (review: `codex` תפס BLOCKER כפילות → תוקן) — אומת: build ירוק, tsc נקי, בדיקת ריצה (0 דופים, אידמפוטנטי)
- [x] 2026-06-20 — הקמת פרוטוקול שיתוף פעולה v1 (docs/sync + CLAUDE/AGENTS stubs) — `claude` — אומת: קבצים נוצרו, build לא הושפע
