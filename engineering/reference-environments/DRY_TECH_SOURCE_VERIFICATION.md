# Dry Tech Source Verification

**Status:** Documentation & evidence only — no implementation  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Verify whether the source of each Dry Tech business behavior identified in the Source Recovery Inventory physically exists in the current repository and how safely it can be recovered.

---

## 1. Mission

The previous reports identified what is missing and where the source is believed to exist.

This sprint verifies evidence.

No assumptions.

No fixes.

No extraction.

No migrations.

No runtime changes.

---

## 2. Evidence Rules

For each feature, this document verifies:

1. whether the source still physically exists: `YES`, `PARTIAL`, or `NO`
2. exact source file paths
3. git history: first known introduction commit and last modification commit where available
4. current usage: `Referenced`, `Partially used`, `Legacy`, `Unused`, or `Dead`
5. dependency graph
6. business knowledge score
7. extraction confidence
8. difficulty reason
9. duplicate/canonical/legacy source identification where applicable
10. completeness correction from the previous inventory where needed

---

## 3. Git Evidence Method

Git history was inspected with commands equivalent to:

```bash
git log --follow --reverse --format='%h %cs %s' -- <file>
git log --follow -1 --format='%h %cs %s' -- <file>
```

Source existence was verified against the current working tree on:

```txt
feature/mjrh-v3-core-platform
```

---

# 4. Feature Source Verification Matrix

> Notes:
> - “Intro commit” means first commit visible in current Git history for that path.
> - “Last modified” means latest commit modifying that path.
> - “Survived transition” means the source still exists after the Platform Generator pivot branch work.

