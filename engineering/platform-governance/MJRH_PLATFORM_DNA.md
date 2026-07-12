# MJRH Platform DNA

**Status:** Mandatory platform knowledge preservation document  
**Purpose:** Preserve why MJRH is built this way, not only what it does.

---

## 1. Core Belief

```txt
The software should know more about running a business than the business owner does.
```

MJRH is not a CRUD app.

MJRH is an operating intelligence platform that understands, proposes, explains, and asks for confirmation.

---

## 2. Why This Architecture Exists

MJRH started with a strong Laundry implementation. That implementation proved value but also exposed the risk of building too deeply around one industry.

The architecture pivot exists to prevent the product from becoming:

```txt
one excellent Laundry system
```

and instead become:

```txt
a universal business operating platform
```

---

## 3. Rejected Alternatives

| Alternative | Why Rejected |
|---|---|
| Build separate apps per industry | Duplicates logic and destroys platform leverage. |
| Add `if industry == X` in Core | Makes Core specialized and unmaintainable. |
| Copy old Laundry code into new architecture | Preserves behavior but imports technical debt. |
| Make Demo Organizations the development environment | Demo data would define architecture incorrectly. |
| Use static sidebar/routes as business model | UI becomes source of truth instead of configuration. |
| Keep tenant bootstrap as hidden default generator | Causes untraceable mutations and bypasses templates. |

---

## 4. Constraints

- Core must be industry-agnostic.
- Business behavior must be configurable.
- Templates must be replaceable.
- Capability Packs must be composable.
- Dry Tech is Gold Standard, not a development sandbox.
- No direct development on `main`.
- No hardcoded industry behavior in Core.
- No customer-facing technical language.

---

## 5. Assumptions

- Most businesses can be represented through common operating models.
- Industry templates are compositions of reusable capability packs.
- Owners prefer confirmation over configuration.
- Business data integrity matters more than internal database IDs.
- Historical business knowledge is valuable even when implementation is obsolete.
- Platform Generator must become the only future source of runtime organization behavior.

---

## 6. Layer Boundaries

```txt
Core Platform
= generic engines and execution mechanics

Business Operating Model
= how a business fundamentally operates

Business DNA
= specific characteristics of one business

Capability Packs
= reusable business capabilities

Industry Templates
= preset compositions of packs

Generated Organizations
= runtime output, not architecture source
```

---

## 7. What Must Never Be Broken

- Organization data isolation.
- Business identity and historical continuity.
- Dry Tech Gold Standard integrity.
- Configuration-first philosophy.
- Core independence from Laundry.
- Owner-first language.
- Architecture review before risky changes.
- Backup/restore verification before destructive changes.

---

## 8. Guardrails Against Legacy Reintroduction

If a developer wants to reuse old code, they must answer:

1. What business knowledge does this code preserve?
2. Is the behavior universal or industry-specific?
3. Should it be Core, Pack, Template, Data, or Obsolete?
4. Does it introduce hardcoded industry behavior?
5. Would it still work if Laundry disappeared?
6. Has it been validated against Dry Tech?

If any answer is unsafe:

```txt
Stop and redesign.
```

---

## 9. Platform DNA Summary

```txt
Core is permanent.
Business knowledge is permanent.
Operating models are reusable.
Business DNA is configurable.
Capability Packs are composable.
Templates are replaceable.
Demo organizations are disposable.
Customer organizations are generated.
Legacy implementation is evidence, not architecture.
```

---

## 10. Final Rule

Future teams must preserve the reason behind MJRH, not only its screens.

The product survives if the business language, operating model, and configuration-first architecture survive.
