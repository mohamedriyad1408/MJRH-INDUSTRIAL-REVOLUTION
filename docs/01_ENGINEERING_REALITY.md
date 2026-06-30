# 01. ENGINEERING REALITY DOCUMENT — v2.1 CTO Review Hardened
**Target Audience:** Core Engineering Team & Technical Auditors  
**Purpose:** A strictly factual, non-marketing audit of the existing repository state, architectural boundaries, technical debt, and implementation realities.  
**Last Verified:** 2026-06-30 — CI green: typecheck 0 errors / vitest 28/28 / build 13.04s / bundle budget pass  
**Reviewer Score (external CTO): 9.5/10 — “separates What Exists from What Doesn't”**

---

## 1. Current Architecture & Stack Reality

* **Frontend Framework:** React 18 (SPA) powered by Vite 6.4.3.
* **Routing:** TanStack Router (`@tanstack/react-router` v1.168) with file-based route generation (`routeTree.gen.ts`).
* **State Management & Data Fetching:** TanStack Query (`@tanstack/react-query` v5) combined with custom React context providers (`AuthProvider`, `I18nProvider`).
* **Backend & Database:** Supabase (`@supabase/supabase-js` v2.50) connecting to PostgreSQL 15.
* **Styling & UI Components:** Tailwind CSS (v3.4) with Radix UI primitives (`shadcn/ui` architecture).
* **Bundle Budget Strategy:** Manual chunk splitting configured in `vite.config.ts` separating translation packs (`i18n-internal`, `i18n-public`) and vendor dependencies (`vendor-react`, `vendor-tanstack`, `vendor-supabase`, `vendor-radix`, `vendor-icons`). Verified via `scripts/check-bundle-size.mjs`.

### 1.1 Architecture Diagram (added per CTO review)

```
[ Browser / React 18 + Vite ]
              │
              ▼
[TanStack Router — file routes /routes/* → routeTree.gen.ts]
              │
              ▼
[TanStack Query — Unified Query Layer: lib/query-layer.ts]
              │
              ▼
[Supabase JS Client — integrations/supabase/client.ts]
              │
      ┌───────┴────────┐
      ▼                ▼
[Supabase REST / PostgREST]   [Supabase Edge Functions — Deno]
      │                         admin-actions / ocr-payment-proof / whatsapp-send
      ▼
[PostgreSQL 15 — RLS enforced]
      │
      ├─ triggers: sync_order_financials, cash_closing_checks
      ├─ RPC: seed_tenant_defaults, cancel_order_with_reason
      └─ views: ledger, profit_loss
              │
              ▼
[Double-Entry Ledger: journal_entries → journal_lines]
```

Authentication / Authorization path:
`Supabase Auth (JWT) → RLS policies (can_access_branch, current_employee_branch_id) → AppRole guards in routes/_app.tsx`

External Integrations (current reality):
`Browser → api.ocr.space (Engine 2, regex heuristics) → wa.me manual links (no WhatsApp Business API push yet)`

### 1.2 Bundle Budget — raw / gzip / brotli (CTO clarification)

Verified 2026-06-30 production build (`npm run build && npm run bundle:check`):

| Chunk | raw | gzip | brotli est. |
|---|---|---|---|
| i18n-internal-BriEDB00.js | 584.0 KB | 167.5 KB | ~145 KB |
| vendor-supabase | 207.8 KB | 53.8 KB | ~48 KB |
| vendor-react | 162.6 KB | 53.5 KB | ~47 KB |
| vendor-tanstack | 124.1 KB | 39.3 KB | ~35 KB |
| index route | 87.8 KB | 27.3 KB | ~24 KB |
| _app shell | 66.5 KB | 21.0 KB | ~18 KB |
| system-health | 37.5 KB | 9.6 KB | ~8.5 KB |
| accounting | 31.1 KB | 8.0 KB | ~7.1 KB |
| executive | 28.2 KB | 7.3 KB | ~6.4 KB |

Budget gate in `scripts/check-bundle-size.mjs`: **main entry < 90 KB raw — PASS**. Gzip total initial load ~285 KB. Brotli served by Vercel CDN automatically — ~245 KB est.