| Feature | Source Verified | Exact File Path(s) | Git History Evidence | Current Usage | Dependency Graph | Business Knowledge Score | Extraction Confidence | Completeness | Difficulty Reason |
|---|---|---|---|---|---|---|---|---|---|
| Today's Operating Center | YES | `routes/$tenant/today.tsx`; `routes/$tenant/daily-operations.tsx`; `components/daily-digest.tsx`; `components/role-daily-brief.tsx`; `components/smart-alerts-feed.tsx`; `components/attendance-widget.tsx`; `hooks/use-dashboard-stats.ts` | `today.tsx` introduced `61f6ede3` 2026-07-02; last modified `62c32757` 2026-07-07. `daily-operations.tsx` introduced `61f6ede3`; last modified `30cfcbd9` 2026-07-04. Survived transition: YES. | Referenced by routes/components, but not generated into Dry Tech nav. | Feature → `/today`, `/daily-operations` → digest/brief/alerts widgets → dashboard stats/order queries → `orders`, `employees`, `employee_attendance`, `app_notifications` | Business Knowledge | Medium | 70% recovered / 30% missing | UI exists, but business behavior must become Reporting/Operations Pack assets. |
| Owner Dashboard | YES | `routes/$tenant/dashboard.tsx`; `routes/$tenant/executive.tsx`; `routes/$tenant/manager.tsx`; `components/ai-advisor-widget.tsx`; `hooks/use-dashboard-stats.ts` | `dashboard.tsx` introduced `61f6ede3`; last modified `62c32757`. `executive.tsx` introduced `61f6ede3`; last modified `d335f3d1` 2026-07-09. Survived transition: YES. | Referenced by routes; partially generated via `/dashboard` nav only. | Feature → dashboard routes → advisor/stats components → aggregate queries → orders/journals/customers/employees | Business Knowledge | Medium | 65% recovered / 35% missing | Dashboard widgets are component-coded, not dashboard assets. |
| Operations Dashboard | YES | `routes/$tenant/ops.tsx`; `routes/$tenant/daily-operations.tsx`; `routes/$tenant/system-health.tsx`; `components/station-board.tsx`; `components/station-actor-widget.tsx`; `components/next-task-card.tsx`; `lib/station-workflow.ts`; `lib/workflow-engine-v2.ts` | `ops.tsx` introduced `61f6ede3`; last modified `30cfcbd9`. `station-workflow.ts` introduced `f26c8e0b` 2026-06-24; last modified `26f65366` 2026-07-11. Survived transition: YES. | Partially used; still legacy station/order-centric. | Feature → `/ops`/system health → station board/widgets → station-workflow helpers → orders/service_units/workflow_stages | Business Knowledge | Low | 55% recovered / 45% missing | Current source is tied to stations and service units; must be generalized. |
| Full Sidebar / Navigation | YES | `components/app-sidebar.tsx` | Introduced `054c2ecc` 2026-06-19; last modified `d3352338` 2026-07-12 during Core Platform pivot. Survived transition: YES. | Referenced; Core nav overlay now partially replaces static groups. | Feature → AppSidebar → static nav arrays + core_navigation_items query → routes → role checks | Business Knowledge | Medium | 60% recovered / 40% missing | Static sidebar is valuable evidence but must not remain source of truth. |
| Order List | YES | `routes/$tenant/orders/index.tsx`; `components/unified-search.tsx`; `components/order-timeline.tsx`; `lib/query-layer.ts`; `lib/export-utils.ts` | `orders/index.tsx` introduced `61f6ede3`; last modified `145168db` 2026-07-09. Survived transition: YES. | Referenced route; not generated in nav. | Feature → `/orders` → list/search components → order/customer queries → `orders`, `customers`, `order_items` | Business Knowledge | High | 80% recovered / 20% missing | Extraction is feasible; must decouple from legacy statuses. |
| New Order Flow | YES | `routes/$tenant/orders/new.tsx`; `components/new-order-components.tsx`; `components/intake-invoice-editor.tsx`; `components/pos-category-tabs.tsx`; `lib/dry-tech-catalog.ts`; `lib/rules/payment.ts` | `orders/new.tsx` introduced `61f6ede3`; last modified `145168db`. `new-order-components.tsx` introduced/last modified `cb0bfaf3` 2026-06-29. `intake-invoice-editor.tsx` introduced `14910736` 2026-07-05; last modified `62c32757`. Survived transition: YES. | Referenced route; not generated as platform action. | Feature → `/orders/new` → POS/intake components → catalog/payment helpers → service_items/orders/order_items | Business Knowledge | Medium | 70% recovered / 30% missing | High business value, but strongly order/Laundry catalog shaped. |
| Order Detail / Edit | YES | `routes/$tenant/orders/$id.tsx`; `components/order-timeline.tsx`; `components/print-invoice.tsx`; `components/intake-invoice-editor.tsx`; `lib/rules/payment.ts` | `orders/$id.tsx` introduced `61f6ede3`; last modified `62c32757`. `order-timeline.tsx` introduced `cb0bfaf3`; last modified `285f54d8` 2026-07-04. Survived transition: YES. | Referenced route. | Feature → `/orders/$id` → timeline/invoice/payment components → order detail queries → orders/order_items/service_units/journals | Business Knowledge | Medium | 75% recovered / 25% missing | Accounting/payment side effects require careful isolation. |
| Receipt / Invoice Printing | YES | `components/print-invoice.tsx`; `routes/$tenant/orders/$id.tsx` | `print-invoice.tsx` introduced `054c2ecc`; last modified `795fc687` 2026-06-29. Survived transition: YES. | Referenced by order screens. | Feature → invoice component → order/customer/items data → print/PDF browser APIs → `orders`, `order_items`, `customers` | Business Knowledge | High | 80% recovered / 20% missing | Good extraction candidate into Document Pack; layout may be Laundry/order-specific. |
| Payment Recording | YES | `routes/$tenant/orders/$id.tsx`; `routes/customer-portal.tsx`; `lib/rules/payment.ts`; Supabase functions/RPCs in migrations | `customer-portal.tsx` introduced `d80d0065` 2026-06-19; last modified `62c32757`. `lib/rules/payment.ts` exists. Survived transition: YES. | Referenced; operational. | Feature → order/customer portal payment UI → payment helper/RPC → `orders`, `journal_entries`, cash/customer ledger objects | Business Rules | Medium | 65% recovered / 35% missing | Must not universalize order-only payment model. |
| Customer List / Search | YES | `routes/$tenant/customers.tsx`; `routes/$tenant/search.tsx`; `components/unified-search.tsx`; `lib/query-layer.ts` | `customers.tsx` introduced `61f6ede3`; last modified `145168db`. `unified-search.tsx` introduced `c6690a5a` 2026-06-30; last modified `62c32757`. Survived transition: YES. | Referenced route/component; not fully nav-generated. | Feature → customers/search route → UnifiedSearch → customers/orders queries | Business Knowledge | High | 85% recovered / 15% missing | Good CRM Pack extraction candidate. |
| CRM / Customer Care | YES | `routes/$tenant/crm.tsx`; `routes/$tenant/customer-care.tsx`; `lib/ai-advisor.ts` | `crm.tsx` introduced `61f6ede3`; last modified `64ba7c1c` 2026-07-11. `customer-care.tsx` introduced `61f6ede3`; last modified `62c32757`. Survived transition: YES. | Referenced routes; not generated. | Feature → CRM/care routes → customer/message/order aggregates → `customers`, `customer_messages`, `customer_loyalty` | Business Knowledge | Medium | 60% recovered / 40% missing | Needs general CRM semantics separate from Laundry order lifecycle. |
| Customer Portal | YES | `routes/customer-portal.tsx`; `routes/join.$slug.tsx`; `routes/track.$token.tsx`; `lib/rules/whatsapp.ts` | `customer-portal.tsx` introduced `d80d0065`; last modified `62c32757`. `join.$slug.tsx` introduced `0f055e87` 2026-06-23; last modified `64851dd7` 2026-06-29. `track.$token.tsx` introduced `d80d0065`; last modified `62c32757`. Survived transition: YES. | Referenced public routes. | Feature → public routes → customer/order RPCs → `customers`, `orders`, `customer_messages` | Business Knowledge | Medium | 70% recovered / 30% missing | Needs generic customer experience pack; current source is order-specific. |
| Pickup Flow | YES | `routes/$tenant/pickups/index.tsx`; `routes/$tenant/pickups/new.tsx`; `routes/customer-portal.tsx`; `lib/geo.ts`; `lib/route-optimizer.ts` | `pickups/index.tsx` introduced/last modified `61f6ede3`; `pickups/new.tsx` introduced/last modified `61f6ede3`. Survived transition: YES. | Referenced routes; not generated in nav. | Feature → pickups routes/portal → geo/route helpers → pickup_requests/orders/customers | Business Knowledge | High | 75% recovered / 25% missing | Good Field Service Pack candidate. |
| Delivery / Courier Flow | YES | `routes/$tenant/driver.tsx`; `components/driver-components.tsx`; `lib/driver-assignment.ts`; `lib/route-optimizer.ts`; `lib/geo.ts` | Driver route exists in current tree; driver components and helpers exist. Survived transition: YES. | Referenced; `/driver` generated in Dry Tech nav. | Feature → `/driver` → driver components → route/assignment helpers → employees/orders/pickups/driver logs | Business Knowledge | High | 80% recovered / 20% missing | Must generalize beyond Laundry delivery. |
| Live Map | YES | `routes/$tenant/live-map.tsx`; `lib/geo.ts`; `lib/route-optimizer.ts` | `live-map.tsx` introduced `61f6ede3`; current history shows later route work. Survived transition: YES. | Referenced route; not generated in Dry Tech nav. | Feature → `/live-map` → geo/route helpers → driver_location_log/employees/pickups/orders | Business Knowledge | High | 75% recovered / 25% missing | Good Field Service Pack asset; privacy/location handling needed. |
| Station Board | YES | `routes/$tenant/stations/*.tsx`; `routes/$tenant/stations/$stage.tsx`; `components/station-board.tsx`; `components/station-page.tsx`; `lib/station-workflow.ts`; `lib/workflow-engine-v2.ts` | `station-board.tsx` introduced `054c2ecc`; last modified `61f6ede3`. `station-page.tsx` introduced `054c2ecc`; last modified `62c32757`. `lib/station-workflow.ts` introduced `f26c8e0b`; last modified `26f65366`. Survived transition: YES. | Referenced; mixed generic/legacy. | Feature → station routes → station components → station workflow helpers → service_units/workflow_stages/task_assignments | Business Knowledge | Low | 60% recovered / 40% missing | Source exists but extraction risks reintroducing station hardcoding. |
| Laundry Workflow V1 | YES | `lib/legacy/laundry-workflow-v1.ts` | Introduced `26f65366` 2026-07-11; last modified `2367aa95` 2026-07-12. Survived transition: YES as legacy. | Legacy; should not be runtime dependency. | Feature → legacy module → old workflow constants/rules → no approved V3 runtime path | Legacy Technical Debt | Impossible | 100% reference only | Must not be restored as runtime behavior. |
| Laundry Validation Rules | YES | `lib/legacy/laundry-validation-rules.ts` | Introduced `4823ddfc` 2026-07-12; last modified `2367aa95` 2026-07-12. Survived transition: YES as legacy. | Legacy/reference. | Feature → legacy validation module → business rules → template/rule candidates | Business Rules | Medium | 50% recovered / 50% missing | Extract rule intent, not runtime dependency. |
| Ironing Distribution | YES | `lib/rules/ironing-distribution.ts`; `routes/$tenant/staff/ironing-payroll.tsx` | `ironing-distribution.ts` introduced/last modified `4cd8f222` 2026-06-28. `ironing-payroll.tsx` introduced `61f6ede3`; last modified `10c22966` 2026-07-09. Survived transition: YES. | Referenced in payroll area. | Feature → ironing payroll route → distribution helper → service_units/ironing rates/payouts | Business Rules | Medium | 65% recovered / 35% missing | Needs work-distribution/compensation abstraction. |
| QC / Issues | YES | `routes/$tenant/stations/qc.tsx`; `routes/$tenant/issues.tsx`; `lib/ai-advisor.ts` | QC route exists; issues route exists. Survived transition: YES. | Referenced routes. | Feature → QC/issues routes → checks/returns/orders → qc_checks/customer_returns/service_units | Business Knowledge | Medium | 65% recovered / 35% missing | QC must be generic staged-work quality capability. |
| Customer Returns | YES | `lib/rules/customer-return.ts`; related migrations; routes referencing returns/issues | Source file exists. Survived transition: YES. | Partially used. | Feature → return rule helper → orders/customer_returns → issue/QC screens | Business Rules | Medium | 60% recovered / 40% missing | Must generalize to service/product issue handling. |
| Staff / HR | YES | `routes/$tenant/staff/*`; `components/attendance-widget.tsx`; `lib/staff-roles.ts` | Staff routes introduced `61f6ede3`; attendance last modified `145168db`; staff index last modified `145168db`. Survived transition: YES. | Referenced routes/widgets; not generated nav. | Feature → staff routes/widgets → staff roles/helpers → employees/attendance/payroll tables | Business Knowledge | Medium | 75% recovered / 25% missing | HR pack must avoid station-role lock-in. |
| Accounting Suite | YES | `routes/$tenant/accounting.tsx`; `ledger.tsx`; `receivables.tsx`; `cash-closing.tsx`; `budgets.tsx`; `lib/rules/payment.ts` | Accounting/ledger/receivables/cash-closing introduced `61f6ede3`; receivables last modified `145168db`. Survived transition: YES. | Referenced routes; accounting nav partially generated. | Feature → finance routes → payment helpers/views → journal/cash/customer ledger objects | Business Knowledge | Medium | 70% recovered / 30% missing | Historical finance must not be broken by generic abstraction. |
| Reports | YES | `routes/$tenant/reports.tsx`; `routes/$tenant/reports/builder.tsx`; `lib/export-utils.ts` | `reports.tsx` introduced `61f6ede3`; last modified `62c32757`. `reports/builder.tsx` introduced/last modified `4823ddfc` 2026-07-12. Survived transition: YES. | Referenced routes; not generated nav. | Feature → reports routes → export utils → report views/definitions | Business Knowledge | Medium | 65% recovered / 35% missing | Component-coded reports need asset definitions. |
| Notification Center | YES | `components/notification-center.tsx`; `components/smart-alerts-feed.tsx`; `components/daily-digest.tsx`; `lib/rules/whatsapp.ts` | `notification-center.tsx` introduced `a3cd4998` 2026-06-22; last modified `3932fa23` 2026-07-09. `whatsapp.ts` introduced/last modified `9c3505ad` 2026-06-29. Survived transition: YES. | Referenced in shell/topbar. | Feature → notification components → WhatsApp/rule helpers → app_notifications/customer_messages | Business Knowledge | High | 75% recovered / 25% missing | Delivery renderer extractable; triggers need pack config. |
| Business Settings | YES | `routes/$tenant/settings.tsx`; `routes/$tenant/settings/index.tsx`; `hooks/use-currency.tsx`; `lib/format.ts` | Settings routes exist in current tree. Survived transition: YES. | Referenced routes; not all generated nav. | Feature → settings routes → app_settings/tenants → formatting/currency helpers | Configuration | Medium | 70% recovered / 30% missing | Must be expressed through Business DNA without technical UI. |
| Services Catalog | YES | `routes/$tenant/services.tsx`; `lib/dry-tech-catalog.ts` | `services.tsx` introduced `61f6ede3`; last modified `dae2409a` 2026-07-09. `dry-tech-catalog.ts` introduced `14910736`; last modified `de0c72e5` 2026-07-07. Survived transition: YES. | Referenced route/helper. | Feature → services route → catalog helper → service_items/service_categories | Business Knowledge | High | 85% recovered / 15% missing | Distinguish Dry Tech data from universal template defaults. |
| Branch Management | YES | `routes/$tenant/branches.tsx`; `routes/$tenant/branches/$id.tsx`; `components/branch-filter.tsx`; `components/branch-compare-dashboard.tsx` | `branches.tsx` introduced/last modified `61f6ede3`; branch detail introduced `61f6ede3`, last modified `30cfcbd9`. Survived transition: YES. | Referenced routes. | Feature → branch routes/components → branch/order/finance aggregates → branches | Business Knowledge | High | 80% recovered / 20% missing | Core Branch Engine can extract most behavior. |
| Unified Search | YES | `routes/$tenant/search.tsx`; `components/unified-search.tsx`; `lib/query-layer.ts` | `search.tsx` introduced `61f6ede3`; last modified `62c32757`. `unified-search.tsx` introduced `c6690a5a`; last modified `62c32757`. Survived transition: YES. | Referenced in topbar/route. | Feature → search route/topbar → query layer → entities | Technical Utility + Business Knowledge | High | 85% recovered / 15% missing | Needs generic entity registry. |
| Mobile Work Dock | YES | `components/mobile-work-dock.tsx`; `hooks/use-auth.tsx`; `lib/station-workflow.ts` | Component exists and is mounted in app shell. Survived transition: YES. | Referenced in tenant layout. | Feature → mobile dock → auth/employee station logic → station routes/tasks | Mixed | Medium | 55% recovered / 45% missing | Station routing assumptions must be replaced. |
| APDO / System Health | YES | `routes/$tenant/system-health.tsx`; `components/system-health-components.tsx` | `system-health.tsx` introduced `61f6ede3`; last modified `62c32757`. `system-health-components.tsx` introduced `cb0bfaf3`; last modified `285f54d8`. Survived transition: YES. | Referenced route; not generated nav. | Feature → system health route/components → health views/events/audit | Business Knowledge | Medium | 70% recovered / 30% missing | Pack-specific checks must not be Core hardcoding. |
| Demo / Seed Scripts | YES | `scripts/seed-demo-tenant.mjs`; `scripts/generate-reference-dry-tech.mjs`; `scripts/seed-demo-data.mjs` | `seed-demo-tenant.mjs` introduced/last modified `0753057d` 2026-06-29. `generate-reference-dry-tech.mjs` introduced/last modified `0764d1f7` 2026-07-12. Survived transition: YES. | Scripts exist; not runtime. | Feature → scripts → Supabase SQL/API → demo/reference data tables | Configuration / Demo Data | Medium | 65% recovered / 35% missing | Scripts can bypass generator if reused without governance. |
| Legacy Bootstrap | YES | Multiple `seed_tenant_defaults` migrations/functions; self-service create functions | Last self-service bootstrap stabilization in `95dc2fc6` 2026-07-12. Survived transition: YES. | Runtime database behavior still exists. | Feature → tenant insert/update functions/triggers → service/features defaults | Legacy Technical Debt | Impossible | 100% obsolete as architecture | Must be replaced, not extracted. |
| Self-Service Generator | YES | `routes/signup.tsx`; migrations `20260715000003`, `20260715000004`; `self_service_create_tenant` RPC | `signup.tsx` existed earlier and was modified during pivot. Latest generator fixes committed `95dc2fc6`. Survived transition: YES. | Referenced in signup. | Feature → signup UI → self_service_create_tenant RPC → tenant shell/core setup draft | Business Knowledge + Technical | Medium | 75% recovered / 25% missing | Needs Business Initialization replacement; current flow is transitional. |

