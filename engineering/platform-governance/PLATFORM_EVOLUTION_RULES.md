# MJRH Platform Evolution Rules

**Status:** Permanent governance rules — pending review  
**Branch:** `feature/mjrh-v3-core-platform`  
**Purpose:** Define how MJRH is allowed to evolve without becoming industry-specific or project-specific.

---

## 1. Permanent Rule

```txt
Every architectural decision must make the platform more reusable, never more specialized.
```

If a decision makes MJRH better for only one industry while weakening the Core Platform, the decision is rejected.

---

## 2. Core Before Industry

Core capabilities must exist before industry-specific templates use them.

Do not solve a problem by writing code for one industry.

Solve it in the Core or a reusable Capability Pack.

---

## 3. Configuration Before Customization

A business difference should first be represented as configuration.

Customization is allowed only after proving configuration cannot express the requirement safely.

Preferred path:

```txt
Configuration
↓
Template setting
↓
Capability Pack extension
↓
Core capability improvement
↓
Custom code only if absolutely unavoidable
```

---

## 4. Business Knowledge Before Database

Do not create tables, columns, APIs, or screens before the business concept is defined.

If a feature requires a new concept, define it first in the Business Knowledge Model or Glossary.

---

## 5. Reusable Before Specific

Before writing a feature, ask:

```txt
Can another industry use this?
```

If yes, build it as Core or Capability Pack.

If no, challenge the design.

---

## 6. Composition Before Duplication

Templates should be assembled from Capability Packs.

Do not duplicate workflow logic, reporting logic, notification logic, or finance logic per industry.

---

## 7. Platform Before Project

MJRH is not a project implementation shop.

The platform is the product.

Customer and demo organizations are generated outputs.

---

## 8. Business Language Before Technical Language

Product decisions should be described in stable business language first.

Technical names are implementation details.

Business owners should not see developer language.

---

## 9. Gold Standard Validation

Every platform capability must be validated against Dry Tech before approval.

Dry Tech is the Official Gold Standard Organization.

Dry Tech is not a sandbox.

---

## 10. Evolution Flow

```txt
Business Concept
↓
Business Knowledge Model / Glossary
↓
Business Operating Model alignment
↓
Business DNA impact
↓
Capability Pack impact
↓
Template impact
↓
Architecture Review
↓
Implementation
↓
Dry Tech validation
↓
Pull Request
↓
Merge approval
```

---

## 11. Stop Conditions

Stop implementation if:

- the feature only makes sense for one industry
- the business concept is not defined
- the terminology is ambiguous
- the change adds hardcoded industry behavior
- another template cannot reuse the capability
- Dry Tech validation is impossible
- the UI exposes technical language to business users

---

## 12. Final Rule

The platform must become more general, more reusable, and more intelligent with every sprint.
