# Platform Foundation Release Report

**Status:** Pre-Merge Validation — Do Not Merge Yet  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Validate Sprints 1A–1E before CTO merge decision.

---

## 1. Architecture Summary

Sprints 1A–1E established the Platform Foundation layer of MJRH V3.

Implemented foundation chain:

```txt
Capability Manifest
↓
Capability Registry
↓
Dependency Resolution
↓
Generic Asset Definitions
↓
Generic Asset Installation Pipeline
↓
Organization Runtime Capabilities
↓
Runtime Assets
├── Navigation
└── Permissions
```

### Sprint 1A — Capability Asset Foundation

Delivered:

- `core_navigation_assets`
- source-owned navigation assets: CORE / CAPABILITY / TEMPLATE
- organization runtime navigation: `core_navigation_items`
- navigation generation function
- AppSidebar support for generated navigation

### Sprint 1B — Permission Binding Engine

Delivered:

- `core_permission_assets`
- `core_permission_bindings`
- generic authorization functions
- navigation permission binding
- permission-aware navigation visibility

### Sprint 1C — Capability Registry Foundation

Delivered:

- `core_capability_registry`
- `core_capability_dependencies`
- `core_template_capabilities`
- `core_organization_capabilities`
- capability installation function
- assets linked to capabilities

### Sprint 1D — Capability Manifest & Installation Pipeline

Delivered:

- capability manifest JSON on registry
- manifest build/refresh/validate functions
- installation pipeline using manifest-backed capabilities

### Sprint 1E — Generic Asset Pipeline Foundation

Delivered:

- `core_asset_type_registry`
- `core_capability_asset_definitions`
- `core_organization_asset_installs`
- generic asset pipeline
- active installers for navigation and permissions
- reserved plug-in categories for workflow, form, report, document, dashboard, automation

---

## 2. Migration Order

Latest Platform Foundation migrations are ordered and applied remotely:

```txt
20260715000005_capability_navigation_assets.sql
20260715000006_permission_binding_engine.sql
20260715000007_capability_registry_foundation.sql
20260715000008_capability_manifest_pipeline.sql
20260715000009_generic_asset_pipeline.sql
```

Remote migration history confirms all five are applied in order.

Duplicate migration version check:

```txt
migration_count: 116
duplicate_versions: []
```

---

## 3. Validation Checklist

| Validation Item | Result | Evidence |
|---|---|---|
| Database migrations execute in order | PASS | `supabase migration list` shows 20260715000005–09 applied sequentially. |
| Fresh installation works | PASS | Transaction rollback org created and entered platform. |
| Existing Dry Tech upgrade works | PASS | Dry Tech has 10 capabilities, 96 asset installs, 57 nav items, 145 permission bindings. |
| Setup Wizard / generator path works | PASS | `self_service_create_tenant` + `complete_mjrh_core_setup` + asset pipeline passed in rollback. |
| Capability installation works | PASS | `apply_capabilities_for_tenant` installed 10 Laundry template capabilities. |
| Generic Asset Pipeline works | PASS | 96 asset install records: 47 navigation + 49 permission. |
| Navigation generation works | PASS | Dry Tech nav items = 57; fresh org nav items = generated. |
| Permission generation works | PASS | Dry Tech permission bindings = 145; fresh org permission bindings = generated. |
| Typecheck passes | PASS | `npm run typecheck -- --pretty false`. |
| Build passes | PASS | `npm run build`. |
| No duplicate migrations | PASS | duplicate_versions = `[]`. |
| No orphan assets | PASS | orphan counts all 0. |
| No broken foreign keys in new asset layer | PASS | orphan source asset / permission asset checks all 0. |
| No circular capability dependencies | PASS | cycle_count = 0. |
| No TODOs blocking production | PASS | TODO/FIXME/HACK scan produced no production-blocking items; one phone placeholder false-positive only. |
| No historical Dry Tech data changed | PASS | branches/employees/customers/services/orders/order_items/service_units/journal_entries preserved. |

---

## 4. Detailed Validation Results

### Dry Tech Runtime Validation

```json
{
  "orders": 530,
  "branches": 2,
  "services": 205,
  "customers": 8,
  "employees": 12,
  "journal_entries": 612,
  "can_enter_platform": true,
  "capabilities": 10,
  "asset_installs": 96,
  "nav_items": 57,
  "permission_bindings": 145
}
```