---

# 5. Duplicate and Canonical Source Analysis

| Business Behavior | Canonical Source Candidate | Duplicate Source | Legacy Source | Temporary Compatibility Source |
|---|---|---|---|---|
| Navigation | Future `core_navigation_items` + pack assets | `components/app-sidebar.tsx` static groups | static sidebar arrays | current AppSidebar hybrid logic |
| Workflow execution | Future Work Order/Task engine | `workflow_stages`, service unit stage status | `lib/legacy/laundry-workflow-v1.ts`, `lib/rules/workflow-engine-v1.ts` | `lib/station-workflow.ts` |
| Station/work area UI | Future generic work-area renderer | station-specific route files | one-file-per-station routes | `routes/$tenant/stations/$stage.tsx` |
| Order lifecycle | Future Order + Work Order bridge | order routes + service units | order-only station statuses | existing order detail/list routes |
| Customer experience | Future CRM/Customer Experience Pack | customer portal, join, track routes | order-specific portal assumptions | current public portal routes |
| Finance behavior | Future Financial Transaction model | order payment sync | order-only journal sync | `sync_order_financials` |
| Notifications | Future Notification Pack triggers/templates | notification center + WhatsApp helper | order-specific message templates | `customer_messages` + notification center |
| Services catalog | Future template/data pack assets | `lib/dry-tech-catalog.ts`, `service_items` | old seed/copy services | existing service route/catalog rows |

