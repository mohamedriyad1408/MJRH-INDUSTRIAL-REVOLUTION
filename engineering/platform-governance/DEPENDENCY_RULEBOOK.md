# MJRH Dependency Rulebook

**Status:** Official Dependency Law

---

## Legal Direction

```txt
Core
↓
Platform
↓
Capability Packs
↓
Templates
↓
Generated Organizations
↓
Runtime
```

Legacy may be referenced only as evidence during extraction and must not become an upward dependency.

---

## Allowed Dependencies

| From | May depend on |
|---|---|
| Core | generic interfaces, business model contracts, configuration contracts |
| Platform | Core, Business Operating Model, Business DNA, pack/template manifests |
| Capability Pack | Core public interfaces, Platform pack contract |
| Template | Capability Pack manifests/assets |
| Generated Organization | generated configuration and runtime Core services |
| Runtime | Core APIs and generated configuration |
| Demo | templates, generator, demo data import |
| Legacy | no new dependencies; evidence only |

---

## Forbidden Dependencies

| Forbidden | Why |
|---|---|
| Core → Template | Makes Core replaceability impossible. |
| Core → Dry Tech | Turns Gold Standard into product dependency. |
| Core → Laundry | Makes Core industry-specific. |
| Pack → Demo | Demo data must not define capability behavior. |
| Pack → Industry name | Packs are reusable operating capabilities. |
| Template → Core internals | Templates configure through public contracts only. |
| Generated Organization → Architecture | Runtime output must not define architecture. |
| UI → Business Rules | React components must not own business decisions. |
| Business Rules → React Components | Rules must be UI-independent. |
| Industry → Core | Industry behavior belongs in templates/packs. |
| Database trigger → hidden business behavior | Automations must be explicit and governed. |
| Static sidebar → business capability source | Navigation must be generated. |

---

## Dependency Review Test

Before implementation, ask:

1. Does this dependency point downward?
2. Does it introduce industry knowledge upward?
3. Does it make Core aware of a template or organization?
4. Does it make UI own business rules?
5. Can it be expressed as configuration?

If unsafe:

```txt
Stop and redesign.
```
