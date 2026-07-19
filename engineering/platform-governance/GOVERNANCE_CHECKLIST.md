# MJRH Governance Checklist

**Status:** Mandatory Architecture Review Checklist

---

## Architecture

- [ ] Does this obey layer boundaries?
- [ ] Does dependency direction remain legal?
- [ ] Does Core remain isolated?
- [ ] Is every runtime behavior assigned to one layer?

## Business

- [ ] Is the business concept defined?
- [ ] Is the glossary term canonical?
- [ ] Are actors, rules, inputs, outputs, and events clear?
- [ ] Does this preserve business knowledge?

## Configuration

- [ ] Can this be configured?
- [ ] Can Business DNA drive it?
- [ ] Does it avoid hardcoded industry conditionals?
- [ ] Are defaults visible and governed?

## Security

- [ ] Is organization isolation preserved?
- [ ] Are permissions enforced outside UI?
- [ ] Are sensitive operations auditable?

## Scalability

- [ ] Can this work for many organizations?
- [ ] Can another industry reuse it?
- [ ] Does it avoid customer/demo-specific assumptions?

## Maintainability

- [ ] Does this reduce duplication?
- [ ] Does this retire or contain legacy debt?
- [ ] Is the source of truth clear?

## Backward Compatibility

- [ ] Does Dry Tech historical continuity remain safe?
- [ ] Are migrations/data changes reversible or backed up?
- [ ] Are legacy compatibility paths documented?

## Platform Independence

- [ ] Would this work if Dry Tech disappeared?
- [ ] Would this work if Laundry disappeared?
- [ ] Does this avoid Core → Template dependency?

## Industry Independence

- [ ] Is industry behavior in Template/Pack, not Core?
- [ ] Are labels/configuration separated from execution?

## Template Isolation

- [ ] Template cannot modify Core.
- [ ] Template only supplies assets/configuration.

## Capability Isolation

- [ ] Pack does not know industry names.
- [ ] Pack owns reusable capability only.

## Business Knowledge Preservation

- [ ] Is new knowledge added to correct registry/document?
- [ ] Is legacy knowledge extracted as intent rather than copied as code?

## Decision

If any critical answer is NO:

```txt
Stop implementation and redesign.
```