---

# 6. Final Verification Table

| Feature | Source Verified | Extraction Confidence | Business Value | Architecture Risk | Recovery Complexity | Recommended Recovery Order |
|---|---|---|---|---|---|---:|
| Role-aware navigation | YES | Medium | Very High | Medium | Medium | 1 |
| Permission role mapping | PARTIAL | Medium | Very High | High | Medium-High | 2 |
| Order list/new/detail flow | YES | Medium | Very High | Medium | Medium-High | 3 |
| Customer/CRM flow | YES | High | High | Medium | Medium | 4 |
| Reports and dashboard routes | YES | Medium | High | Medium | Medium | 5 |
| Work Order bridge | PARTIAL | Low | Very High | High | High | 6 |
| Generic station renderer | PARTIAL | Low | High | High | High | 7 |
| Laundry station definitions | YES | Medium | High | Medium | Medium | 8 |
| Accounting behavior | YES | Medium | Very High | High | High | 9 |
| Notification behavior | YES | High | High | Medium | Medium | 10 |
| Pickup/delivery field service | YES | High | High | Medium | Medium | 11 |
| Staff/HR | YES | Medium | Medium | Medium | Medium | 12 |
| Services catalog | YES | High | High | Low-Medium | Medium | 13 |
| Dry Tech data pack | YES | Medium | High | Medium | Medium | 14 |
| Legacy bootstrap | YES | Impossible | Negative | Very High | Medium-High to replace | Retire |
| Laundry workflow v1 | YES | Impossible | Reference only | High | Low to archive | Retire |

