# Platform Implementation Order

**Status:** Definitive dependency-driven implementation sequence

## Phase 0 — Engineering Foundation

**Goal:** Make implementation safe before runtime expansion.

**Includes:** PR checklist enforcement, validation scripts, Dry Tech gold validation harness, generator regression harness.

**Depends on:** Governance docs.

**Milestone:** Engineers cannot bypass branch, review, typecheck, and Dry Tech validation rules.

## Phase 1 — Core Engine

**Goal:** Build industry-agnostic execution primitives.

Order:

1. Entity registry and organization context.
2. Permission engine and role mapping.
3. Generated navigation engine.
4. Work Order engine.
5. Task engine.
6. Domain event bus.
7. Configuration loader.
8. Document/form engine primitives.
9. Financial transaction abstraction.
10. Validation/audit engine.

**Milestone:** Core can execute configured behavior without industry conditionals.

## Phase 2 — Platform Services

**Goal:** Services that convert configuration into runtime capability.

Order:

1. Capability pack registry.
2. Template asset application service.
3. Business DNA resolver.
4. Pack composition service.
5. Generated navigation service.
6. Generated permission service.
7. Generated dashboard/report service.
8. Generated notification service.
9. Organization validation service.

**Milestone:** Platform can install capabilities into an organization.

## Phase 3 — Capability Packs

**Goal:** Extract reusable operating capabilities.

Order:

1. CRM Pack.
2. Workflow Management Pack.
3. Field Service Pack.
4. Accounting Pack.
5. Document Pack.
6. Reporting/Dashboard Pack.
7. Notification/Messaging Pack.
8. HR Pack.
9. Inventory Pack.
10. Approval Pack.
11. Scheduling Pack.
12. AI Advisor Pack.

**Milestone:** packs are installable without knowing industries.

## Phase 4 — Business DNA

**Goal:** Owner answers become configuration.

Order:

1. DNA schema.
2. DNA question model.
3. Operating model mapper.
4. Pack selection rules.
5. Default recommendation engine.
6. Change-later policy.

**Milestone:** business type + DNA selects packs/templates.

## Phase 5 — Templates

**Goal:** Industry presets composed from packs.

Order:

1. Laundry Template refactor.
2. Cleaning Template.
3. Maintenance Template.
4. Medical Lab Template.
5. Restaurant Template.
6. Retail Template.
7. Warehouse/Logistics Template.

**Milestone:** templates contain zero Core logic.

## Phase 6 — Organization Generator

**Goal:** Produce complete organization from DNA + packs + template.

Order:

1. Organization shell.
2. Capability installation.
3. Template composition.
4. Navigation generation.
5. Role/permission generation.
6. Workflow/work order generation.
7. Document/form generation.
8. Report/dashboard generation.
9. Notification generation.
10. Validation and first success dashboard.

**Milestone:** new organization enters platform without manual edits.

## Phase 7 — Dry Tech Recovery

**Goal:** Recover Dry Tech behavior through new architecture.

Order:

1. Generated navigation parity.
2. Permission parity.
3. Order → Work Order compatibility bridge.
4. Station/work-area generic renderer.
5. Reporting/dashboard pack parity.
6. Notification/customer journey parity.
7. Accounting mapping parity.
8. Dry Tech data pack extraction.

**Milestone:** Dry Tech regains business behavior as Gold Standard, not legacy app.

## Phase 8 — Marketplace and Ecosystem

**Goal:** Packs/templates become installable products.

Order:

1. Pack marketplace metadata.
2. Template marketplace metadata.
3. Versioning/checksums.
4. Partner APIs.
5. AI-assisted pack/template recommendation.

**Milestone:** platform can grow without Core changes.
