# Permission Engine Validation Report

**Sprint:** Sprint 1B — Permission Binding Engine  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Generic authorization foundation for MJRH V3

---

## 1. Architecture Compliance

Implemented model:

```txt
Actor
↓
Role
↓
Permission
↓
Capability
↓
Resource
↓
Action
↓
Runtime Enforcement
```

Implemented source/runtime split:

```txt
CORE / CAPABILITY / TEMPLATE Permission Assets
↓
ORGANIZATION Runtime Permission Bindings
↓
Authorization Function
↓
Navigation / Runtime Consumers
```

Ownership levels are explicit:

| Ownership | Purpose |
|---|---|
| CORE | Permission assets required by every MJRH installation. |
| CAPABILITY | Reusable business capability permissions. |
| TEMPLATE | Template-specific permissions used during organization generation. |
| ORGANIZATION | Tenant-specific runtime permission bindings. |

---

## 2. Permission Model Test

Core permission asset model:

```txt
core_permission_assets
```

Runtime organization binding model:

```txt
core_permission_bindings
```

Canonical permission shape:

```txt
capability.resource.action
```

Examples generated:

```txt
orders.order.view
orders.order.create
crm.customer.view
accounting.finance.approve
workflow.task.complete
field_service.delivery.view
reports.report.export
laundry.station.view
```

No permission key uses Dry Tech-specific names.

Laundry-specific station permissions are TEMPLATE-owned:

```txt
ownership_level = TEMPLATE
owner_key = laundry
```

---

## 3. Runtime Authorization Functions

Created generic authorization functions:

```sql
actor_has_permission(tenant_id, actor_user_id, capability_key, resource_key, action_key)
current_actor_has_permission(tenant_id, capability_key, resource_key, action_key)
get_actor_permissions(tenant_id, actor_user_id)
```

These functions evaluate runtime organization permission bindings, not UI visibility alone.

---

## 4. Navigation Integration

Sprint 1A navigation assets now carry permission requirements.

Example flow:

```txt
Navigation Asset
↓
required_permissions
↓
Actor Permission Check
↓
Visible / Hidden
```

`AppSidebar` now loads actor permissions and can filter generated navigation by permission, while preserving legacy role fallback during compatibility.

---

## 5. Dry Tech Validation

Target organization:

```txt
Dry Tech
slug: dry-tech
```

Runtime permission generation:

```json
{
  "inserted": 145,
  "updated": 0,
  "template_slug": "laundry",
  "total_permission_bindings": 145
}
```

Dry Tech record validation after permission generation:

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
| Permission Bindings | 145 |
| Navigation Items | 57 |
| Navigation Items with Permissions | 47 |

Historical data unchanged.

Dry Tech authorization checks:

| Check | Result |
|---|---|
| Owner can view orders | PASS |
| Owner can approve finance | PASS |
| Courier can view delivery | PASS |
| Courier cannot approve finance | PASS |
| Employee can complete tasks | PASS |
| Dry Tech-specific permission logic | FALSE |

---

## 6. Disposable Organization Validation

A disposable organization was created inside a transaction rollback.

Result:

```json
{
  "tenant_created": true,
  "can_enter_platform": true,
  "permission_bindings": 145,
  "nav_with_permissions": 47,
  "owner_orders_view": true,
  "owner_finance_approve": true,
  "dry_tech_leak": false
}
```

Validation:

- new organization received permissions using the same mechanism
- navigation records carried permission requirements
- owner permissions worked
- no Dry Tech-specific permission key leaked
- transaction rolled back; no disposable tenant remains

---

## 7. Security Validation

| Requirement | Result |
|---|---|
| Authorization exists below UI | PASS — SQL functions evaluate permissions. |
| UI hiding is not sole protection | PASS — `actor_has_permission` can be used by services/RPCs. |
| Navigation can use permissions | PASS — `required_permissions` wired into generated nav. |
| Existing user roles preserved | PASS — `user_roles` not destroyed or replaced. |
| Legacy fallback preserved | PASS — role checks remain as compatibility. |
| Industry logic in Core | PASS — no Dry Tech/Laundry conditionals in permission functions. |

---

## 8. Known Limitations

1. Route-level enforcement is not fully migrated yet.
   - Current sprint provides the generic authorization foundation and navigation integration.
   - Future sprints should migrate route/service actions to `actor_has_permission`.

2. API/service-level protection must be adopted progressively.
   - Functions exist, but not every RPC/service route has been converted.

3. `user_roles` and generated `core_roles` still coexist.
   - This is intentional compatibility.
   - Future work should unify role templates and runtime role assignments.

4. Permission conditions are stored but not deeply evaluated yet.
   - Current model supports conditions as JSON.
   - Future engine iterations can evaluate thresholds, branch scope, ownership, etc.

5. Deny precedence is not fully used yet.
   - `effect` supports allow/deny.
   - Current generation uses allow bindings.

---

## 9. Definition of Done Check

| Requirement | Status |
|---|---|
| Permission Engine is generic | PASS |
| Actor authorization works | PASS |
| Roles map to permissions | PASS |
| Capabilities can declare permissions | PASS |
| Templates can compose permissions | PASS |
| Navigation uses permission checks | PASS |
| Runtime enforcement exists below UI | PASS |
| Dry Tech works through configuration | PASS |
| No industry logic exists in Core | PASS |
| Documentation contract exists | PASS |
| Typecheck passes | PASS |
| Validation report created | PASS |

---

## 10. Recommendation

Sprint 1B establishes the generic authorization foundation.

Recommended next sprint:

```txt
Sprint 1C — Capability Pack Registry Foundation
```

or, if continuing the visible Dry Tech continuity path:

```txt
Sprint 1C — Route/Action Permission Enforcement for generated navigation targets
```

The next step should start using `actor_has_permission` beyond navigation so permissions control actions and services, not only visibility.
