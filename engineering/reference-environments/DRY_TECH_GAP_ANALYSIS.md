# Dry Tech Gap Analysis

**Status:** Analysis sprint — no fixes implemented  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Compare historical Dry Tech baseline with restored Dry Tech on the new Core Platform  
**Rule:** The old implementation is a **Reference Baseline**, not source code to copy.

---

## 1. Mission

Dry Tech was restored successfully as the Official Gold Standard Organization:

```txt
slug: dry-tech
can_enter_platform: true
historical data: preserved
```

However, validation showed that several behaviors, configurations, navigation paths, and business capabilities were previously implicit in the old implementation or hardcoded in application code.

This document does **not** restore those items.

This document identifies gaps and classifies each one into the correct architectural layer before any implementation begins.

---

## 2. References Compared

## Reference A — Historical Dry Tech Baseline

Source used for comparison:

```txt
backup_dry_tech_20260712194142
```

This backup was created before the in-place Core Platform initialization repair.

It represents the existing Dry Tech business data and legacy operational state at the moment before restoration.

Important limitation:

```txt
This is a database baseline, not a complete snapshot of every historical UI behavior.
```

Therefore, hardcoded UI/code behavior was audited separately from the codebase.

## Reference B — Restored Dry Tech on Core Platform

Current organization:

```txt
slug: dry-tech
name: Dry Tech
platform access: restored
core initialization: completed
```

---

## 3. Comparison Snapshot

| Area | Reference A | Reference B | Difference |
|---|---:|---:|---:|
| Branches | 2 | 2 | 0 |
| Employees | 12 | 12 | 0 |
| Customers | 8 | 8 | 0 |
| Services | 205 | 205 | 0 |
| Orders | 530 | 530 | 0 |
| Order Items | 1103 | 1103 | 0 |
| Service Units | 1647 | 1647 | 0 |
| Pickup Requests | 9 | 9 | 0 |
| Journal Entries | 612 | 612 | 0 |
| Journal Lines | 1224 | 1224 | 0 |
| Customer Messages | 14 | 14 | 0 |
| Operation Events | 139 | 140 | +1 restoration audit event |
| Tenant Features | 10 | 22 | +12 Core feature flags |
| Core Departments | 0 | 10 | +10 generated |
| Core Roles | 0 | 7 | +7 generated |
| Core Navigation Items | 0 | 10 | +10 generated |
| Core Workflow Blueprints | 0 | 1 | +1 generated |
| Core Financial Event Types | 0 | 6 | +6 generated |
| Core Documents | 0 | 3 | +3 generated |
| Core Forms | 0 | 2 | +2 generated |
| Can Enter Platform | false | true | restored |

## Initial conclusion

The main historical business data was not lost.

The major gaps are not record-count gaps.

The gaps are mostly:

- behavior that used to be hardcoded
- navigation that used to be static
- legacy station/workflow assumptions
- missing template/capability-pack representation
- missing automated business acceptance coverage
- old implementation details not yet relocated into Core, Capability Packs, Laundry Template, or Dry Tech data

---

## 4. Classification Rules

Every gap is classified into exactly one category.

| Category | Meaning |
|---|---|
| A — Core Platform | Generic capability reusable by every industry. |
| B — Business Capability Pack | Reusable operating capability across multiple industries. |
| C — Laundry Template | Laundry-specific configuration. |
| D — Dry Tech Business Data | Business-specific operational data/configuration for Dry Tech only. |
| E — Technical Debt | Old implementation that should not return. |

Recommended Action must be one of:

- Restore into Core Platform
- Restore into Capability Pack
- Restore into Laundry Template
- Restore into Dry Tech Data
- Do Not Restore (legacy technical debt)

---

## 5. Gap Inventory

