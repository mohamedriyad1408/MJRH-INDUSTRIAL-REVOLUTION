# MJRH Architecture Decision Records

**Status:** Official ADR Index  
**Purpose:** Capture major architectural decisions and prevent re-litigation during implementation.

---

## ADR-001 — Business DNA

**Context:** Industry names were too shallow to generate correct operating behavior.

**Problem:** “Laundry” or “Hotel” does not describe whether a business uses stages, inventory, appointments, field work, assets, approvals, quality, or compliance.

**Alternatives considered:** industry-only setup; manual setup; developer configuration.

**Chosen solution:** Business DNA derived from Business Operating Model drives pack/template selection.

**Rejected alternatives:** industry-only creates brittle templates; manual setup overwhelms owners.

**Long-term consequences:** Business Initialization must ask operating questions, not technical questions.

**Future impact:** Enables new industries by operating characteristics.

---

## ADR-002 — Capability Packs

**Context:** Industry templates risk duplicating capabilities.

**Problem:** Laundry, maintenance, logistics, healthcare, and construction share workflow, field service, documents, accounting, CRM, notifications.

**Alternatives considered:** per-industry implementations; shared utility helpers; capability packs.

**Chosen solution:** reusable Business Capability Packs.

**Rejected alternatives:** per-industry logic duplicates behavior; utilities lack business ownership.

**Long-term consequences:** Packs become the main reusable product units.

**Future impact:** Marketplace and partner ecosystem can package capabilities.

---

## ADR-003 — Work Orders

**Context:** Legacy Dry Tech is order/station/service-unit centric.

**Problem:** Not all operational work starts from a customer order.

**Alternatives considered:** keep orders as universal execution unit; create Work Orders; create industry-specific execution records.

**Chosen solution:** Order is commercial; Work Order is execution; Task is action.

**Rejected alternatives:** order-only model fails maintenance, manufacturing, internal work, assets.

**Long-term consequences:** Build compatibility bridge for historical orders.

**Future impact:** Universal execution model.

---

## ADR-004 — Generic Task Engine

**Context:** Station-specific assignment and task behavior limits reuse.

**Problem:** Every business needs actionable assignments, but not every business has stations.

**Chosen solution:** generic Task Engine assigned to actors/teams/work areas.

**Rejected alternatives:** station-only tasks; industry-specific task models.

**Long-term consequences:** Employee routing must become task/work-area based.

**Future impact:** supports field service, clinics, manufacturing, projects.

---

## ADR-005 — Configuration First

**Context:** Hardcoded behavior caused Platform Generator gaps.

**Problem:** Code conditionals cannot scale across industries.

**Chosen solution:** configuration before customization; templates and packs supply behavior.

**Rejected alternatives:** `if industry`, static defaults, hidden bootstrap.

**Long-term consequences:** Business differences are stored as configuration.

**Future impact:** safer generated organizations.

---

## ADR-006 — Generated Navigation

**Context:** Static sidebar contained business capability knowledge.

**Problem:** Dry Tech lost visible behavior when navigation moved toward Core generation.

**Chosen solution:** navigation generated from Core/Pack/Template assets.

**Rejected alternatives:** static sidebar as source of truth.

**Long-term consequences:** Navigation becomes a business asset.

**Future impact:** each generated organization receives correct role-aware navigation.

---

## ADR-007 — Platform Generator

**Context:** Owners should not need developers.

**Problem:** Manual tenant setup and demo scripts do not prove SaaS scalability.

**Chosen solution:** Platform Generator creates organization from Operating Model + DNA + Packs + Template.

**Rejected alternatives:** manual setup, per-customer scripts.

**Long-term consequences:** Business Initialization must produce generator input.

**Future impact:** self-service customer onboarding.

---

## ADR-008 — Template Assets

**Context:** Templates must be replaceable configuration, not code forks.

**Problem:** Industry behavior needs structure without Core coupling.

**Chosen solution:** templates own assets: departments, workflows, services, documents, reports, forms, nav, defaults.

**Rejected alternatives:** custom code per template.

**Long-term consequences:** template registry and asset governance required.

**Future impact:** marketplace-ready industry templates.

---

## ADR-009 — Legacy Retirement

**Context:** Legacy Laundry code preserves valuable business knowledge but also debt.

**Problem:** Blind reuse reintroduces hardcoding.

**Chosen solution:** legacy is evidence; classify as Extract, Rewrite, Reference, Temporary Compatibility, or Delete.

**Rejected alternatives:** copy old code; delete all legacy immediately.

**Long-term consequences:** gradual retirement with validation.

**Future impact:** preserves knowledge without preserving debt.

---

## ADR-010 — Core Isolation

**Context:** Core must support unlimited businesses.

**Problem:** Any Core dependency on Laundry, Dry Tech, or templates compromises reuse.

**Chosen solution:** Core depends only on generic business model and configuration interfaces.

**Rejected alternatives:** Core imports industry templates; Core reads demo org state.

**Long-term consequences:** all industry behavior enters through config/packs/templates.

**Future impact:** Core remains stable as industries expand.
