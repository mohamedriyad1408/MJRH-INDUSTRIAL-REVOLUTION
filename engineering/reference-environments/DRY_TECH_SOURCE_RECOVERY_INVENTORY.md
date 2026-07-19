# Dry Tech Source Recovery Inventory

**Status:** Documentation & analysis only — no implementation  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Identify the source of missing Dry Tech business behavior after Platform Generator transition  
**Rule:** Do not extract, refactor, migrate, or modify runtime code during this sprint.

---

## 1. Purpose

The Dry Tech Gap Analysis identified business behaviors and generated experience that became disconnected during the move from the legacy Laundry implementation to the new Platform Generator architecture.

This document answers a different question:

```txt
For each missing business capability, does the source still exist, where is it, can it be extracted, or must it be rebuilt?
```

This is not a data comparison.

This is a **Behavior Source Inventory**.

---

## 2. Classification Rules

## 2.1 Current Code Status

| Status | Meaning |
|---|---|
| Exists | Source code or database object still exists and can be inspected. |
| Partially Exists | Some code/data exists, but not enough to restore capability safely as-is. |
| Removed | No meaningful source remains in the current repository/database. |
| Unknown | Source is not identifiable from current repository/database without additional historical artifacts. |

## 2.2 Recovery Strategy

| Strategy | Meaning |
|---|---|
| Extract | Existing code/behavior can be lifted into the correct layer with minimal rewrite. |
| Generalize | Existing code exists but must be made industry-agnostic. |
| Rebuild | Existing source is insufficient or too coupled; rebuild from Business Knowledge documents. |
| Retire | Old behavior is technical debt and should not return. |

## 2.3 Architectural Destinations

Allowed destinations:

- Core Platform
- Business Operating Model
- Business DNA
- Capability Pack
- Industry Template
- Demo Data
- Dry Tech Configuration
- Obsolete

---

# 3. Source Recovery Inventory