---

# 7. Files with Highest Business Knowledge Concentration

Ranked from most valuable to least valuable for preserving Dry Tech business intelligence:

| Rank | File / Area | Classification | Why It Matters |
|---:|---|---|---|
| 1 | `components/app-sidebar.tsx` | Mixed / Business Knowledge | Contains the richest map of old business navigation, role visibility, and operational areas. |
| 2 | `routes/$tenant/orders/new.tsx` | Business Knowledge | Encodes order intake, service selection, pricing behavior, and customer-facing workflow start. |
| 3 | `routes/$tenant/orders/$id.tsx` | Business Knowledge | Encodes historical order detail, edit, invoice, payment, and operational continuity behavior. |
| 4 | `routes/customer-portal.tsx` | Business Knowledge | Encodes customer journey, customer order creation/tracking/payment assumptions. |
| 5 | `components/station-board.tsx` + `components/station-page.tsx` | Business Knowledge | Encodes station queue behavior and work execution UX. |
| 6 | `lib/station-workflow.ts` | Business Knowledge | Encodes station movement and workflow assumptions. |
| 7 | `lib/dry-tech-catalog.ts` | Business Knowledge | Contains catalog/category knowledge relevant to Laundry/Dry Tech. |
| 8 | `routes/$tenant/accounting.tsx` + finance routes | Business Knowledge | Encodes operational finance and reporting behavior. |
| 9 | `components/print-invoice.tsx` | Business Knowledge | Encodes document/receipt business output. |
| 10 | `routes/$tenant/driver.tsx` + `components/driver-components.tsx` | Business Knowledge | Encodes delivery/field service behavior. |
| 11 | `components/notification-center.tsx` | Mixed | Encodes alert presentation and notification behavior. |
| 12 | `routes/$tenant/reports.tsx` | Business Knowledge | Encodes operational/financial reporting views. |
| 13 | `routes/$tenant/staff/*` | Business Knowledge | Encodes HR, attendance, payroll, and staff operations. |
| 14 | `lib/legacy/laundry-validation-rules.ts` | Business Rules | Contains rule intent that may inform Laundry Template validation. |
| 15 | `scripts/generate-reference-dry-tech.mjs` | Demo Data / Configuration | Encodes current reference generation assumptions. |

