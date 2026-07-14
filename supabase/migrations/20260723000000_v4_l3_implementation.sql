-- MJRH V4 — Layer 3: Readiness & Capability (Final Hardened Implementation v2.0)
CREATE SCHEMA IF NOT EXISTS v4_l3;

-- [TABLE] Capability Catalog
CREATE TABLE v4_l3.capability_definitions (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Requirements Bridge (New: Connects Definition to Resource Needs)
CREATE TABLE v4_l3.capability_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id text REFERENCES v4_l3.capability_definitions(id),
    resource_type text NOT NULL, -- HUMAN, EQUIPMENT, etc.
    min_quantity int NOT NULL DEFAULT 1,
    min_proficiency text NOT NULL DEFAULT 'BEGINNER'
);

-- [TABLE] Capability Instances
CREATE TABLE v4_l3.capability_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id text REFERENCES v4_l3.capability_definitions(id),
    org_node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(definition_id, org_node_id)
);

-- [TABLE] Dependency Graph
CREATE TABLE v4_l3.capability_dependencies (
    dependent_id text REFERENCES v4_l3.capability_definitions(id),
    dependency_id text REFERENCES v4_l3.capability_definitions(id),
    PRIMARY KEY (dependent_id, dependency_id)
);

-- [TABLE] Resource Registry
CREATE TABLE v4_l3.resource_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    resource_type text NOT NULL,
    health_status text NOT NULL DEFAULT 'OPTIMAL',
    availability_status text NOT NULL DEFAULT 'AVAILABLE',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Competency Matrix
CREATE TABLE v4_l3.competency_matrix (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL REFERENCES v4_l3.resource_registry(id),
    capability_id text NOT NULL REFERENCES v4_l3.capability_definitions(id),
    proficiency_level text NOT NULL,
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz
);

-- [ENGINE] Recursive Readiness Evaluator
CREATE OR REPLACE FUNCTION v4_l3.fn_evaluate_readiness(
    _instance_id uuid,
    _actor_context_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    _instance record;
    _unready_dependency text;
    _req record;
    _available_count int;
    _governance jsonb;
BEGIN
    -- 1. Instance Check
    SELECT * FROM v4_l3.capability_instances WHERE id = _instance_id INTO _instance;
    IF NOT FOUND THEN RETURN jsonb_build_object('state', 'UNKNOWN', 'reason', 'INSTANCE_NOT_FOUND'); END IF;
    IF NOT _instance.is_active THEN RETURN jsonb_build_object('state', 'BLOCKED', 'reason', 'INSTANCE_INACTIVE'); END IF;

    -- 2. RECURSIVE Dependency Check
    WITH RECURSIVE dep_tree AS (
        SELECT dependency_id FROM v4_l3.capability_dependencies WHERE dependent_id = _instance.definition_id
        UNION
        SELECT d.dependency_id FROM v4_l3.capability_dependencies d
        INNER JOIN dep_tree dt ON dt.dependency_id = d.dependent_id
    )
    SELECT dt.dependency_id INTO _unready_dependency
    FROM dep_tree dt
    LEFT JOIN v4_l3.capability_instances ci ON dt.dependency_id = ci.definition_id AND ci.org_node_id = _instance.org_node_id
    WHERE ci.id IS NULL OR ci.is_active = false
    LIMIT 1;

    IF _unready_dependency IS NOT NULL THEN 
        RETURN jsonb_build_object('state', 'MISSING_DEPENDENCY', 'missing_capability', _unready_dependency); 
    END IF;

    -- 3. Resource & Capacity & Competency Check
    FOR _req IN SELECT * FROM v4_l3.capability_requirements WHERE capability_id = _instance.definition_id LOOP
        SELECT count(*) INTO _available_count
        FROM v4_l3.resource_registry r
        LEFT JOIN v4_l3.competency_matrix c ON r.id = c.resource_id
        WHERE r.org_node_id = _instance.org_node_id
        AND r.resource_type = _req.resource_type
        AND r.health_status IN ('OPTIMAL', 'DEGRADED')
        AND r.availability_status = 'AVAILABLE'
        AND (r.resource_type <> 'HUMAN' OR (c.capability_id = _instance.definition_id AND c.valid_until IS NULL));

        IF _available_count < _req.min_quantity THEN
            RETURN jsonb_build_object('state', 'INSUFFICIENT_CAPACITY', 'resource_type', _req.resource_type, 'needed', _req.min_quantity, 'found', _available_count);
        END IF;
    END LOOP;

    -- 4. Governance check (L2)
    IF _actor_context_id IS NOT NULL THEN
        _governance := v4_l2.fn_evaluate_governance(_actor_context_id, _instance.org_node_id, 'capability.pulse', 'system');
        IF (_governance->>'decision' <> 'ALLOW') THEN
            RETURN jsonb_build_object('state', 'POLICY_BLOCKED', 'reason', _governance->>'reason');
        END IF;
    END IF;

    RETURN jsonb_build_object('state', 'READY', 'evaluated_at', now());
END;
$$ LANGUAGE plpgsql STABLE;
