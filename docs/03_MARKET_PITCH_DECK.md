# 03. MARKET PITCH DECK & PRICING — v2.1 CTO-Hardened
**Target Audience:** Go-To-Market Teams, External Partners & Enterprise Clients  
**Purpose:** B2B SaaS positioning, value proposition narrative, and transparent pricing — with explicit Facts / Assumptions / Aspirations separation.  
**Reviewer Scores (external CTO):**  
- Pitch Deck: **8/10**  
- Market Analysis: **5.5/10**  
- Pricing Justification: **4/10 → revised below with clear assumption labels**  
**Last Verified:** 2026-06-30

> **CTO editorial note incorporated:** separate Facts, Assumptions, Aspirations. Tone down “AI Engine” → “Operational Advisor — Rule-based Live Simulation”. Remove unsubstantiated financial absolutes (“Payback 3 months”, “88% margin”) or mark them explicitly as **Assumption — needs real customer data**.

---

## 1. Market Opportunity & Segment Positioning — FACTS

The global commercial laundry and dry cleaning sector is actively transitioning from legacy on-premise point-of-sale (POS) terminals to cloud-based operations platforms. Traditional software vendors focus primarily on front-desk transactional logging (basic CRUD orders), leaving a critical market gap in automated accounting, dynamic workstation governance, and digital customer self-service.

```
       [High Operational Control | Comprehensive Accounting]
                                |
                                |       * MJRH INDUSTRIAL REVOLUTION
                                |         Operational Advisor (Live Sim)
                                |         APDO | Double-Entry | 9-lang
                                |
                                |       * Cents / CleanCloud
                                |         (General POS | Driver Management)
--------------------------------+---------------------------------
[Basic Terminal POS]            |           [Advanced Cloud SaaS]
* Square for Retail             |
* Geelus / Quick Dry Cleaning   |
                                |
        [Low Operational Control | Basic CRUD Orders]
```

**Positioning statement (revised):**  
MJRH occupies a **differentiated operational-control + native-accounting quadrant** — not “best in the world”, but measurably different in: double-entry ledger natively coupled to garment workflow.

**Competitive claim — revised per CTO caution:**  
Previous v1 stated: *“Cents and CleanCloud lack native accounting.”*  
**Revised, defensible:**  
“Cents and CleanCloud offer strong POS and driver management with partner accounting integrations / modules. MJRH’s differentiation is **native double-entry ledger generated automatically from workstation events inside the same database**, with APDO forensic trace — reducing third-party accounting subscription dependency for single-location operators. This claim is verifiable in our open schema (`journal_entries`, `journal_lines`, `sync_order_financials`). We do NOT claim competitors have zero accounting — they use integrations / partner ecosystems.”

---

## 2. Competitive Differentiation & Value Pillars — FACTS

MJRH establishes a premium value proposition through four **verifiable** architectural differentiators:

1. **Automated Double-Entry Ledger — FACT**  
   Replaces third-party accounting subscriptions for SMB laundries by automatically generating debit/credit journal entries (`1100 Accounts Receivable`, `4000 Revenue`, `2065 Accrued Payables`) upon order progression.  
   Schema: `journal_entries`, `journal_lines`, triggers: `sync_order_financials` — auditable.

2. **APDO Governance Model — FACT**  
   Provides enterprise management with forensic transparency across every operational mutation (`Actor, Process, Data, Output`).  
   Storage: `system_events` append-only.

3. **Interactive Customer Portal — FACT**  
   End consumers initiate orders, attach camera verification photos, track SLA fulfillment, and upload InstaPay bank transfer receipts.  
   Live Simulation UI — explicitly simulated, not ML.

4. **Operational Advisor (previously “AI Laundry Advisor”) — FACT = Rule-based Live Simulation / ASPIRATION = ML forecasting**  
   **Current reality:** automated analytical engine providing **rule-based** morning recommendations to optimize shift scheduling, resolve station bottlenecks, and prevent packaging material shortages.  
   Inputs/outputs/limitations documented in `02_PRODUCT_STRATEGY.md §3`.  
   **No ML model, no training pipeline today.** Marketing must say: “Operational Advisor — Live Simulation, rule-based” until Phase 4 data exists.

---

## 3. B2B SaaS Pricing Architecture

Pricing tiers are structurally aligned with customer operational complexity and infrastructure hosting costs.

```
+-----------------------------------------------------------------------+
|                       ENTERPRISE TIER ($899+/mo)                      |
|      Multi-Branch Chains | Benchmarking | Dedicated DB | @mjrh.com    |
+-----------------------------------------------------------------------+
+-----------------------------------------------------------------------+
|                         GROWTH TIER ($399/mo)                         |
|   Core Flagship | Operational Advisor | Live SLA | *.mjrh.com | Acct  |
+-----------------------------------------------------------------------+
+-----------------------------------------------------------------------+
|                        BOUTIQUE TIER ($199/mo)                        |
|       Single Location | Core Stations | Portal | Daily Cash Close     |
+-----------------------------------------------------------------------+
+-----------------------------------------------------------------------+
|                           PILOT TIER ($0)                             |
|              14-Day Evaluation | Standard Workstations                |
+-----------------------------------------------------------------------+
```

