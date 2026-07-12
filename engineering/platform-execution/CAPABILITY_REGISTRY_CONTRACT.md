# Capability Registry Contract

**Status:** Sprint 1C implementation contract  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Source of truth for reusable business capabilities and their installable assets.

---

## 1. What is a Capability?

A Capability is a reusable business ability that can be installed into an Organization.

Examples:

- CRM
- Orders
- Workflow
- Field Service
- Accounting
- Reporting
- HR
- Catalog
- Documents
- Notifications

A Capability is not an industry.

A Capability may own Navigation Assets, Permission Assets, and future Workflow/Form/Report/Automation Assets.

---

## 2. Capability Lifecycle

```txt
Proposed
↓
Registered
↓
Installable
↓
Installed in Organization
↓
Enabled / Disabled
↓
Versioned / Upgraded
↓
Deprecated / Retired
```

---

## 3. Capability Ownership

Capability definitions are platform-level source configuration.

Runtime installation is organization-owned data.

| Layer | Owns |
|---|---|
| CORE | Registry mechanics and dependency resolution. |
| CAPABILITY | Capability definition and capability-owned assets. |
| TEMPLATE | Capability composition defaults. |
| ORGANIZATION | Installed/enabled/disabled capability state. |

---

## 4. Capability Dependencies

Capabilities may depend on other capabilities.

Examples:

```txt
Field Service → CRM + Workflow
Accounting → Core + Permissions
Laundry Operations → CRM + Orders + Workflow + Field Service + Accounting
```

Dependencies must be explicit.

No hidden dependency through UI or code imports.

---

## 5. Capability Versioning Roadmap

Sprint 1C establishes a `version` field but does not implement upgrades.

Future versions must support:

- installed version per organization
- migration plan per capability version
- compatibility checks
- asset version pinning

---

## 6. Capability Installation

Installing a Capability means:

1. create organization capability record
2. resolve dependencies
3. install capability assets
4. generate runtime permissions/navigation
5. validate enabled state

Installation must not modify historical business records.

---

## 7. Relationship to Assets

Navigation and Permission Assets must identify the Capability they belong to.

No orphan assets.

```txt
Capability
↓
Permission Assets
↓
Runtime Permission Bindings
```

```txt
Capability
↓
Navigation Assets
↓
Runtime Navigation Items
```

---

## 8. Relationship to Templates

Templates compose capabilities.

A Template does not own Core behavior.

Example:

```txt
Laundry Template = CRM + Orders + Workflow + Field Service + Accounting + Reporting + HR + Laundry Operations
```

---

## 9. Relationship to Organizations

An Organization stores runtime installed capability state:

- installed
- enabled
- disabled
- source template
- install metadata

Organization state is runtime data, not source architecture.

---

## 10. Forbidden Patterns

- Hardcoding capability installation for Dry Tech.
- Hardcoding Laundry capabilities in Core.
- Navigation/permission assets without capability ownership.
- Hidden dependencies in UI or route logic.
- Template modifying Core behavior.
- Capability depending on demo organization data.

---

## 11. Definition of Done

1. Capability Registry exists.
2. Dependencies can be declared.
3. Organizations can install capabilities.
4. Templates reference capabilities.
5. Navigation Assets belong to capabilities.
6. Permission Assets belong to capabilities.
7. Dry Tech installs capabilities through registry.
8. Disposable org installs same capabilities without Dry Tech logic.
9. No industry logic exists in Core registry mechanics.
10. Typecheck passes.
11. Validation report exists.