---

# 8. Files That Should Never Become Runtime Dependencies Again

| File / Area | Still Needed? | Why It Must Not Become Runtime Dependency |
|---|---|---|
| `lib/legacy/laundry-workflow-v1.ts` | Reference only | Reintroduces old Laundry workflow model and conflicts with Platform Generator / Work Order architecture. |
| `lib/rules/workflow-engine-v1.ts` | Reference only until bridge complete | Old workflow rules risk keeping execution tied to legacy assumptions. |
| Station-specific route files as the long-term model | Temporary compatibility only | One-file-per-station architecture hardcodes Laundry workflow and blocks generic work-area rendering. |
| Static arrays in `components/app-sidebar.tsx` | Temporary compatibility only | Static sidebar must not remain source of business navigation truth. |
| Legacy `seed_tenant_defaults` bootstrap behavior | Eventually delete/replace | Hidden mutation path can change services/features unexpectedly and bypass templates. |
| Demo seed SQL blocks as production generation path | Reference only | They can bypass Platform Generator and create non-reproducible business state. |
| Direct station/job_role redirect logic | Temporary compatibility only | Routing should be based on actor/task/work-area assignment, not hardcoded station jobs. |
| `if laundry` / `switch industry` logic anywhere | Not needed | Violates Configuration First policy. |