| Item | Before | Current | Classification | Recommended Action | Priority |
|---|---|---|---|---|---|
| Full old sidebar/navigation groups | Static sidebar exposed many operational links: Today, orders, customers, staff, reports, live map, services, billing, marketplace, settings, station links. | Core navigation has 10 generated workspace links only. Many links still exist as routes but are not generated into Core navigation. | A — Core Platform | Restore into Core Platform | P0 |
| Template-owned navigation assets | Navigation was mostly hardcoded in `components/app-sidebar.tsx`. | Core nav is generated from departments only, not from explicit template navigation assets. | B — Business Capability Pack | Restore into Capability Pack | P0 |
| Orders navigation | Old UI exposed order list/new order links directly. | Generated nav does not include `/orders`, `/orders/new`, or order management entries. | B — Business Capability Pack | Restore into Capability Pack | P0 |
| Customer navigation | Old UI exposed customer list and customer workflows. | Generated nav only has `/cs`, not direct `/customers` or CRM/customer management links. | B — Business Capability Pack | Restore into Capability Pack | P0 |
| Services/catalog navigation | Old UI exposed service catalog management. | Generated nav does not expose `/services`. | C — Laundry Template | Restore into Laundry Template | P1 |
| Staff/employee navigation | Old UI exposed staff, attendance, schedules, requests, salaries. | Generated nav does not expose HR/staff routes. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Reports navigation | Old UI exposed reports and report builder. | Generated nav does not expose `/reports`. | B — Business Capability Pack | Restore into Capability Pack | P0 |
| Dashboards beyond management | Old UI had today center, operations dashboard, executive dashboard, manager dashboard. | Generated nav contains only management `/dashboard`. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Live map / field operations | Old UI exposed live map and driver workflow. | Generated nav exposes `/driver` but not `/live-map`. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Billing/subscription links | Old UI exposed billing/subscriptions. | Generated nav does not expose these links. | B — Business Capability Pack | Restore into Capability Pack | P2 |
| Legal/settings/help links | Old UI exposed legal, settings, help. | Generated nav does not expose them by default. | A — Core Platform | Restore into Core Platform | P2 |
| Station pages | Old implementation had hardcoded station route files for reception, sorting, cleaning, ironing, packing, QC, etc. | Routes still exist, but station definitions are not fully generated from template assets. | C — Laundry Template | Restore into Laundry Template | P0 |
| Station enums | Old workflow used enum/static station values. | New template has departments/workflow blueprint, but legacy station enum remains in code/database. | E — Technical Debt | Do Not Restore (legacy technical debt) | P1 |
| Dynamic station rendering | Generic `routes/$tenant/stations/$stage.tsx` exists, but many station routes are still specific. | Platform still depends on specific station components for complete experience. | A — Core Platform | Restore into Core Platform | P0 |
| Workflow stage bridge | Old workflow stages table has 8 rows for Dry Tech. | Core workflow blueprint exists but is not fully bridged to operational order/station execution. | B — Business Capability Pack | Restore into Capability Pack | P0 |
| Order → Work Order model | Old system is order-centric with service units and station statuses. | `work_orders` for Dry Tech is still 0; Platform Generator architecture expects Work Orders/Tasks. | A — Core Platform | Restore into Core Platform | P0 |
| Task model connection | Old tasks/assignments exist in legacy operational tables. | New task engine is not the main execution path for Dry Tech. | A — Core Platform | Restore into Core Platform | P0 |
| Laundry service catalog reproducibility | Dry Tech has 205 services. | Laundry Template has 10 service assets only; regenerated Dry Tech would not reproduce full catalog. | D — Dry Tech Business Data | Restore into Dry Tech Data | P0 |
| Curated Laundry Template catalog | Old Dry Tech catalog is rich but business-specific and possibly noisy. | Template has minimal 10 services. | C — Laundry Template | Restore into Laundry Template | P1 |
| Customer data | Existing customers preserved. | Present and intact. | D — Dry Tech Business Data | Restore into Dry Tech Data | No action now |
| Employee data | Existing employees preserved. | Present and intact. | D — Dry Tech Business Data | Restore into Dry Tech Data | No action now |
| Branch data | Existing branches preserved. | Present and intact. | D — Dry Tech Business Data | Restore into Dry Tech Data | No action now |
| Historical orders | Existing 530 orders preserved. | Present and intact. | D — Dry Tech Business Data | Restore into Dry Tech Data | No action now |
| Accounting history | Existing 612 journal entries preserved. | Present and intact. | D — Dry Tech Business Data | Restore into Dry Tech Data | No action now |
| Generic finance event model | Old accounting is mostly order/payment-specific. | Core financial event types exist, but bridge to historical accounting requires a generic mapping model. | A — Core Platform | Restore into Core Platform | P1 |
| Cash/accounting views | Existing data loads. | Functional by data check, but old order-specific accounting functions remain. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Report definitions | Baseline had 1 report definition; most reports are route/component logic. | Still 1 report definition; reporting is not template-driven enough. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Dashboard definitions | Old dashboards are coded components. | No template-driven dashboard definitions for Dry Tech. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Notification templates | Old customer messages exist and notification center exists. | Notification rules/templates are not fully represented as template assets. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Customer portal behavior | Old customer portal routes remain hardcoded around orders. | Functional route exists, but not generated from packs/templates. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Employee experience routing | Old code redirects employees based on stations/job roles. | Still relies on station/job_role logic. | E — Technical Debt | Do Not Restore (legacy technical debt) | P1 |
| Role model alignment | Old `user_roles` persisted and core_roles generated separately. | No complete mapping from core_roles to app roles and UI permissions. | A — Core Platform | Restore into Core Platform | P0 |
| Permission review | Existing user_roles preserved. | Generated nav required_roles are broad defaults. | A — Core Platform | Restore into Core Platform | P0 |
| 9-language support | i18n files exist with many translations. | Business Initialization/capability packs do not yet express multilingual pack behavior. | B — Business Capability Pack | Restore into Capability Pack | P2 |
| Dry Tech gold standard validation script | Validation was performed manually/transactionally. | No reusable script yet. | A — Core Platform | Restore into Core Platform | P0 |
| Backup/restore verification automation | Backup/restore was manually executed through SQL/API. | No reusable command exists. | A — Core Platform | Restore into Core Platform | P1 |
| Legacy tenant bootstrap | Old triggers still add default services on tenant update paths. | First dry run showed service count would increase from 205 to 247. | E — Technical Debt | Do Not Restore (legacy technical debt) | P0 |
| `complete_mjrh_core_setup()` side effects | Direct use may update tenant fields and trigger legacy bootstrap side effects. | Restoration avoided it for Dry Tech. | A — Core Platform | Restore into Core Platform | P0 |
| Demo/reference generation script | `generate-reference-dry-tech.mjs` can generate a reference org but not the full 205-service/530-order Dry Tech baseline. | Useful proof, not full gold standard reproduction. | D — Dry Tech Business Data | Restore into Dry Tech Data | P1 |
| Sample/demo data packs | Old demo data is real historical DB state. | Demo data import packs are not declarative. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Hardcoded Arabic/customer-facing text | Many labels and messages still live in components/routes. | Not consistently template/i18n driven. | B — Business Capability Pack | Restore into Capability Pack | P2 |
| Laundry-specific validation rules | `lib/legacy/laundry-validation-rules.ts` exists. | Should not return to Core; evaluate as Laundry Template or pack rules. | C — Laundry Template | Restore into Laundry Template | P1 |
| Laundry workflow v1 | `lib/legacy/laundry-workflow-v1.ts` exists. | Should not drive Core execution directly. | E — Technical Debt | Do Not Restore (legacy technical debt) | P1 |
| Ironing distribution rules | Old ironing-specific payroll/distribution exists. | Should be represented as compensation/work-distribution pack or Laundry Template config. | B — Business Capability Pack | Restore into Capability Pack | P1 |
| Drying/assembly station logic | Specific station added in old migrations/code. | Should become Laundry Template workflow/station config if still needed. | C — Laundry Template | Restore into Laundry Template | P1 |
| Public tracking/order status labels | Old tracking is order/status-specific. | Needs generic document/work status model with template labels. | B — Business Capability Pack | Restore into Capability Pack | P1 |