| Feature Name | Previous Business Behavior | Current Status | Source Files | Source Components | Source Services | Source Queries | Source Helpers | Source Database Objects | Current Code Status | Recovery Strategy | Correct Architectural Destination | Complexity | Risks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Today's Operating Center | Daily workload, alerts, KPIs, team status, current orders. | Route exists but not generated into Dry Tech navigation. | `routes/$tenant/today.tsx`, `routes/$tenant/daily-operations.tsx` | `daily-digest.tsx`, `role-daily-brief.tsx`, `smart-alerts-feed.tsx`, `attendance-widget.tsx` | `lib/ai-advisor.ts`, `hooks/use-dashboard-stats.ts` | orders, tasks, attendance, notifications queries inside route/components | `lib/format.ts`, `lib/query-layer.ts` | `orders`, `employees`, `employee_attendance`, `app_notifications`, `operation_events` | Exists | Generalize | Capability Pack | Medium | If reused as-is it may preserve order/station assumptions instead of generic work status. |
| Owner Dashboard | Owner summary of operations, finance, activity, alerts. | Route exists; generated nav has management dashboard only. | `routes/$tenant/dashboard.tsx`, `routes/$tenant/executive.tsx`, `routes/$tenant/manager.tsx` | dashboard cards inside route files, `ai-advisor-widget.tsx` | `hooks/use-dashboard-stats.ts`, `lib/ai-advisor.ts` | tenant-scoped aggregate queries | `lib/format.ts` | `orders`, `journal_entries`, `customers`, `employees`, `operation_events` | Partially Exists | Generalize | Capability Pack | Medium | Existing widgets may be tied to Laundry order statuses. |
| Operations Dashboard | Operational load, stations, delays, branch status. | Routes exist; not generated from packs. | `routes/$tenant/ops.tsx`, `routes/$tenant/daily-operations.tsx`, `routes/$tenant/system-health.tsx` | `station-board.tsx`, `station-actor-widget.tsx`, `next-task-card.tsx`, `status-dot.tsx` | `lib/station-workflow.ts`, `lib/workflow-engine-v2.ts` | station/order/service unit queries | `lib/rules/workflow-engine-v1.ts` | `orders`, `service_units`, `workflow_stages`, `task_assignments` | Exists | Generalize | Capability Pack | High | High risk of reintroducing hardcoded station model. |
| Full Sidebar / Navigation | Rich role-aware navigation across operations, customers, finance, staff, reports, settings. | Current generated Core nav has only 10 Dry Tech items. | `components/app-sidebar.tsx` | `AppSidebar` | none isolated | nav arrays + dynamic stage queries | role visibility helper in component | `core_navigation_items`, `workflow_stages`, `workflow_definitions` | Exists | Generalize | Core Platform | Medium | Static sidebar cannot remain source of truth; must become generated navigation engine. |
| Order List | View all orders, filter/search, open historical orders. | Route exists; not in generated navigation. | `routes/$tenant/orders/index.tsx` | `unified-search.tsx`, `order-timeline.tsx` | `lib/export-utils.ts`, `lib/query-layer.ts` | orders/customers/order_items queries | `lib/format.ts` | `orders`, `order_items`, `customers`, `service_units` | Exists | Generalize | Capability Pack | Medium | Existing order model may delay Work Order transition. |
| New Order Flow | Create customer order, add services, calculate totals. | Route exists; not generated as action asset. | `routes/$tenant/orders/new.tsx` | `new-order-components.tsx`, `intake-invoice-editor.tsx`, `pos-category-tabs.tsx` | `lib/dry-tech-catalog.ts`, `lib/rules/payment.ts` | service_items/customers/orders/order_items inserts | pricing/calculation helpers in route/components | `orders`, `order_items`, `service_items`, `customers` | Exists | Generalize | Capability Pack | High | Must not remain Laundry-only order creation. |
| Order Detail / Edit | Open old order, timeline, edit status/items/payment fields. | Route exists; validation passed by transaction simulation. | `routes/$tenant/orders/$id.tsx` | `order-timeline.tsx`, `print-invoice.tsx`, `intake-invoice-editor.tsx` | `lib/export-utils.ts`, `lib/rules/payment.ts` | order detail queries | `lib/format.ts` | `orders`, `order_items`, `service_units`, `journal_entries` | Exists | Generalize | Capability Pack | High | Direct edits can affect historical accounting if not guarded. |
| Receipt / Invoice Printing | Generate printable customer invoice/receipt. | Component exists; generated documents are shallow. | `components/print-invoice.tsx`, `routes/$tenant/orders/$id.tsx` | `PrintInvoice` | browser print/PDF helpers | order/customer/item queries | `lib/format.ts` | `orders`, `order_items`, `customers`, `core_documents` | Exists | Generalize | Capability Pack | Medium | Must become Document Pack templates, not hardcoded print layout. |
| Payment Recording | Mark orders paid, proof upload, sync accounting. | Logic exists; accounting is order-specific. | `routes/$tenant/orders/$id.tsx`, `routes/customer-portal.tsx` | payment proof UI, invoice editor components | `lib/rules/payment.ts`, Supabase RPCs | orders/payment fields/journals | `sync_order_financials` database function | `orders`, `journal_entries`, `cash_transactions`, `customer_financial_ledger` | Exists | Generalize | Capability Pack | High | Risk of breaking 612 historical journals. |
| Customer List / Search | Search old customers and open profiles. | Routes/components exist; not fully generated in navigation. | `routes/$tenant/customers.tsx`, `routes/$tenant/search.tsx` | `unified-search.tsx` | `lib/query-layer.ts` | customers/orders search queries | `lib/format.ts` | `customers`, `orders` | Exists | Extract | Capability Pack | Low | Low risk; ensure generic CRM terms. |
| CRM / Customer Care | Loyalty, follow-ups, customer care. | Routes exist; pack not modeled. | `routes/$tenant/crm.tsx`, `routes/$tenant/customer-care.tsx` | customer care UI in route | `lib/ai-advisor.ts` | customers/messages/orders queries | formatting helpers | `customers`, `customer_messages`, `customer_loyalty` | Partially Exists | Generalize | Capability Pack | Medium | CRM behavior should not assume Laundry order lifecycle. |
| Customer Portal | Customer order/tracking/payment portal. | Routes exist and `/customer-portal?tenant=dry-tech` works. | `routes/customer-portal.tsx`, `routes/join.$slug.tsx`, `routes/track.$token.tsx` | portal UI inside routes | public RPCs in migrations | customer/order public queries | `lib/rules/whatsapp.ts` | `customers`, `orders`, `customer_messages` | Exists | Generalize | Capability Pack | High | Customer portal is order-specific; must become generic customer experience pack. |
| Pickup Flow | Customer pickup request and conversion to order. | Data preserved; route exists in app. | `routes/$tenant/pickups/index.tsx`, `routes/$tenant/pickups/new.tsx`, `routes/customer-portal.tsx` | pickup UI in routes | `lib/geo.ts`, `lib/route-optimizer.ts` | pickup_requests/orders/customers | geo helpers | `pickup_requests`, `orders`, `customers` | Exists | Generalize | Capability Pack | Medium | Should become Field Service Pack, not Laundry-only pickup. |
| Delivery / Courier Flow | Courier tasks, delivery status, collection. | `/driver` generated; driver logic exists. | `routes/$tenant/driver.tsx`, `components/driver-components.tsx`, `routes/$tenant/live-map.tsx` | driver components, map UI | `lib/driver-assignment.ts`, `lib/route-optimizer.ts`, `lib/geo.ts` | driver locations/orders/pickups | route and geo helpers | `driver_location_log`, `orders`, `pickup_requests`, `employees` | Exists | Generalize | Capability Pack | Medium | Field service must support non-laundry visits. |
| Live Map | Owner/ops map of team and route tasks. | Route exists; not generated into nav. | `routes/$tenant/live-map.tsx` | map UI in route | `lib/geo.ts`, `lib/route-optimizer.ts` | driver/task location queries | geospatial helpers | `driver_location_log`, `employees`, `pickup_requests`, `orders` | Exists | Generalize | Capability Pack | Medium | External map dependencies and location privacy. |
| Station Board | Work by station: reception, sorting, cleaning, ironing, packing, QC. | Station route files exist; generated departments point to some routes. | `routes/$tenant/stations/*.tsx`, `routes/$tenant/stations/$stage.tsx` | `station-board.tsx`, `station-page.tsx`, `station-timer.tsx` | `lib/station-workflow.ts`, `lib/workflow-engine-v2.ts` | orders/service_units/workflow_stages | station helpers | `service_units`, `workflow_stages`, `task_assignments` | Exists | Generalize | Core Platform | High | One-file-per-station should not become V3 architecture. |
| Laundry Workflow V1 | Laundry-specific workflow order/station logic. | Legacy file exists. | `lib/legacy/laundry-workflow-v1.ts` | none | legacy workflow module | none direct | workflow constants/helpers | legacy code only | Exists | Retire | Obsolete | Low | Should not return as runtime source. |
| Laundry Validation Rules | Laundry-specific operational validation. | Legacy file exists. | `lib/legacy/laundry-validation-rules.ts` | none | validation module | none direct | validation functions | none direct | Exists | Generalize | Industry Template | Medium | Reusing as-is would hardcode Laundry in runtime. |
| Ironing Distribution | Assign/pay ironing work fairly. | Rule file and payroll route exist. | `lib/rules/ironing-distribution.ts`, `routes/$tenant/staff/ironing-payroll.tsx` | ironing payroll UI | ironing distribution logic | ironing rates/payouts queries | compensation helpers | `ironing_rates`, `ironing_daily_payouts`, `service_units` | Exists | Generalize | Capability Pack | Medium | Specialized but could become work-distribution/compensation pack. |
| QC / Issues | Quality control checks, exceptions, issue pages. | QC route/issues route exist. | `routes/$tenant/stations/qc.tsx`, `routes/$tenant/issues.tsx` | QC/issue UI | `lib/ai-advisor.ts` | qc_checks/customer_returns/orders | validation helpers | `qc_checks`, `customer_returns`, `service_units` | Exists | Generalize | Capability Pack | Medium | QC should support all staged work, not only garments. |
| Customer Returns | Returns after delivery. | Rules and migrations exist. | `lib/rules/customer-return.ts`, relevant migrations | route/UI references | return rule module | orders/customer_returns | rule helpers | `customer_returns` | Exists | Generalize | Capability Pack | Medium | Return logic should be generic service/product issue handling. |
| Staff / HR | Employees, attendance, schedules, requests, salaries. | Routes exist; nav not generated. | `routes/$tenant/staff/*` | attendance widget, staff forms | `lib/staff-roles.ts` | employees/attendance/payroll queries | staff role helpers | `employees`, `employee_attendance`, `payroll_periods`, `payroll_lines` | Exists | Generalize | Capability Pack | Medium | HR pack must not assume station roles only. |
| Accounting Suite | Accounting, ledger, receivables, cash closing, budgets. | Routes/data exist; nav incomplete. | `routes/$tenant/accounting.tsx`, `ledger.tsx`, `receivables.tsx`, `cash-closing.tsx`, `budgets.tsx` | finance UI in routes | `lib/rules/payment.ts`, `lib/format.ts` | journal/cash/customer ledger views | money formatting | `journal_entries`, `cash_accounts`, `cash_transactions`, `v_profit_loss`, `v_trial_balance` | Exists | Generalize | Capability Pack | High | Must preserve historical accounting. |
| Reports | Operational/financial reports. | Routes exist; generated definitions minimal. | `routes/$tenant/reports.tsx`, `routes/$tenant/reports/builder.tsx` | report builder UI | `lib/export-utils.ts` | report views and aggregates | export helpers | `report_definitions`, reporting views | Exists | Generalize | Capability Pack | Medium | Reporting definitions must become assets. |
| Report Builder | Build/export reports. | Route exists. | `routes/$tenant/reports/builder.tsx` | builder UI | export utils | report_definitions queries | export helpers | `report_definitions` | Exists | Extract | Capability Pack | Medium | Need permission and template governance. |
| Notifications Center | Owner/staff alerts, customer messages. | Component exists; templates incomplete. | `components/notification-center.tsx`, `components/smart-alerts-feed.tsx`, `components/daily-digest.tsx` | notification components | `lib/rules/whatsapp.ts`, `lib/ai-advisor.ts` | notifications/messages queries | message helpers | `app_notifications`, `customer_messages` | Exists | Generalize | Capability Pack | Medium | Must separate notification delivery from industry triggers. |
| WhatsApp Messaging | Prepared WhatsApp/customer messages. | Helper exists. | `lib/rules/whatsapp.ts`, `supabase/functions/whatsapp-send/index.ts` | message UI references | edge function | customer_messages | whatsapp helper | `customer_messages` | Exists | Generalize | Capability Pack | Medium | Integration/security handling required. |
| Business Settings | Business name, currency, branding, settings. | App settings preserved; Business DNA mapping incomplete. | `routes/$tenant/settings.tsx`, `routes/$tenant/settings/index.tsx` | settings forms | `hooks/use-currency.tsx` | app_settings/tenant queries | format/currency helpers | `app_settings`, `tenants` | Exists | Generalize | Business DNA | Medium | Avoid exposing technical config. |
| Services Catalog | Manage 205 Dry Tech services. | Route exists; template has only 10 services. | `routes/$tenant/services.tsx`, `lib/dry-tech-catalog.ts` | service/category UI | catalog helper | service_items/service_categories | dry-tech catalog constants | `service_items`, `service_categories` | Exists | Generalize | Dry Tech Configuration | Medium | Do not blindly convert all Dry Tech services to global Laundry Template. |
| Branch Management | Manage branches and branch comparison. | Routes exist; nav incomplete. | `routes/$tenant/branches.tsx`, `routes/$tenant/branches/$id.tsx` | `branch-filter.tsx`, `branch-compare-dashboard.tsx` | branch query hooks | branches/orders aggregations | formatting helpers | `branches`, branch-scoped records | Exists | Generalize | Core Platform | Medium | Branch is Core but dashboards may be business-specific. |
| Search | Unified search across data. | Component exists; route exists. | `routes/$tenant/search.tsx`, `components/unified-search.tsx` | UnifiedSearch | query layer | search queries | query helpers | customers/orders/services | Exists | Extract | Core Platform | Low | Needs generic entity registration over time. |
| Mobile Work Dock | Mobile quick actions/station tasks. | Component exists. | `components/mobile-work-dock.tsx` | MobileWorkDock | auth/employee station logic | employee/station queries | station helpers | employees/service_units/tasks | Exists | Generalize | Core Platform | Medium | Current station redirects can reintroduce legacy assumptions. |
| Print Labels / QR | Unit labels and QR codes. | Components/libs exist. | `components/print-invoice.tsx`, `lib/export-utils.ts`, QR dependencies | print components | QR/PDF libraries | service_units/order queries | label generation helpers | `service_units`, `order_items` | Partially Exists | Generalize | Capability Pack | Medium | Product/service labels should be generic Document Pack. |
| APDO / System Health | Operational readiness/health checks. | Route exists. | `routes/$tenant/system-health.tsx`, `components/system-health-components.tsx` | health components | health queries/functions | health views/RPCs | rules/helpers | `tenant_bootstrap_health`, operation/audit tables | Exists | Generalize | Core Platform | Medium | Must not assume Laundry readiness only. |
| Demo / Seed Scripts | Generate demo/reference data. | Scripts exist. | `scripts/seed-demo-tenant.mjs`, `scripts/generate-reference-dry-tech.mjs`, `scripts/seed-demo-data.mjs` | none | Supabase API scripts | SQL blocks | script helpers | many tenant tables | Exists | Generalize | Demo Data | Medium | Scripts can bypass Platform Generator if not governed. |
| Legacy Bootstrap | Auto-seed defaults on tenant insert/update. | Still exists in migrations/functions; caused side-effect risk. | multiple `seed_tenant_defaults` migrations | none | DB triggers/functions | tenant insert/update triggers | SQL functions | tenant bootstrap functions/triggers | Exists | Retire | Obsolete | High | Must not continue hidden mutations. |
| Self-Service Generator | Create tenant shell and owner employee. | Exists; recently stabilized. | `self_service_create_tenant` migrations, `routes/signup.tsx` | signup UI | Supabase RPC | tenant/role/employee inserts | RPC | tenants, user_roles, employees | Exists | Generalize | Core Platform | Medium | Must avoid legacy bootstrap side effects. |

