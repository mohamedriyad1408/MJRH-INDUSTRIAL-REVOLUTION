-- MJRH V4 — Control Plane: STRATEGY DISPATCHER (v1.0)

-- [ENGINE] Dispatch DNA Mutation
-- Pushes a standardized policy or blueprint from the global registry to all subsidiaries.
CREATE OR REPLACE FUNCTION v4_control.fn_v_dispatch_conglomerate_strategy(
    _holding_node_id uuid,
    _dna_registry_id uuid
) RETURNS int
SET search_path = v4_control, v4_l10, v4_l1, public
AS $$
DECLARE
    _dna record;
    _sub record;
    _dispatched_count int := 0;
BEGIN
    -- 1. Fetch Global DNA
    SELECT * FROM v4_control.global_dna_registry WHERE id = _dna_registry_id INTO _dna;
    IF NOT FOUND THEN RAISE EXCEPTION 'DNA_NOT_FOUND'; END IF;

    -- 2. Iterate through Subsidiaries
    FOR _sub IN SELECT subsidiary_root_id FROM v4_control.enterprise_map WHERE holding_node_id = _holding_node_id AND is_active = true LOOP
        -- 3. Inject into Layer 10 as a "PROPOSED" Mutation for each Root
        -- This respects the "Human-in-the-Loop" ADR-023
        INSERT INTO v4_l10.mutations (
            sovereign_root_id, target_layer, target_entity_id, mutation_payload, justification, status
        ) VALUES (
            _sub.subsidiary_root_id,
            CASE WHEN _dna.dna_type = 'SLA' THEN 'L6_SLA'::v4_l10.layer_target ELSE 'L4_BLUEPRINT'::v4_l10.layer_target END,
            gen_random_uuid(), -- For template dispatch, this would resolve to the specific local policy ID
            _dna.payload,
            format('Conglomerate-wide strategy push: %s', _dna.name),
            'PROPOSED'
        );
        
        _dispatched_count := _dispatched_count + 1;
    END LOOP;

    RETURN _dispatched_count;
END;
$$ LANGUAGE plpgsql;
