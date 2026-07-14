# Work Order Canonical Model Contract

**Status:** Sprint 2A implementation contract  
**Branch:** `feature/sprint-2a-work-order-canonical-model`  
**Scope:** Generic Work Order entity for MJRH execution layer.

---

## 1. Definition

A Work Order is the internal execution container for work that must be performed by an Organization.

It is not a customer-facing commercial order.

It is not a Laundry station order.

It is not a UI route.

---

## 2. Canonical Lifecycle

The canonical lifecycle is:

```txt
Draft
Created
In Progress
Blocked
Completed
Cancelled
```

Database canonical values:

```txt
draft
created
in_progress
blocked
completed
cancelled
```

Existing legacy `status` values are preserved for backward compatibility. New canonical behavior uses `canonical_status`.

---

## 3. Required Generic Capabilities

A canonical Work Order must support:

- tenant / organization ownership
- capability ownership
- workflow reference
- source record reference
- parent / child Work Orders
- metadata
- attachment references
- priority
- due date
- blocked reason
- completion/cancellation timestamps

---

## 4. Ownership

| Layer | Owns |
|---|---|
| CORE | Work Order entity shape, lifecycle and generic transition rules. |
| CAPABILITY | Capability-specific work order defaults and future asset definitions. |
| TEMPLATE | Template-specific workflow labels/defaults. |
| ORGANIZATION | Runtime work order records and metadata. |

---

## 5. Forbidden Patterns

- No Laundry-specific fields.
- No station names in Core model.
- No Dry Tech conditional logic.
- No migration of historical Orders in Sprint 2A.
- No Journal Entry changes.
- No UI coupling.
- No task coupling in this sprint.

---

## 6. Definition of Done

1. Existing `work_orders` is extended, not duplicated.
2. Canonical lifecycle exists.
3. Capability link exists.
4. Parent/child Work Orders supported.
5. Source record references supported.
6. Metadata, attachments, priority and due date supported.
7. Generic create/transition functions exist.
8. Dry Tech historical data unchanged.
9. Disposable organization validation passes.
10. No industry logic exists in Core model.