---

# Business Knowledge Extraction Candidates

This appendix classifies source files that still contain business knowledge inside code.

| File / Area | Classification | Reason | Suggested Handling |
|---|---|---|---|
| `components/app-sidebar.tsx` | Mixed | Contains UI plus business navigation/role assumptions. | Extract navigation definitions into Core/Pack assets; keep rendering technical. |
| `routes/$tenant/stations/*.tsx` | Business Knowledge | Encodes station behavior and Laundry workflow. | Extract station behavior into Industry Template + generic renderer. |
| `routes/$tenant/stations/$stage.tsx` | Mixed | Generic route but still tied to stage assumptions. | Generalize as Core work-area renderer. |
| `routes/$tenant/orders/new.tsx` | Business Knowledge | Encodes order intake and service selection behavior. | Extract into Order/Workflow Capability Pack. |
| `routes/$tenant/orders/$id.tsx` | Business Knowledge | Encodes historical order lifecycle, invoice/payment behavior. | Generalize into Order/Document/Accounting Packs. |
| `routes/$tenant/orders/index.tsx` | Mixed | List UI plus order business filters/statuses. | Extract filters/status semantics into Capability Pack. |
| `routes/customer-portal.tsx` | Business Knowledge | Encodes customer journey and payment behavior. | Generalize into CRM/Customer Experience Pack. |
| `routes/track.$token.tsx` | Business Knowledge | Public order tracking behavior. | Generalize into Notification/Customer Experience Pack. |
| `routes/join.$slug.tsx` | Mixed | Customer signup for tenant. | Generalize as customer onboarding capability. |
| `routes/$tenant/driver.tsx` | Business Knowledge | Driver/courier workflow. | Extract into Field Service Pack. |
| `routes/$tenant/live-map.tsx` | Business Knowledge | Location/dispatch behavior. | Extract into Field Service Pack. |
| `routes/$tenant/accounting.tsx` | Business Knowledge | Accounting UI and operational finance assumptions. | Extract into Accounting Pack. |
| `routes/$tenant/ledger.tsx` | Business Knowledge | Ledger behavior. | Accounting Pack. |
| `routes/$tenant/receivables.tsx` | Business Knowledge | Receivables behavior. | Accounting/CRM Pack. |
| `routes/$tenant/cash-closing.tsx` | Business Knowledge | Cash closing business behavior. | Accounting Pack. |
| `routes/$tenant/reports.tsx` | Business Knowledge | Report definitions in UI. | Reporting Pack. |
| `routes/$tenant/reports/builder.tsx` | Mixed | Report builder UI and business report model. | Reporting Pack with generic builder. |
| `routes/$tenant/staff/*` | Business Knowledge | HR/attendance/salary behavior. | HR Capability Pack. |
| `components/station-board.tsx` | Business Knowledge | Station queue behavior. | Generic work-area renderer + Workflow Pack. |
| `components/station-page.tsx` | Business Knowledge | Station screen composition. | Generalize. |
| `components/station-actor-widget.tsx` | Business Knowledge | Actor/station assignment. | Actor/Task Capability Pack. |
| `components/mobile-work-dock.tsx` | Mixed | Mobile UI plus station routing. | Core mobile shell + configurable actions. |
| `components/notification-center.tsx` | Mixed | Notification UI plus business event assumptions. | Notification Pack. |
| `components/order-timeline.tsx` | Business Knowledge | Order lifecycle visualization. | Generic timeline for Order/Work Order. |
| `components/print-invoice.tsx` | Business Knowledge | Document/invoice layout. | Document Pack. |
| `components/new-order-components.tsx` | Business Knowledge | Order intake behavior. | Order/Service Pack. |
| `components/intake-invoice-editor.tsx` | Business Knowledge | Invoice/order intake behavior. | Document/Order Pack. |
| `components/driver-components.tsx` | Business Knowledge | Driver workflow. | Field Service Pack. |
| `components/system-health-components.tsx` | Mixed | Health UI plus operational readiness checks. | Core health model + pack-specific checks. |
| `lib/legacy/laundry-workflow-v1.ts` | Legacy Only | Old Laundry workflow runtime. | Retire as runtime dependency; use for reference only. |
| `lib/legacy/laundry-validation-rules.ts` | Business Knowledge | Laundry rules. | Extract useful rules into Laundry Template assets. |
| `lib/station-workflow.ts` | Business Knowledge | Station workflow logic. | Generalize into Workflow Pack. |
| `lib/workflow-engine-v2.ts` | Mixed | More generic workflow logic but may include industry assumptions. | Review for Core extraction. |
| `lib/rules/workflow-engine-v1.ts` | Legacy Only | Old workflow rules. | Retire after bridge. |
| `lib/rules/ironing-distribution.ts` | Business Knowledge | Specialized work distribution/pay rule. | Generalize to compensation/distribution pack or Laundry Template. |
| `lib/rules/order-routing.ts` | Business Knowledge | Routing order logic. | Generalize through Work Order/Task bridge. |
| `lib/rules/payment.ts` | Business Knowledge | Payment rules. | Accounting Pack. |
| `lib/rules/whatsapp.ts` | Business Knowledge | Customer messaging rules. | Notification Pack. |
| `lib/dry-tech-catalog.ts` | Business Knowledge | Dry Tech/Laundry catalog knowledge. | Dry Tech Configuration + curated Template extraction. |
| `lib/staff-roles.ts` | Business Knowledge | Role mapping. | Permission/HR Pack. |
| `lib/format.ts` | Pure Technical Code | Formatting/currency helpers. | Keep technical utility. |
| `lib/query-layer.ts` | Pure Technical Code | Query abstraction. | Keep technical utility. |
| `lib/geo.ts` | Mixed | Technical geo helpers used for field operations. | Keep helpers; field behavior to Field Service Pack. |
| `lib/route-optimizer.ts` | Mixed | Route logic with field service use. | Field Service Pack + technical helper separation. |
| `scripts/seed-demo-tenant.mjs` | Business Knowledge | Demo data and operational assumptions. | Convert to Demo Data Import assets. |
| `scripts/generate-reference-dry-tech.mjs` | Business Knowledge | Reference generation assumptions. | Convert to governed Gold Standard generator/data import. |
| Legacy `seed_tenant_defaults` migrations | Legacy Only | Hidden default mutation. | Retire/replace with template-aware generation. |