### 3.1. Pricing Tier Breakdown & Feature Gates — FACTS
* **Pilot Tier ($0 / 14 Days):** Designed to minimize Customer Acquisition Cost by allowing emerging dry cleaners to evaluate physical workstation progression and customer portal capabilities without initial capital expenditure.
* **Boutique Tier ($199 / Month):** Targets single-location commercial operations. Includes the 7 standard physical workstations, standard customer portal, and automated daily cash closing routines.
* **Growth Tier ($399 / Month - Flagship Offering):** Targets expanding commercial facilities and boutique chains. Unlocks the **Operational Advisor (rule-based)**, live SLA monitoring, custom subdomains (`*.mjrh.com`), full double-entry accounting ledgers, and automated courier tip separation.
* **Enterprise Tier ($899+ / Month or Custom Contract):** Targets multi-branch commercial networks and industrial processing facilities. Unlocks multi-branch KPI benchmarking, dedicated database compute clusters, custom email routing (`@mjrh.com`), and dedicated support agreements.

**Naming change per CTO review:** “AI Laundry Advisor” → **“Operational Advisor”** in all pricing tables until ML Phase 4 ships.

---

## 4. Pricing Justification — FACTS vs ASSUMPTIONS vs ASPIRATIONS

### FACTS (verifiable today)
- ✅ 9-language i18n shipped — `lib/i18n-internal.ts`, tested in CI (`i18n-critical.test.ts`)
- ✅ Double-entry ledger shipped — `journal_entries` / `journal_lines`, `sync_order_financials` trigger
- ✅ Customer portal shipped — `routes/customer-portal.tsx`, InstaPay OCR proof upload live
- ✅ 7 physical workstations routed — `routes/_app/stations/*`, `lib/station-workflow.ts`
- ✅ Type safety: **zero `as any`** in `lib/` and `routes/` — CI enforced
- ✅ Production live: https://mjrh.vercel.app — health check 200 OK
- ✅ Bundle initial load: **~285KB gzip / ~245KB brotli** — verified 2026-06-30
- ✅ CI: typecheck 0 errors, vitest 28/28, build 13.04s

### ASSUMPTIONS (must be labeled as such — per CTO review)
> **Previous v1 presented these as facts — they are NOT facts yet. They are financial models awaiting real customer data.**

| Assumption (v1 claim) | Status | Required evidence |
|---|---|---|
| **CAC = $1,200 avg B2B** | ❌ ASSUMPTION — no paid campaigns yet | Need: actual ad spend / leads / closed-won funnel — at least 20 paying customers |
| **Payback in 3 Months** ($399/mo → $4,788 ACV / $1,200 CAC) | ❌ FINANCIAL ASSUMPTION — do NOT present as fact | Need: real CAC + real churn cohort |
| **88% Gross Margin** | ❌ PROJECTION — not audited P&L | Need full COGS: Supabase Pro ($25-599), Vercel Pro ($20), OCR.space API ($…/1k calls), Email, WhatsApp WABA future, Support FTE allocation, future AI compute |
| **“Payback in 3 Months” headline** | ❌ REMOVE from investor deck until data-backed | Replace with: “Target payback <6 months — pending first 20 paid customers cohort” |
| **Competitor “lack native accounting” absolute** | ⚠️ RISKY — softened in §1 above | Replace with differentiated positioning map + verifiable schema link |

**Revised pricing justification language (investor-safe):**

> *“MJRH Growth tier at $399/mo targets an ACV of $4,788. **Target** CAC (assumption, not yet validated) is <$1,200 based on B2B SaaS laundry benchmarks — yielding a **modeled** payback of ~3 months. **We have NOT yet validated CAC with paid acquisition — current users are design partners / pilot.**  
> Infrastructure direct costs today: Supabase Pro ~$25-99/mo per project pooled, Vercel Pro $20/mo, OCR.space ~$0.005/image. **Modeled** gross margin ~80-88% at scale — pending audited COGS including support labor.  
> We will NOT claim ‘Payback in 3 Months’ or ‘88% margin’ as fact until we close ≥20 paying customers and publish cohort 1 retention.”*

### ASPIRATIONS (clearly labeled)
- **AI forecasting engine (ML):** Aspirational — Phase 4, 2027+, requires 6+ months multi-tenant operational data. Today = rule-based Operational Advisor + Live Simulation UI.
- **Enterprise expansion / market leadership:** Aspirational — depends on proven NRR, churn <5%/mo, CAC payback validated.
- **IoT predictive maintenance:** Aspirational — Phase 3, Q4 2026, hardware partner required.
- **Bank webhook / MT940 auto-reconciliation:** Planned Phase 2, Q3 2026 — currently OCR regex heuristics only.

