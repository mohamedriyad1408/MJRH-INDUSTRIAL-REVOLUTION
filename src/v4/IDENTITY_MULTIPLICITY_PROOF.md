# MJRH V4 — Identity Multiplicity Proof

## Abstract
This document proves the mathematical integrity of the 1:N relationship between an Identity and its Nodes in the MJRH V4 Topology.

## 1. The Disjoint Branch Rule
An Identity (I) can exist in multiple Nodes (N1, N2... Nx) if and only if:
For any two nodes Na and Nb belonging to I, Na is NOT an ancestor of Nb, and Nb is NOT an ancestor of Na.

## 2. Scenario Validations

| Scenario | Action | Outcome | Reason |
| :--- | :--- | :--- | :--- |
| **New Entry** | Create Node_B for Identity_X in a different country branch. | **ALLOWED** | Branches are disjoint; no recursion. |
| **Illegal Move** | Move Node_B (Identity_X) to be a child of Node_A (Identity_X). | **BLOCKED** | Violation of Identity Path Uniqueness. |
| **Acquisition** | Company A buys Company B. | **ALLOWED** | Handled via SUCCESSOR relationship or re-parenting if identities remain distinct. |
| **Redundancy** | Same Identity requested in the same department. | **BLOCKED** | Logic Engine (L2) prevents functional redundancy, while L1 prevents structural recursion. |

## 3. Conclusion
The 1:N model allows for functional scaling (Shared Services, Legal Representation in multiple units) while the Path Invariant prevents the structural paradox of an entity becoming its own descendant.