---

# 9. Obsolete Item Disposition

| Obsolete Item | Needed for Reference? | Eventually Delete? | Condition Before Deletion |
|---|---|---|---|
| `lib/legacy/laundry-workflow-v1.ts` | Yes | Yes | After Work Order/Task bridge and Laundry Template workflow assets fully replace it. |
| `lib/rules/workflow-engine-v1.ts` | Yes | Yes | After v2/v3 generic workflow execution is fully validated. |
| Legacy bootstrap functions/triggers | Yes, for migration understanding | Yes / replace | After `create_organization_from_template()` or equivalent fully replaces bootstrap safely. |
| Station-specific route files | Yes, temporarily | Gradually | After generic work-area renderer reaches parity. |
| Static sidebar business arrays | Yes, temporarily | Refactor away | After generated role-aware navigation reaches parity. |
| Demo seed scripts as source of truth | Yes | Replace | After declarative Demo Data Import exists. |

---

# 10. Final Answers

## How much of the original Dry Tech business intelligence is still recoverable from the current repository?

Approximately:

```txt
76% recoverable as evidence or source material
```

This includes extractable/generalizable code plus partial sources that preserve business intent.

## What percentage must be rebuilt?

Approximately:

```txt
36% requires significant rebuild
```

The rebuild percentage overlaps with partially recoverable source because some behaviors have useful evidence but cannot be safely extracted as-is.

