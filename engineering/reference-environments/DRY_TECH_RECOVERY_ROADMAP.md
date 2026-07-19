# Dry Tech Business Knowledge Recovery Roadmap

**Status:** Planning only — no implementation approved  
**Branch:** `feature/mjrh-v3-core-platform`  
**Purpose:** Convert the Dry Tech Functional Reconciliation and Gap Analysis into a safe implementation roadmap.

---

## 1. Roadmap Rule

Do not implement anything from this roadmap until reviewed and approved.

Every recovery item must restore business knowledge in the correct architectural layer.

Hardcoding Laundry behavior back into the Core is forbidden.

---

## 2. Priority Scale

| Priority | Meaning |
|---|---|
| P0 | Required to make Dry Tech feel operationally continuous and protect Core architecture. |
| P1 | Important for full Gold Standard quality and future generator maturity. |
| P2 | Valuable, but can follow after core reconciliation is stable. |

---

## 3. Recovery Roadmap

| Item | Priority | Architectural Destination | Dependencies | Risk | Estimated Effort |
|---|---|---|---|---|---|
| Role-aware generated navigation | P0 | Core Platform + Capability Pack | Existing core_navigation_items, Business Glossary, Template assets | Medium: may expose wrong routes if permissions are not mapped | Medium |
| Navigation asset model | P0 | Core Platform | Capability Pack model, Template Registry | Medium: needs backward compatibility with static routes | Medium |
| Permission/role mapping | P0 | Core Platform | `user_roles`, `core_roles`, route access rules | High: wrong mapping can expose sensitive areas | Medium-High |
| Order management capability assets | P0 | Capability Pack | Navigation asset model, existing order routes | Medium: old order flow must not break | Medium |
| Customer/CRM capability assets | P0 | Capability Pack | Navigation model, customer routes | Medium | Medium |
| Reporting menu/assets | P0 | Capability Pack | Report definition model | Medium: dashboards may assume old data shapes | Medium |
| Order → Work Order → Task bridge | P0 | Core Platform + Workflow Pack | Business Knowledge Model, historical order compatibility | High: could affect historical orders if done destructively | High |
| Generic work-area/station renderer | P0 | Core Platform | Laundry station asset extraction | High: station screens are operationally important | High |
| Laundry station definitions | P0 | Industry Template | Template asset schema, generic renderer | Medium | Medium |
| Dry Tech validation script | P0 | Core Platform | Business acceptance checklist | Low-Medium | Small-Medium |
| Retire/contain legacy bootstrap side effects | P0 | Obsolete / Core Platform replacement | Self-service generator, template-aware creation | High: old tenant creation may depend on bootstrap | Medium-High |
| Accounting/financial transaction mapping | P1 | Capability Pack + Core Platform | Work Order bridge, existing journals | High: accounting history must remain intact | High |
| Cash closing/receivables navigation and config | P1 | Accounting Pack | Navigation assets, permission mapping | Medium | Medium |
| Dashboard widget definitions | P1 | Reporting Pack | Report model, First Success Dashboard design | Medium | Medium |
| Notification template extraction | P1 | Notification Pack | Event triggers, message templates | Medium | Medium |
| Customer portal as generated experience | P1 | CRM + Notification + Document Packs | Customer portal routes, order/work status mapping | Medium-High | High |
| Pickup/delivery Field Service Pack config | P1 | Field Service Pack | Driver flow, map routes, pickup data | Medium | Medium |
| Staff/HR pack navigation | P1 | HR Capability Pack | Role mapping, staff routes | Medium | Medium |
| Laundry validation rule extraction | P1 | Industry Template + Capability Pack | Legacy validation audit | Medium | Medium |
| Ironing/distribution rule extraction | P1 | Capability Pack or Laundry Template | Compensation/work distribution model | Medium-High | Medium |
| Dry Tech service catalog data pack | P1 | Dry Tech Configuration / Demo Data | Service export, data import format | Low-Medium | Medium |
| Curated Laundry service defaults | P1 | Industry Template | Analysis of 205 Dry Tech services | Medium: avoid copying business-specific catalog blindly | Medium |
| Document template expansion | P1 | Document Management Pack | Document model, print/invoice routes | Medium | Medium |
| Form/checklist expansion | P2 | Capability Pack | Generic form builder | Low-Medium | Medium |
| 9-language business behavior | P2 | Capability Pack / Configuration | i18n strategy, language preferences | Medium | Medium |
| Legal/settings/help generated nav | P2 | Core Platform | Navigation model | Low | Small |
| Operational intelligence/advisor model | P2 | Business Operating Model + Reporting Pack | Business rules and advisory principles | Medium | Medium-High |

---

## 4. Recommended Implementation Sequence

## Phase 1 — Visible Continuity Without Hardcoding

1. Role-aware generated navigation.
2. Navigation asset model.
3. Order/customer/report navigation assets.
4. Permission/role mapping.

Goal:

```txt
Dry Tech feels operational again without restoring static sidebar as source of truth.
```

---

## Phase 2 — Execution Model Alignment

1. Order → Work Order → Task compatibility bridge.
2. Generic work-area/station renderer.
3. Laundry station definitions as template assets.
4. Workflow stage mapping.

Goal:

```txt
Historical orders remain intact while new Core execution model becomes usable.
```

---

## Phase 3 — Business Capability Packs

1. Reporting Pack definitions.
2. Dashboard widget definitions.
3. Notification Pack templates.
4. Field Service Pack for pickup/delivery.
5. Accounting Pack mapping.
6. HR/Staff Pack navigation and rules.

Goal:

```txt
Old Dry Tech behavior returns as reusable capability packs.
```

---

## Phase 4 — Dry Tech Reproducibility

1. Dry Tech service catalog export/data pack.
2. Curated Laundry Template service defaults.
3. Demo data import pack.
4. Gold Standard regeneration validation.

Goal:

```txt
Dry Tech can eventually be recreated from Template + Platform Generator + Demo Data Import.
```

---

## Phase 5 — Technical Debt Retirement

1. Remove dependency on legacy bootstrap side effects.
2. Retire duplicate station routes gradually.
3. Retire legacy workflow v1 as execution path.
4. Replace station redirects with actor/task/work-area routing.

Goal:

```txt
Old hardcoded behavior is replaced, not reconnected.
```

---

## 5. High-Risk Items Requiring Separate Approval

These items require explicit approval before implementation:

- Work Order bridge affecting historical orders.
- Accounting/financial transaction remapping.
- Retiring legacy bootstrap.
- Replacing station routes.
- Any migration that touches historical Dry Tech records.
- Any change to `user_roles` or permission enforcement.
- Any data-pack extraction that changes the 205-service Dry Tech catalog.

---

## 6. Immediate Recommended Next Step

Start with:

```txt
Role-aware generated navigation from Capability Pack / Template navigation assets
```

Why:

- Highest visible user impact.
- Low risk to historical data.
- Strong architectural value.
- Required by every generated organization.
- Avoids hardcoding old sidebar back into the product.

---

## 7. Final Rule

This roadmap restores the business intelligence of Dry Tech, not the old implementation.

Every item must return through:

```txt
Core Platform
Business Operating Model
Business DNA
Capability Pack
Industry Template
Generated Organization Data
Configuration
```

or be intentionally retired.
