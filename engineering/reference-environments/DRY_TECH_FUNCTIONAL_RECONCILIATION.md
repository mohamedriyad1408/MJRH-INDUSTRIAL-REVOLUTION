# Dry Tech Functional Reconciliation Report

**Status:** Documentation & analysis only — no fixes implemented  
**Branch:** `feature/mjrh-v3-core-platform`  
**Organization:** Dry Tech  
**Slug:** `/dry-tech`  
**Purpose:** Identify Business Behavior, configuration, UI behavior, hardcoded logic, and generated asset gaps after the Platform Generator transition.

---

## 1. Executive Summary

Dry Tech has been technically restored in-place:

- same organization
- same slug `/dry-tech`
- same owner account
- same historical data
- Core Platform initialization repaired
- platform access restored

However, technical restoration is not the same as full functional reconciliation.

The remaining question is:

```txt
What business behavior existed in the old Dry Tech experience, what is missing or disconnected now, and where should it be restored architecturally?
```

This sprint does **not** implement fixes.

It documents the gaps and classifies each missing element into the correct future location.

---

## 2. Comparison Sources

## Source A — Reference Baseline

The old working Dry Tech state before the Platform Generator pivot is treated as a **Reference Baseline**, not source code to copy.

Sources used:

1. Verified backup:

```txt
backup_dry_tech_20260712194142
```

2. Existing legacy code paths and hardcoded UI/business logic still present in the repository.

3. Historical routes/components that supported Dry Tech behavior before the pivot.

Important rule:

```txt
Source A tells us what existed.
It does not tell us how to implement it again.
```

## Source B — Restored Dry Tech

Current restored organization:

```txt
slug: dry-tech
can_enter_platform: true
onboarding_completed: true
gold_standard_organization: true
```

Data state:

| Area | Count |
|---|---:|
| Branches | 2 |
| Employees | 12 |
| Customers | 8 |
| Services | 205 |
| Orders | 530 |
| Order Items | 1103 |
| Service Units | 1647 |
| Pickup Requests | 9 |
| Journal Entries | 612 |
| Journal Lines | 1224 |
| Core Departments | 10 |
| Core Roles | 7 |
| Core Navigation Items | 10 |
| Core Workflow Blueprints | 1 |
| Core Financial Event Types | 6 |
| Core Documents | 3 |
| Core Forms | 2 |

---

## 3. Critical Rule

Do not restore the old behavior by reconnecting hardcoded Laundry logic.

Each missing behavior must move to exactly one correct future location:

- Core Platform
- Business Operating Model
- Business DNA
- Capability Pack
- Industry Template
- Demo Data
- Dry Tech Configuration
- Obsolete

---

# Deliverable 1 — Functional Gap Report

This section compares business capabilities, not database counts.

