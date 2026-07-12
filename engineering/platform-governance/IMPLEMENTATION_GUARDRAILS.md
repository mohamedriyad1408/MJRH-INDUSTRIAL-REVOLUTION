# MJRH Implementation Guardrails

**Status:** Mandatory PR Gate

Every future implementation PR must answer these questions.

---

## Architecture

1. Does this introduce industry knowledge into Core?
2. Can this work without Laundry?
3. Does this belong to Core, Platform, Pack, Template, Config, or Data?
4. Is runtime behavior leaking into UI?
5. Does this duplicate existing business knowledge?
6. Does this violate layer boundaries?
7. Does this create a forbidden dependency?

---

## Business

1. What business knowledge does this implement?
2. Is the term defined in the glossary?
3. Which business entity owns it?
4. Which domain events does it produce or consume?
5. Is it universal, pack-specific, template-specific, or org-specific?

---

## Configuration

1. Can Business DNA configure this?
2. Can a Capability Pack own this?
3. Can a Template configure this?
4. Are defaults explicit and visible?
5. Are conditionals replaced by configuration?

---

## Legacy

1. Does this reuse old code?
2. What business knowledge does that code preserve?
3. Is it being extracted, generalized, rewritten, or retired?
4. Would using it as-is reintroduce hardcoded logic?
5. Is it listed in the Legacy Retirement Plan?

---

## Validation

1. Has Dry Tech been validated?
2. Does a newly generated organization still work?
3. Are counts and relationships preserved where applicable?
4. Are business acceptance flows tested when behavior changes?

---

## Stop Conditions

Stop implementation if:

- the answer depends on “because Laundry needs it”
- a business rule is placed in UI
- Core imports a template or demo
- a generated organization becomes architecture source
- legacy code is copied without extraction/generalization
- no rollback path exists for risky data changes
