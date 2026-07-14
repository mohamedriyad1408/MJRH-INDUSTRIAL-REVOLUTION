# ADR-013: Structural Mutation Outbox

## Status: Accepted
## Context: How should external systems (L5, Event Bus) consume structural changes?
## Decision: 
The table `v4_l1.structural_mutation_facts` acts as a **Transactional Outbox**.
## Rationale: 
Guarantees at-least-once delivery of structural events. Any external Event Bus (Kafka, NATS) can safely relay these facts without polluting the core logic.
