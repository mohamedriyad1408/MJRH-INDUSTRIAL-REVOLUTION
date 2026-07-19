# Permission Engine Contract

**Status:** Sprint 1B implementation contract  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Generic authorization foundation for MJRH V3.

---

## 1. Actor

An Actor is any person, team, customer, supplier, system, or integration that can request or perform an action.

In the current runtime, human actors are primarily represented by authenticated users plus organization role assignments.

---

## 2. Role

A Role is a responsibility profile assigned to an Actor inside an Organization.

Core does not know industry job titles.

Core only knows that a role can receive permissions.

Examples of role keys may come from templates or organization configuration.

---

## 3. Permission

A Permission is a rule allowing an Action on a Resource inside a Capability.

Canonical shape:

```txt
capability.resource.action
```

Examples:

```txt
orders.order.create
crm.customer.view
accounting.journal_entry.view
reports.report.export
```

Forbidden examples:

```txt
laundry.receive_garment
drytech.finish_item
```

---

## 4. Capability

A Capability is a reusable business ability such as CRM, Orders, Workflow, Accounting, Reporting, Field Service, Documents, or HR.

Capabilities may declare Permission Assets.

Capabilities must not know industries.

---

## 5. Resource

A Resource is the object or area being accessed.

Examples:

- customer
- order
- work_order
- task
- report
- document
- financial_transaction
- navigation_item
- configuration

---

## 6. Action

An Action is the operation being attempted.

Examples:

- view
- create
- update
- delete
- approve
- assign
- export
- print
- pay
- close
- configure

---

## 7. Permission Binding

A Permission Binding connects a Role to a Permission for one Organization.

The binding is runtime organization configuration.

It may be generated from:

- CORE permission assets
- CAPABILITY permission assets
- TEMPLATE permission assets
- ORGANIZATION overrides

---

## 8. Ownership Boundaries

| Layer | Owns |
|---|---|
| CORE | Permission model, authorization engine, permission evaluation. |
| CAPABILITY | Capability-specific permissions and default role bindings. |
| TEMPLATE | Default role compositions and template-specific permission bindings. |
| ORGANIZATION | Custom roles, custom assignments, generated runtime permission bindings. |

Do not mix ownership levels.

---

## 9. Runtime Enforcement Rules

- UI hiding is not security.
- Navigation visibility can consume permissions, but Permission Engine must exist below UI.
- Route/service/database checks should use the same permission model over time.
- Legacy role checks may remain as temporary compatibility until parity is proven.

---

## 10. Forbidden Patterns

- Hardcoded Dry Tech roles in Core.
- Hardcoded Laundry permissions in Core.
- `if industry == laundry` authorization.
- Permission checks that exist only in React components.
- Navigation-only authorization.
- Removing legacy access before validation.
- Breaking existing `user_roles` access.

---

## 11. Database Ownership Rule

Every database object created in this sprint must explicitly belong to one layer:

- CORE: required by every MJRH installation.
- CAPABILITY: owned by reusable business capability modules.
- TEMPLATE: used during organization generation.
- ORGANIZATION: tenant-specific runtime configuration.

---

## 12. Definition of Done

1. Permission asset model exists.
2. Runtime organization permission bindings can be generated.
3. Existing `user_roles` remain intact.
4. Generic authorization check exists.
5. Navigation can depend on permissions.
6. Dry Tech data remains unchanged.
7. Disposable organization can receive permissions.
8. No industry logic exists in Core.
9. Typecheck passes.
10. Validation report is produced.
