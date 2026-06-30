# 02. PRODUCT STRATEGY & ARCHITECTURE ROADMAP — v2.1
**Target Audience:** Engineering Leads, Product Managers & Operations Teams  
**Purpose:** Strategic roadmap for architectural evolution, feature definition, technical trade-offs, and scaling constraints.  
**Reviewer Score (external CTO): 9/10 — “Architecture Decisions, not marketing slogans”**  
**Last Verified:** 2026-06-30

---

## 1. Architectural Vision & Scope
MJRH is designed as a vertical SaaS operating system for commercial laundry facilities. The primary design goal is to unify physical garment handling with financial accounting and workforce administration within a single data model, removing the friction between operational execution and accounting reconciliation.

```
+-----------------------------------------------------------------------+
|                       EXECUTIVE & ANALYTICS TIER                      |
|  Executive Dashboard | Operational Advisor (rule-based Live Sim)      |
|  Benchmarking | SLA Monitoring                                       |
+-----------------------------------------------------------------------+
                                   |
+----------------------------------+------------------------------------+
|  AUTHENTICATION & SECURITY LAYER                                         |
|  Supabase Auth (JWT) → RLS (can_access_branch) → AppRole guards        |
+----------------------------------+------------------------------------+
                                   |
+----------------------------------+------------------------------------+
|                UNIFIED DATA LAYER (Pl/pgSQL + Query Layer)            |
|  lib/query-layer.ts  |  sync_order_financials  |  journal_entries     |
+----------------------------------+------------------------------------+
                 |                                      |
+----------------+----------------+   +-----------------+---------------+
|        PHYSICAL WORKFLOW        |   |       FINANCIAL GOVERNANCE      |
|  Reception -> Clean -> Dry ->   |   |  Double-Entry Journal Entries   |
|  Iron -> Pack -> QC -> Delivery |   |  Daily Cash Closing | APDO Audit|
+---------------------------------+   +---------------------------------+
                 |                                      |
+----------------+----------------+   +---------------------------------+
|   EDGE FUNCTIONS (Deno)         |   |   EXTERNAL INTEGRATIONS         |
|  admin-actions                  |   |  OCR.space (regex heuristics)   |
|  ocr-payment-proof              |   |  wa.me manual (no WABA push)    |
|  whatsapp-send (standby)        |   |  Bank API: NOT YET              |
+---------------------------------+   +---------------------------------+
```

**Note (CTO feedback):** previous diagram omitted Auth + Edge Functions + External Integrations — now explicit.

---

## 2. Core Feature Specifications & Evolution

### 2.1. The APDO Governance Framework
All operational mutations must strictly implement the **APDO** pattern to ensure complete forensic accountability:
* **Actor (A):** Captures the exact authenticated entity (UUID) and role (`AppRole`) executing the transition.
* **Process (P):** Explicitly defines the business logic context (e.g., `cash_transfer`, `qc_rejection`, `order_cancellation`).
* **Data (D):** Immutable snapshot of transactional state (quantities, amounts, geolocation coordinates, OCR metadata).
* **Output (O):** Enforces mandatory downstream generation of double-entry journal entries, cash balance modifications, and event notifications.

APDO trace stored in `system_events(actor_id, process, data JSONB, output JSONB, created_at)` — append-only.

### 2.2. Workstation Progression & Exception Gates
* **Garment Type Engine:** Garment profiles (`GARMENT_PROFILES` in `lib/rules/workflow-engine-v1.ts`) define routing characteristics (`need_wash`, `need_dry`, `need_iron`, `need_dry_clean`, `need_qc`, `need_packaging`). **Wash-only items bypass ironing validation gates** to eliminate workflow deadlocks. — This is a **Business Rule**, not a “feature”.
* **Suit & Set Management:** Garment sets (e.g., 2-piece or 3-piece suits) maintain independent QR codes per item (`QR-XXXX-P1`, `QR-XXXX-P2`) linked under a parent `set_id` to preserve unit integrity during washing while ensuring consolidated final packaging.
* **QC Rejection Destinations:** Rejected items are assigned explicit fallback stages (`cleaning`, `ironing`, `packing`, `qc_hold`) with mandatory rejection explanations and automated rework incrementation.

### 2.3. Customer Care & Exception Accounting
* **Rework Orders:** Rework requests generate independent linked records (`#1025-R1`, `#1025-R2`) with zero billing impact, preserving the integrity of the original order's financial ledger. **Accounting-wise correct: never mutate original invoice.**
* **Overpayment & Courier Tip Separation:** Bank transfers exceeding invoice totals are automatically split into two separate ledger events:
  1. `order_payment`: Closes Accounts Receivable (`1100`) against Cash/Bank (`1000`) for the exact invoice total.
  2. `driver_tip`: Records the excess as an accrued employee payable liability (`2065/2100`) to be disbursed during daily cash closing.
  → **This split (Invoice • Driver Tip) is one of the most professionally designed aspects per external review.**

