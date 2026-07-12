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
