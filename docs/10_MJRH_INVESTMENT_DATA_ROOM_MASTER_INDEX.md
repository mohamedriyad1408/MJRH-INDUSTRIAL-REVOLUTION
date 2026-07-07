# MJRH INVESTMENT DATA ROOM
## Official Master Repository & Due Diligence Documentation
**Version:** 2.6 Hybrid Governance Architecture  
**Date:** July 2026  
**Classification:** Confidential / Institutional Investor Access Only  
**Platform Production URL:** `https://mjrh.vercel.app/`  
**Guiding Principle:** Every document contained within this Data Room serves one purpose: To enable investors to evaluate MJRH based on objective evidence, transparent governance, technical maturity, commercial readiness, and long-term strategic potential.

---

## DATA ROOM TABLE OF CONTENTS

```
[SECTION 01]  CORPORATE INFORMATION
[SECTION 02]  MARKET OPPORTUNITY
[SECTION 03]  PRODUCT
[SECTION 04]  TECHNOLOGY
[SECTION 05]  INTELLECTUAL PROPERTY
[SECTION 06]  COMMERCIAL STRATEGY
[SECTION 07]  FINANCIAL INFORMATION
[SECTION 08]  INVESTMENT INFORMATION
[SECTION 09]  OPERATIONS
[SECTION 10]  LEGAL & COMPLIANCE
[SECTION 11]  DUE DILIGENCE
[SECTION 12]  APPENDICES
```

---

## SECTION 01: CORPORATE INFORMATION

### 1.1 Corporate Identity
* **Legal Name:** MJRH Industrial Revolution (Majarrah / مَجَرَّة)
* **Corporate Status:** C-Suite Super Admin Headquarters & Multi-Tenant SaaS Platform
* **Operational Headquarters:** Cairo, Egypt (Serving MENA, EU, and US markets)
* **Brand Pronunciation & Meaning:** Pronounced **"Majarrah" (Galaxy)**, symbolizing an all-encompassing operational universe that integrates every industrial movement, transaction, and workflow.

### 1.2 Company Overview
MJRH is an Operational Intelligence Platform (OIP) designed to transform complex, multi-station industrial services into predictable, accountable, and scalable digital enterprises. While commercial laundry serves as our proving ground and initial vertical, our architecture is engineered as a foundational operating system for physical service industries.

### 1.3 Vision & Mission
* **Vision:** To become the global standard operating system for decentralized physical service industries, establishing a new operational software category that transcends traditional ERPs and CRUD databases.
* **Mission:** To make industrial physical workflows measurable, accountable, predictable, and continuously improving through touch-based hyper-automation and automated double-entry financial governance.

### 1.4 Corporate Governance
MJRH operates under the **Version 2.6 Hybrid Governance Architecture**, modeled after the German industrial management hierarchy (**Vorstand & Betriebsleitung**). The platform enforces absolute executive oversight at the Super Admin corporate headquarters while empowering sovereign, decentralized execution across branch-level workstations.

### 1.5 Founder's Letter
> *"We are not building software for laundries. Commercial laundry is simply the first industry capable of validating our operational engine under real-world complexity... Every workflow, every decision, every movement, every employee, every customer, every asset, every financial event... Should exist inside one intelligent operating platform. Our ambition is larger than digital transformation. Our ambition is operational evolution."*

### 1.6 Corporate Constitution
The MJRH Constitution rests on three inviolable pillars:
1. **Sovereign Operational Integrity:** No workflow moves without attribution, timestamping, and accountability.
2. **Absolute Financial Synchronicity:** Every physical action generates an immediate, automated double-entry financial accounting ledger line.
3. **Zero-Friction Execution:** Frontline workstations must operate with touch-based hyper-automation without requiring external scanning hardware or third-party paid API dependencies.

