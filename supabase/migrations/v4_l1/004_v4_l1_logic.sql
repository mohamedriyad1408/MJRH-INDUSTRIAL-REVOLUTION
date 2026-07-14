-- [LOGIC: Invariant Enforcement]
CREATE OR REPLACE FUNCTION v4_l1.fn_assert_l1_invariants(_new v4_l1.nodes, _old v4_l1.nodes DEFAULT NULL) RETURNS void 
SET search_path = v4_l1, public AS $$
DECLARE
    _ident record;
    _p_node record;
BEGIN
    -- 1. Identity Integrity & Status (Optimistic Locking Hook)
    SELECT * INTO _ident FROM identities WHERE id = _new.identity_id FOR UPDATE;
    IF _ident.current_state = 'ARCHIVED' THEN RAISE EXCEPTION 'IDENTITY_DEAD' USING ERRCODE = 'P1110'; END IF;

    -- 2. Sovereign Root Immutability (ADR-004)
    IF _old IS NOT NULL AND _old.node_class = 'SOVEREIGN_ROOT' AND _new.parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'SOVEREIGN_ROOT_IMMUTABILITY' USING ERRCODE = 'P1105';
    END IF;

    -- 3. Cycle Detection
    IF _old IS NOT NULL AND _new.parent_id IS DISTINCT FROM _old.parent_id THEN
        IF _old.node_path @> (SELECT node_path FROM nodes WHERE id = _new.parent_id) THEN
            RAISE EXCEPTION 'CIRCULAR_DEPENDENCY' USING ERRCODE = 'P1104';
        END IF;
    END IF;

    -- 4. Identity Recursion (Inductive Path Check)
    IF (pg_trigger_depth() = 1) THEN
        IF EXISTS (
            SELECT 1 FROM nodes n
            WHERE n.node_path <@ CASE WHEN _old IS NOT NULL THEN _old.node_path ELSE _new.node_path END
            AND EXISTS (
                SELECT 1 FROM nodes anc
                WHERE anc.id IN (SELECT (replace(lbl, '_', ''))::uuid FROM unnest(ltree2text_array(_new.node_path)) AS lbl)
                AND anc.identity_id = n.identity_id AND anc.id <> n.id
            )
        ) THEN RAISE EXCEPTION 'IDENTITY_PATH_RECURSION' USING ERRCODE = 'P1103'; END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;
