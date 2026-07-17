-- MJRH V4 — SECURITY PATCH: SECURITY DEFINER SEARCH PATH LOCK (v1.1)
-- Purpose: Harden all SECURITY DEFINER functions to prevent search_path hijacking.
-- Target Schemas: v4_l4, v4_l5, v4_l6, v4_l9

-- [v4_l4]
ALTER FUNCTION v4_l4.rpc_provision_job(uuid, uuid, jsonb) SET search_path = v4_l4, v4_l2, v4_l1, public;
ALTER FUNCTION v4_l4.rpc_pulse_job(uuid, uuid, jsonb) SET search_path = v4_l4, v4_l2, v4_l1, public;

-- [v4_l9]
ALTER FUNCTION v4_l9.rpc_submit_external_signal(text, text, text, jsonb) SET search_path = v4_l9, v4_l4, v4_l1, public;

-- Note: Layers v4_l5 and v4_l6 currently do not contain SECURITY DEFINER functions.
-- All existing SECURITY DEFINER functions in the target schemas have been locked.