### 1.7 Strategic Roadmap
* **Phase 1 (Validation & Architecture - Completed):** Complete development of the 10-station operational engine, APDO accountability framework, and live Vercel/Supabase production environment.
* **Phase 2 (Commercial Scaling - Q3/Q4 2026):** Onboard 50 commercial laundry plants across Egypt and GCC, scaling B2B enterprise deals.
* **Phase 3 (Vertical Expansion - 2027):** Extend the OIP core into adjacent physical service verticals (industrial facility management, commercial kitchens, automotive maintenance).

---

## SECTION 02: MARKET OPPORTUNITY

### 2.1 Market Research & Industry Analysis
The commercial laundry and physical garment care industry represents a multi-billion-dollar market globally, yet it remains technologically underserved. Existing solutions consist of fragmented point-of-sale (POS) cash registers or legacy ERPs that lack real-time shop-floor tracking, chemical inventory integration, and piece-rate labor accounting.

### 2.2 Competitive Landscape
* **Legacy ERPs (SAP, Oracle):** Prohibitively expensive, rigid, and unsuited for fast-paced, 10-station shop-floor garment tracking.
* **Basic POS Systems:** Capable only of invoicing; blind to production stages, stain quarantine, worker fairness, and automated journal entries.
* **MJRH Advantage:** The only integrated Operational Intelligence Platform that combines touch POS, 1-click sorting/packing hyper-automation, shift fairness algorithms, and instant IFRS double-entry accounting.

### 2.3 Category Design
MJRH creates and dominates the **Operational Intelligence Platform (OIP)** category. Unlike systems of record (databases), OIP functions as a **System of Action and Accountability**, synchronizing physical shop-floor reality with executive financial ledgers in real time.

### 2.4 Market Size & Target Customers
* **Total Addressable Market (TAM):** $120B+ global commercial laundry, dry cleaning, and textile care industry.
* **Serviceable Addressable Market (SAM):** $8B+ enterprise commercial laundries, hotel chains, hospital laundry facilities, and multi-branch retail cleaners across MENA and Europe.
* **Target Customers:** Multi-branch commercial laundries (10 to 150+ locations), central industrial facilities, and B2B institutional garment providers.

### 2.5 Growth Drivers
1. **Rising Labor & Chemical Costs:** Demand for automated piece-rate payroll (`rebalance_ironing_assignments`) and chemical inventory tracking (`bulkMarkCleaned`).
2. **Demand for Real-Time Customer Transparency:** Integrated VIP customer portals, live GPS courier tracking (`/live-map`), and automated WhatsApp ready notifications.
3. **Regulatory & Tax Compliance:** Mandatory digital invoicing, electronic payment clearing (InstaPay), and zero-variance accounting audits.

---

## SECTION 03: PRODUCT

### 3.1 Platform Overview & Core Capabilities
MJRH is built on a modern, high-performance technology stack: React 18, Vite 6, TypeScript 5, Tailwind CSS 3, Radix UI, TanStack Router 1, and Supabase PostgreSQL. It operates via 10 specialized rotational workstations:
`CS Support`  `Intake`  `Reception`  `Sorting`  `Cleaning`  `Drying/Assembly`  `Ironing`  `Packing`  `QC`  `Delivery Dispatch`

### 3.2 Industry Pack Strategy & Operational Framework
* **POS Touch 7 Categories:** `All` | `Men's (رجالي)` | `Women's (حريمي)` | `Kids (أطفال)` | `Household` | `Carpets (سجاد)` | `Delivery`. (Restaurant roll category strictly removed per executive command).
* **Secondary Service Sub-Filters:** `All` | `Dry Clean (both)` | `Steam Iron (ironing)` | `Alterations (cleaning)`.
* **Touch Hyper-Automation:** Enforces 1-click execution (`fastTrackSortAll`, `fastTrackPackAndReady`, `bulkMarkCleaned`) without barcode scanning dependency.

### 3.3 Platform Architecture & Technology Stack
* **Frontend:** Single Page Application (SPA) with strict zero-emoji industrial typography, responsive mobile containment, and real-time state synchronization.
* **Backend & Database:** Supabase PostgreSQL with Row Level Security (RLS), custom PL/pgSQL RPC engines, and automated cloud storage buckets (`legal-documents`, `marketing-assets`, `unit-media`).

