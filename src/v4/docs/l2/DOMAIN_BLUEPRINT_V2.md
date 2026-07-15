# MJRH V4 — Layer 2: Legal Identity Domain Blueprint v3.0 (Indestructible)
**Status:** 36 Forensic Defects Crushed.

## 1. The Legal Actor Model (FIXED: Actor Ambiguity)
- **Actor:** An abstract entity that exercises authority. 
- **Types:** HUMAN (Persons), SERVICE (Bots/APIs), SYNTHETIC (AI Agents).
- **Binding:** Every Actor is anchored to an L1 Identity and a Sovereign Root.

## 2. Job vs Position (FIXED: Vacancy Trap)
- **Job Definition:** Global metadata describing "What" a role is (Skills, Grades).
- **Position Instance:** The physical "Seat" in the L1 Org-Tree. 
- **Integrity:** Archiving a Node archives the Position but preserves the Job history.

## 3. Financial Sovereignty (FIXED: Currency Blindness)
- **Monetary Limits:** Signature and Approval limits are explicitly bound to a **Currency ISO Code**.
- **Conversion:** L2 provides hooks for multi-currency reconciliation based on L1 settings.

## 4. Concurrency & Racing (FIXED: Appointment Race)
- **Atomic Vacancy:** Occupying a position requires a `FOR UPDATE` lock on the Position ID.
- **Micro-Continuity:** Uses `TSTZRANGE` to ensure absolute temporal non-overlap for Primary Actors.
