# Work Order Canonical Model Validation Report

**Sprint:** Sprint 2A — Work Order Canonical Model  
**Branch:** `feature/sprint-2a-work-order-canonical-model`  
**Scope:** Generic canonical Work Order entity for MJRH execution layer

---

## 1. Architecture Compliance

Implemented direction:

```txt
Capability Registry
↓
Capability Assets
↓
Permission Engine
↓
Canonical Work Order Model
↓
Future Task Engine
↓
Future Workflow / Station Bridge
```

This sprint does **not** implement Tasks, station bridge, historical order migration, or UI changes.

The Work Order model is generic and not tied to Laundry, Dry Tech, or station names.

---

## 2. Existing Table Strategy

The existing `public.work_orders` table was extended instead of creating a duplicate model.

Reason:

- `work_orders` already existed as the intended generic execution container.
- Duplicating it would create a competing source of truth.
- Sprint 2A should stabilize the canonical model, not create another table.

---

## 3. Canonical Fields Added

Additive fields added to `public.work_orders`:

| Field | Purpose |
|---|---|
| `canonical_status` | Canonical lifecycle independent of legacy status. |
| `capability_key` | Capability that owns the work behavior. |
| `resource_type` | Generic resource type, default `work_order`. |
| `source_entity` | Optional polymorphic source entity, e.g. order, appointment, asset. |
| `source_id` | Optional polymorphic source record ID. |
| `parent_work_order_id` | Parent/child Work Order hierarchy. |
| `metadata` | Generic metadata. |
| `attachment_refs` | Generic attachment references. |
| `due_at` | Business due date. |
| `blocked_reason` | Reason when canonical status is blocked. |
| `cancelled_at` | Cancellation timestamp. |
| `cancelled_by` | User that cancelled. |
| `completed_by` | User that completed. |

---

## 4. Canonical Lifecycle

Canonical lifecycle values:

```txt
draft
created
in_progress
blocked
completed
cancelled
```

Existing legacy `status` remains for backward compatibility.

A sync trigger maps canonical lifecycle to legacy status values:

| Canonical | Legacy compatibility |
|---|---|
| draft | open |
| created | open |
| in_progress | in_progress |
| blocked | waiting |
| completed | completed |
| cancelled | cancelled |

---

## 5. Generic Functions Added

### `create_canonical_work_order(...)`

Creates a canonical Work Order without industry-specific fields.

Requires `workflow_id` because the current schema still uses workflow definitions as execution context.

### `transition_canonical_work_order(...)`

Validates and applies canonical lifecycle transitions.

Supported transition pattern:

```txt
draft → created / cancelled
created → in_progress / blocked / cancelled
in_progress → blocked / completed / cancelled
blocked → in_progress / cancelled
completed → completed
cancelled → cancelled
```

### `v_canonical_work_orders`

Read view exposing canonical fields while preserving legacy status for compatibility.

---

## 6. Disposable Organization Validation

A disposable organization was created inside a transaction rollback.

Validation executed:

- create tenant
- complete setup
- apply platform assets
- create generic workflow definition
- create workflow stages
- create parent Work Order
- create child Work Order
- transition parent through lifecycle
- read from canonical view
- rollback transaction

Validation result:

```json
{
  "tenant_created": true,
  "can_enter_platform": true,
  "parent_status": "completed",
  "parent_legacy_status": "completed",
  "child_parent_valid": true,
  "metadata_present": true,
  "attachment_refs_present": true,
  "view_reads": true
}
```

---

## 7. Dry Tech Safety Validation

Dry Tech was not migrated.

Dry Tech historical Orders were not modified.

Dry Tech Journal Entries were not modified by this sprint.

Dry Tech current observed execution counts during validation:

```json
{
  "dry_tech_work_orders_count": 0,
  "dry_tech_orders_count": 530,
  "dry_tech_journals_count": 618
}
```

Important note:

- Sprint 2A does not alter Dry Tech historical records.
- The validation was executed inside a rollback transaction for disposable data.
- Dry Tech remains a legacy order-based gold standard until Sprint 2D Historical Bridge.

---

## 8. What This Sprint Does Not Do

This sprint intentionally does not:

- create Task Engine
- connect Tasks to Work Orders
- connect station workflow to Work Orders
- map historical Dry Tech Orders to Work Orders
- modify legacy Orders
- modify Journal Entries
- modify Dry Tech services/customers/employees
- change UI routes
- remove legacy workflow code

---

## 9. Known Limitations

1. `workflow_id` is still required because current schema depends on workflow definitions.
2. `source_entity/source_id` are polymorphic and intentionally do not have a single FK.
3. `metadata` and `attachment_refs` are generic JSONB fields; future packs should define schemas for them.
4. Legacy status remains and is synchronized for compatibility.
5. Task Engine is not implemented yet.
6. Historical Bridge is not implemented yet.

---

## 10. Definition of Done Check

| Requirement | Status |
|---|---|
| Canonical Work Order Model exists | PASS |
| Existing `work_orders` extended, not duplicated | PASS |
| Canonical lifecycle exists | PASS |
| Capability link exists | PASS |
| Metadata supported | PASS |
| Attachments supported | PASS |
| Priority and due date supported | PASS |
| Parent/child Work Orders supported | PASS |
| Generic create function exists | PASS |
| Generic transition function exists | PASS |
| No Laundry-specific fields | PASS |
| No station coupling | PASS |
| No historical Dry Tech migration | PASS |
| Disposable organization validation passes | PASS |
| Typecheck passes | PASS |

---

## 11. Recommendation

Proceed to:

```txt
Sprint 2B — Generic Task Engine
```

The Task Engine should attach to canonical Work Orders and must remain independent from station names and Laundry-specific concepts.
