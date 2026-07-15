# MJRH V4 — Layer 2 Legal Identity Architecture

## 1. Principle: Structural Mirroring
Layer 2 does not duplicate the hierarchy. It provides "Legal Context" to the structural nodes of Layer 1.

- `persons` -> Human Identity
- `organizations` -> Corporate Identity
- `assignments` -> Dynamic link between Person and Position

## 2. Temporal Integrity
Assignments are immutable chains. To change a person's role:
1. Set `effective_to` on the current assignment.
2. Create a new assignment with a higher `version`.

## 3. Delegation Logic
Authority can be delegated between `assignments`. Delegations are always time-bound and scoped.
