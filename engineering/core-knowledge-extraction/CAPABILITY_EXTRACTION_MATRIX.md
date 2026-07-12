# Capability Extraction Matrix

**Status:** Documentation only  
**Rule:** Nothing remains unclassified.

| Capability / Feature | Classification | Evidence | Extraction Decision | Notes |
|---|---|---|---|---|
| Authentication | Core Engine | `hooks/use-auth.tsx`, Supabase auth usage | Preserve as Core | Universal identity boundary. |
| Organization shell | Core Engine | `self_service_create_tenant`, `routes/signup.tsx` | Generalize | Must be template-aware, no legacy bootstrap side effects. |
| Branches | Core Engine | `routes/$tenant/branches.tsx`, `branches` | Extract/Generalize | Branch is universal location concept. |
| Departments | Platform Capability | `core_departments`, template assets | Rebuild asset model | Departments are generated, not Core defaults. |
| Actors/Roles/Permissions | Core Engine | `user_roles`, `core_roles`, `hooks/use-auth.tsx` | Rebuild mapping | Parallel models must be unified. |
| Navigation | Platform Capability | `components/app-sidebar.tsx`, `core_navigation_items` | Generalize | Static sidebar becomes evidence only. |
| Customers/CRM | Capability Pack | `customers.tsx`, `crm.tsx`, `customer-care.tsx` | Extract/Generalize | Strong reusable business value. |
| Customer Portal | Capability Pack | `routes/customer-portal.tsx`, `join`, `track` | Generalize | Must become Customer Experience Pack. |
| Services Catalog | Capability Pack | `services.tsx`, `lib/dry-tech-catalog.ts` | Extract + curate | Dry Tech catalog is data; defaults are template assets. |
| Orders | Platform Capability | order routes/components | Generalize | Commercial request concept is universal. |
| Work Orders | Core Engine | `work_orders`, workflow v3 migrations | Rebuild | Current bridge incomplete. |
| Tasks | Core Engine | `task_assignments`, work order foundation | Rebuild | Must become universal execution unit. |
| Workflow | Core Engine + Capability Pack | `workflow-engine-v2`, `core_workflow_blueprints` | Rebuild/Generalize | Engine is Core; workflow packs/templates configure it. |
| Stations | Industry Asset | station routes, `station-workflow.ts` | Convert to Template Asset | Station definitions are not Core. |
| Field Service | Capability Pack | driver/live-map/pickup routes, geo helpers | Extract/Generalize | Supports logistics/maintenance/home services. |
| Accounting | Capability Pack | accounting/ledger/receivables/cash-closing routes | Generalize | Accounting behavior universal; current sync order-specific. |
| Financial Transaction model | Core Engine | `core_financial_event_types`, journals | Rebuild | Generic abstraction required. |
| Reports | Capability Pack | reports routes, report builder | Extract/Generalize | Definitions should be assets. |
| Dashboards | Capability Pack | dashboard/executive/today routes | Generalize | Widget definitions needed. |
| Notifications | Capability Pack | notification center, WhatsApp helper | Extract/Generalize | Triggers/templates must be configurable. |
| Documents | Capability Pack | `print-invoice.tsx`, core docs | Generalize | Print layouts become document templates. |
| Forms/Checklists | Capability Pack | core forms, input builder | Rebuild/Generalize | Needed for many industries. |
| Staff/HR | Capability Pack | staff routes, attendance widget | Extract/Generalize | Should not rely only on station roles. |
| Inventory | Capability Pack | inventory routes/tables | Generalize | DNA-driven. |
| Assets | Capability Pack | equipment_assets, asset docs | Generalize | DNA-driven. |
| Business DNA | Platform Capability | Business DNA docs, setup/onboarding | Rebuild | Not yet runtime-complete. |
| Business Initialization | Platform Capability | onboarding route, core-platform helpers | Rebuild | V1 should be replaced. |
| Dry Tech historical data | Demo Asset / Gold Standard Data | database backup and current tenant | Preserve | Not template by default. |
| Laundry Template | Template Asset | template registry, migration 20260715000002 | Expand | Should compose packs. |
| Legacy bootstrap | Technical Debt | seed_tenant_defaults migrations | Retire | Hidden mutations are forbidden. |
| Laundry workflow v1 | Legacy Reference | `lib/legacy/laundry-workflow-v1.ts` | Archive/Retire | Reference only. |
| Station-specific pages | Temporary Compatibility | station route files | Rewrite gradually | Replace with generic renderer. |