---

## 6. Regression Comparison by Area

## 6.1 Navigation

### Before

Navigation was broad and static, including dashboards, operations, station pages, orders, customers, finance, staff, reports, settings, help, and admin-style tools depending on roles.

### Current

Generated Core Navigation for Dry Tech contains 10 workspace links:

| Department | Route |
|---|---|
| Customer Service | `/cs` |
| Intake | `/stations/intake` |
| Sorting | `/stations/sorting` |
| Cleaning | `/stations/cleaning` |
| Finishing | `/stations/ironing` |
| Quality Control | `/stations/qc` |
| Packing | `/stations/packing` |
| Delivery | `/driver` |
| Finance Control | `/accounting` |
| Management | `/dashboard` |

### Regression

Many existing routes still exist but are not generated into navigation.

### Classification

A — Core Platform and B — Business Capability Pack.

### Recommended action

Create template/capability-driven navigation assets that can generate full role-aware navigation without hardcoded sidebars.

---

## 6.2 Permissions

### Before

Permissions were primarily based on `user_roles` and route-specific UI checks.

### Current

Existing `user_roles` are preserved. `core_roles` were generated but are not fully mapped to the runtime permission model.

### Regression

Core roles are not yet the single permission source of truth.

### Classification

A — Core Platform.

### Recommended action