| Missing Item | Previous Behavior | Current State | Root Cause | Correct Future Location | Priority |
|---|---|---|---|---|---|
| Full business owner dashboard behavior | Owner could access multiple operational views: today center, dashboard, executive view, operations status, financial indicators. | Dry Tech has access restored, but generated navigation exposes only limited management/dashboard entry. | Old dashboards were route/component-driven, not generated assets. | Capability Pack | P0 |
| Today / daily operating center | A daily operational hub existed for current work, alerts, orders, and team status. | Not represented in generated Core navigation or template assets. | Hardcoded route existed outside Platform Generator asset model. | Capability Pack | P0 |
| Order management flow | Owner/team could navigate to all orders, create new order, open historical order, edit order, track status. | Routes/data still exist, but generated nav does not fully expose order management. | Order capability not represented as reusable pack navigation/behavior. | Capability Pack | P0 |
| Customer service workflow | Customer handling, customers list, CRM, customer care routes existed. | Customer data preserved, but generated nav only exposes `/cs`, not full customer workflow. | CRM capability not fully generated from packs. | Capability Pack | P0 |
| Branch operations visibility | Branch-specific data existed and operational branch separation was supported. | Branch data preserved, but branch operational UI is not fully represented in generated nav/assets. | Branch operations behavior not modeled as generator assets. | Core Platform | P1 |
| Station-based production flow | Intake, sorting, cleaning, finishing/ironing, QC, packing, delivery stations supported work movement. | Station route files still exist and Core departments exist, but behavior is not fully generated from template. | Station behavior is split between hardcoded routes and template assets. | Industry Template | P0 |
| Quality control behavior | QC checks and issue workflows existed in operational screens. | QC route and data concepts exist, but QC rules/forms are not fully generated assets. | QC behavior is not formalized as reusable pack/template configuration. | Capability Pack | P1 |
| Delivery / courier flow | Driver route/tasks/live map/delivery collection existed. | `/driver` is generated, but live map and full route planning are not generated. | Field service behavior not fully pack-based. | Capability Pack | P1 |
| Pickup request flow | Pickup requests and customer pickup status existed. | Data preserved, but generated navigation does not expose pickup management. | Pickup/delivery behavior not modeled as Field Service Pack assets. | Capability Pack | P1 |
| Financial operations flow | Accounting, ledger, receivables, cash closing, budgets existed as screens. | Accounting data preserved; generated nav includes only `/accounting`. | Accounting Pack navigation and reports not fully modeled. | Capability Pack | P0 |
| Cash closing behavior | Daily cash closing existed. | Data/routes likely exist, but not generated in Dry Tech navigation. | Finance operations were route-driven. | Capability Pack | P1 |
| Receivables behavior | Receivables existed for customer balances. | Historical data preserved; route not generated. | Accounting/CRM pack assets missing. | Capability Pack | P1 |
| Staff operations | Staff, attendance, schedules, requests, salaries existed. | Employee data preserved; generated nav does not expose full staff suite. | HR capability not generated from packs. | Capability Pack | P1 |
| Report browsing | Reports and report builder existed. | Report route exists; generated nav does not expose full reporting. | Reporting Pack asset model incomplete. | Capability Pack | P0 |
| Notifications behavior | Notifications and customer messages existed around order updates and alerts. | Customer messages preserved; notification rules/templates not generated. | Notification Pack not complete. | Capability Pack | P1 |
| Customer portal behavior | Customer portal, signup, tracking existed around Dry Tech. | Public `/dry-tech` and customer portal route exist; behavior remains order-specific/hardcoded. | Customer experience not generated from CRM/Notification/Document packs. | Capability Pack | P1 |
| Public tracking behavior | Customers could track orders by token/status. | Route exists, but status semantics are legacy order-centric. | Tracking is not modeled as generic customer-facing workflow status. | Capability Pack | P1 |
| Operational intelligence / health checks | System health/APDO pages existed. | Routes exist but not generated in nav/assets. | Operational health behavior not formalized as Core/Reporting Pack asset. | Core Platform | P2 |
| AI/advisor recommendations | Advisor-like widgets and operational insights existed in code. | Not represented in generated Dry Tech assets. | Advisory behavior not modeled in Business Operating Model/Capability Pack. | Business Operating Model | P2 |

---

# Deliverable 2 — Configuration Gap Report

This section compares configuration and generated assets.

| Missing Item | Previous Behavior | Current State | Root Cause | Correct Future Location | Priority |
|---|---|---|---|---|---|
| Complete role-aware navigation configuration | Static sidebar defined many links and role rules. | Core navigation has 10 generated items only. | Navigation was not template/capability-pack driven. | Core Platform | P0 |
| Navigation asset registry | No explicit reusable navigation asset model; app sidebar held logic. | Core nav items exist but are derived from departments only. | Missing capability/template navigation asset model. | Core Platform | P0 |
| Order capability config | Order routes and screens existed. | No generated order capability config. | Orders predate Platform Generator. | Capability Pack | P0 |
| Customer/CRM config | CRM/customer care screens existed. | No CRM pack config drives Dry Tech generation. | CRM behavior is route/component based. | Capability Pack | P0 |
| Staff/HR config | Staff/attendance/salary routes existed. | No HR pack config drives generated navigation. | HR functionality not modeled as pack. | Capability Pack | P1 |
| Reporting config | Reports exist as routes/components. | Only minimal `report_definitions` present. | Report definitions not used as full source of truth. | Capability Pack | P1 |
| Dashboard widget config | Dashboard widgets were coded. | No generated dashboard widget definitions. | Dashboard behavior is component-driven. | Capability Pack | P1 |
| Notification template config | Messages existed, but trigger/template config incomplete. | Customer messages preserved; notification templates not fully generated. | Notification behavior not expressed as pack assets. | Capability Pack | P1 |
| Full Dry Tech service catalog as reproducible config | Dry Tech has 205 services. | Laundry Template has 10 services. | Dry Tech catalog is business data, not template asset pack. | Dry Tech Configuration | P0 |
| Curated Laundry service defaults | Old implementation seeded/copy services. | Template defaults are minimal. | Legacy seed process was not curated. | Industry Template | P1 |
| Workflow stage operational config | `workflow_stages` has 8 baseline rows. | Core blueprint has 1 workflow but not full operational bridge. | Dual workflow models coexist. | Capability Pack | P0 |
| Station definitions | Station names/routes were hardcoded/enums. | Template departments exist, but station definitions are incomplete as assets. | Station concept not fully template-driven. | Industry Template | P0 |
| Document defaults | Receipts/delivery/payment documents existed implicitly. | 3 core documents generated. | Document pack/template asset model still shallow. | Capability Pack | P1 |
| Form defaults | Operational forms/checklists existed or were implied. | 2 core forms generated. | Forms not fully extracted from old behavior. | Capability Pack | P2 |
| Financial event mapping | Accounting history exists. | Generic financial event types exist, but old order sync functions remain. | Finance mapping not fully generic. | Core Platform | P1 |
| Approval rules | Some approvals existed in workflows/payments/discounts. | Basic approval payload exists but not connected broadly. | Approval Pack incomplete. | Capability Pack | P1 |
| Business settings | App settings preserved. | Not fully mapped into new Business Initialization output. | Business settings model incomplete. | Business DNA | P1 |

