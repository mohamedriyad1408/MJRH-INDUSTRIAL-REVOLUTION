# Current Setup Problems

**Status:** Discovery document  
**Scope:** Setup Version 1 / current Platform Generator onboarding  
**Purpose:** Identify why the current setup should not be expanded directly

---

## 1. Problem Summary

The current setup flow is technically useful but not business-owner friendly.

It exposes too much platform architecture and not enough business guidance.

The target customer is not technical and may never have used business software before. The current flow risks making the owner feel that they are configuring software instead of building their company.

---

## 2. Current Problems

### 2.1 Technical language appears too early

Examples of concepts that are too technical for the owner:

- Template Registry
- Template Assets
- Department Engine
- Workflow Engine
- Financial Engine
- Permissions
- Blueprint
- Configuration
- Platform Generator

These are valid engineering concepts but should not be customer-facing labels.

### 2.2 The setup does not always answer “why”

Every screen should explain:

1. Why am I answering this?
2. How will this affect my business?
3. Can I change it later?

The current flow does not consistently answer these questions.

### 2.3 It feels like setup of a system, not creation of a company

The user should feel:

```txt
Someone is helping me build my business step by step.
```

Not:

```txt
I am configuring a technical platform.
```

### 2.4 It mixes owner decisions with implementation details

Business owners should decide:

- what their business does
- where they operate
- who works there
- how customers are served
- how money is collected
- what documents they need
- what should require approval

They should not think about engines, schemas, internal routes, table structures, or template assets.

### 2.5 The progress model is not emotionally reassuring enough

A first-time owner needs visible reassurance:

- where am I now?
- how much is left?
- can I save and continue later?
- what happens when I finish?
- will I be able to change this later?

### 2.6 It assumes the owner knows their final structure

Many small business owners do not know how to define departments, roles, approval levels, or workflows upfront.

The flow should offer recommendations and examples, then allow editing later.

### 2.7 Optional information is not clearly separated

The owner should know:

- required to start today
- recommended for accurate reports
- optional and can be added later

### 2.8 Developer notes must not appear in product UI

Any temporary reminders, architecture notes, TODOs, or implementation details must live in the Engineering Workspace, not customer screens.

---

## 3. Design Rule Going Forward

Setup Version 1 should not be expanded.

A new Business Initialization experience should be designed first, reviewed, then implemented.