Conclusion: the “<90KB” claim in v1 referred to **raw main entry**, not gzip. We now report all three.

---

## 2. Factual Feature State: What Exists vs. What Doesn't

### What Exists & Functions (Verified via CI & DB Schemas)
1. **Type Safety & Schema Definitions:** `integrations/supabase/types.ts` contains 5,659 lines of generated database types. The custom wrapper `SupabaseCustomClient` in `integrations/supabase/client.ts` enforces type boundaries **without using `as any`** — verified by `grep -r " as any" lib/ routes/ --include="*.ts*"` → 0 results.
2. **Double-Entry Accounting Engine:** Fully backed by PostgreSQL tables (`journal_entries`, `journal_lines`, `cash_transactions`, `cash_movements`, `customer_financial_ledger`, `employee_financial_ledger`). SQL triggers and Pl/pgSQL functions (e.g., `sync_order_financials`) handle automatic ledger posting upon order generation or status transitions.
3. **Multi-Language i18n:** Static dictionaries for 9 languages (`ar`, `en`, `fr`, `it`, `es`, `de`, `zh`, `ja`, `pt`) exist in `lib/i18n-internal.ts` and `lib/i18n-public-packs.ts`. Dynamic RTL/LTR toggling functions correctly in `lib/i18n.tsx`.
4. **Physical Workstations:** 7 discrete route components exist (`reception`, `cleaning`, `drying-assembly`, `ironing`, `packing`, `qc`, `delivery`) with role-based guardrails in `routes/_app.tsx`.
5. **Customer Portal & OCR Flow:** `routes/customer-portal.tsx` allows order tracking and InstaPay payment proof uploads. The Deno edge function `ocr-payment-proof` calls `api.ocr.space` (Engine 2) to parse images and extracts numbers using **regex heuristics — NOT banking reconciliation**.
6. **Live Simulation UI:** A simulated interactive multi-step verification card renders in `CustomerPortalPage` upon payment proof upload, which subsequently executes a direct Supabase table update to mark the order as `paid`. **This is explicitly a Live Simulation UI, not an ML model.**

### What Doesn't Exist (Simulations, Workarounds & Missing Infrastructure)
1. **Direct Bank / InstaPay API Integration:** There is no real-time banking API webhook integration. The “matching” mechanism relies entirely on OCR regex extraction from uploaded images or user-typed input. **OCR ≠ Banking reconciliation — acknowledged explicitly.**
2. **Active WhatsApp Business API Push:** `supabase/functions/whatsapp-send` exists as an Edge Function wrapper, but current frontend implementation primarily generates `https://wa.me/...` links for manual staff sending.
3. **True Hardware IoT Sensors:** The “Predictive Maintenance” data in `routes/_app/executive.tsx` relies on database timestamps (`next_maintenance_at`) and manual status flags (`down`, `needs_maintenance`), not physical IoT hardware telemetry.
4. **Production IPv6 Connection:** Direct PostgreSQL client scripts (`pg`) fail in isolated IPv4 sandbox runners due to Supabase transitioning direct DB connections to IPv6-only. Standard HTTP REST calls work normally.
5. **ML / AI forecasting engine:** No training pipeline, no ML model registry. “AI Laundry Advisor” in UI = **rule-based operational recommendations + Live Simulation UI**.
6. **Bank webhook / MT940 / CAMT.053 ingestion:** not implemented.
7. **IoT telemetry ingestion:** not implemented.

---

## 3. Automated Testing & Verification Baseline
* **Static Typecheck:** `tsc -b --pretty false` executes successfully with 0 errors.
* **Vitest Unit & Guardrail Tests:** `vitest run tests` executes 9 test files (28 total tests) covering error sanitization, workflow rules (`station-workflow-core.test.ts`), i18n fallback elimination, and payroll calculations. Current pass rate is 100%.
* **Playwright E2E Tests:** Smoke tests exist for public routes, authenticated flows, mobile viewport regressions, and i18n navigation preservation. All test blocks are wrapped in `expectNoPageErrors` to catch unhandled DOM/console exceptions.

---

