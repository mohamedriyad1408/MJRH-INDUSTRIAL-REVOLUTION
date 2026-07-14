-- [ORCHESTRATION: BEFORE PULSE]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_main_before() RETURNS trigger 
SET search_path = v4_l1, public AS $$
DECLARE _p_node record; _sov_id uuid;
BEGIN
    -- Optimistic Locking check for L4 consumers
    IF TG_OP = 'UPDATE' AND OLD.version IS DISTINCT FROM NEW.version - 1 THEN
        RAISE EXCEPTION 'STALE_OBJECT_UPDATE' USING ERRCODE = 'P1120';
    END IF;

    -- Dual-Parent Locking (Deterministic Ordering)
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
        PERFORM 1 FROM nodes WHERE id IN (OLD.parent_id, NEW.parent_id) ORDER BY id FOR UPDATE;
    END IF;

    -- Path Calculation
    IF NEW.parent_id IS NULL THEN 
        NEW.node_path := ('_' || replace(NEW.id::text, '-', ''))::ltree;
    ELSE
        SELECT * INTO _p_node FROM nodes WHERE id = NEW.parent_id FOR SHARE;
        IF _p_node.current_state = 'ARCHIVED' THEN RAISE EXCEPTION 'ZOMBIE_BRANCH' USING ERRCODE = 'P1108'; END IF;
        NEW.node_path := _p_node.node_path || ('_' || replace(NEW.id::text, '-', ''))::ltree;
    END IF;

    PERFORM fn_assert_l1_invariants(NEW, OLD);
    NEW.version := COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [ORCHESTRATION: AFTER PULSE - Facts and Propagation]
CREATE OR REPLACE FUNCTION v4_l1.trg_l1_main_after() RETURNS trigger 
SET search_path = v4_l1, public AS $$
BEGIN
    -- 1. Batch Subtree Update (Optimized #5)
    IF (TG_OP = 'UPDATE') AND (pg_trigger_depth() = 1) AND (OLD.node_path IS DISTINCT FROM NEW.node_path) THEN
        UPDATE nodes SET node_path = NEW.node_path || subpath(nodes.node_path, nlevel(OLD.node_path))
        WHERE nodes.node_path <@ OLD.node_path AND nodes.id <> NEW.id;
    END IF;

    -- 2. Transactional Outbox (Rich Metadata #10)
    INSERT INTO structural_outbox (event_type, aggregate_id, payload)
    VALUES (
        CASE WHEN TG_OP = 'INSERT' THEN 'NodeCreated' WHEN TG_OP = 'UPDATE' THEN 'NodeMoved' ELSE 'NodeDeleted' END,
        NEW.id,
        jsonb_build_object('prev', OLD, 'curr', NEW, 'tx_id', txid_current())
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l1_before BEFORE INSERT OR UPDATE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_main_before();
CREATE TRIGGER trg_l1_after AFTER INSERT OR UPDATE OR DELETE ON v4_l1.nodes FOR EACH ROW EXECUTE FUNCTION v4_l1.trg_l1_main_after();
