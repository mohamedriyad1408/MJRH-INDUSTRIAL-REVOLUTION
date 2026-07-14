-- MJRH V4 — Layer 3: Readiness & Capability (Final Frozen Candidate v2.5)
CREATE SCHEMA IF NOT EXISTS v4_l3;

-- [TABLE] Capability Catalog
CREATE TABLE v4_l3.capability_definitions (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Requirements Bridge
CREATE TABLE v4_l3.capability_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id text REFERENCES v4_l3.capability_definitions(id),
    resource_type text NOT NULL,
    min_quantity int NOT NULL DEFAULT 1,
    min_proficiency text NOT NULL DEFAULT 'BEGINNER' CHECK (min_proficiency IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'))
);

-- [TABLE] Capability Instances
CREATE TABLE v4_l3.capability_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id text REFERENCES v4_l3.capability_definitions(id),
    org_node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    is_active boolean DEFAULT true,
    config_values jsonb DEFAULT '{}'::jsonb,
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
    resource_type text NOT NULL CHECK (resource_type IN ('HUMAN', 'EQUIPMENT', 'VEHICLE', 'LOCATION', 'SOFTWARE', 'CASH')),
    health_status text NOT NULL DEFAULT 'OPTIMAL' CHECK (health_status IN ('OPTIMAL', 'DEGRADED', 'CRITICAL', 'FAIL')),
    availability_status text NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
    lifecycle_state text NOT NULL DEFAULT 'OPERATIONAL' CHECK (lifecycle_state IN ('NEW', 'OPERATIONAL', 'MAINTENANCE', 'RETIRED')),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Competency Matrix
CREATE TABLE v4_l3.competency_matrix (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL REFERENCES v4_l3.resource_registry(id),
    capability_id text NOT NULL REFERENCES v4_l3.capability_definitions(id),
    proficiency_level text NOT NULL CHECK (proficiency_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [HELPER] Proficiency Comparison
CREATE OR REPLACE FUNCTION v4_l3.fn_proficiency_weight(_level text) RETURNS int AS $$
BEGIN
    RETURN CASE _level
        WHEN 'BEGINNER' THEN 1
        WHEN 'INTERMEDIATE' THEN 2
        WHEN 'ADVANCED' THEN 3
        WHEN 'EXPERT' THEN 4
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- [ENGINE] Readiness Evaluator (Hardened)
CREATE OR REPLACE FUNCTION v4_l3.fn_evaluate_readiness(
    _instance_id uuid,
    _actor_context_id uuid DEFAULT NULL,
    _call_context jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
    _instance record;
    _unready_dependency record;
    _req record;
    _available_count int;
    _governance jsonb;
    _details jsonb := '[]'::jsonb;
BEGIN
    -- 1. Instance Check
    SELECT * FROM v4_l3.capability_instances WHERE id = _instance_id INTO _instance;
    IF NOT FOUND THEN RETURN jsonb_build_object('state', 'UNKNOWN', 'reason', 'INSTANCE_NOT_FOUND'); END IF;
    IF NOT _instance.is_active THEN RETURN jsonb_build_object('state', 'BLOCKED', 'reason', 'INSTANCE_INACTIVE'); END IF;

    -- 2. RECURSIVE Dependency Check with Cycle Detection
    WITH RECURSIVE dep_tree AS (
        -- Anchor
        SELECT dependency_id, ARRAY[dependent_id] as path
        FROM v4_l3.capability_dependencies 
        WHERE dependent_id = _instance.definition_id
        UNION ALL
        -- Recursive step
        SELECT d.dependency_id, dt.path || d.dependent_id
        FROM v4_l3.capability_dependencies d
        JOIN dep_tree dt ON dt.dependency_id = d.dependent_id
        WHERE NOT (d.dependency_id = ANY(dt.path)) -- Cycle Prevention
    )
    SELECT ci.definition_id, ci.is_active INTO _unready_dependency
    FROM dep_tree dt
    LEFT JOIN v4_l3.capability_instances ci ON dt.dependency_id = ci.definition_id AND ci.org_node_id = _instance.org_node_id
    WHERE ci.id IS NULL OR ci.is_active = false
    LIMIT 1;

    IF FOUND THEN 
        RETURN jsonb_build_object(
            'state', 'MISSING_DEPENDENCY', 
            'missing_capability', _unready_dependency.definition_id,
            'reason', CASE WHEN _unready_dependency.definition_id IS NULL THEN 'NOT_INSTALLED' ELSE 'INACTIVE' END
        ); 
    END IF;

    -- 3. Resource Capacity & Competency Check
    FOR _req IN SELECT * FROM v4_l3.capability_requirements WHERE capability_id = _instance.definition_id LOOP
        SELECT count(*) INTO _available_count
        FROM v4_l3.resource_registry r
        WHERE r.org_node_id = _instance.org_node_id
        AND r.resource_type = _req.resource_type
        AND r.health_status IN ('OPTIMAL', 'DEGRADED')
        AND r.availability_status = 'AVAILABLE'
        AND r.lifecycle_state = 'OPERATIONAL'
        AND (
            _req.resource_type <> 'HUMAN' 
            OR EXISTS (
                SELECT 1 FROM v4_l3.competency_matrix c 
                WHERE c.resource_id = r.id 
                AND c.capability_id = _instance.definition_id
                AND v4_l3.fn_proficiency_weight(c.proficiency_level) >= v4_l3.fn_proficiency_weight(_req.min_proficiency)
                AND c.valid_from <= now() AND (c.valid_until IS NULL OR c.valid_until > now())
            )
        );

        IF _available_count < _req.min_quantity THEN
            RETURN jsonb_build_object(
                'state', 'INSUFFICIENT_CAPACITY', 
                'resource_type', _req.resource_type, 
                'needed', _req.min_quantity, 
                'available', _available_count,
                'min_proficiency', _req.min_proficiency
            );
        END IF;
    END LOOP;

    -- 4. Governance check (Called ONCE at the end)
    IF _actor_context_id IS NOT NULL THEN
        _governance := v4_l2.fn_evaluate_governance(_actor_context_id, _instance.org_node_id, 'capability.pulse', 'system', _call_context);
        IF (_governance->>'decision' <> 'ALLOW') THEN
            RETURN jsonb_build_object(
                'state', 'POLICY_BLOCKED', 
                'reason', _governance->>'reason',
                'policy_id', _governance->>'matched_policy_id'
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('state', 'READY', 'evaluated_at', now(), 'sovereign_id', (SELECT (v4_l1.resolve_sovereign_root(_instance.org_node_id)->>'sovereign_id')::uuid));
END;
$$ LANGUAGE plpgsql STABLE;
