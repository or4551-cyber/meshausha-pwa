# SDD Progress — Supplier Price Catalog

מקור-אמת: `docs/sdd/spec-gpt-design.md` (אפיון), `docs/sdd/roadmap.md` (4 פלאנים), `docs/sdd/plan-1-catalog-core.md` (תוכנית מימוש מפורטת, 10 משימות).
האפליקציה: `Meshausha`. תוכננה במקור ב-`GPT מחירונים` (ללא git) — יובא לכאן כמקור-אמת משותף ומגובה.

## Plan 1 — Catalog Core, App Integration, and Excel

| # | משימה | סטטוס | מי | הערות |
|---|-------|-------|-----|-------|
| 1 | Test Runner and Catalog Schemas | ✅ הושלם | codex (אומת+קובע claude) | npm test 3/3, commit 160738c (מקומי) |
| 2 | Pure Catalog Change Engine | ✅ הושלם | claude | normalization.ts + engine.ts + engine.test.ts; 8/8 טסטים, shared typecheck נקי |
| 3 | Deterministic Legacy Seed and Reconciliation | ✅ הושלם | claude | legacySeed.ts; פיוס 270/8 מאומת (4 טסטים) |
| 4 | Versioned Blob Repository | ✅ הושלם | claude | _priceCatalogStore.ts (blob+memory); 3 טסטים |
| 5 | Price API Authentication and Admin Session | ⬜ ממתין | | API_TOKEN / PRICE_GPT_TOKEN / PRICE_ADMIN_SECRET |
| 6 | Catalog HTTP Router and Netlify Handler | ⬜ ממתין | | routePriceCatalog + handler |
| 7 | Central Excel Workbook and Signed Download Link | ⬜ ממתין | | summary tab + tab/supplier |
| 8 | Frontend Catalog Adapter and Foreground Sync | ⬜ ממתין | | חיבור ל-suppliersStore/App |
| 9 | Secure Admin Preview and Apply | ⬜ ממתין | | מסך אדמין preview/apply |
| 10 | End-to-End Reconciliation, Documentation, and Review Gate | ⬜ ממתין | | |

## פלאנים עתידיים (roadmap)
- Plan 2 — Private GPT Actions (סוכן המחירים)
- Plan 3 — Price-List Imports (XLSX/CSV/PDF/תמונות)
- Plan 4 — Production Hardening and Rollout

## כללי ביצוע
- TDD לכל משימה (RED→GREEN), אימות `npm test` + `npx tsc --noEmit` בכל אחת.
- Relay: claude בונה, codex מבקר ב-gates. רק claude עושה deploy (Plan 4).
- כל שינוי מחיר → preview + אישור מפורש. מחירים לפני מע"מ. 9999 = שער ניווט, לא סוד.
