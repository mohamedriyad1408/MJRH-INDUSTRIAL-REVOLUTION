# MJRH V4 — Layer 1 Architecture Guide

## 1. System Intent
Layer 1 (The Constitutional Layer) provides the structural foundation. Its primary goal is to maintain a perfect, acyclic hierarchy of identities.

## 2. Trigger Map (Execution Order)
| Order | Trigger Name | Phase | Responsibility |
| :--- | :--- | :--- | :--- |
| 1 | `trg_l1_before` | BEFORE | Path calculation, Invariant checking, Locking. |
| 2 | `trg_l1_after` | AFTER | Outbox fact emission, Subtree path propagation. |

## 3. Approved ADRs Index
- [ADR-001] Hierarchy vs Flat Tags
- [ADR-005] Identity Binding
- [ADR-011] Subtree Integrity
- [ADR-015] Soft-Delete Policy