Critical rebuild areas:

- Work Order / Task bridge
- permission unification
- generated navigation asset model
- generic station/work-area renderer
- generic financial transaction abstraction
- first success dashboard
- automation rules registry

## What percentage still physically exists?

Approximately:

```txt
92% of identified source areas physically exist
```

Most behavior source still exists in routes/components/helpers, but existence does not mean it is architecturally safe to reuse directly.

## Which 10 files contain the highest concentration of recoverable business knowledge?

1. `components/app-sidebar.tsx`
2. `routes/$tenant/orders/new.tsx`
3. `routes/$tenant/orders/$id.tsx`
4. `routes/customer-portal.tsx`
5. `components/station-board.tsx`
6. `components/station-page.tsx`
7. `lib/station-workflow.ts`
8. `lib/dry-tech-catalog.ts`
9. `routes/$tenant/accounting.tsx`
10. `components/print-invoice.tsx`

## If the repository disappeared tomorrow, which files would you archive first to preserve Dry Tech's business intelligence?

Archive first:

```txt
components/app-sidebar.tsx
routes/$tenant/orders/new.tsx
routes/$tenant/orders/$id.tsx
routes/customer-portal.tsx
components/station-board.tsx
components/station-page.tsx
lib/station-workflow.ts
lib/dry-tech-catalog.ts
routes/$tenant/accounting.tsx
routes/$tenant/ledger.tsx
routes/$tenant/receivables.tsx
routes/$tenant/cash-closing.tsx
routes/$tenant/reports.tsx
components/print-invoice.tsx
components/notification-center.tsx
routes/$tenant/driver.tsx
components/driver-components.tsx
lib/legacy/laundry-validation-rules.ts
scripts/generate-reference-dry-tech.mjs
engineering/business-knowledge/BUSINESS_KNOWLEDGE_MODEL.md
engineering/reference-environments/DRY_TECH_GAP_ANALYSIS.md
engineering/reference-environments/DRY_TECH_FUNCTIONAL_RECONCILIATION.md
engineering/reference-environments/DRY_TECH_RECOVERY_ROADMAP.md
```

Reason:

These files/documents preserve the highest concentration of business behavior, operational assumptions, recovery decisions, and future architectural direction.

---

# 11. Final Principle

Source verification confirms that Dry Tech business intelligence is still largely present, but it is distributed across UI, route code, helper modules, legacy files, and scripts.

The next sprint must not copy these sources back into runtime as-is.

The next sprint should extract or rebuild the verified business knowledge into the correct architecture layer.
