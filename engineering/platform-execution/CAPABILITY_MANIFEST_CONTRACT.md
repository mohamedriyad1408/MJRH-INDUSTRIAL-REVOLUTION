# Capability Manifest Contract

**Status:** Sprint 1D implementation contract  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Canonical description of installable reusable business capabilities.

---

## 1. Capability Manifest

A Capability Manifest is the canonical definition of a reusable business capability before it is installed into an Organization.

It describes:

- identity
- version
- owner
- dependencies
- navigation assets
- permission assets
- future asset references
- install hooks, reserved
- uninstall hooks, reserved
- metadata

The Manifest is source knowledge.

Organization runtime tables store only installed/enabled/disabled state and organization-specific configuration.

---

## 2. Manifest Ownership

| Ownership | Meaning |
|---|---|
| CORE | Capability required by every MJRH installation. |
| CAPABILITY | Reusable business capability. |
| TEMPLATE | Template-specific capability layer. |

Manifest ownership is not tenant ownership.

Installed capability state is organization-owned runtime data.

---

## 3. Registry Relationship

The Capability Registry is the catalog of available capabilities.

The Manifest is the detailed installable definition attached to or derived from the registry entry.

```txt
Capability Manifest
↓
Capability Registry
↓
Dependency Resolution
↓
Installation Pipeline
↓
Organization Runtime State
```

---

## 4. Installation Lifecycle

```txt
Manifest Loaded
↓
Dependencies Resolved
↓
Capability Registered / Verified
↓
Organization Capability Installed
↓
Assets Applied
↓
Runtime Validated
```

---

## 5. Dependency Loading

Dependencies must be explicit.

A capability may depend on:

- CORE platform capability
- another reusable CAPABILITY

Hidden dependencies through UI, route code, or hardcoded assumptions are forbidden.

---

## 6. Future Marketplace Compatibility

The manifest structure must be compatible with future marketplace requirements:

- semantic versioning
- owner/publisher metadata
- dependency declarations
- asset lists
- compatibility metadata
- install/uninstall hooks, reserved but not executed in this sprint

---

## 7. Forbidden Patterns

- Capability installed without manifest/registry entry.
- Organization runtime state treated as source definition.
- Hardcoded Dry Tech installation.
- Hardcoded Laundry installation in Core.
- Hidden dependency on UI route existence.
- Hooks that execute arbitrary runtime behavior in this sprint.

---

## 8. Definition of Done

1. Capability Manifest model exists.
2. Manifest can be built for every registered capability.
3. Manifest includes dependencies, navigation assets, permission assets, and metadata.
4. Installation pipeline uses manifest-derived definitions.
5. Dry Tech capabilities still install and validate.
6. Disposable organization installs from manifests.
7. Existing Sprint 1A/1B/1C behavior remains intact.
8. No historical Dry Tech data is modified.
9. Typecheck passes.
10. Validation report exists.