## 4. Non-Functional Requirements (added per CTO review)

| NFR | Target | Current Measurement | Status |
|---|---|---|---|
| **Performance – TTFB (Vercel Edge, Cairo)** | < 300ms | ~180-260ms (prod:health) | ✅ |
| **Performance – Initial JS (gzip)** | < 300KB | 285 KB | ✅ |
| **Performance – LCP (3G Fast)** | < 2.5s | ~2.1s (Lighthouse local) | ✅ |
| **Availability – Frontend** | 99.9% (Vercel SLA) | Vercel managed | ✅ inherited |
| **Availability – Database** | 99.95% (Supabase Pro) | Supabase managed | ✅ inherited |
| **Backup – Postgres PITR** | 7-day point-in-time | Supabase PITR enabled | ✅ |
| **Disaster Recovery – RTO** | < 4h | DB restore + `npx supabase db push` + Vercel redeploy tested | ⚠️ manual runbook exists (`docs/OPERATIONS_RUNBOOK.md`) |
| **Disaster Recovery – RPO** | < 15 min | WAL archiving via Supabase | ✅ |
| **Security – Auth** | JWT + RLS | Supabase Auth, RLS policies on all tenant tables | ✅ |
| **Security – Audit Logs** | append-only | `system_events`, `journal_entries`, `cash_movements` immutable | ✅ |
| **Security – Secret handling** | no client secrets | `scripts/repo-guard.mjs` blocks `sbp_`, `ghp_`, `SERVICE_ROLE` in repo | ✅ |
| **Scalability – concurrent users** | 100 concurrent / tenant | load test not yet run — theoretical limit: Supabase 200 conn pool | ⚠️ needs k6 |
| **Scalability – orders** | 1M orders / tenant / year | schema indexed (`orders(tenant_id, branch_id, created_at)`) | design-validated, not load-tested |
| **Observability** | client error capture | `lib/client-error-reporting.ts` + `/system-health` | ✅ |

---

## 5. Security Architecture (added per CTO review)

* **AuthN:** Supabase Auth — email/password + magic link. JWT issued, `exp` 3600s, refresh via `@supabase/supabase-js`.
* **AuthZ — Row Level Security:**
  - `can_access_branch(tenant_id, branch_id)` — owner sees all, employee sees own branch only.
  - `current_employee_branch_id()` — injects branch scope.
  - RLS enabled on: `orders`, `order_items`, `service_units`, `employees`, `cash_accounts`, `expenses`, `inventory_items`, `task_assignments`, `daily_cash_closings`.
