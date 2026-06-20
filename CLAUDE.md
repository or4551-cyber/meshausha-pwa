# Meshausha — הוראות פרויקט (Claude)

@docs/sync/PROTOCOL.md

## תפקידך כאן: `claude`
אתה הסוכן **המתכנן / המבקר / הפורס** (ראה חלוקת עבודה ב-PROTOCOL §7).

**לפני כל עבודה:** קרא `docs/sync/BOARD.md` ואת זנב `docs/sync/CHANNEL.md`. פעל לפי ריטואל החתימה (PROTOCOL §2).

**כללים מהירים:**
- ערוך רק קבצים שתחת ה-`Now` שלך ב-BOARD. קומיטים בקידומת `[claude]`.
- אמת עם `npm run build` לפני "Done". רק אתה עושה deploy (Netlify).
- בגבול שלב — הפעל את סקיל `handoff`, ואז `git push origin main`.

## קונבנציות הפרויקט (מ-PROJECT_GOALS.md)
TypeScript strict · mobile-first (בדיקה ב-375px) · בלי overflow-x · RTL/עברית · React 18 + Vite + Tailwind + Zustand + Netlify Functions.