---

# Recovery Decision Matrix

| Feature | Source Exists | Can Extract | Needs Rebuild | Target Layer | Priority |
|---|---|---:|---:|---|---|
| Role-aware navigation | Yes | Yes | Partial | Core Platform | P0 |
| Navigation asset model | Partial | Partial | Yes | Core Platform | P0 |
| Order list/new/detail flow | Yes | Yes | Partial | Capability Pack | P0 |
| Customer/CRM flow | Yes | Yes | Partial | Capability Pack | P0 |
| Reports menu/definitions | Yes | Partial | Yes | Capability Pack | P0 |
| Permission role mapping | Yes | Partial | Yes | Core Platform | P0 |
| Work Order bridge | Partial | No | Yes | Core Platform | P0 |
| Generic station renderer | Partial | Partial | Yes | Core Platform | P0 |
| Laundry station definitions | Yes | Yes | Partial | Industry Template | P0 |
| Dry Tech service catalog data pack | Yes | Yes | No | Dry Tech Configuration | P1 |
| Curated Laundry service defaults | Yes | Partial | Partial | Industry Template | P1 |
| Accounting behavior | Yes | Partial | Partial | Capability Pack | P1 |
| Financial transaction abstraction | Partial | No | Yes | Core Platform | P1 |
| Notification templates | Yes | Partial | Partial | Capability Pack | P1 |
| Customer portal generalized behavior | Yes | Partial | Yes | Capability Pack | P1 |
| Field service / delivery | Yes | Yes | Partial | Capability Pack | P1 |
| Pickup flow | Yes | Yes | Partial | Capability Pack | P1 |
| HR/staff operations | Yes | Yes | Partial | Capability Pack | P1 |
| Document templates | Yes | Partial | Partial | Capability Pack | P1 |
| Form/checklist model | Partial | Partial | Yes | Capability Pack | P2 |
| First Success Dashboard | No | No | Yes | Core Platform | P1 |
| Legacy bootstrap | Yes | No | No | Obsolete | P0 |
| Workflow v1 runtime | Yes | No | No | Obsolete | P1 |
| Direct station redirects | Yes | No | Partial | Obsolete | P1 |
| Static sidebar source of truth | Yes | No | Partial | Obsolete | P0 |