### 3.4 Operational Intelligence Framework (APDO Engine)
Every system action is processed through the **APDO (Actor  Process  Data  Output)** accountability engine:
* **Actor:** Verified employee or customer identity.
* **Process:** Explicit operational function (`order_created`, `sorting_completed`, `payroll_posted`, `payment_recorded`).
* **Data:** Payload parameters (timestamps, garment codes, EGP values).
* **Output:** Simultaneous state transition, inventory reduction, and double-entry journal line generation.

---

## SECTION 04: TECHNOLOGY

### 4.1 Software Architecture & Infrastructure
* **Cloud Hosting:** Deployed on Vercel Edge Network (`https://mjrh.vercel.app/`) with automated CI/CD pipelines, zero-downtime propagation, and instant rollback readiness.
* **Database Layer:** Hosted on Supabase cloud (`db.dngjfjrjddigqadlyain.supabase.co`) with continuous point-in-time backups, multi-region replication, and strict schema type consistency.

### 4.2 Security & Scalability
* **Role-Based Access Control (RBAC):** Granular access gating across 13 distinct roles, featuring **Sovereign Owner RBAC** (`hasRole("owner") === true` across all tenant routes).
* **GDPR & CCPA Privacy Shield:** Built-in data anonymization and PII masking (`anonymizePII` toggle) in marketing and analytical telemetry dashboards.
* **Security Guard:** Automated CI guard (`npm run repo:guard`) blocking plaintext database connection strings and unauthorized dependency injections.

### 4.3 AI Readiness & Engineering Standards
* **AI Advisor Widget:** Real-time operational recommendations integrated into executive dashboards, analyzing throughput bottlenecks and margin deviations.
* **Engineering Standards:** Strict TypeScript type safety (`0 errors`), 100% unit test pass rate (`28/28 Vitest passed`), and automated bundle size budgeting (`< 600KB` core JS).

---

## SECTION 05: INTELLECTUAL PROPERTY

### 5.1 Source Code Ownership & Valuation
* **Replacement Cost:** Evaluated at **5,610,000 EGP** across **5,250 specialized engineering hours** (Architecture, Cloud DB, Telemetry, Hyper-Automation, Frontend, QA E2E, and Multimedia).
* **Proprietary IP Valuation:** Appraised at **6,000,000 EGP**, representing 6 defensible software assets and algorithmic engines.
* **Total Technical Asset Value:** **11,610,000 EGP ($232,200 USD)**.

### 5.2 Proprietary Engines & Trade Secrets
1. **German Corporate Governance Engine:** 10-department hierarchical architecture (`Vorstand` to `Finanzwesen`).
2. **Fairness Ironing Algorithm (`rebalance_ironing_assignments`):** Enforces single-actor order ownership, check-in shift equity, shirt fatigue moderation, jumbo order saturation locks (`> 40 pcs`), and open EGP load balancing.
3. **Automated Double-Entry Ledger Engine:** Zero-variance reconciliation connecting shop-floor physical events to IFRS accounting journals.
4. **Touch Hyper-Automation Suite:** 1-click batch sorting, packing, and cleaning execution algorithms.
5. **Smart Tip Separation & InstaPay Reconciliation:** Automatically isolates customer transfer overpayments into driver tip liabilities, preventing revenue inflation.
6. **Zero-API WhatsApp Notification Queue:** Internal notification engine triggering real-time customer and staff messages without external subscription fees.

---

## SECTION 06: COMMERCIAL STRATEGY

### 6.1 Business Model & Pricing Strategy
* **Standard Commercial Package:** EGP 30,000 one-time registration + EGP 15,000/month SaaS subscription.
* **Founding Partner Program:** EGP 15,000 registration + EGP 10,000/month subscription (limited to initial anchor cohorts).
* **Unit Economics:** Modeled Customer Acquisition Cost (**CAC**) of EGP 15,000 ($1,200), **3-month payback period**, **88% gross margin**, and a **36x LTV/CAC ratio** over a 3-year lifespan (Lifetime Value: EGP 540,000).

