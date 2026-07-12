# MJRH Architecture Directive
## From Demo-Based Development to Platform Generator

**Status:** Active Architecture Directive  
**Branch:** `feature/mjrh-v3-core-platform`  
**Scope:** Product architecture, development philosophy, sprint governance  
**Type:** Architectural pivot, not a feature request

---

## MISSION

We are officially changing the development philosophy of MJRH.

This is **NOT** a feature request.

This is an architectural pivot.

The objective is to transform MJRH from a project-specific application into a **Platform Generator** capable of creating any workflow-driven organization.

---

## IMPORTANT OBSERVATION

The current Laundry implementation has served its purpose as our first validation project.

From this point onward:

**Laundry is NO LONGER the development reference.**

Laundry becomes ONLY a Demo Organization.

The Core Platform must never depend on Laundry logic.

---

## THE NEW ARCHITECTURE

Separate the platform into four logical layers.

---

## Layer 1 — Core Platform

Contains ONLY generic platform capabilities.

The Core Platform includes:

- Authentication
- Organization Engine
- Branch Engine
- Department Engine
- Workflow Engine
- Actor Engine
- Task Engine
- Finance Engine
- Reporting Engine
- Notification Engine
- Permission Engine
- Configuration Engine
- Audit Engine
- Document Engine

No industry knowledge exists here.

The Core Platform does not know whether the organization is a laundry, hotel, hospital, factory, restaurant, construction company, or any other business type.

The Core Platform only understands generic concepts:

- organizations
- branches
- actors
- roles
- permissions
- departments
- workflows
- tasks
- documents
- financial events
- approvals
- notifications
- reports
- configuration
- audit trails

---

## Layer 2 — Industry Templates

Each industry is only a configuration package.

Examples:

- Laundry Template
- Hotel Template
- Hospital Template
- Restaurant Template
- Furniture Factory Template
- Food Factory Template
- Construction Company Template
- Retail Store Template
- Maintenance Company Template
- Real Estate Company Template

Rules:

- No duplicated business logic.
- No duplicated components.
- No custom backend per industry.
- No hardcoded industry behavior.
- Only configuration.

Industry Templates define configuration assets such as:

- departments
- roles
- workflow blueprints
- forms
- document types
- financial event types
- approval rules
- notification rules
- reports
- dashboards
- initial setup defaults

Templates are replaceable.

---

## Layer 3 — Demo Organizations

Examples:

- MJRH Laundry
- Royal Hotel
- ABC Furniture
- Elite Hospital
- Demo Restaurant

These are generated FROM templates.

They are NOT hardcoded.

Deleting a Demo Organization must never affect the Core Platform.

Demo Organizations are disposable:

- Clone
- Test
- Delete
- Rollback
- Recreate

No Demo Organization should ever become the development environment.

---

## Layer 4 — Customer Organizations

Real customers follow the exact same flow.

```txt
Create Account
↓
Verify Phone
↓
Create Organization
↓
Run Setup Wizard
↓
Choose Industry
↓
Apply Template
↓
Generate Platform
↓
Platform Ready
```

Customer Organizations and Demo Organizations must be generated through the same platform mechanism.

No customer organization should require developer intervention to become operational.

---

## THE SETUP WIZARD

The Setup Wizard becomes the heart of the platform.

It must collect every required configuration before opening the system.

Examples:

- Organization Name
- Industry
- Branches
- Departments
- Business Identity
- Working Hours
- Languages
- Currencies
- Tax Configuration
- Approval Levels
- Employee Structure
- Accounting Preferences
- Branding
- Notifications
- Document Numbering
- Anything required to operate

The owner should never need developer intervention.

The Setup Wizard must generate platform configuration, not hardcoded business behavior.

The system must not allow operational access before the Setup Wizard has completed.

---

## CURRENT CODEBASE

The existing Laundry implementation is now considered a reusable component library.

Before copying any code ask:

```txt
Can this work for every industry?
```

If the answer is:

```txt
YES
```

Reuse it.