---

# Quick Wins

These items appear recoverable mainly through extraction/generalization, without full rewrite.

| Quick Win | Source | Target |
|---|---|---|
| Customer search/list behavior | `routes/$tenant/customers.tsx`, `components/unified-search.tsx` | CRM Capability Pack |
| Report builder shell | `routes/$tenant/reports/builder.tsx` | Reporting Pack |
| Existing report routes as navigation assets | `routes/$tenant/reports.tsx` | Reporting Pack |
| Field delivery route as pack action | `routes/$tenant/driver.tsx` | Field Service Pack |
| Live map as field service asset | `routes/$tenant/live-map.tsx` | Field Service Pack |
| Service catalog export for Dry Tech | `service_items`, `routes/$tenant/services.tsx`, `lib/dry-tech-catalog.ts` | Dry Tech Configuration |
| Invoice print layout as document template reference | `components/print-invoice.tsx` | Document Pack |
| Notification center rendering | `components/notification-center.tsx` | Notification Pack UI renderer |
| Unified search shell | `components/unified-search.tsx` | Core Platform entity search |
| Branch list/management UI | `routes/$tenant/branches.tsx` | Core Branch Engine |

---

# Rebuild Required

These items do not have a safe source that can be extracted directly.

| Rebuild Item | Reason | Target |
|---|---|---|
| Order → Work Order → Task bridge | Old model is order/station/service-unit centric; new model needs universal execution abstraction. | Core Platform |
| Capability Pack registry for navigation/actions | Old sidebar is static UI, not a pack registry. | Core Platform / Capability Pack |
| Permission unification | Runtime roles and generated roles are parallel models. | Core Platform |
| Generic station/work-area renderer | Existing station pages are duplicated and Laundry-shaped. | Core Platform |
| First Success Dashboard | New product requirement; no old equivalent. | Core Platform |
| Generic Financial Transaction mapping | Existing accounting is order-specific. | Core Platform / Accounting Pack |
| Template-driven dashboard widgets | Old dashboards are coded components. | Reporting Pack |
| Automation rules registry | Existing automations live in triggers/functions. | Capability Pack |
| Safe replacement for legacy bootstrap | Old bootstrap is technical debt. | Core Platform |

