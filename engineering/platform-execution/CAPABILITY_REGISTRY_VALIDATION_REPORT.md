# Capability Registry Validation Report

**Sprint:** Sprint 1C — Capability Registry Foundation  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Central catalog for reusable business capabilities and their assets

---

## 1. Architecture Compliance

Implemented architecture:

```txt
Core
↓
Capability Registry
↓
Capability Assets
├── Navigation Assets
├── Permission Assets
├── Future Workflow/Form/Report/Automation Assets
↓
Template Composition
↓
Generated Organization
```

Ownership is explicit:

| Layer | Object Type |
|---|---|
| CORE / CAPABILITY / TEMPLATE | `core_capability_registry` source rows |
| CAPABILITY dependencies | `core_capability_dependencies` |
| TEMPLATE composition | `core_template_capabilities` |
| ORGANIZATION runtime installs | `core_organization_capabilities` |

---

## 2. Capability Inventory

Seeded capabilities:

| Capability | Ownership | Category | Purpose |
|---|---|---|---|
| core | CORE | core | Core runtime capability required by every installation. |
| orders | CAPABILITY | business | Customer-facing commercial order capability. |
| crm | CAPABILITY | customer | Customer relationships and history. |
| catalog | CAPABILITY | business | Service/product catalog and branch/catalog management. |
| workflow | CAPABILITY | operations | Workflows, work orders, tasks, issues and health. |
| field_service | CAPABILITY | operations | Pickup, delivery, routing, driver and live map. |
| accounting | CAPABILITY | finance | Finance, accounting, ledger, receivables, cash closing and budgets. |
| reporting | CAPABILITY | business | Reports, dashboards and intelligence views. |
| hr | CAPABILITY | people | Staff, attendance, payroll, requests and schedules. |
| laundry | TEMPLATE | template | Laundry Template-specific work areas and operational defaults. |

---

## 3. Dependency Validation

All registered dependencies validated successfully.

Dependency examples:

| Capability | Depends On |
|---|---|
| field_service | crm, workflow |
| laundry | crm, orders, workflow, field_service, accounting, reporting, catalog, hr |
| workflow | core |
| accounting | core |
| reporting | core |

Validation output showed every capability dependency as:

```txt
valid = true
missing_dependencies = []
```

---

## 4. Asset Ownership Validation

Existing Navigation Assets and Permission Assets were linked to capabilities.

Examples:

| Asset Type | Ownership | Capability Link |
|---|---|---|
| CORE navigation assets | CORE | core |
| Orders navigation assets | CAPABILITY | orders |
| CRM navigation assets | CAPABILITY | crm |
| Accounting navigation assets | CAPABILITY | accounting |
| Laundry station navigation assets | TEMPLATE | laundry |
| CORE permission assets | CORE | core |
| Capability permission assets | CAPABILITY | capability owner |
| Laundry permission assets | TEMPLATE | laundry |

No new business data was created or modified.

---

## 5. Dry Tech Validation

Target:

```txt
Dry Tech
slug: dry-tech
```

Capabilities installed through:

```sql
public.apply_capabilities_for_tenant(<dry-tech-tenant-id>, 'laundry')
```

Result:

```json
{
  "inserted": 10,
  "updated": 0,
  "template_slug": "laundry",
  "installed_capabilities": 10
}
```

Installed capabilities:

```txt
accounting
catalog
core
crm
field_service
hr
laundry
orders
reporting
workflow
```

Dry Tech validation after installation:

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
| Installed Capabilities | 10 |
| Permission Bindings | 145 |
| Navigation Items | 57 |

Historical counts preserved:

```txt
PASS
```

---

## 6. Disposable Organization Validation

A disposable organization was created inside a transaction rollback.

Result:

```json
{
  "tenant_created": true,
  "can_enter_platform": true,
  "installed_capabilities": 10,
  "permission_bindings": 145,
  "navigation_items": 47,
  "capabilities": [
    "accounting",
    "catalog",
    "core",
    "crm",
    "field_service",
    "hr",
    "laundry",
    "orders",
    "reporting",
    "workflow"
  ],
  "dry_tech_leak": false
}
```

Validation:

- Disposable organization received installed capabilities.
- Permissions were generated from installed capabilities.
- Navigation was generated from installed capabilities.
- No Dry Tech-specific configuration leaked.
- Transaction was rolled back; no disposable tenant remains.

---

## 7. Known Limitations

1. Capability versioning exists as a field but upgrade mechanics are not implemented yet.
2. Dependency validation checks existence, but does not yet enforce semantic compatibility/version ranges.
3. Capability installation currently enables all template-required capabilities; user-selectable optional pack installation is future work.
4. Future asset types such as workflow/report/form/automation assets are not yet connected to the registry.
5. Marketplace metadata and partner API metadata are future work.
6. Existing compatibility navigation records remain for Dry Tech; runtime de-duplication prefers source-owned assets.

---

## 8. Definition of Done Check

| Requirement | Status |
|---|---|
| Capability Registry exists | PASS |
| Capabilities can declare dependencies | PASS |
| Organizations can install capabilities | PASS |
| Templates reference capabilities | PASS |
| Navigation Assets belong to capabilities | PASS |
| Permission Assets belong to capabilities | PASS |
| Dry Tech works through installed capabilities | PASS |
| Disposable organization passes validation | PASS |
| No industry logic exists in Core registry mechanics | PASS |
| Typecheck passes | PASS |
| Validation report exists | PASS |

---

## 9. Recommendation

Sprint 1C establishes the missing source of truth for reusable capabilities.

Recommended next sprint:

```txt
Sprint 1D — Capability Asset Installation Pipeline
```

or:

```txt
Sprint 2 — Work Order + Task Bridge
```

The next implementation should start using installed capability state to drive more than navigation and permissions, especially workflow/report/dashboard assets.
