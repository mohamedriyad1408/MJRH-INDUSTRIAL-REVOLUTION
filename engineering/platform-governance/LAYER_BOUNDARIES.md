# MJRH Layer Boundaries

**Status:** Official Layer Contract

---

## Core

**Purpose:** Generic engines and execution mechanics.

**Responsibilities:** auth boundaries, organization isolation, branch engine, actor/permission engine, workflow execution, work orders, tasks, finance mechanics, documents mechanics, notification mechanics, reporting mechanics, configuration loading.

**May depend on:** Business Knowledge Model interfaces, configuration contracts.

**Must never depend on:** templates, packs as implementations, Dry Tech, Laundry, demo data, React components.

**Examples:** Permission Engine, Task Engine, Finance Engine.

**Required interfaces:** configuration loader, domain event bus, permission check, entity registry.

---

## Platform

**Purpose:** Turn business knowledge/configuration into generated organizations.

**Responsibilities:** Business Initialization, Platform Generator, Template Registry, Capability Pack Registry, generated navigation, validation tooling.

**May depend on:** Core, Business Operating Model, Business DNA, Pack/Template definitions.

**Must never depend on:** one customer org as source of truth.

**Examples:** Organization Generator, Business DNA processing.

**Required interfaces:** generator input/output contracts, pack composition contract.

---

## Capability Packs

**Purpose:** Reusable operating capabilities.

**Responsibilities:** define pack assets, rules, forms, reports, workflows, events, navigation/actions.

**May depend on:** Core interfaces, Platform pack contract.

**Must never depend on:** industry names, demo organizations, customer data.

**Examples:** CRM Pack, Accounting Pack, Field Service Pack.

**Required interfaces:** pack manifest, asset definitions, event subscriptions.

---

## Templates

**Purpose:** Industry/business presets composed from Capability Packs.

**Responsibilities:** labels, starter workflows, department/work-area definitions, service defaults, documents, reports, forms.

**May depend on:** Capability Packs and Template Registry.

**Must never depend on:** Core internals or customer org data.

**Examples:** Laundry Template, Clinic Template.

**Required interfaces:** template manifest, pack composition list, asset definitions.

---

## Generated Organizations

**Purpose:** Runtime business instances produced by generator.

**Responsibilities:** hold organization-specific configuration/data/history.

**May depend on:** generated config, runtime Core services.

**Must never depend on:** being architecture source.

**Examples:** Dry Tech, customer organizations, demo organizations.

**Required interfaces:** tenant/org config, feature flags, generated assets.

---

## Runtime

**Purpose:** Execute and render generated behavior.

**Responsibilities:** UI rendering, API calls, task execution, workflows, reports, messages.

**May depend on:** Core APIs and generated config.

**Must never depend on:** hardcoded industry behavior.

**Examples:** dashboard, order/work order screens, customer portal.

**Required interfaces:** runtime config reader, permission guard, event dispatcher.

---

## Demo

**Purpose:** Disposable proof/training/testing organizations and data.

**Responsibilities:** sample data, demo flows, videos, training.

**May depend on:** templates/generator.

**Must never depend on:** Core internals; must never define Core.

**Examples:** generated demos.

**Required interfaces:** demo data import/export.

---

## Legacy

**Purpose:** Evidence and temporary compatibility only.

**Responsibilities:** preserve business knowledge until extracted; keep old flows working only where approved.

**May depend on:** nothing new.

**Must never depend on:** future architecture as source of truth.

**Examples:** legacy laundry workflow v1, static station routes.

**Required interfaces:** retirement plan, reference-only docs.