Build a generic permission mapping layer from template/core roles to existing app role enforcement, then gradually retire hardcoded role assumptions.

---

## 6.3 Workflows

### Before

Operational flow was order/station/service-unit centric.

### Current

Core workflow blueprint exists, but Work Orders are still 0 and legacy station/order execution remains primary.

### Regression

New Core workflow model is not yet connected to Dry Tech execution.

### Classification

A — Core Platform / B — Workflow Capability Pack.

### Recommended action

Implement an Order → Work Order → Task bridge without breaking historical orders.

---

## 6.4 Departments and Stations

### Before

Stations existed as routes/enums/hardcoded screens.

### Current

Core departments exist, but station behavior still depends on route files and legacy station values.

### Regression

Departments are generated but not yet the source of all station/work-area behavior.

### Classification

C — Laundry Template for station definitions; A — Core for dynamic rendering.

### Recommended action

Move station definitions into Laundry Template assets and make station rendering generic.

---

## 6.5 Services

### Before

Dry Tech had a large operational service catalog.

### Current

Dry Tech still has 205 services, but Laundry Template has only 10 service assets.

### Regression

Dry Tech is restored, but not fully reproducible from template + data packs.

### Classification

D — Dry Tech Business Data and C — Laundry Template.

### Recommended action

Extract a curated service pack from Dry Tech, but do not blindly copy all 205 services into the Laundry Template.

---

## 6.6 Reports and Dashboards

### Before

Reports/dashboards were mostly implemented as route/component logic.

### Current

Report definitions are not rich enough to reproduce old report/dashboard behavior through the generator.

### Regression

Reporting is not yet configuration-first.

### Classification

B — Reporting Pack.

### Recommended action

Create report/dashboard definitions as pack assets and map existing report routes to generic reporting concepts.

---

## 6.7 Accounting

### Before

Accounting data and journal history existed and was order/payment driven.

### Current

Accounting history is preserved; generic Core financial event types exist, but old sync functions remain order-specific.

### Regression

Financial capability is not fully abstracted into generic transaction/event mapping.

### Classification

A — Core Platform and B — Accounting Pack.

### Recommended action

Create generic Financial Transaction mapping while preserving historical journal entries.

---

## 6.8 Notifications

### Before

Customer messages and notification center behavior existed around orders/tracking.

### Current

Customer messages are preserved, but notification rules/templates are not fully pack/template assets.

### Regression

Notification behavior is not yet reproducible through configuration.

### Classification

B — Notification Pack.

### Recommended action

Extract notification triggers/templates into capability pack assets.

---

## 6.9 Operational Flows

### Before

Operations were order/station/service-unit based.

### Current

The same legacy flow exists, but Platform Generator architecture expects Work Orders/Tasks.

### Regression

Platform Generator model is not yet the execution model.

