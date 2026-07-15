-- MJRH V4 — Layer 1: SECURITY HARDENING (v1.0)
-- Implementing Least Privilege and Search Path Isolation.

-- A. Revoke public access to internal logic
REVOKE ALL ON FUNCTION v4_l1.fn_assert_l1_invariants FROM public;
REVOKE ALL ON FUNCTION v4_l1.trg_l1_orchestrator FROM public;
REVOKE ALL ON FUNCTION v4_l1.fn_propagate_path FROM public;

-- B. Explicit Grant to Authenticated Service Role
GRANT EXECUTE ON FUNCTION v4_l1.resolve_sovereign_root TO authenticated;
GRANT EXECUTE ON FUNCTION v4_l1.resolve_hierarchy TO authenticated;

-- C. Ensure all existing functions have strict search_path
-- (Already handled in v3.5+, but enforcing consistency here)
ALTER FUNCTION v4_l1.resolve_sovereign_root(uuid) SET search_path = v4_l1, public;
ALTER FUNCTION v4_l1.resolve_hierarchy(uuid) SET search_path = v4_l1, public;