---

# Deliverable 3 — UI Gap Report

This section compares visible user experience.

| Missing Item | Previous Behavior | Current State | Root Cause | Correct Future Location | Priority |
|---|---|---|---|---|---|
| Sidebar richness | Sidebar exposed many sections and tools. | Generated sidebar is simplified to 10 workspace links. | Core navigation generation only uses departments. | Core Platform | P0 |
| Orders buttons/menus | Buttons for new order/order list were visible in operational UX. | Not generated in Core nav. | Order actions not modeled as pack nav/actions. | Capability Pack | P0 |
| Customer quick access | Customer list/search/CRM visible. | Customer search exists separately but not generated as full nav. | CRM pack missing nav/action assets. | Capability Pack | P0 |
| Staff menu | Staff and attendance actions visible. | Not generated for Dry Tech. | HR pack not represented. | Capability Pack | P1 |
| Reports menu | Reports were available as route/menu. | Not generated in nav. | Reporting Pack not represented. | Capability Pack | P0 |
| Financial menus | Ledger/receivables/cash closing/budgets existed. | Only accounting workspace generated. | Accounting Pack nav incomplete. | Capability Pack | P1 |
| Live map link | Live map exposed field team. | Not generated in nav. | Field Service Pack nav incomplete. | Capability Pack | P1 |
| Services menu | Service catalog management visible. | Not generated. | Laundry template/catalog management not included in nav. | Industry Template | P1 |
| Help/settings/legal | Previously available. | Not generated in Dry Tech nav. | Core support/admin nav missing from generated nav model. | Core Platform | P2 |
| Station screens empty-risk | Specific station screens still exist. | Some generated work areas may route to legacy station pages rather than generic renderer. | Mixed legacy/new station rendering. | Core Platform | P0 |
| First success dashboard | Not relevant in old Dry Tech, but required in new platform. | Not implemented yet. | Business Initialization implementation not started. | Core Platform | P1 |
| Empty generated screens | Some generated entries may lead to screens that assume legacy data shape. | Needs validation per route. | Generator does not yet guarantee screen readiness. | Core Platform | P1 |

---

# Deliverable 4 — Hardcoded Logic Report

This section identifies old implementation dependencies that must not be blindly restored.

## 4.1 Hardcoded candidates found

High-volume hardcoded/legacy references exist around:

- Laundry terminology
- stations
- order statuses
- ironing
- packing
- delivery
- cleaning
- station-specific role redirects
- route-specific operational screens
- legacy bootstrap functions

## 4.2 Key files and recommended classification

