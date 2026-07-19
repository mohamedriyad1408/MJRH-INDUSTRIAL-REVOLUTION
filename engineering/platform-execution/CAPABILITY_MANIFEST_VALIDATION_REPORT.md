# Capability Manifest Validation Report

**Sprint:** Sprint 1D — Capability Manifest & Installation Pipeline  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Capability manifests as canonical installable definitions

---

## 1. Architecture Compliance

Implemented pipeline:

```txt
Capability Manifest
↓
Capability Registry
↓
Generic Asset Definitions
↓
Asset-Type Registry
↓
Generic Asset Installation Pipeline
↓
Organization Runtime
↓
Navigation / Permissions
```

Manifest model now includes:

- identity
- version
- owner
- dependencies
- generic asset references
- grouped asset references
- future workflow/form/report/document/dashboard/automation asset buckets
- reserved install/uninstall hooks
- metadata

Runtime organization state remains in organization-owned runtime tables:

```txt
core_organization_capabilities
core_organization_asset_installs
core_navigation_items
core_permission_bindings
```

---

## 2. Generic Asset Pipeline Model

Created:

```txt
core_asset_type_registry
core_capability_asset_definitions
core_organization_asset_installs
```

Supported asset categories:

| Asset Type | Status | Installer |
|---|---|---|
| navigation | active | apply_navigation_assets_for_tenant |
| permission | active | apply_permission_assets_for_tenant |
| workflow | reserved | future |
| form | reserved | future |
| report | reserved | future |
| document | reserved | future |
| dashboard | reserved | future |
| automation | reserved | future |

Navigation and Permission assets are now mirrored into generic asset definitions while preserving backward compatibility with their existing source tables.

---

## 3. Manifest Functions

Created/updated:

```sql
build_capability_manifest(capability_key)
refresh_capability_manifest(capability_key)
refresh_all_capability_manifests()
validate_capability_manifest(capability_key)
refresh_generic_capability_asset_definitions()
apply_capability_assets_for_tenant(tenant_id, template_slug)
```

`build_capability_manifest()` now emits schema version 2 and includes:

```txt
assets_generic
assets.navigation
assets.permissions
assets.workflow
assets.forms
assets.reports
assets.documents
assets.dashboards
assets.automation
```

---

## 4. Installation Pipeline

`apply_capability_assets_for_tenant()` performs:

1. refresh generic asset definitions
2. apply/install capabilities
3. create organization-owned asset install records
4. invoke asset-type installers through `core_asset_type_registry.installer_function`
5. preserve future reserved asset types without changing the pipeline

This keeps the pipeline asset-type extensible.

---

## 5. Dry Tech Validation

Target:

```txt
Dry Tech
slug: dry-tech
```

Dry Tech pipeline execution:

```json
{
  "definition_sync": {
    "navigation_assets_synced": 47,
    "permission_assets_synced": 49
  },
  "manifest_refresh": {
    "refreshed": 10
  },
  "pipeline": {
    "asset_install_records_touched": 96,
    "installed_asset_records": 96,
    "installer_results": [
      {
        "asset_type": "navigation",
        "installer_function": "apply_navigation_assets_for_tenant"
      },
      {
        "asset_type": "permission",
        "installer_function": "apply_permission_assets_for_tenant"
      }
    ]
  },
  "historical_counts_preserved": true
}
```

Dry Tech installed asset state:

| Asset Type | Status | Count |
|---|---|---:|
| navigation | enabled | 47 |
| permission | enabled | 49 |

Dry Tech historical counts remained unchanged:

| Area | Count |
|---|---:|
| Branches | 2 |
| Employees | 12 |
| Customers | 8 |
| Services | 205 |
| Orders | 530 |
| Order Items | 1103 |
| Service Units | 1647 |
| Journal Entries | 612 |

---

## 6. Manifest Dependency Validation

All enabled capabilities returned:

```txt
manifest_exists = true
valid = true
missing_dependencies = []
```

Validated capabilities:

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

Sample manifest verification:

```json
{
  "capability": "orders",
  "schema_version": 2,
  "assets_generic_count": 6
}
```

---

## 7. Disposable Organization Validation

A disposable organization was created inside a transaction rollback and installed through the generic asset pipeline.

Result:

```json
{
  "tenant_created": true,
  "can_enter_platform": true,
  "asset_installs": 96,
  "navigation_asset_installs": 47,
  "permission_asset_installs": 49,
  "permission_bindings": 145,
  "navigation_items": 47,
  "dry_tech_leak": false
}
```

Validation:

- disposable organization installed assets through generic pipeline
- permissions generated through active asset installer
- navigation generated through active asset installer
- no Dry Tech-specific config leaked
- transaction rolled back

---

## 8. Backward Compatibility

Sprint 1A and 1B source tables remain intact:

```txt
core_navigation_assets
core_permission_assets
```

Generic asset definitions reference them through:

```txt
source_table
source_id
payload
```

Existing runtime tables remain intact:

```txt
core_navigation_items
core_permission_bindings
```

The generic pipeline invokes existing installers for active asset types, preserving current behavior while enabling future asset categories.

---

## 9. Known Limitations

1. Future asset categories are reserved but not implemented yet:
   - workflow
   - form
   - report
   - document
   - dashboard
   - automation
2. Installer functions currently use a common `(tenant_id uuid, template_slug text)` signature.
3. Asset version upgrade mechanics are not implemented yet.
4. Install/uninstall hooks are reserved but not executed.
5. Dependency validation does not yet evaluate semantic version compatibility.
6. Marketplace metadata is not implemented yet.

---

## 10. Definition of Done Check

| Requirement | Status |
|---|---|
| Generic Asset Pipeline exists | PASS |
| Navigation uses it | PASS |
| Permissions use it | PASS |
| Future asset types can plug in through registry | PASS |
| Capability Manifest references generic assets | PASS |
| Installation pipeline installs assets by type | PASS |
| Backward compatibility preserved | PASS |
| Dry Tech validates with historical data unchanged | PASS |
| Disposable organization validates | PASS |
| Typecheck passes | PASS |
| Validation report exists | PASS |

---

## 11. Recommendation

Sprint 1D completes the generic asset pipeline foundation.

Recommended next sprint:

```txt
Sprint 2 — Work Order + Task Bridge
```

Alternative if extending the asset system first:

```txt
Sprint 1E — Workflow Asset Installer
```

The most valuable next business step is the Work Order + Task bridge, because it connects generated capabilities to real operational execution.