### Classification

A — Core Platform.

### Recommended action

Implement compatibility bridge first; do not force migrate all historical records immediately.

---

## 6.10 Customer Experience

### Before

Customer portal and tracking existed with order-centric assumptions.

### Current

Routes still exist, but customer experience is not generated from capability packs.

### Regression

Customer experience remains hardcoded around legacy order model.

### Classification

B — CRM/Notification/Document Packs.

### Recommended action

Move customer portal behavior into reusable customer experience capability configuration.

---

## 6.11 Employee Experience

### Before

Employees were routed by station/job_role.

### Current

That logic still exists, while generated Core roles/departments are not the primary driver.

### Regression

Employee experience still depends on legacy station assumptions.

### Classification

E — Technical Debt for direct station redirects; A/B for generic assignment model.

### Recommended action

Replace with generic actor/task/work-area routing.

---

## 7. Hardcoded Audit

## 7.1 High-risk hardcoded areas

Static/hardcoded candidates found in:

- `components/app-sidebar.tsx`
- `routes/$tenant/stations/*.tsx`
- `routes/$tenant/orders/new.tsx`
- `routes/$tenant/orders/$id.tsx`
- `routes/customer-portal.tsx`
- `components/mobile-work-dock.tsx`
- `components/notification-center.tsx`
- `components/order-timeline.tsx`
- `components/station-board.tsx`
- `lib/station-workflow.ts`
- `lib/legacy/laundry-workflow-v1.ts`
- `lib/legacy/laundry-validation-rules.ts`
- `lib/rules/ironing-distribution.ts`
- `lib/rules/order-routing.ts`
- many older migrations with station/laundry-specific bootstrap behavior

## 7.2 Hardcoded station route files

Current station route files:

```txt
routes/$tenant/stations/cleaning.tsx
routes/$tenant/stations/cs.tsx
routes/$tenant/stations/delivery.tsx
routes/$tenant/stations/drying-assembly.tsx
routes/$tenant/stations/intake.tsx
routes/$tenant/stations/ironing.tsx
routes/$tenant/stations/packing.tsx
routes/$tenant/stations/qc.tsx
routes/$tenant/stations/reception.tsx
routes/$tenant/stations/sorting.tsx
routes/$tenant/stations/$stage.tsx
```

Recommended classification:

- station definitions → Laundry Template
- generic station renderer → Core Platform
- route duplication → Technical Debt to retire gradually

## 7.3 Legacy implementation files

```txt
lib/legacy/laundry-validation-rules.ts
lib/legacy/laundry-workflow-v1.ts
```

Recommended classification:

- business-valid rules that are still useful → Laundry Template or Capability Pack
- code structure / old workflow implementation → Technical Debt

## 7.4 Legacy bootstrap behavior

During Dry Tech restoration dry-run, direct use of `complete_mjrh_core_setup()` would have increased services from 205 to 247 because legacy tenant bootstrap behavior was triggered.

Classification:

E — Technical Debt.

Recommended action:

Do not restore. Replace with template-aware organization creation.

---

## 8. Final Report Summary

## Total Gaps Found

```txt
46
```

## By Classification

| Classification | Count |
|---|---:|
| A — Core Platform gaps | 12 |
| B — Business Capability Pack gaps | 18 |
| C — Laundry Template gaps | 6 |
| D — Dry Tech Business Data gaps | 5 |
| E — Technical Debt / Do Not Restore | 5 |

## Highest-Value Implementation Order

### 1. Core navigation generation model

Reason:

Dry Tech is accessible, but navigation is visibly simplified compared with the old operational experience.

Architectural value:

High. Every generated organization needs role-aware navigation.

### 2. Permission and role mapping model

Reason:

Generated `core_roles` and existing `user_roles` are not unified.

Architectural value:

High. Required for every industry.

### 3. Order → Work Order → Task compatibility bridge

Reason:

Dry Tech remains order/station-centric while Platform Generator architecture expects Work Orders and Tasks.

Architectural value:

Very high. Central to the universal operating model.