| Item | Previous Behavior | Current State | Root Cause | Correct Future Location | Priority |
|---|---|---|---|---|---|
| `components/app-sidebar.tsx` static tenant groups | Encoded many business areas and role rules. | Core nav can override, but static logic still exists. | Navigation started as app-specific UI. | Core Platform | P0 |
| `routes/$tenant/stations/*.tsx` | One file per station. | Still present. | Station rendering was hardcoded. | Obsolete | P1 |
| `routes/$tenant/stations/$stage.tsx` | Generic stage route exists. | Not yet primary for all station behavior. | Migration incomplete. | Core Platform | P0 |
| `lib/legacy/laundry-workflow-v1.ts` | Laundry workflow logic. | Legacy file still present. | Old implementation. | Obsolete | P1 |
| `lib/legacy/laundry-validation-rules.ts` | Laundry-specific validation rules. | Legacy file still present. | Business rules not moved to template. | Industry Template | P1 |
| `lib/station-workflow.ts` | Station workflow helpers. | Still used by station/order flow. | Station model not generalized. | Capability Pack | P1 |
| `lib/rules/ironing-distribution.ts` | Ironing-specific distribution. | Still a specialized rule. | Laundry/compensation behavior mixed with code. | Capability Pack | P1 |
| `lib/rules/order-routing.ts` | Order routing assumptions. | Still order-centric. | Work Order/Task bridge missing. | Core Platform | P0 |
| Legacy tenant bootstrap migrations | Seeded services/features/defaults automatically. | Still can cause side effects. | Pre-generator bootstrap design. | Obsolete | P0 |
| Order-specific financial sync | Accounting tied to orders. | Still functional but not generic. | Finance model predates Work Orders. | Core Platform | P1 |
| Station-based employee redirects | Employee experience based on station/job_role. | Still present in layout behavior. | Legacy station assumptions. | Obsolete | P1 |

## 4.3 Audit answers

| Question | Answer |
|---|---|
| Is hardcoded logic business knowledge? | Sometimes. It must be extracted into Business Knowledge, Capability Packs, or Templates. |
| Is it configuration? | Often yes, especially stations, workflows, documents, reports, navigation. |
| Is it reusable? | Many parts are reusable if generalized: workflow, task, notification, reporting. |
| Should it become template data? | Laundry-specific stations/service defaults should become Laundry Template data. |
| Should it become platform configuration? | Navigation, permissions, dashboards, reports, workflow execution should become platform configuration. |
| Should it disappear? | Legacy bootstrap, duplicate station routes, and one-off workarounds should disappear gradually. |

---

# Deliverable 5 — Missing Generated Assets Report

Assets that should eventually be generated by Platform Generator rather than manually coded:

| Missing Generated Asset | Previous Behavior | Current State | Root Cause | Correct Future Location | Priority |
|---|---|---|---|---|---|
| Full role-aware navigation asset set | Static sidebar. | 10 generated nav items only. | No navigation asset pack model. | Core Platform | P0 |
| Order management actions | Hardcoded buttons/routes. | Not generated. | Missing action assets. | Capability Pack | P0 |
| Customer/CRM actions | Hardcoded routes/screens. | Not generated. | Missing CRM pack assets. | Capability Pack | P0 |
| Dashboard widget definitions | Component-coded. | Not generated. | Missing dashboard asset model. | Capability Pack | P1 |
| Report definitions | Component-coded. | Minimal definitions. | Reporting Pack incomplete. | Capability Pack | P1 |
| Notification templates | Code/message-based. | Not fully generated. | Notification Pack incomplete. | Capability Pack | P1 |
| Station definitions | Enum/routes. | Partially represented as departments. | Template station assets incomplete. | Industry Template | P0 |
| Workflow-to-task rules | Order/station logic. | Not generated as tasks. | Work Order bridge missing. | Core Platform | P0 |
| Approval rules | Mixed code/config. | Minimal. | Approval Pack incomplete. | Capability Pack | P1 |
| Full document templates | Implicit. | 3 core docs only. | Document Pack incomplete. | Capability Pack | P1 |
| Dry Tech demo data pack | Historical DB state. | Not declarative. | Demo Data Import missing. | Demo Data | P1 |
| Full Dry Tech service catalog export | Existing service rows. | Not pack/data asset. | No data-pack extraction. | Dry Tech Configuration | P1 |
| First success dashboard | New requirement. | Not generated. | Business Initialization not implemented. | Core Platform | P1 |

---

# Deliverable 6 — Recommended Restoration Plan

No fixes should begin until this report is reviewed and approved.

Recommended implementation order:

## Phase 1 — Restore visible business navigation without hardcoding

