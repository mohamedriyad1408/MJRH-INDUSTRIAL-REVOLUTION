# MJRH V4 — Layer 2 Core Specification v1.0 (APPROVED)

## 1. Responsibility
The Sovereign Brain of the enterprise. Manages the legal right to act (Authority), computes runtime permissions (Authorization), and enforces operating constraints (Policy).

## 2. Governance Decision Model
Every check returns a formal `Decision`:
- `ALLOW`: Proceed.
- `DENY`: Terminate.
- `REQUIRE_APPROVAL`: Suspend for sign-off.
- `REQUIRE_ESCALATION`: Transfer to higher authority.

## 3. Conflict Resolution (Precedence)
1. **Explicit Deny** (Highest)
2. **Legal Policy**
3. **Business Policy**
4. **Active Mandate**
5. **Default Deny** (Lowest)

## 4. Versioning & Immutability
- No in-place edits for Mandates or Policies.
- Mandatory `valid_from` and `valid_until` tracking.
- Every decision is linked to a specific version for L5 audit integrity.

## 5. Component Definitions
- **Authority Manager:** Owns Mandates. Distinct from Org Roles.
- **Policy Engine:** Owns Predicates and Compliance logic.
- **Authorization Service:** Dynamic computation of Rights.

## 6. Architectural Boundary (L1/L2)
| Concept | Layer 1 | Layer 2 |
| :--- | :--- | :--- |
| **Organization** | Structural Nodes | Scope for Authority |
| **Identity** | Structural URN | Target for Mandate |
| **Authority** | **NONE** | Full Ownership |
| **Rules** | **NONE** | Full Ownership |