### 4. Template-driven workflow/station rendering

Reason:

Station route duplication is a major source of hardcoded Laundry assumptions.

Architectural value:

High. Enables any staged business.

### 5. Reporting Pack / Dashboard definitions

Reason:

Reports and dashboards are still mostly coded pages rather than generated definitions.

Architectural value:

High. Needed for First Success Dashboard and generated organizations.

### 6. Notification Pack extraction

Reason:

Customer messages exist but rules/templates are not configuration-first.

Architectural value:

Medium-high.

### 7. Accounting Pack / Financial Transaction mapping

Reason:

Historical accounting works, but old sync paths are order-specific.

Architectural value:

High, but should follow work-order/task bridge design.

### 8. Dry Tech data pack extraction

Reason:

Dry Tech is restored but not fully reproducible from template + data import.

Architectural value:

Medium. Important for long-term Gold Standard regeneration.

### 9. Retire legacy bootstrap

Reason:

It caused unexpected service mutation in dry-run.

Architectural value:

Very high, but should be handled carefully because older self-service flows may depend on it.

---

## 9. Critical Rule

Do not reconnect old hardcoded code to make Dry Tech “look old.”

The old implementation is a Reference Baseline, not source code.

Each missing behavior must return only in its correct architectural layer:

```txt
Core Platform
Business Capability Pack
Laundry Template
Dry Tech Business Data
```

Anything that is legacy technical debt must not return.

---

## 10. Recommendation

Do not implement fixes until this Gap Analysis is reviewed and approved.

The safest first implementation target is:

```txt
Core role-aware navigation generation from Capability Pack / Template navigation assets
```

This restores a visible part of the old experience without reintroducing hardcoded Laundry logic.

---

# Business Knowledge Recovery Addendum

**Purpose:** Convert the Dry Tech gap analysis from “missing screens/data” into a business knowledge recovery model.

This addendum follows the rule:

```txt
Do not restore hardcoded behavior.
Recover business knowledge into the correct Platform Generator layer.
```

## Recovery Classification Model

Every business knowledge gap must be classified into exactly one of the following categories:

| Category | Architectural destination |
|---|---|
| A | Business Operating Model |
| B | Business DNA |
| C | Capability Pack |
| D | Industry Template Asset |
| E | Generated Organization Data |
| F | Configuration |
| G | Initialization Metadata |
| H | Legacy Hardcoded Logic |

The answer “hardcode it again” is never acceptable.

---

## Required Historical Comparison Matrix

