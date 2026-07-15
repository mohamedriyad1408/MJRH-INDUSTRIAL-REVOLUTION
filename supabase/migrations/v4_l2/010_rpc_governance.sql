CREATE OR REPLACE FUNCTION v4_l2.resolve_chain_of_command(_position_id uuid)
RETURNS TABLE (level int, pos_id uuid, title text, holder_name text)
SET search_path = v4_l2, v4_l1, public AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE command_chain AS (
        SELECT 1 as lvl, p.id, p.job_id, p.reports_to_id
        FROM positions p WHERE p.id = _position_id
        UNION ALL
        SELECT cc.lvl + 1, p.id, p.job_id, p.reports_to_id
        FROM positions p
        JOIN command_chain cc ON p.id = cc.reports_to_id
    )
    SELECT 
        cc.lvl, 
        cc.id, 
        (SELECT title FROM job_blueprints WHERE id = cc.job_id),
        (SELECT first_name_cipher FROM persons WHERE actor_id = (SELECT actor_id FROM assignments WHERE position_id = cc.id AND lifecycle_status = 'ACTIVE' LIMIT 1))
    FROM command_chain cc;
END;
$$ LANGUAGE plpgsql STABLE;