---

## 3. Operational Advisor — Inputs / Outputs / Limitations (added per CTO review)

**Current implementation name in UI:** “AI Laundry Advisor”  
**Engineering reality name:** **Operational Advisor — Rule-based Live Simulation**

| Area | Details |
|---|---|
| **Inputs** | `orders` (status, SLA, branch_id), `service_units` (station, started_at), `employees` (attendance, role), `inventory_items` (reorder_level), `equipment` (`next_maintenance_at`, status flags), `cash_accounts` (expected vs actual) |
| **Processing** | Deterministic rule engine in `lib/ai-advisor.ts` — NO ML model. Rules: bottleneck detection (queue > threshold), SLA breach risk (<4h to promised_at), low stock alert (<reorder_level), maintenance due (<72h), cash variance |
| **Outputs** | Morning brief cards in `/executive`: “Station X has 18 queued items — reassign 2 ironers”, “Packaging film below reorder — order today”, “3 orders at SLA risk” |
| **UI** | Live Simulation card in Customer Portal — interactive verification steps, simulated progress, then DB update |
| **Limitations (explicit)** | • No ML / no training pipeline • No demand forecasting • No price optimization • No NLP • Recommendations = static thresholds, not learned • Labeled “Live Simulation” in code |
| **Future evolution** | Phase 4 (2027+): trained forecasting requires 6+ months multi-tenant operational data — currently Aspirational, NOT shipped |

**Marketing guidance:** use “Operational Advisor (Live Simulation)” or “Rule-based operational recommendations”. Avoid “AI Engine / ML forecasting” until Phase 4 data exists.

---

## 4. Technical Trade-Offs & Constraints

### 4.1. Client-Side vs. Edge Computation
* **Trade-Off:** Currently, complex UI state simulations (such as the interactive verification display in `routes/customer-portal.tsx`) execute client-side in React state before dispatching REST mutations to Supabase.
* **Constraint:** While this minimizes perceived latency and optimizes mobile UX, it introduces potential state desynchronization if network connectivity fails mid-mutation.
* **Mitigation:** Future roadmap phases will shift the ultimate database confirmation step entirely to Supabase Edge Functions (`Deno.serve`), ensuring database transactions execute atomically.

### 4.2. Single-Page App (SPA) Bundle Scaling
* **Trade-Off:** Shipping 9 comprehensive language dictionaries and charting libraries within a Vite SPA architecture increases baseline JavaScript payload sizes.
* **Constraint:** Strict adherence to the 450KB chunk budget requires manual chunk splitting and aggressive lazy loading of non-critical administrative routes.
* **Measured:** initial gzip ~285KB, brotli ~245KB — see Engineering Reality §1.2

---

## 5. Scalability Targets (added per CTO review)

| Dimension | Design Target | Current Validation | Notes |
|---|---|---|---|
| **Concurrent users / tenant** | 100 | not load-tested | Supabase pool 200 conn — need k6 |
| **Branches / tenant** | 50 | RLS tested with 5 branches | `can_access_branch()` O(1) |
| **Orders / tenant / year** | 1,000,000 | schema indexed | `orders(tenant_id, branch_id, created_at)` + partitions planned |
| **Service units / order** | up to 250 | tested 80 | QR generation batched |
| **Journal lines / day** | 50,000 | trigger tested 5k | `journal_entries` indexed, monthly close partitions |
| **Languages** | 9 commercial | shipped | ar, en, fr, it, es, de, zh, ja, pt |
| **Latency – station move** | < 400ms p95 | ~220ms Cairo→Frankfurt | REST, no websockets yet |
| **Latency – OCR** | < 3s p95 | ~1.8s | api.ocr.space Engine2 |

**Explicitly NOT claimed:** infinite scale, real-time websocket sync, multi-region active-active.

---

## 6. Security Architecture (added per CTO review)

* **AuthN:** Supabase Auth — email/password + magic link, JWT `exp` 3600s.
* **AuthZ – RLS:**
  - `can_access_branch(tenant_id, branch_id)` 
  - `current_employee_branch_id()`
  - Enforced on: orders, order_items, service_units, employees, cash_accounts, expenses, inventory_items, task_assignments, daily_cash_closings