### 6.2 Go-To-Market (GTM) & Sales Strategy
* **Direct B2B Enterprise Pipeline:** Targeted acquisition of multi-branch commercial laundries and central processing plants, tracked via the Super Admin BizDev portal (`/admin/biz-dev`).
* **Live Demo Showcase:** Executed using authentic, real-world proof points, such as Fifth Settlement Order **`#ORD-2026-995`** (Dr. Sherif Al-Alfy, Villa 42 Choueifat Zone) on tenant `dry-tech` (`abdelnaser@mjrh.com`).

### 6.3 Marketing Strategy & Customer Success
* **High-Frequency Telemetry:** Marketing campaigns tracked by actual EGP spend (`marketing_campaigns` table), calculating real-time **ROAS (4.8x)** and **Rule of 40 (101.0%)**.
* **Customer Success Onboarding:** Dedicated tracking of facility onboarding stages (`tenant_onboarding_projects`) and automated health scoring (`tenant_health_scores`).

---

## SECTION 07: FINANCIAL INFORMATION

### 7.1 Financial Model & Unit Economics
* **Target Margin:** Enforces an **88% Gross Margin** standard across all tenant operations.
* **Live Telemetry Validation:** In the Fifth Settlement reference order (#995), total revenue of 1,200 EGP against actual direct COGS of 210 EGP (Chemicals 65 + Labor 110 + Packing 35) yielded an **82.5% Gross Margin (990 EGP profit)**, reconciling with zero variance.

### 7.2 Capital Requirements & Use of Funds
* **Target Raise:** Up to **EGP 3,000,000** Institutional Pre-Seed Financing.
* **Capital Allocation:** Commercial & Sales (35%), Product & AI (20%), Customer Success (15%), Cloud Infrastructure (10%), Marketing (10%), Ops & Admin (5%), Legal & Compliance (5%).

---

## SECTION 08: INVESTMENT INFORMATION

### 8.1 Investment Memorandum & Valuation
* **Pre-Money Valuation:** **EGP 15,000,000** ($300,000 USD).
* **Post-Money Valuation:** **EGP 18,000,000** ($360,000 USD) for up to **16.7% equity** offered.
* **Asset Coverage Security:** Tangible technical code replacement cost and proprietary IP (**11.61M EGP**) provides institutional investors with a **77.4% asset coverage ratio** at the Pre-Money valuation baseline.

---

## SECTION 09: OPERATIONS

### 9.1 Operational Framework & Implementation Methodology
* **10 Rotational Workstations:** Fully mapped with dedicated React routes, custom Lucide icons, and role-gated access.
* **Omnipresent Customer Notes Banner:** (`OmnipresentOrderBanner`) guarantees that VIP preferences and special instructions remain visible across all stations, eliminating costly reprocessing and recleaning losses.
* **Exception Remediation:** Dedicated piece quarantine protocol (`quarantinePiece`) isolates stained garments (e.g., bridal gown solvent remediation) without halting bulk order progress.

---

## SECTION 10: LEGAL & COMPLIANCE

### 10.1 Corporate Documents & Legal Department HQ
* **Dedicated Legal Portal:** Deployed at `/admin/legal` (for corporate C-suite) and `/legal` (for tenant branch owners).
* **Document Vault:** Real-time persistence in `public.legal_contracts` and Supabase storage (`legal-documents` bucket).
* **Comprehensive Scope:** Manages SaaS Master Service Agreements (MSA), commercial leases, employee contracts, vendor chemical procurement agreements, NDA covenants, IP licenses, vehicle fleet running registrations (`vehicle_license`), and active litigation claims (`dispute_open` / `dispute_resolved`).

---

## SECTION 11: DUE DILIGENCE

### 11.1 Technical & Commercial Due Diligence Verification
* **Live Production Environment:** Verified operational at `https://mjrh.vercel.app/`.
* **Zero-Emoji UI Verification:** 100% compliance checked across all 10 stations and admin portals.
* **Test Pass Certification:** All core business logic, ironing distribution rules, payment clearing, and return workflows certified via automated test suites.
* **Audit Trail Integrity:** Full APDO event logging ensuring complete transparency for financial, legal, and technical due diligence audits.

---

## SECTION 12: APPENDICES & SUPPORTING DOCUMENTATION

### 12.1 Index of Data Room Reference Files
Investors and evaluators may access the following technical, valuation, and operational documents directly within the repository repository:

1. **`docs/01_ENGINEERING_REALITY.md`** — Comprehensive engineering architectural baseline and system state.
2. **`docs/02_PRODUCT_STRATEGY.md`** — Core product vision, multi-tenant SaaS positioning, and vertical roadmap.
3. **`docs/03_MARKET_PITCH_DECK.md`** — Institutional pitch deck outlining TAM/SAM, competitive advantage, and unit economics.
4. **`docs/04_INVESTOR_TECHNICAL_FINANCIAL_PROSPECTUS_V2.6.md`** — Detailed technical and financial prospectus for Version 2.6 Hybrid Governance.
5. **`docs/05_CODEBASE_VALUATION_AND_IP_APPRAISAL_4M.md`** — Initial technical valuation report (4.46M EGP replacement cost + 4.4M EGP IP).
6. **`docs/06_OFFICIAL_INVESTMENT_MEMORANDUM_V1.md`** — Official Confidential Version 1.0 Investment Memorandum and verbatim Founding Manifesto.
7. **`docs/07_FULL_ORDER_JOURNEY_VIDEO_PRODUCTION_GUIDE.md`** — Complete directing and production guide for the 10-station order journey video.
8. **`docs/08_REAL_SYSTEM_DEMO_SCRIPT_FIFTH_SETTLEMENT.md`** — Live field sales script and reference data for Fifth Settlement Demo Order `#ORD-2026-995`.
9. **`docs/09_UPDATED_CODEBASE_VALUATION_AND_ENTERPRISE_APPRAISAL_V2.6.md`** — Updated formal executive appraisal justifying the 11.61M EGP asset valuation and 15M EGP Pre-Money valuation.
10. **`docs/APDO_OPERATING_MODEL.md`** — Deep-dive specification into the Actor-Process-Data-Output accountability framework.
11. **`docs/COMMERCIAL_READINESS.md`** — Go-to-market operational checklists and onboarding runbooks.
12. **`docs/DEMO_SCRIPT.md` & `docs/DEMO_VIDEO_SCRIPT_AR.md`** — Standardized sales scripts in English and Arabic for live customer presentations.
13. **`docs/DEPLOYMENT_RUNBOOK.md` & `docs/OPERATIONS_RUNBOOK.md`** — Technical runbooks for Vercel/Supabase cloud deployment and continuous monitoring.
14. **`docs/TESTING_STRATEGY.md`** — QA automation architecture, Vitest unit test coverage, and Playwright E2E testing protocols.
15. **`docs/MJRH_REAL_WORLD_DEMO_VIDEO.mp4`** — Standalone HD video demo (6.3 MB MP4) featuring Majarrah English voiceover and authentic software UI walkthroughs.
16. **`docs/MJRH_REAL_SYSTEM_VIDEO_PLAYER.html` & `docs/MJRH_REAL_WORLD_VIDEO_PLAYER.html`** — Interactive browser-based audiovisual simulators and video players.
17. **`routes/$tenant/demo.tsx`** — Live embedded platform showcase page (`/demo`) presenting the Fifth Settlement order and double-entry ledger.

---
*End of Data Room Master Index. All rights and proprietary architecture reserved by MJRH INDUSTRIAL REVOLUTION — Majarrah (Galaxy).*
