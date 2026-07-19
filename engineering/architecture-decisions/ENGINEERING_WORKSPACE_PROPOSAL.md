# Engineering Workspace Proposal

**Status:** Proposed and initialized  
**Location:** `/engineering`

---

## Purpose

Separate internal engineering knowledge from the customer-facing product.

The product is for customers.

Developer knowledge belongs outside the product.

---

## What Belongs Here

- architecture notes
- TODOs
- temporary reminders
- ideas
- implementation discussions
- migration notes
- technical decisions
- restoration plans
- setup redesign documents
- reference environment lifecycle notes

---

## What Must Not Appear in Product UI

- developer TODOs
- “temporary” notes
- raw migration explanations
- database table names unless the screen is admin/developer-only
- internal function names
- engineering caveats
- architecture reminders
- debug messages
- stack traces

---

## Proposed Structure

```txt
engineering/
  README.md
  architecture-decisions/
  business-initialization/
  reference-environments/
```

---

## Governance Rule

If a note is meant for developers, architects, or migration planning, it goes into `/engineering`.

If text appears in the product, it must be written for the business owner.
