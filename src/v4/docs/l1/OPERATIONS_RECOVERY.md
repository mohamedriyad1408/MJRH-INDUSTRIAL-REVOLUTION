# MJRH V4 — L1 Recovery Procedures

## Scenario: Hierarchy Corruption
**Symptoms:** Node path does not match parent path.
**Recovery:** Use `structural_mutation_facts` to identify the last valid state and re-trigger a `parent_id` update to force propagation.

## Scenario: Deadlock in Re-organization
**Prevention:** L1 enforces Top-Down locking.
**Resolution:** Database engine kills the youngest transaction. The Outbox ensures no inconsistent fact is emitted.
