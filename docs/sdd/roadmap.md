# Supplier Price Catalog Delivery Roadmap

**Spec:** `docs/superpowers/specs/2026-06-20-supplier-price-catalog-gpt-design.md`

The approved spec contains three independently reviewable subsystems. Each subsystem receives its own implementation plan and produces working software before the next begins.

## Plan 1 — Catalog Core, App Integration, and Excel

Deliverables:

- Versioned catalog in Netlify Blobs.
- Preview/apply/revert change engine.
- Separate app-read, admin-write, and future GPT-write authorization.
- Reconciliation of all 270 products and 8 suppliers.
- App refresh on startup and foreground resume with offline cache fallback.
- Admin product mutations routed through the catalog API.
- Central Excel workbook generated from the active version.

Detailed plan: `docs/superpowers/plans/2026-06-20-price-catalog-core.md`

Exit gate: the app and exported Excel show the same active version and prices; every mutation is versioned and reversible.

## Plan 2 — Private GPT Actions

Deliverables:

- OpenAPI action schema for catalog search, preview, apply, history, revert, and export.
- Private GPT instructions and Hebrew conversation examples.
- Dedicated GPT API key stored only in GPT configuration and Netlify environment variables.
- Consequential write operations and server-enforced two-step confirmation.
- Manual acceptance suite using real product questions and one reversible price change.

Exit gate: a new ChatGPT conversation reads live prices and can apply an explicitly approved change that reaches the app and Excel.

## Plan 3 — Price-List Imports

Deliverables:

- Deterministic XLSX/CSV parsing.
- Structured PDF/image extraction through ChatGPT file understanding.
- Supplier detection, SKU/name matching, confidence states, duplicate detection, and anomaly flags.
- Import comparison with unchanged, changed, new, missing, and uncertain rows.
- Partial approval, source-file retention, atomic apply, and rollback.

Exit gate: representative Excel, CSV, PDF, and image price lists produce accurate previews; uncertain rows never publish automatically.

## Plan 4 — Production Hardening and Rollout

Deliverables:

- Full backup/restore drill.
- Mobile verification at 375px and offline/foreground-resume checks.
- Production reconciliation report and smoke tests for selected suppliers.
- Staged deployment under the Meshausha collaboration protocol; only Claude deploys.

Exit gate: production reads, writes, export, rollback, and branch refresh are verified with no product-count or price drift.

