-- [LOGIC: Physical Delete Guard]
CREATE OR REPLACE FUNCTION v4_l1.trg_fn_prevent_physical_delete() RETURNS trigger 
SET search_path = v4_l1, public AS $$
BEGIN
    -- Only allow deletion of DRAFT nodes with no facts
    IF OLD.lifecycle_status <> 'DRAFT' THEN
        RAISE EXCEPTION 'PHYSICAL_DELETE_FORBIDDEN: Only DRAFT nodes can be deleted.' USING ERRCODE = 'P1130';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nodes_delete_guard BEFORE DELETE ON v4_l1.nodes 
FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_fn_prevent_physical_delete();