---

## 5. Investor / CTO Due Diligence — 5 Questions We Must Answer Honestly

Per external CTO review — questions any serious investor/CTO will ask immediately:

| # | Question | Honest Answer (2026-06-30) |
|---|---|---|
| **1** | كم مغسلة تستخدم النظام اليوم؟ (How many laundries actively use the system today?) | **Pilot / design partners — Dry Tech tenant live on Supabase `dngjfjrjddigqadlyain`. Paying customer count: disclose actual — do NOT inflate.** |
| **2** | كم Order processed؟ | Pull from DB: `SELECT COUNT(*) FROM orders WHERE tenant_id = …` — include in next investor update. Do NOT estimate. |
| **3** | ما هو churn المتوقع؟ | **Unknown — no 12-month cohort yet.** Assumption: target <5%/mo SMB SaaS benchmark — mark as assumption. |
| **4** | ما هو CAC الحقيقي وليس المفترض؟ | **$0 paid CAC to date — all users organic / founder-led.** $1,200 figure = industry benchmark assumption, NOT measured. |
| **5** | هل دفع أحد $199 أو $399 بالفعل؟ | **Answer truthfully with Stripe / bank receipts.** If not yet: state “pre-revenue pilot, LOIs signed: X” — do NOT claim MRR without invoices. |

**Action:** before next investor pitch, populate a **Facts Sheet** with real DB queries:
```sql
-- live tenants
SELECT COUNT(DISTINCT tenant_id) FROM orders WHERE created_at > now() - interval '30 days';
-- orders last 30d
SELECT COUNT(*) FROM orders WHERE created_at > now() - interval '30 days';
-- GMV
SELECT SUM(total_amount_cents)/100.0 FROM orders WHERE status = 'delivered';
```

---

## 6. Messaging Guidance — Engineering vs Marketing (CTO directive)

| Context | Recommended Wording | Avoid |
|---|---|---|
| Operational Advisor | “Operational Advisor — Rule-based Live Simulation” / “Prescriptive operational recommendations” | “AI Engine”, “ML forecasting”, “AI prediction”, “Superior AI” |
| Accounting | “Native double-entry ledger automatically generated from workstation events — APDO auditable” | “Replaces all accountants”, “Best accounting in the world” |
| Market position | “Differentiated operational-control + native-accounting quadrant — verifiable schema” | “Best laundry platform in the world”, “Revolutionary”, “Superior to everyone” |
| Financials | “Modeled CAC / modeled payback / target margin — pending first 20 paying customers” | “Payback in 3 months” / “88% margin” as fact |
| Competitive | “Cents / CleanCloud = strong POS + driver management + partner accounting integrations; MJRH differentiates with native ledger + APDO” | “Competitors lack accounting 100%” absolute |
| Type safety | “Zero `as any` — CI-enforced TypeScript hygiene improving maintainability” | “Zero as-any = proof of superior system quality alone” |

**Strongest defensible message (CTO consensus, adopted):**

> **“Laundry operations workflow natively coupled to double-entry accounting inside a single system — with APDO forensic traceability.”**
>
> Build all marketing around: **APDO → Accounting → Customer Experience** — postpone AI / financial absolutes until real operational data from paying customers exists.

---

## Appendix — Facts / Assumptions / Aspirations quick card (for sales deck)

**FACTS — ship today, CI-verified:**
- 9-language i18n, RTL/LTR
- 7 physical workstations, QR piece tracking
- Double-entry journal, daily cash closing
- Customer portal + InstaPay OCR (regex heuristics)
- Zero `as any`, 28/28 tests, production live at mjrh.vercel.app
- Bundle: 285KB gzip initial

**ASSUMPTIONS — needs customer data:**
- CAC $1,200 • Payback 3 months • 88% gross margin • Churn <5%
- → Label clearly “modeled / target — pending cohort 1”

**ASPIRATIONS — roadmap, NOT shipped:**
- ML AI forecasting (Phase 4, 2027)
- Bank webhook MT940 (Phase 2)
- IoT predictive maintenance (Phase 3)
- Enterprise market leadership

---

*Document v2.1 — CTO review feedback fully incorporated 2026-06-30*  
*Changes vs v1: added Facts/Assumptions/Aspirations split; removed “AI Engine” absolute claims → “Operational Advisor — Rule-based Live Simulation”; softened competitive accounting claim with verifiable schema reference; converted CAC / payback / 88% margin from “fact” to explicitly labeled “Assumption — pending real customer cohort”; added Investor Due Diligence 5-question honest answer table; adopted core message: “operations workflow natively coupled to double-entry accounting + APDO”.*
