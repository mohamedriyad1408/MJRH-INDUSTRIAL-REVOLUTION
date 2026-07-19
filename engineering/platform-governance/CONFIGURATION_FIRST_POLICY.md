# MJRH Configuration First Policy

**Status:** Permanent policy — pending review  
**Purpose:** Ensure business differences are expressed through configuration, templates, and packs instead of hardcoded industry logic.

---

## 1. Core Policy

Everything that varies by business, industry, country, workflow, team, customer, or operating model should be configurable whenever possible.

The Core Platform must not contain industry assumptions.

---

## 2. Forbidden Inside Core

Never add Core logic like:

```ts
if (industry === "laundry") {
  // special logic
}
```

```ts
switch (industry) {
  case "hotel":
  case "hospital":
  case "factory":
}
```

Forbidden Core patterns:

- `if industry == Laundry`
- `switch(industry)`
- hardcoded departments
- hardcoded workflows
- hardcoded stations
- hardcoded roles
- hardcoded document types
- hardcoded service catalogs
- hardcoded report definitions
- hardcoded finance events with industry names
- hardcoded demo organization behavior

---

## 3. Approved Pattern

Use:

```txt
Business Operating Model
↓
Business DNA
↓
Capability Pack configuration
↓
Industry Template configuration
↓
Generated Organization configuration
```

Core executes the configured behavior.

Core does not decide industry behavior through code branches.

---

## 4. What Belongs in Configuration

- departments
- roles
- workflow stages
- task rules
- forms
- documents
- numbering
- approvals
- reports
- dashboards
- notifications
- service catalogs
- product catalogs
- payment methods
- tax preferences
- quality rules
- sample/demo data packs

---

## 5. What Belongs in Core

Core owns generic capabilities:

- authentication
- organization boundaries
- permissions execution
- workflow execution
- task execution
- document generation mechanics
- notification delivery mechanics
- financial transaction mechanics
- reporting framework
- audit trail
- configuration loading

---

## 6. Exception Process

If a requirement appears impossible to express through configuration:

1. document the requirement
2. explain why configuration is insufficient
3. check if a Capability Pack extension can solve it
4. review architecture impact
5. only then consider code changes

No exception is allowed without architecture review.

---

## 7. Final Rule

If behavior differs by business type, it belongs in configuration or Capability Packs before it belongs in Core code.
