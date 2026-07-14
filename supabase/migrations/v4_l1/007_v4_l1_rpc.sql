CREATE OR REPLACE FUNCTION v4_l1.resolve_sovereign_root(_node_id uuid) RETURNS jsonb 
SET search_path = v4_l1, public AS $$
DECLARE _path ltree; _sov_id uuid;
BEGIN
    SELECT node_path INTO _path FROM nodes WHERE id = _node_id;
    IF _path IS NULL THEN RAISE EXCEPTION 'NODE_NOT_FOUND' USING ERRCODE = 'P1101'; END IF;
    _sov_id := (replace(subltree(_path, 0, 1)::text, '_', ''))::uuid;
    RETURN jsonb_build_object('v', '1.0', 'sovereign_id', _sov_id, 'path', _path::text);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION v4_l1.resolve_hierarchy(_node_id uuid) RETURNS jsonb 
SET search_path = v4_l1, public AS $$
BEGIN
    RETURN jsonb_build_object(
        'v', '1.0',
        'hierarchy', (SELECT array_agg((replace(lbl, '_', ''))::uuid) FROM (SELECT unnest(ltree2text_array(node_path)) as lbl FROM nodes WHERE id = _node_id) s)
    );
END;
$$ LANGUAGE plpgsql STABLE;
