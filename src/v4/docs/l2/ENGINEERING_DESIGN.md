# MJRH V4 — Layer 2 Engineering Design

## 1. Entity Relationship Diagram (Conceptual)
- **Identity (L1)** <1---1> **Party (Person/Org)**
- **Node (L1)** <1---1> **FunctionalUnit (Dept)**
- **Position** <1---N> **Assignment** <N---1> **Person**

## 2. Invariants Catalog
- **[INV_L2_001]:** A Person cannot have more than one ACTIVE PRIMARY Assignment per Organization.
- **[INV_L2_002]:** Assignments are Immutable. Any change in (Person, Position) requires a new record.
- **[INV_L2_003]:** Delegations cannot exceed the valid range of the source Assignment.

## 3. Temporal Model
All legal records use `effective_from` and `effective_to`.
Current State is defined where `now() BETWEEN effective_from AND effective_to`.