---

# Architecture Risk Assessment

## What can be extracted safely?

- customer search/list UI patterns
- report builder shell
- driver/live map UI patterns after generalization
- notification rendering shell
- invoice layout concepts after converting to Document Pack template
- Dry Tech service catalog as Dry Tech Configuration/data pack
- branch management concepts
- unified search technical shell

## What would reintroduce hardcoded logic if reused as-is?

- static sidebar arrays as source of truth
- station route files as long-term model
- `lib/legacy/laundry-workflow-v1.ts`
- station/job_role redirect logic
- order-only financial sync as universal architecture
- legacy tenant bootstrap
- hardcoded Laundry validation rules as runtime Core code
- one-off seed/demo scripts bypassing Platform Generator

## What should become Capability Packs?

- Workflow Management
- CRM / Customer Experience
- Reporting
- Accounting
- Notification
- Field Service
- HR / Staff Operations
- Document Management
- Approval / Validation Rules
- Quality Control

## What should become Industry Template Assets?

- Laundry station labels and order
- Laundry workflow defaults
- Laundry document defaults
- Laundry-specific service defaults
- Laundry-specific validation rules
- Laundry-specific quality checklist labels

## What should become Core Platform?

- role-aware navigation engine
- permission mapping/execution
- generic work-area renderer
- Work Order / Task execution bridge
- generic financial transaction abstraction
- entity search registry
- backup/restore and validation tooling
- Platform Generator asset application engine

