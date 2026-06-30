# 01. ENGINEERING REALITY DOCUMENT
**Target Audience:** Core Engineering Team & Technical Auditors  
**Purpose:** A strictly factual, non-marketing audit of the existing repository state, architectural boundaries, technical debt, and implementation realities.

---

## 1. Current Architecture & Stack Reality
* **Frontend Framework:** React 18 (SPA) powered by Vite 6.4.3.
* **Routing:** TanStack Router (`@tanstack/react-router` v1.168) with file-based route generation (`routeTree.gen.ts`).
* **State Management & Data Fetching:** TanStack Query (`@tanstack/react-query` v5) combined with custom React context providers (`AuthProvider`, `I18nProvider`).
* **Backend & Database:** Supabase (`@supabase/supabase-js` v2.50) connecting to PostgreSQL.
* **Styling & UI Components:** Tailwind CSS (v3.4) with Radix UI primitives (`shadcn/ui` architecture).
* **Bundle Budget Strategy:** Manual chunk splitting configured in `vite.config.ts` separating translation packs (`i18n-internal`, `i18n-public`) and vendor dependencies (`vendor-react`, `vendor-tanstack`, `vendor-supabase`, `vendor-radix`, `vendor-icons`). Main chunk size is verified via `scripts/check-bundle-size.mjs` (currently passing under 90KB raw).

---

## 2. Factual Feature State: What Exists vs. What Doesn't

### What Exists & Functions (Verified via CI & DB Schemas)
1. **Type Safety & Schema Definitions:** `integrations/supabase/types.ts` contains 5,659 lines of generated database types. The custom wrapper `SupabaseCustomClient` in `integrations/supabase/client.ts` enforces type boundaries without using `as any`.
2. **Double-Entry Accounting Engine:** Fully backed by PostgreSQL tables (`journal_entries`, `journal_lines`, `cash_transactions`, `cash_movements`, `customer_financial_ledger`, `employee_financial_ledger`). SQL triggers and Pl/pgSQL functions (e.g., `sync_order_financials`) handle automatic ledger posting upon order generation or status transitions.
3. **Multi-Language i18n:** Static dictionaries for 9 languages (`ar`, `en`, `fr`, `it`, `es`, `de`, `zh`, `ja`, `pt`) exist in `lib/i18n-internal.ts` and `lib/i18n-public-packs.ts`. Dynamic RTL/LTR toggling functions correctly in `lib/i18n.tsx`.
4. **Physical Workstations:** 7 discrete route components exist (`reception`, `cleaning`, `drying-assembly`, `ironing`, `packing`, `qc`, `delivery`) with role-based guardrails in `routes/_app.tsx`.
5. **Customer Portal & OCR Flow:** `routes/customer-portal.tsx` allows order tracking and InstaPay payment proof uploads. The Deno edge function `ocr-payment-proof` calls `api.ocr.space` (Engine 2) to parse images and extracts numbers using regex heuristics.
6. **Live Simulation UI:** A simulated interactive multi-step verification card renders in `CustomerPortalPage` upon payment proof upload, which subsequently executes a direct Supabase table update to mark the order as `paid`.

### What Doesn't Exist (Simulations, Workarounds & Missing Infrastructure)
1. **Direct Bank / InstaPay API Integration:** There is no real-time banking API webhook integration. The "matching" mechanism relies entirely on the OCR regex extraction from uploaded images or user-typed input.
2. **Active WhatsApp Business API Push:** `supabase/functions/whatsapp-send` exists as an Edge Function wrapper, but current frontend implementation primarily generates `https://wa.me/...` links for manual staff sending.
3. **True Hardware IoT Sensors:** The "Predictive Maintenance" data in `routes/_app/executive.tsx` relies on database timestamps (`next_maintenance_at`) and manual status flags (`down`, `needs_maintenance`), not physical IoT hardware telemetry.
4. **Production IPv6 Connection:** Direct PostgreSQL client scripts (`pg`) fail in isolated IPv4 sandbox runners due to Supabase transitioning direct DB connections to IPv6-only. Standard HTTP REST calls work normally.

---

## 3. Automated Testing & Verification Baseline
* **Static Typecheck:** `tsc -b --pretty false` executes successfully with 0 errors.
* **Vitest Unit & Guardrail Tests:** `vitest run tests` executes 9 test files (28 total tests) covering error sanitization, workflow rules (`station-workflow-core.test.ts`), i18n fallback elimination, and payroll calculations. Current pass rate is 100%.
* **Playwright E2E Tests:** Smoke tests exist for public routes, authenticated flows, mobile viewport regressions, and i18n navigation preservation. All test blocks are wrapped in `expectNoPageErrors` to catch unhandled DOM/console exceptions.

---

## 4. Known Constraints & Technical Debt
1. **Client-Side Secret Exposure Risk:** E2E test files and frontend helper scripts must strictly avoid embedding raw service role keys (`SUPABASE_SERVICE_ROLE_KEY`) or personal access tokens (`sbp_...`, `ghp_...`). `scripts/repo-guard.mjs` enforces this pre-commit.
2. **Bundle Dependency Growth:** Importing large charting libraries (e.g., `recharts`) directly into route bundles increases initialization overhead. Subsequent refactoring must maintain strict lazy-loading boundaries.