* **Roles (`AppRole`):** `owner`, `manager`, `cs`, `reception`, `cleaning`, `ironing`, `packing`, `qc`, `driver`, `accountant`. Guarded in `routes/_app.tsx`.
* **Secrets:**
  - Frontend: only `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (anon).
  - Service role key: Edge Functions only, never bundled.
  - Repo guard: `scripts/repo-guard.mjs` fails CI on `SERVICE_ROLE`, `sbp_`, `ghp_`, `vcp_` patterns.
* **Audit trail:** every financial mutation writes `journal_entries` + `journal_lines` (immutable), plus `system_events` with `actor_id`, `process`, `data JSONB`, `output JSONB` (APDO).
* **Transport:** 100% HTTPS (Vercel + Supabase enforced). HSTS enabled.
* **Data residency:** Supabase project `dngjfjrjddigqadlyain` — EU (Frankfurt) region.

---

## 6. Risk Register

### High
| Risk | Impact | Mitigation |
|---|---|---|
| **OCR false positives** — `detectAmountFromFilename` previously captured year strings like “2026” | financial mis-posting | Fixed 2026-06-30: `ocr-payment-proof` hardened against current-year false positives, added `extractAmount` sanity checks, manual review queue in `/finance` |
| **WhatsApp manual flow dependency** | SLA notification delays | `supabase/functions/whatsapp-send` ready, needs paid WhatsApp Business API credentials; fallback `wa.me` links audited |
| **No real bank reconciliation** | payment fraud / duplicate | OCR + manual finance review + daily cash closing variance alerts; roadmap: MT940 webhook Phase 2 |

### Medium
| Risk | Impact | Mitigation |
|---|---|---|
| **Bundle growth (i18n 9 languages)** | LCP regression | manualChunks in `vite.config.ts`, lazy-loaded admin routes, `bundle:check` CI gate |
| **Client-side state desync (network mid-mutation)** | order state skew | TanStack Query retry 3×, optimistic UI rollback, server-side `sync_order_financials` trigger authoritative |
| **IPv6-only direct Postgres** | local tooling breakage | documented: use Supabase REST / `supabase db push`, not raw `pg` |
| **Multi-branch filter not yet global** | data leakage perception | RLS prevents actual leakage; UI filter rollout tracked in README §8.1 |

### Low
| Risk | Impact | Mitigation |
|---|---|---|
| **Recharts in main bundle** | +45KB | already code-split to `vendor-charts`, lazy import in `/reports` |
| **`as any` regression** | type safety decay | CI: `grep -rn " as any" lib routes --include="*.ts*"` → must be 0; current: 0 |
| **Edge Function cold start** | ~400ms OCR latency | acceptable for async payment proof; warm via cron possible |

---

## 7. Known Constraints & Technical Debt
1. **Client-Side Secret Exposure Risk:** E2E test files and frontend helper scripts must strictly avoid embedding raw service role keys (`SUPABASE_SERVICE_ROLE_KEY`) or personal access tokens (`sbp_...`, `ghp_...`). `scripts/repo-guard.mjs` enforces this pre-commit.
2. **Bundle Dependency Growth:** Importing large charting libraries (e.g., `recharts`) directly into route bundles increases initialization overhead. Subsequent refactoring must maintain strict lazy-loading boundaries.
3. **TypeScript `as any` policy:** repository enforces **zero `as any`** — this is a *code quality practice*, not a standalone marketing feature. Enforced via CI grep + ESLint.
4. **OCR ≠ Banking reconciliation:** explicitly documented in §2 — do not market OCR as “AI banking”.

---

## 8. Error Recovery & Resilience (added per CTO review)

| Scenario | Strategy |
|---|---|
| **Network Failure mid-mutation** | TanStack Query: 3× exponential backoff retry; UI shows “retrying”; server triggers are idempotent (`sync_order_financials` checks existing `journal_entries` to prevent duplicate posting) |
| **Conflict Resolution** | Postgres row-level `updated_at` + optimistic concurrency token; station moves validate `service_units` state server-side (`lib/station-workflow.ts`) before commit |
| **Retry Strategy** | QueryClient: `retry: 3, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000)` |
| **Idempotency** | Financial functions: `prevent_duplicate_revenue_expense_posting` — unique constraint on (`order_id`, `event_type`, `amount_cents`); cash transfers use UUID idempotency key |
| **Offline Queue (future)** | Roadmap Phase 1: IndexedDB + ServiceWorker background sync — not yet implemented |

---

## 9. Roadmap — What doesn't exist → Planned

| Phase | Scope | Status |
|---|---|---|
| **Phase 1 — Branch Hardening (NOW)** | Global branch filter (today/reports/accounting/cash-closing), branch-aware safe creation, branch compare dashboard | In progress — README §8 |
| **Phase 2 — Bank Reconciliation** | MT940 / CAMT.053 bank feed ingestion, automated statement matching, replace OCR as primary source | Planned — Q3 2026 |
| **Phase 3 — IoT & Predictive Ops** | Hardware telemetry adapter (MQTT), true predictive maintenance, equipment downtime SLA | Planned — Q4 2026 |
| **Phase 4 — AI Forecasting** | Trained demand forecasting (not rule-based), dynamic pricing, capacity optimization; requires 6+ months real operational data first | Aspirational — 2027, data-dependent |

**Explicitly NOT promised today:** Bank API, IoT sensors, ML forecasting, WhatsApp Business API push (manual `wa.me` only).

---

## 10. Verification Checklist (for independent technical auditor)

- [x] `npm run typecheck` → 0 errors
- [x] `npm run test:run` → 28/28
- [x] `npm run build` → success, see §1.2 bundle table
- [x] `grep -rn " as any" lib routes --include="*.ts*"` → 0 results
- [x] `journal_entries` double-entry validated: `SELECT SUM(debit) = SUM(credit) FROM journal_lines` → true
- [x] RLS: `SELECT * FROM orders` as branch-restricted employee → branch-scoped only
- [x] OCR endpoint: `supabase/functions/ocr-payment-proof/index.ts` → regex heuristics, documented NOT banking
- [x] Repo guard: `npm run repo:guard` → pass (1 WARN: SECURITY DEFINER search_path — tracked)
- [x] Production health: `npm run prod:health` → 200 OK, https://mjrh.vercel.app

---

> **Engineering note (CTO feedback incorporated):**  
> This document deliberately separates **Facts** (CI-verified), **Constraints** (known gaps), and **Aspirations** (roadmap).  
> “Zero `as any`” is a hygiene practice improving type safety — not a standalone product differentiator.  
> OCR is regex heuristics. “AI Advisor” UI is Live Simulation + rule-based recommendations today — no ML training pipeline yet.

---

## Evidence

### Repository Evidence
- **Files:**
  - `integrations/supabase/client.ts` — zero `as any` — `grep -rn " as any" lib routes` → **0**
  - `integrations/supabase/types.ts` — 5,659 lines
  - `lib/station-workflow.ts` — 7 stations
  - `lib/ai-advisor.ts` — rule-based — **NO ML**
  - `vite.config.ts` + `scripts/check-bundle-size.mjs` — budget pass — initial gzip ~285KB
  - `supabase/functions/ocr-payment-proof/index.ts` — regex heuristics — **OCR ≠ banking**
- **Database Objects (live `dngjfjrjddigqadlyain` 2026-06-30):**
  - `tenants`: **1** | `branches`: **2** | `customers`: **6** | `employees`: **10** | `profiles`: **12**
  - `orders`: **24** (19 delivered) | `order_items`: **106** | `service_units`: **134**
  - `journal_entries`: **95** | `journal_lines`: **190** — balanced
  - `cash_transactions`: **58** | `daily_cash_closings`: **10**
  - `qc_checks`: **19** | `pickup_requests`: **8** | `operation_events`: **119**
  - RLS: `can_access_branch()` enforced
- **Tests:**
  - `tsc -b` → **0 errors**
  - `vitest` → **28/28**
  - `build` → **13.04s / 2017 modules**
  - `bundle:check` → **pass**
  - `prod:health` → **HTTP 200 https://mjrh.vercel.app**

### Operational Evidence
- **Customers:** **6** (all last 30d)
- **Orders:** **24 total / 19 delivered / 11 last 7d**
  - First: 2026-06-21 18:10 UTC | Last: 2026-06-30 09:13 UTC
- **Revenue — FACTS:**
  - **GMV: 12,549.00 EGP**
  - **Delivered GMV: 11,339.00 EGP**
  - **AOV: 522.88 EGP**
- **Tenants:** **1 active — Dry Tech (`dry-tech`) — since 2026-06-21**
- **Branches:** **2**
  - الفرع الرئيسي — **24 orders / 5 safes / 50,903.40 EGP main safe**
  - فرع البنفسج — **0 orders / 0 safes yet**
- **Employees:** **10** / **Profiles: 12**

### Business Assumptions
| Metric | Status |
|---|---|
| **CAC** | **$1,200 → ASSUMPTION — $0 paid to date** |
| **NRR / Churn** | **NO DATA — cohort 9 days old** |
| **Gross Margin** | **88% → PROJECTION — pending COGS audit** |
| **Payback** | **3 months → FINANCIAL MODEL — NOT validated** |
| **MRR $199/$399** | **0 verified invoices — PRE-REVENUE PILOT** |
| **AI / ML** | **ASPIRATIONAL — Phase 4 2027 — today rule-based Live Simulation only** |
| **Bank API / IoT** | **NOT SHIPPED — Phase 2/3 roadmap** |

> Source: `docs/FACTS_SHEET_2026-06-30.md` — Supabase `dngjfjrjddigqadlyain` — `supabase db query --linked -o json` — 2026-06-30 22:40 UTC
