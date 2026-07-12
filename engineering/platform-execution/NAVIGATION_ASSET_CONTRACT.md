# Navigation Asset Contract

**Status:** Sprint 1 implementation contract  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Generic capability-driven navigation, not Dry Tech-specific restoration.

---

## 1. Definition

A Navigation Asset is a configuration record that describes a business navigation entry without embedding industry logic in Core.

A Navigation Asset may define:

- label
- route
- icon
- group / parent
- required roles
- required permissions
- visibility rules
- ordering
- enabled/disabled state
- owning layer
- metadata

---

## 2. Ownership Levels

Every database object created in this sprint must explicitly declare ownership.

| Ownership | Meaning |
|---|---|
| CORE | Objects required by every MJRH installation. |
| CAPABILITY | Objects owned by a reusable business capability. |
| TEMPLATE | Objects used only for initial organization generation. |
| ORGANIZATION | Tenant-specific generated runtime data. |

Do not mix ownership levels.

---

## 3. Layer Responsibilities

## Core Navigation Engine

Core knows how to render and enforce navigation from generated records.

Core does not know Dry Tech, Laundry, station names, or industry-specific routes.

## Capability Navigation Assets

Capability Packs may declare navigation assets.

Examples:

- CRM Pack: Customers, CRM, Customer Care
- Accounting Pack: Accounting, Ledger, Receivables, Cash Closing
- Field Service Pack: Driver, Live Map, Pickups

## Template Navigation Assets

Templates may declare template-specific navigation assets.

Example:

- Laundry Template: Reception, Sorting, Cleaning, Finishing, QC, Packing

## Generated Organization Navigation

Generated organizations receive runtime navigation records from selected Core, Capability, and Template assets.

These records are tenant-specific and may be enabled/disabled later.

---

## 4. Forbidden Patterns

- Core must not hardcode Dry Tech routes.
- Core must not hardcode Laundry routes.
- Core must not copy old sidebar arrays as source of truth.
- Core must not use `if industry == laundry`.
- UI must not own business navigation rules.
- Navigation generation must not alter historical business data.

---

## 5. Migration Safety

Any database migration must:

- be additive when possible
- avoid destructive changes
- preserve existing Dry Tech records
- include rollback consideration

---

## 6. Branch Requirement

This sprint must be implemented on:

```txt
feature/mjrh-v3-core-platform
```

Direct commits to `main` are forbidden.

The branch must be pushed and reviewed before merge.

---

## 7. Definition of Done

1. Core can render navigation from generated Navigation Assets.
2. Capability Packs can declare navigation assets.
3. Templates can compose navigation assets.
4. Dry Tech navigation is generated from configuration.
5. Role visibility works through generated navigation records.
6. Existing Dry Tech historical data remains untouched.
7. No industry-specific Core logic is introduced.
8. A disposable generated organization can receive navigation through the same mechanism.
9. Typecheck passes.
10. Dry Tech validation report is produced.