Target:

```txt
Core role-aware navigation generation from Capability Pack / Template navigation assets
```

Why first:

- Most visible gap.
- High value for Dry Tech owner experience.
- Reusable for all future generated organizations.
- Avoids reconnecting old sidebar hardcoding.

## Phase 2 — Unify permissions and role mapping

Target:

```txt
core_roles → runtime permissions/user_roles mapping
```

Why:

- Generated roles currently exist beside old user_roles.
- Every generated organization needs consistent permission behavior.

## Phase 3 — Order → Work Order → Task compatibility bridge

Target:

```txt
Historical Orders remain intact.
New operational model can create Work Orders/Tasks.
```

Why:

- Central to Business Knowledge Model.
- Avoids breaking 530 historical orders.

## Phase 4 — Generic workflow/station renderer

Target:

```txt
Template station definitions → generic work-area renderer
```

Why:

- Retires station route duplication gradually.
- Keeps Laundry Template configurable.

## Phase 5 — Reporting/Dashboard Pack extraction

Target:

```txt
Reports and dashboards as generated assets
```

Why:

- Supports Dry Tech business acceptance.
- Required for First Success Dashboard.

## Phase 6 — Notification/Customer Experience Pack extraction

Target:

```txt
Customer portal and messages from CRM + Notification + Document packs
```

## Phase 7 — Finance mapping modernization

Target:

```txt
Order/payment history preserved; generic Financial Transaction model introduced safely.
```

## Phase 8 — Dry Tech reproducibility

Target:

```txt
Dry Tech = Template + Platform Generator + Demo Data Import
```

Do this only after behavior is stable.

---

# Deliverable 7 — Recommended Architecture Location Summary

| Future Location | Items |
|---|---|
| Core Platform | navigation engine, permission mapping, work order/task bridge, generic station renderer, financial transaction mapping, validation scripts |
| Business Operating Model | advisor/operational intelligence patterns, first success dashboard operating patterns |
| Business DNA | business settings, branch complexity, payment timing, approval sensitivity, field operation flags |
| Capability Pack | workflow, CRM, accounting, HR, reporting, notification, field service, document, approval capabilities |
| Industry Template | laundry stations, laundry workflow defaults, laundry document defaults, curated laundry service defaults |
| Demo Data | generated sample orders/customers/messages for training/demo |
| Dry Tech Configuration | 205 service catalog, historical business-specific settings, gold standard dataset |
| Obsolete | legacy bootstrap side effects, duplicate station routes over time, direct station redirects, old workflow v1 as execution path |

---

# Deliverable 8 — Items That Should Not Return

These items conflict with the new architecture and should not be restored as-is:

| Item | Reason |
|---|---|
| Legacy tenant bootstrap service mutation | Causes unexpected data changes and bypasses template generation. |
| `if business_type/laundry` style Core behavior | Reintroduces industry-specific Core. |
| Static sidebar as source of truth | Blocks template/capability-driven navigation. |
| One file per station as long-term architecture | Duplicates station logic and hardcodes Laundry flow. |
| `lib/legacy/laundry-workflow-v1.ts` as runtime source | Old workflow model conflicts with Platform Generator model. |
| Station-based employee redirect as primary routing | Should become actor/task/work-area assignment logic. |
| Blindly copying all 205 Dry Tech services into Laundry Template | Dry Tech data is not automatically universal template data. |
| Order-only finance model as universal architecture | Must evolve into generic financial transaction mapping. |
| Demo org as development environment | Violates Gold Standard policy. |

---

## Final Answer to Success Question

**Question:**

```txt
What existed in old Dry Tech and disappeared after the Platform Generator transition, and how do we restore it correctly without breaking the new architecture?
```

**Answer:**

The historical business data did not disappear.

The missing pieces are mostly business behavior and generated experience:

- navigation richness
- capability-specific menus/actions
- workflow/station behavior as configuration
- order/work-order/task bridge
- report/dashboard definitions
- notification templates
- permission mapping
- Dry Tech reproducibility as template + data import

These should not be restored by reconnecting old hardcoded code.

They should be restored through:

```txt
Core Platform
Business Capability Packs
Laundry Template
Dry Tech Configuration
Demo Data Import
```

Anything that is legacy bootstrap, duplicate station code, or hardcoded Laundry behavior should be treated as Obsolete.
