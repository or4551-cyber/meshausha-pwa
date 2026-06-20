# שלב: הקמת פרוטוקול שיתוף-פעולה Claude × Codex × OR (v1) — 2026-06-20

## מטרת השלב
OR ביקש מצב עבודה משולש מסונכרן: הוא, Claude Code, ו-OpenAI Codex CLI עובדים יחד על אותו פרויקט, מחלקים שלבים, ומעדכנים אחד את השני בכל שלב — דרך התיקייה המשותפת `c:\Users\OR\קודקס`. בנוסף: לבדוק את Codex וכל החיבורים שלו, להשלים מה שחסר לתקשורת מושלמת, ולקבל תוכנית עבודה שמסבירה איך להשתמש בשני הסוכנים יחד.

## מה נבנה בפועל (קבצים עיקריים)
- `docs/sync/PROTOCOL.md` — מקור-אמת יחיד לכללי השיתוף (זהויות, ריטואל START/DURING/END, בעלות על קבצים, קומיטים, חלוקת עבודה Relay).
- `docs/sync/BOARD.md` — לוח חי: Now / Next / Done + מי מחזיק את הטוקן.
- `docs/sync/CHANNEL.md` — צ'אט append-only בין הסוכנים.
- `CLAUDE.md` + `AGENTS.md` (שורש) — stubs דקים ששניהם מייבאים `@docs/sync/PROTOCOL.md` (מקור-אמת יחיד). AGENTS.md כולל "טעינת הפעלה" — הוראה ל-Codex לקרוא קודם את docs/sync + docs/handoff.
- `.gitignore` — הוספת `~$*` ו-`*.xlsx` (ניקוי רעש קבצי עבודה).
- **גלובלי:** `~/.codex/shared-brain.md` — נוצר כ-hardlink ל-`~/.claude/shared-brain.md` (תיקון import שבור אצל Codex).
- **גלובלי:** `~/.claude/hooks/handoff_loader.ps1` — הורחב להזריק גם את השכבה החיה (BOARD מלא + זנב CHANNEL), ולפעול גם כשקיימת רק שכבת sync.
- **גלובלי:** `~/.claude/templates/collab/` — תבנית לשימוש חוזר (5 קבצים) + `init-collab.ps1` להקמה בכל פרויקט עתידי.

## הדרך: מה נוסה, מה עבד, מה נכשל ולמה
- חקירה ראשונית (3 סוכני Explore במקביל) גילתה שהתשתית חצי-קיימת: שני הסוכנים כבר חולקים את אותה תיקייה, פלאגין superpowers, סקיל handoff, וקבצי הוראות גלובליים כמעט זהים (שניהם `@shared-brain.md`). מה שחסר היה שכבת תיאום **פעילה** ברמת הפרויקט.
- סוכן תכנון תיקן שתי הנחות: (1) **יש** remote ב-GitHub (`github.com/or4551-cyber/meshausha-pwa`) — לא local-only; (2) `safe.directory` כבר מוגדר. כך ש-PR-based cross-review זמין בחינם, ותיקון git לא נדרש.
- אותו סוכן גילה ש-`@shared-brain.md` אצל Codex **שבור** — אין `~/.codex/shared-brain.md` (הקובץ קיים רק ב-`~/.claude/`).
- **תיקון ה-import:** סימלינק נכשל ("Administrator privilege required"). נפילה-לאחור ל-**hardlink** הצליחה (אותו volume, בלי אדמין). מגבלה ידועה: אם משהו ימחק-וייצור-מחדש את `~/.claude/shared-brain.md` במקום לערוך-במקום, ה-hardlink ב-`~/.codex` יישאר עם התוכן הישן. ל-v1 מספיק.
- **טעינת הפעלה ל-Codex:** נבדק config.toml — ל-Codex יש מנגנון hooks (superpowers רשום עם `session_start` דרך `hooks-codex.json`, hash-trusted). הוחלט **לא** להוסיף hook ידני (סיכון hash-trust + פורמט לא מתועד). הפתרון: Codex קורא `AGENTS.md` בשורש **אוטומטית** בהפעלה — וזה כבר מורה לו לקרוא docs/sync + docs/handoff. טעינה native אמיתית דרך המנגנון הקיים.