## What should be eliminated permanently?

- legacy bootstrap hidden mutations
- `if laundry` / `switch industry` style Core behavior
- static sidebar as source of truth
- duplicated station route architecture over time
- workflow v1 runtime path
- direct station redirects as primary employee routing
- demo orgs as development environments

---

# Recovery Percentages

Based on the current inventory of 25 primary capabilities in the Recovery Decision Matrix:

| Category | Count | Percentage |
|---|---:|---:|
| Extractable / Generalizable | 13 | 52% |
| Rebuild Required | 9 | 36% |
| Obsolete / Retire | 3 | 12% |

Interpretation:

- A majority of the business behavior source still exists and can inform recovery.
- The most important architectural pieces still require rebuilding, especially Work Orders/Tasks, permission unification, and generated navigation assets.
- A small but dangerous group must be retired, not restored.

---

# Final Conclusion

The source of Dry Tech business knowledge is still largely present, but much of it is embedded in UI routes, components, helper files, old migrations, and legacy station/order logic.

The next implementation must not copy that logic back.

It must extract the business knowledge and relocate it into:

```txt
Core Platform
Business Operating Model
Business DNA
Capability Packs
Industry Template Assets
Generated Organization Data
Configuration
```

Only then should Dry Tech regain its full historical business behavior without compromising the Platform Generator architecture.
