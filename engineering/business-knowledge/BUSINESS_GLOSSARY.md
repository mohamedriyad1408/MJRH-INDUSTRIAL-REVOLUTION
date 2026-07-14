# MJRH Business Glossary

**Status:** Official glossary draft — pending review  
**Purpose:** Ensure every business term has exactly one meaning across the platform.

---

## Glossary Rules

1. One word means one thing.
2. Do not use the same word for multiple concepts.
3. Do not expose technical/internal names to business users.
4. If a term is unclear, update this glossary before implementing features.
5. UI labels, database naming, APIs, TypeScript types, docs, and tests must align with this glossary.

---

## Official Terms

| Term | Official meaning | Do not use it to mean |
|---|---|---|
| Organization | The business entity operated in MJRH. | Branch, customer account, tenant UI wording. |
| Branch | A physical or operational location. | Department or workflow stage. |
| Department | A responsibility area inside an Organization. | Location or station. |
| Station | A physical or operational work point inside a workflow context. | Department, branch, or role. |
| Actor | A person, team, system, or external party that performs or influences work. | Only employee. |
| Role | Permission and responsibility pattern assigned to an Actor. | Person, job title only, department. |
| Owner | Actor with ultimate Organization authority. | Customer owner of an asset unless explicitly stated. |
| Manager | Actor responsible for a business area. | Owner unless explicitly granted owner authority. |
| Supervisor | Actor overseeing execution or quality for a scope. | Manager, owner, or department. |
| Customer | Person or organization receiving value from the business. | Internal user or supplier. |
| Supplier | External party providing goods, services, labor, or materials. | Customer. |
| Service | Work performed by the business. | Product or inventory item. |
| Product | A thing sold, made, stocked, rented, or delivered. | Service. |
| Asset | Individually tracked object with lifecycle/history. | Generic stock quantity. |
| Inventory Item | Stock counted by quantity, movement, and consumption. | Individually tracked asset. |
| Order | Customer-facing commercial request. | Internal execution record. |
| Work Order | Internal execution record for work to be performed. | Commercial order or single task. |
| Task | Specific action assigned to an Actor or team. | Whole order or work order. |
| Job | Avoid as primary term. If used, it means informal work item in user copy only. | Order, work order, or task in technical naming. |
| Activity | Recorded action or event in history/audit. | Task unless assigned and actionable. |
| Workflow | Path work follows from start to finish. | Department, station, or order. |
| Workflow Stage | A named step inside a Workflow. | Department or station. |
| Approval | Controlled decision required before an action proceeds. | General review without decision authority. |
| Document | Formal or operational record. | Report or notification. |
| Financial Transaction | Money-related business event. | Industry-specific payment type in Core. |
| Report | Structured answer to a business question. | Raw table or dashboard widget only. |
| Dashboard | Visual summary and next actions for a role or business area. | Report definition. |
| Notification | Message or alert sent to someone or a system. | Audit log. |
| Template | Configurable starting package for an industry/business type. | Core code or demo organization. |
| Capability Pack | Reusable package for a business operating need. | Industry template. |
| Business DNA | Operating characteristics used to select packs/templates. | Industry name only. |
| Demo Organization | Disposable organization generated for demo/testing. | Core platform or template. |
| Gold Standard Organization | Stable benchmark organization used for validation. | Development sandbox. |

---

## Terms to Avoid in Customer-Facing UI

| Avoid | Use instead |
|---|---|
| Tenant | Business / Organization |
| Schema | Setup / Structure |
| Engine | Feature / Area / System behavior |
| Workflow Blueprint | Work steps / Work flow |
| Template Asset | Recommended item / Starting plan item |
| RPC | Action |
| Migration | Update |
| RLS | Security rules |
| Entity | Record / item |
| Config JSON | Settings |
| Seed data | Sample data |
| CRUD | Add, edit, delete |

---

## Ambiguous Terms and Resolution

### Order vs Work Order vs Task

```txt
Order = what the customer requested and pays for.
Work Order = what the business must execute.
Task = what someone must do next.
```

### Department vs Station vs Workflow Stage

```txt
Department = responsibility.
Station = work point.
Workflow Stage = progress step.
```

### Service vs Product vs Asset vs Inventory Item

```txt
Service = work performed.
Product = thing sold/made/delivered.
Asset = individually tracked object.
Inventory Item = stock quantity.
```

---

## Final Rule

The same word must never have multiple meanings across MJRH.