## כיוונים שעלו בשיחה ולא מומשו (+ למה)
- **מצב מקביל (branch-per-agent) כברירת מחדל** — נדחה. עבור אדם אחד שמתזמר שני סוכנים, צוואר הבקבוק הוא תשומת הלב של OR, לא תפוקת הסוכנים. רצוף = אפס merge conflicts. מקביל נשאר כאופציית אסקלציה מתועדת (PROTOCOL §4).
- **גשר CLI ישיר** (Claude מריץ `codex exec` או להפך) — נדחה מ-v1. סיכונים: חיוב כפול, אישורי sandbox, לולאות A→B→A בלי אדם. השכבה מבוססת-הקבצים + הטוקן-אצל-OR נותנת סנכרון עם מפסק-בטיחות אנושי. לשקול אחרי ש-v1 יוכיח את עצמו.
- **Netlify MCP ל-Codex** — נדחה בכוונה. בעלות-deploy יחידה (claude בלבד) מונעת מירוץ double-deploy.
- **hook הפעלה native ל-Codex** — נדחה (ראה לעיל); AGENTS.md ממלא את התפקיד.

## באגים שהתגלו ותוקנו
- `@shared-brain.md` שבור אצל Codex → תוקן ב-hardlink (ראה לעיל).
- `git status` מלוכלך מ-2 קבצי `.xlsx` לא-מעוקבים → תוקן ב-`.gitignore` (המידע של המוצרים ממילא מוטמע בקוד).

## החלטות שהתקבלו (+ נימוק)
- **ברירת מחדל SEQUENTIAL** (טוקן אחד, OR מעביר) — הכי פשוט לפיקוח, אפס התנגשויות.
- **חלוקת עבודה Relay** — claude מתכנן/מבקר/פורס; codex מממש מהר. מנצל חוזקות א-סימטריות (xhigh review מול הקשר 372k).
- **שתי שכבות מצב נפרדות** — LIVE (`docs/sync/`, כל תור) מול DEEP (`docs/handoff/`, גבול שלב). `docs/sync/` נפרד כדי שסקיל handoff (שמשכתב STATE.md) לא ידרוס את הלוח החי.
- **מקור-אמת יחיד** — הכללים נכתבים פעם אחת ב-PROTOCOL.md; CLAUDE.md ו-AGENTS.md רק מייבאים אותו.
- **הקמה גם כתבנית גלובלית** — כדי שכל פרויקט עתידי יקבל את אותו פרוטוקול דרך `init-collab.ps1`.

## קומיטים רלוונטיים
- (השלב הזה: `[claude] chore: collab protocol v1` — מתווסף בסוף השלב)
- `c88e7d1` fix: ESLint no-case-declarations ב-ReportsPage
- `a0ae9dd` feat: Phase 3 — חיפוש חוצה-הזמנות + דשבורד הנהלה

## לקחים לשלב הבא
- **לפני נגיעה בקוד:** קרא `docs/sync/BOARD.md` ואת זנב `docs/sync/CHANNEL.md`. ודא שהטוקן שלך.
- עדכן `Now` עם הקבצים שאתה תופס לפני שאתה עורך; הזז ל-`Done` (עם hash + אימות) בסוף.
- רק `claude` עושה deploy. בגבול שלב — הפעל `handoff` ואז `git push`.
- אם OR מדווח ש-Codex לא רואה את shared-brain אחרי עדכון של JARVIS — בדוק שה-hardlink לא נשבר (`(Get-Item ~/.codex/shared-brain.md).LinkType`).
