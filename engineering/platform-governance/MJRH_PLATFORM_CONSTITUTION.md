# MJRH Platform Constitution

**Status:** Immutable Platform Governance  
**Branch:** `feature/mjrh-v3-core-platform`  
**Purpose:** Define the architectural laws that all future MJRH implementation must obey.

---

## Law Format

Each law includes:

- Rule ID
- Statement
- Rationale
- Examples
- Allowed
- Forbidden
- Enforcement level

Enforcement levels:

- **Absolute** — violation blocks implementation/merge.
- **Strict** — requires architecture review before exception.
- **Guiding** — preferred direction; deviations must be documented.

---

## CON-001 — Core Isolation

**Statement:** Core must never depend on Templates, Industries, Demo Organizations, or Customer Organizations.

**Rationale:** The Core Platform is the product. It must remain reusable for every future business.

**Examples:** Workflow execution, task assignment, finance posting, document rendering mechanics.

**Allowed:** Core depends on generic business entities and configuration interfaces.

**Forbidden:** Core imports Laundry Template, checks `industry === 'laundry'`, or reads Dry Tech-specific data.

**Enforcement level:** Absolute.

---

## CON-002 — Capability Packs Must Not Know Industries

**Statement:** Capability Packs implement reusable operating capabilities, not industry-specific behavior.

**Rationale:** A Workflow Pack must work for laundry, construction, healthcare, manufacturing, and maintenance.

**Examples:** CRM Pack, Field Service Pack, Accounting Pack, Notification Pack.

**Allowed:** Pack accepts configuration from templates.

**Forbidden:** Pack contains hotel/laundry/hospital conditionals.

**Enforcement level:** Absolute.

---

## CON-003 — Templates Configure, They Do Not Modify Core

**Statement:** Templates are configuration packages that compose capability packs; they must never patch Core behavior.

**Rationale:** Templates are replaceable. Core is permanent.

**Allowed:** Template defines workflows, labels, services, documents, reports, forms, navigation assets.

**Forbidden:** Template changes Core functions or creates custom backend logic per industry.

**Enforcement level:** Absolute.

---

## CON-004 — Runtime Must Never Infer Industry

**Statement:** Runtime behavior must read configuration; it must not infer behavior from industry names.

**Rationale:** Industry names are shortcuts. Business Operating Model + Business DNA are the source of behavior.

**Allowed:** Runtime loads generated workflow/config/navigation rules.

**Forbidden:** `if (businessType === 'laundry')`, `switch(industry)`.

**Enforcement level:** Absolute.

---

## CON-005 — Navigation Must Be Generated

**Statement:** Business navigation must be generated from Core/Pack/Template configuration.

**Rationale:** Static navigation caused lost behavior during the transition.

**Allowed:** UI component renders navigation records.

**Forbidden:** Static sidebar arrays as the source of business capability availability.

**Enforcement level:** Strict.

---

## CON-006 — Business Rules Must Never Live in UI

**Statement:** React components may display and collect data, but must not own business rules.

**Rationale:** UI changes should not alter business meaning.

**Allowed:** UI calls a rule engine or reads rule configuration.

**Forbidden:** Pricing rules, approval rules, workflow transitions, accounting logic inside UI components.

**Enforcement level:** Absolute.

---

## CON-007 — Configuration Before Conditionals

**Statement:** Business differences must be represented as configuration before code conditionals.

**Rationale:** MJRH must generate unlimited businesses.

**Allowed:** Configurable flags, templates, packs, forms, workflows, event rules.

**Forbidden:** hardcoded departments, workflows, stations, roles, documents, reports.

**Enforcement level:** Absolute.

---

## CON-008 — Legacy Code Is Evidence, Never Architecture

**Statement:** Legacy implementation may be studied to recover business knowledge, but must not define future architecture.

**Rationale:** Copying legacy behavior imports technical debt.

**Allowed:** Extract intent, rules, events, data shapes.

**Forbidden:** Reconnect legacy workflow/runtime as the V3 source of truth.

**Enforcement level:** Absolute.

---

## CON-009 — Business DNA Drives Organization Behavior

**Statement:** Business DNA, derived from the Business Operating Model, is the source of organization behavior.

**Rationale:** Industry name alone is not enough.

**Allowed:** Business DNA selects packs/templates/defaults.

**Forbidden:** Runtime behavior chosen directly from industry labels.

**Enforcement level:** Absolute.

---

## CON-010 — Every Runtime Behavior Has One Architectural Home

**Statement:** Every runtime behavior must belong to exactly one architectural layer.

**Rationale:** Duplicate ownership caused scattered logic.

**Allowed:** Core executes, Pack provides reusable capability, Template configures, Organization stores generated data.

**Forbidden:** Same behavior duplicated in UI, migration, helper, and template.

**Enforcement level:** Strict.

---

## CON-011 — Dry Tech Is Gold Standard, Not Core Dependency

**Statement:** Dry Tech validates the platform but must never define Core behavior.

**Rationale:** Gold Standard organizations are benchmarks, not architecture.

**Allowed:** Validate future capabilities in Dry Tech.

**Forbidden:** Core depends on Dry Tech IDs, services, branches, or records.

**Enforcement level:** Absolute.

---

## CON-012 — Platform Generator Is the Future Runtime Source

**Statement:** New organizations must be created through the Platform Generator and configuration, not manual scripts.

**Rationale:** Generation proves platform scalability.

**Allowed:** scripts for validation/temporary analysis with governance.

**Forbidden:** permanent production flows that bypass the generator.

**Enforcement level:** Strict.