| Area | Present Before | Present Now | Missing | Root Cause | Correct Restoration |
|---|---|---|---|---|---|
| Departments | Dry Tech behavior depended on known operational areas and stations. | Core departments generated: 10. Existing legacy station routes still exist. | Department model is present, but not yet the complete source of UI and work behavior. | Department/station knowledge was split between hardcoded routes, enums, and sidebar logic. | Category D — Industry Template Asset. Laundry work areas should be generated as template assets; generic rendering belongs to Core. |
| Roles | `user_roles` controlled access; station/job role assumptions routed employees. | `user_roles` preserved and `core_roles` generated, but not unified. | Mapping between generated roles and runtime permissions is incomplete. | Old roles were operational and code-driven; new roles are generated but not yet authoritative. | Category C — Capability Pack. Permission/role mapping should be reusable across industries. |
| Navigation | Rich static sidebar exposed operations, orders, customers, staff, finance, reports, map, settings. | Generated navigation has 10 workspace links. | Many business areas are not generated into navigation. | Navigation lived in `components/app-sidebar.tsx`, not in generator assets. | Category C — Capability Pack. Navigation should be pack/template configuration consumed by Core. |
| Services | Dry Tech had 205 operational services. | Same 205 services preserved. Laundry Template has 10 service assets. | Reproducible service catalog is missing. | Services are Dry Tech data, not declarative template/data-pack assets. | Category E — Generated Organization Data for full Dry Tech catalog; Category D for curated Laundry defaults. |
| Categories | Services had practical business grouping/categories in data/code. | Service rows preserved; category reproducibility not guaranteed. | Category taxonomy is not yet a template/data-pack asset. | Categories emerged in business data and UI, not as generator output. | Category D — Industry Template Asset for common laundry categories; Category E for Dry Tech-specific catalog details. |
| Service Types | Cleaning/ironing/both style service types existed. | Existing enum/data preserved. | Service type semantics are not fully abstracted for other industries. | Service types are laundry-oriented but partly generic as “work type.” | Category C — Capability Pack. Generalize as service/work type attributes; Laundry Template supplies labels. |
| Workflow Stages | Dry Tech used legacy workflow stages and order statuses. | Legacy stages preserved; Core workflow blueprint generated. | Operational bridge between Core workflow and legacy execution is missing. | Dual workflow models coexist. | Category C — Capability Pack. Workflow Pack should map template stages to executable work orders/tasks. |
| Stations | Station-specific screens/routes existed. | Station routes still exist; generated departments point to some station routes. | Stations are not fully generated assets. | Station definitions were hardcoded routes and enums. | Category D — Industry Template Asset. Generic station/work-area renderer belongs to Core. |
| Operational Rules | Routing, station assignment, ironing distribution, QC and delivery rules existed in code. | Some code remains, but not expressed as packs/configuration. | Operational rules are disconnected from generator model. | Business rules were implemented as code rather than pack assets. | Category C — Capability Pack where reusable; Category D for laundry-specific rules; H for obsolete implementation shape. |
| Order Lifecycle | Orders moved through statuses and service units. | Historical orders preserved; Core Work Orders are not used for Dry Tech yet. | Order → Work Order → Task bridge is missing. | Old Dry Tech was order-centric; new model is work-order-centric. | Category C — Capability Pack plus Core execution support. |
| Customer Features | Customer list, portal, tracking, signup, messages existed. | Data and routes preserved; generated assets incomplete. | Customer journey is not generated from CRM/Notification/Document packs. | Customer behavior was route/component-driven. | Category C — CRM/Notification/Document Capability Packs. |
| Pickup Flow | Pickup requests and customer pickup statuses existed. | Pickup data preserved. Navigation/pack model incomplete. | Pickup flow is not generated by Field Service Pack. | Pickup was laundry/order-specific in code. | Category C — Field Service Capability Pack with Laundry Template labels. |
| Delivery Flow | Driver route, delivery status, collection existed. | Driver route generated; live map and full delivery workflow not generated. | Delivery behavior is partially connected only. | Field operations were spread across routes/components. | Category C — Field Service Pack. |
| Financial Events | Order/payment accounting sync and journal entries existed. | Journal history preserved; generic financial event types generated. | Generic mapping between operational events and financial events is incomplete. | Accounting was order-specific. | Category C — Accounting Pack, with Core financial transaction abstraction. |
| Accounting Configuration | Cash accounts, chart accounts, journals existed. | Preserved. | Initialization can preserve but not fully regenerate all accounting behavior. | Legacy bootstrap and accounting functions predate generator. | Category F — Configuration for accounts; Category C — Accounting Pack for behavior. |
| Reports | Reports existed mostly as coded routes/components. | Data exists; generated report assets are minimal. | Reports are not configuration-first. | Reporting was UI/component-driven. | Category C — Reporting Pack. |
| Dashboard Widgets | Dashboards existed as coded components. | Generated dashboard/widget definitions missing. | First dashboard/gold standard widgets are not generated assets. | Dashboard behavior was not modeled. | Category C — Reporting/Operations Pack; some belongs to Business Operating Model. |
| Permissions | Runtime permissions existed via `user_roles` and checks. | Preserved, plus generated `core_roles`. | Single permission source of truth missing. | Generated roles not wired to runtime checks. | Category C — Permission Capability Pack / Core permission execution. |
| Notifications | Customer messages/notification center existed. | Messages preserved; rules/templates incomplete. | Notification templates and triggers are not generator assets. | Notifications were tied to order/customer code. | Category C — Notification Pack. |
| Templates | Old Dry Tech did not come from a formal template. | Laundry Template exists but is incomplete. | Laundry Template does not reproduce full old behavior. | Old implementation was app-specific, not template-based. | Category D — Industry Template Asset. |
| Forms | Some operational forms/checklists were implicit or screen-driven. | Two core forms generated. | Complete form set missing. | Forms were not formal assets. | Category C — Document/Form Capability Pack; Laundry-specific forms in Template. |
| Documents | Receipts/delivery/payment documents existed in behavior. | Three core documents generated. | Document templates are shallow. | Documents were implicit in print/order code. | Category C — Document Management Pack. |
| Business Settings | App settings and business defaults existed. | Preserved but not fully represented in Business DNA output. | Business settings generation is incomplete. | Settings predate Business DNA model. | Category B — Business DNA and Category F — Configuration. |
| Pricing Rules | Prices preserved in services. | Pricing rules beyond service prices not formalized. | Discounts, urgent fees, delivery fees, commissions need rule model. | Pricing behavior spread across order/payment screens. | Category C — Accounting/Pricing Capability Pack. |
| Validation Rules | Laundry validation files and UI validations existed. | Some remain in legacy code. | Rules not moved to template/pack configuration. | Hardcoded validation logic. | Category D for laundry-specific validation; Category C for reusable validation framework. |
| Automation Rules | Auto financial sync, task movement, notifications existed in triggers/functions. | Some remain; not generator governed. | Automation registry/rule model missing. | Automation was embedded in triggers/functions. | Category C — Automation/Workflow/Accounting Packs. |
| Business Defaults | Defaults existed via seed functions/bootstrap. | Some defaults generated; legacy bootstrap remains risky. | Defaults are split between legacy bootstrap and new templates. | Old bootstrap was not template-aware. | Category H — Legacy Hardcoded Logic for old bootstrap; Category D/F for replacement defaults. |