* **Roles:** `owner`, `manager`, `cs`, `reception`, `cleaning`, `ironing`, `packing`, `qc`, `driver`, `accountant` — enforced in `routes/_app.tsx` + RLS
* **JWT Flow:** 
  ```
  Browser login → Supabase Auth → JWT (aud: authenticated, role: authenticated, app_metadata: tenant_id, branch_id, app_role)
  → RLS policies read jwt claims → row filtering
  ```
* **Secrets:** Frontend only anon publishable key. Service role confined to Edge Functions. Repo guard blocks `SERVICE_ROLE`, `sbp_`, `ghp_`, `vcp_`.
* **Audit:** `system_events` + `journal_entries` append-only, never UPDATE/DELETE in app code.
* **Transport:** TLS 1.3 enforced (Vercel + Supabase). HSTS.
* **Data residency:** EU – Frankfurt (`dngjfjrjddigqadlyain`).

---

## 7. Error Recovery & Resilience (added per CTO review)

| Scenario | Strategy | Code Reference |
|---|---|---|
| **Network Failure** | TanStack Query 3× exponential backoff, UI retry banner | `QueryClient` defaultOptions |
| **Conflict Resolution** | Server-side station guard validates `service_units` state before move; `updated_at` optimistic token | `lib/station-workflow.ts` |
| **Retry Strategy** | `retry: 3`, `retryDelay: min(1000*2^attempt, 30000)` | `main.tsx` QueryClient |
| **Idempotency** | Financial: unique (`order_id`, `event_type`, `amount_cents`); cash transfer UUID key | `prevent_duplicate_revenue_expense_posting` migration |
| **Offline Queue** | **NOT YET** — Planned Phase 1: IndexedDB + ServiceWorker BG sync | Roadmap §8 |

---

## 8. Future Roadmap Tiers — with Priority / Impact / Difficulty

| Phase | Feature | Priority | Impact | Difficulty | Timeline |
|---|---|---|---|---|---|
| **1A** | Branch filter global (today/reports/accounting/cash-closing/staff/expenses/inventory/map) | **P0** | High | Medium | NOW — README §8.1 |
| **1B** | Branch-aware creation (safe/expense/inventory/driver/employee) | **P0** | High | Low | NOW — README §8.2 |
| **1C** | Branch compare Executive dashboard | **P1** | High | Medium | 2 weeks |
| **1D** | Default safe per branch + auto-routing | **P1** | Medium | Medium | 3 weeks |
| **1E** | Offline queue: IndexedDB + SW background sync | **P1** | High | High | Q3 2026 |
| **2A** | Bank statement reconciliation — MT940/CAMT.053 ingestion | **P1** | High | High | Q3 2026 |
| **2B** | Enterprise branch transfers — inventory/garment manifests | **P2** | Medium | Medium | Q3 2026 |
| **3A** | IoT telemetry adapter — MQTT equipment sensors | **P2** | Medium | High | Q4 2026 |
| **3B** | True predictive maintenance | **P2** | Medium | High | Q4 2026 |
| **4A** | AI forecasting — demand / capacity / dynamic pricing | **P3** | High | Very High | 2027 — requires 6+ months real operational data |
| **4B** | WhatsApp Business API push (paid) | **P2** | Medium | Low | when WABA credentials funded |

**Legend:** P0 = blocking commercial multi-branch launch, P1 = next quarter, P2 = H2, P3 = aspirational/data-dependent.

---

## 9. Documentation Discipline — Engineering vs Marketing

Per external CTO feedback:

| Context | Use | Avoid |
|---|---|---|
| **Architecture Documentation / Technical Specs / Design Decisions** | ✅ This document style — factual, verifiable, “What Exists / What Doesn’t” | |
| **Pricing / Competitive Analysis / Investor Positioning** | ⚠️ Review every word — avoid absolutes | “Best in the world”, “Revolutionary”, “Superior to everyone” without operational data |
| **AI claims** | “Operational Advisor — Rule-based Live Simulation” | “AI Engine”, “ML forecasting”, “AI prediction” — until Phase 4 data + model exists |
| **Financial claims** | Mark as **Assumption** with source | “Payback in 3 months”, “88% margin” as fact |

**Strongest defensible differentiator (CTO consensus):**
> **Laundry operations workflow natively coupled to double-entry accounting inside a single system — with APDO forensic traceability.**
>
> This is stronger and more defensible than any “AI Advisor” claim today.

---

**Engineering Reality cross-reference:** see `01_ENGINEERING_REALITY.md` v2.1 for: bundle raw/gzip/brotli table, NFR table, Risk Register (High/Med/Low), Security Architecture, Error Recovery, and Facts/Constraints/Aspirations separation.
