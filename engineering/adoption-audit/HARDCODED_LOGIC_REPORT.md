# Hardcoded Logic Report

**Status:** Architecture Recovery Audit — no implementation

## Summary

Repository scan found business logic and magic business terms still present in runtime code. The highest concentration appears in sidebar/navigation, station screens, order flows, accounting/reporting routes, Dry Tech catalog, and legacy workflow/rule helpers.

## Highest-count files

| File | Hits | Reason | Replacement Architecture | Priority |
|---|---:|---|---|---|
| `components/app-sidebar.tsx` | 105 | Static groups, role arrays, compatibility nav, generated nav fallback. | Generated Navigation Assets + Permission Engine. | P0 |
| `lib/dry-tech-catalog.ts` | 167 | Dry Tech/Laundry catalog knowledge in code. | Dry Tech Configuration data pack + curated Laundry Template assets. | P1 |
| `scripts/generate-reference-dry-tech.mjs` | 90 | Reference org generation assumptions in script. | Demo Data Import + Gold Standard generator. | P1 |
| `routes/$tenant/stations/ironing.tsx` | 62 | Station-specific operational UI and business rules. | Generic Work Area Renderer + Laundry Template station asset. | P1 |
| `routes/$tenant/reports.tsx` | 44 | Reports still route/component-driven. | Reporting Pack asset definitions. | P1 |
| `routes/$tenant/accounting.tsx` | 41 | Accounting behavior in route code. | Accounting Pack + Financial Transaction Engine. | P1 |
| `routes/$tenant/orders/$id.tsx` | 38 | Order detail/payment/status behavior. | Order/Document/Accounting capability assets. | P0 |
| `routes/$tenant/staff/attendance.tsx` | 37 | HR/staff business behavior in route. | HR Capability Pack. | P2 |
| `routes/$tenant/stations/qc.tsx` | 34 | QC station-specific logic. | Quality/Workflow Pack + Template config. | P1 |
| `supabase/functions/admin-actions/index.ts` | 32 | Admin action logic and role checks. | Platform Governance / Admin Capability with permission enforcement. | P1 |

## Representative findings

| Pattern | Example Source | Reason | Replacement Architecture | Priority |
|---|---|---|---|---|
| role checks | `hasRole(...)`, `role ===`, `user_roles` in app routes/components | Permissions still often checked by role name. | `actor_has_permission` / route-action permissions. | P0 |
| static sidebar groups | `components/app-sidebar.tsx` | Navigation knowledge still partially lives in UI. | Capability Navigation Assets. | P0 |
| station hardcoding | `routes/$tenant/stations/*.tsx`, `lib/station-workflow.ts` | Stations are still implementation artifacts. | Work Area + Workflow Asset model. | P1 |
| laundry/Dry Tech terms | `lib/dry-tech-catalog.ts`, scripts | Business knowledge exists as code constants/scripts. | Template/Data Pack extraction. | P1 |
| service_type assumptions | order/station/catalog files | Laundry-oriented service types drive behavior. | Catalog/Pricing Capability fields. | P1 |
| branch_id assumptions | many routes | Branch scoping appears directly in route queries. | Branch Engine / scoped query service. | P2 |
| magic business statuses | orders/stations/workflow files | Status strings encode process knowledge. | Workflow/Task lifecycle config. | P1 |

## Production-blocking hardcoding

No single finding requires immediate rollback. However, the following must be addressed before claiming full V3 adoption:

1. Static sidebar cannot remain source of business navigation.
2. Route-level role checks must adopt Permission Engine.
3. Station-specific routes must become compatibility only.
4. Dry Tech catalog must become data/configuration, not code source.
5. Legacy bootstrap must not define generated organizations.