If the answer is:

```txt
NO
```

Rewrite it.

Never migrate technical debt.

Never migrate Laundry assumptions.

---

## NEW DEVELOPMENT RULE

From this point forward:

No feature may be implemented directly inside a Demo Organization.

Every feature must first exist in the Core Platform.

Then it becomes available automatically for every generated organization.

If implementing a feature requires changing only Laundry...

```txt
STOP.
```

The architecture is wrong.

Fix the Core first.

---

## DEMO POLICY

Demo Organizations are disposable.

They may be used to prove the Core Platform, but they must never define the Core Platform.

Allowed Demo operations:

- Clone
- Test
- Delete
- Rollback
- Recreate

Forbidden Demo behavior:

- Treating a Demo Organization as the development environment
- Adding demo-only features
- Writing custom code for a demo
- Making a demo dependency of the Core
- Allowing demo data to affect Core configuration

---

## CURRENT BRANCH

Continue all work inside:

```txt
feature/mjrh-v3-core-platform
```

Do NOT continue development on `main`.

Do NOT merge until architecture review and approval.

---

## SPRINT OBJECTIVE

The next sprint is NOT about adding features.

It is about building the Platform Generator.

Success is NOT:

```txt
We created more demo industries.
```

Success is:

```txt
We created ONE platform capable of generating unlimited industries through configuration.
```

---

## DELIVERABLES

At the end of this sprint provide:

1. Updated architecture diagram.
2. Core layer definition.
3. Template layer definition.
4. Demo Organization generation flow.
5. Setup Wizard flow.
6. List of reusable modules extracted from the Laundry implementation.
7. List of Laundry-specific code that should NOT migrate into the Core.
8. Risks discovered during the architecture transition.
9. Recommended next sprint after completing the Platform Generator foundation.

---

## LANGUAGE AND NAMING POLICY

The team must stop using the phrase:

```txt
Laundry Project
```

or its Arabic equivalent:

```txt
مشروع مغسلة
```

Use the following terms instead:

- **Core Platform**
- **Laundry Template**
- **Laundry Demo Organization**

This is not only a wording change.

It is an architectural discipline.

When the team says “Laundry”, it encourages thinking about one special case.

When the team says “Laundry Template”, it forces the question:

```txt
How do we make this replaceable by any other industry template?
```

That is the intended architectural mindset.

---

## FORBIDDEN DEVELOPMENT PATTERNS

Do not:

- Add new laundry-specific logic to the Core.
- Build directly for a Demo Organization.
- Hardcode industry names into Core workflows.
- Hardcode departments into the Core.
- Hardcode roles into the Core.
- Hardcode station names into the Core.
- Duplicate backend logic per industry.
- Create custom backend functions per demo industry.
- Treat generated organizations as source-of-truth architecture.
- Let Demo Organizations affect Core Platform configuration.
- Continue development on `main`.

---

## APPROVED DEVELOPMENT PATH

All work must follow this path:

```txt
Feature Branch
↓
Internal Testing
↓
Architecture Review
↓
Approval
↓
Pull Request
↓
Merge into main
```

The current active branch is:

```txt
feature/mjrh-v3-core-platform
```

---

## FINAL PRINCIPLE

Protect the Core Platform above everything else.

Industries are temporary.

Templates are replaceable.

Demo Organizations are disposable.

The Core Platform is the product.

Everything else exists only to demonstrate its capabilities.

---

## INTERNAL PRODUCT PRINCIPLE

The team adopts this internal principle:

```txt
The software should know more about running a business than the business owner does.
```

This does not mean replacing the owner.

It means MJRH must guide, propose, warn, and reduce operational mistakes.

MJRH should become an intelligent operating advisor, not merely a management system.

---

## CTO RULE

One final architectural rule:

Before writing any new code, always ask:

```txt
Am I improving the Core Platform, or am I solving only one industry's problem?
```

If the answer is the second one...

```txt
Stop.
```

Redesign the solution until it belongs to the Core Platform.