---

## Root Cause Summary

| Root Cause | Impact |
|---|---|
| Static UI was used as business configuration | Navigation, dashboards, reports, and actions are not fully generated. |
| Laundry/station concepts were embedded in routes and enums | Station behavior is not portable to other industries. |
| Order-centric execution predated Work Orders and Tasks | New Core execution model is not yet connected to historical Dry Tech behavior. |
| Legacy bootstrap performed hidden mutations | Restoration dry run nearly changed service counts. |
| Reports/dashboards were components, not assets | Platform Generator cannot reproduce old insights yet. |
| Notifications were tied to order-specific events | Notification Pack needs extraction. |
| Roles existed in runtime checks, not generated permission model | `core_roles` and `user_roles` are parallel instead of unified. |

---

## Recovery Path Summary

| Recovery Path | Items |
|---|---|
| Generate from Capability Pack | Navigation, CRM, workflow execution, accounting, reporting, notifications, HR/staff, field service, document forms, approval rules. |
| Generate from Industry Template | Laundry stations, laundry stage labels, laundry service defaults, laundry-specific validation rules, document defaults. |
| Generate during Business Initialization | Business settings, owner confirmations, operating hours, branch structure, payment preferences. |
| Generate during Platform Generator | Core departments, roles, navigation, workflow blueprints, documents, forms, feature flags. |
| Store as Configuration | Pricing rules, approval thresholds, notification preferences, dashboard layout, report definitions. |
| Store as Business Knowledge | Operating model patterns, Business DNA questions, service/product/work distinctions. |
| Restore existing business data | Dry Tech 205 services, historical orders, customers, employees, accounting history. |
| Keep as historical data only | Old journal entries, old operation events, historical messages where not needed as future templates. |
| Retire as Obsolete | Legacy bootstrap side effects, direct station redirects, workflow v1 as execution path, static sidebar as source of truth. |

---

## Final Business Knowledge Recovery Rule

Success is not simply:

```txt
Dry Tech works.
```

Success is:

```txt
Every piece of business knowledge that existed before has either been preserved, correctly relocated into the new architecture, or intentionally retired with justification.
```

No implementation should begin before this analysis and the recovery roadmap are reviewed and approved.