### Fresh Installation Validation

Fresh organization was created inside transaction rollback.

```json
{
  "tenant_created": true,
  "can_enter_platform": true,
  "capabilities": 10,
  "asset_installs": 96,
  "nav_items": 47,
  "permission_bindings": 145,
  "manifest_backed_installs": 10,
  "dry_tech_leak": false
}
```

### Dependency Validation

All enabled capabilities returned:

```txt
valid = true
missing_dependencies = []
```

Capabilities validated:

- accounting
- catalog
- core
- crm
- field_service
- hr
- laundry
- orders
- reporting
- workflow

### Orphan Validation

```json
{
  "nav_assets_orphan_capability": 0,
  "permission_assets_orphan_capability": 0,
  "asset_definitions_orphan_capability": 0,
  "org_capabilities_orphan_capability": 0,
  "nav_items_orphan_source_asset": 0,
  "permission_bindings_orphan_asset": 0
}
```

### Circular Dependency Validation

```json
{
  "cycle_count": 0,
  "circular_dependency_paths": []
}
```

---

## 5. Known Limitations

1. Workflow/form/report/document/dashboard/automation asset categories are reserved but not yet implemented.
2. Permission conditions exist as JSON but are not deeply evaluated yet.
3. Deny-precedence is modeled but not broadly used.
4. Route/API enforcement is not fully migrated to `actor_has_permission` yet.
5. Static sidebar remains as compatibility fallback.
6. Dry Tech still has 10 older compatibility navigation records; runtime de-duplicates and prefers source-owned assets.
7. Capability versioning exists as a field/manifest property, but upgrade mechanics are not implemented.
8. Dependency validation checks existence, not semantic version ranges.
9. Legacy bootstrap still exists and remains a risk until replaced by fully template-aware generation.
10. Historical Work Order / Task bridge is not implemented yet.

---

## 6. Production Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Navigation visibility mismatch for some legacy roles | Medium | Legacy role fallback remains; generated permissions now available. |
| Route/API actions not yet fully permission-enforced | Medium | Current sprint creates authorization layer; next enforcement sprint should adopt it route-by-route. |
| Legacy bootstrap hidden mutations | High | Do not use direct tenant bootstrap for final generator until replaced/contained. |
| Static sidebar compatibility path divergence | Medium | Keep fallback temporarily, but use generated nav as preferred source. |
| Capability manifest version upgrades not implemented | Medium | Avoid destructive capability changes until versioning is implemented. |
| Accounting/Work Order bridge not implemented | High | Do not remap historical accounting until dedicated bridge sprint. |

---

## 7. Rollback Strategy

No merge has been performed.

If rollback is required before merge:

1. Do not merge this branch into `main`.
2. Keep `main` unchanged.
3. Revert specific commits on `feature/mjrh-v3-core-platform` if needed.
4. Remote database migrations are additive; safest production rollback is to disable new runtime usage rather than drop tables.
5. Existing legacy fallback remains, so UI can continue rendering without relying exclusively on new asset tables.
6. Dry Tech historical business data was not modified by the platform foundation work.

If a database rollback becomes necessary later:

- create a verified backup first
- prefer disabling generated capabilities/assets over destructive table drops
- do not drop tables before all code paths are verified independent of them

---

## 8. Recommended Merge Strategy

Do not merge automatically.

Recommended process:

1. Open Pull Request from `feature/mjrh-v3-core-platform` to `main`.
2. Attach this release report.
3. CTO Review.
4. Architecture Review.
5. Product Review.
6. Confirm CI/typecheck/build.
7. Confirm no direct push to `main`.
8. Merge via PR only after explicit approval.

Suggested PR title:

```txt
Platform Foundation: Capability Assets, Permissions, Registry, Manifests, Generic Asset Pipeline
```

Recommended merge type:

```txt
Squash merge or merge commit, depending on preferred audit history.
```

Given the architectural significance, a merge commit may preserve sprint history more clearly.

---

## 9. Final Recommendation

Platform Foundation branch is technically ready for CTO review and PR creation.

Do not merge yet.

Next implementation after merge approval should be:

```txt
Sprint 2 — Work Order + Task Bridge
```

Reason:

The foundation now supports capabilities, assets, navigation, and permissions. The next highest-value platform step is connecting generated capabilities to real operational execution.
