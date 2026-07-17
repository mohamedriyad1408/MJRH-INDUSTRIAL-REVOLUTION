-- MJRH V4 — Control Plane: ENTERPRISE ECOSYSTEM (v1.0)
CREATE SCHEMA IF NOT EXISTS v4_control;

-- [TABLE] Enterprise Forest Map
-- Maps Holding Companies (Parent Nodes) to their Sovereign Roots (Subsidiaries).
CREATE TABLE v4_control.enterprise_map (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    holding_node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    subsidiary_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    relationship_type text NOT NULL DEFAULT 'OWNED_SUBSIDIARY',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE (holding_node_id, subsidiary_root_id)
);

-- [TABLE] Global DNA Registry
-- Standardized blueprints and policies for the entire conglomerate.
CREATE TABLE v4_control.global_dna_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    dna_type text NOT NULL, -- 'BLUEPRINT', 'POLICY', 'SLA'
    payload jsonb NOT NULL,
    version int DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- [ENGINE] Provision New Sovereign Enterprise
-- Atomically creates a new L1 Root and initializes basic OS layers.
CREATE OR REPLACE FUNCTION v4_control.fn_v_provision_new_enterprise(
    _holding_node_id uuid,
    _legal_name text,
    _global_urn text,
    _owner_identity_id uuid
) RETURNS uuid
SET search_path = v4_control, v4_l2, v4_l1, public
AS $$
DECLARE
    _new_root_id uuid;
    _new_identity_id uuid;
BEGIN
    -- 1. Create Constitutional Identity (L1)
    INSERT INTO v4_l1.identities (legal_name, global_urn, is_sovereign_root)
    VALUES (_legal_name, lower(_global_urn), true)
    RETURNING id INTO _new_identity_id;

    -- 2. Create Sovereign Node (L1)
    INSERT INTO v4_l1.nodes (identity_id, node_class, node_path)
    VALUES (_new_identity_id, 'SOVEREIGN_ROOT', text2ltree(replace(_global_urn, ':', '_')))
    RETURNING id INTO _new_root_id;

    -- 3. Map to Holding (Control Plane)
    INSERT INTO v4_control.enterprise_map (holding_node_id, subsidiary_root_id)
    VALUES (_holding_node_id, _new_root_id);

    -- 4. Initial Genesis Record (L5)
    -- This ensures the ledger starts with a valid "Handshake" from the Control Plane.
    -- (Implementation handled via standard L4/L5 triggers)

    RETURN _new_root_id;
END;
$$ LANGUAGE plpgsql;

-- [VIEW] Consolidated Scoreboard (The CEO View)
-- Aggregates L6 metrics across all subsidiaries in a holding.
CREATE OR REPLACE VIEW v4_control.v_consolidated_scoreboard AS
SELECT 
    m.holding_node_id,
    COUNT(m.subsidiary_root_id) as total_subsidiaries,
    AVG(h.total_score) as conglomerate_health_avg,
    SUM(CASE WHEN h.total_score < 70 THEN 1 ELSE 0 END) as at_risk_entities
FROM v4_control.enterprise_map m
JOIN v4_l6.node_health_scores h ON m.subsidiary_root_id = h.node_id
WHERE m.is_active = true
GROUP BY m.holding_node_id;

-- [RLS] Only Holding Admins see the Scoreboard
ALTER TABLE v4_control.enterprise_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_control.global_dna_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_v4_control_holding_isolation ON v4_control.enterprise_map
FOR ALL TO authenticated
USING (
    -- Only allow if the actor has a mandate on the holding_node_id
    EXISTS (
        SELECT 1 FROM v4_l2.assignments a
        JOIN v4_l2.positions p ON a.position_id = p.id
        WHERE a.actor_id = (SELECT id FROM v4_l2.actors WHERE identity_id = auth.uid())
        AND p.node_id = v4_control.enterprise_map.holding_node_id
        AND a.lifecycle_status = 'ACTIVE'
    )
);
