-- [LOGIC: Archive Pipeline]
CREATE OR REPLACE FUNCTION v4_l1.fn_archive_node(_node_id uuid) RETURNS void 
SET search_path = v4_l1, public AS $$
BEGIN
    UPDATE nodes SET lifecycle_status = 'ARCHIVED' WHERE id = _node_id;
    -- Propagation to descendants is handled by fn_propagate_path
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v4_l1.fn_restore_node(_node_id uuid) RETURNS void 
SET search_path = v4_l1, public AS $$
BEGIN
    UPDATE nodes SET lifecycle_status = 'ACTIVE' WHERE id = _node_id;
END;
$$ LANGUAGE plpgsql;
