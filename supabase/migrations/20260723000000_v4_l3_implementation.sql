-- MJRH V4 — Layer 3: Readiness & Capability (Final Frozen Core v2.9)
CREATE SCHEMA IF NOT EXISTS v4_l3;

-- [TABLE] Capability Catalog
CREATE TABLE v4_l3.capability_definitions (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Capability Dependencies (DAG Enforcement)
CREATE TABLE v4_l3.capability_dependencies (
    dependent_id text REFERENCES v4_l3.capability_definitions(id),
    dependency_id text REFERENCES v4_l3.capability_definitions(id),
    PRIMARY KEY (dependent_id, dependency_id)
);

-- [LOGIC] Trigger: Prevent Cycles
CREATE OR REPLACE FUNCTION v4_l3.fn_prevent_capability_cycles() RETURNS trigger AS $$
BEGIN
    IF EXISTS (
        WITH RECURSIVE check_tree AS (
            SELECT dependency_id FROM v4_l3.capability_dependencies WHERE dependent_id = NEW.dependency_id
            UNION ALL
            SELECT d.dependency_id FROM v4_l3.capability_dependencies d
            INNER JOIN check_tree ct ON d.dependent_id = ct.dependency_id
        )
        SELECT 1 FROM check_tree WHERE dependency_id = NEW.dependent_id
    ) THEN
        RAISE EXCEPTION 'ARCHITECTURAL_VIOLATION: Circular capability dependency detected.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_l3_cycle_prevent BEFORE INSERT OR UPDATE ON v4_l3.capability_dependencies 
FOR EACH ROW EXECUTE FUNCTION v4_l3.fn_prevent_capability_cycles();

-- [TABLE] Resource Registry
CREATE TABLE v4_l3.resource_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    resource_type text NOT NULL CHECK (resource_type IN ('HUMAN', 'EQUIPMENT', 'VEHICLE', 'LOCATION', 'SOFTWARE', 'CASH')),
    health_status text NOT NULL DEFAULT 'OPTIMAL' CHECK (health_status IN ('OPTIMAL', 'DEGRADED', 'CRITICAL', 'FAIL')),
    total_capacity int NOT NULL DEFAULT 1,
    availability_status text NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
    lifecycle_state text NOT NULL DEFAULT 'OPERATIONAL' CHECK (lifecycle_state IN ('NEW', 'OPERATIONAL', 'MAINTENANCE', 'RETIRED')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Resource Reservations
CREATE TABLE v4_l3.resource_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL REFERENCES v4_l3.resource_registry(id),
    reserved_by_job_id uuid NOT NULL,
    capacity_consumed int NOT NULL DEFAULT 1,
    valid_until timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
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

-- [TABLE] Capability Requirements
CREATE TABLE v4_l3.capability_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id text REFERENCES v4_l3.capability_definitions(id),
    resource_type text NOT NULL,
    required_capacity int NOT NULL DEFAULT 1,
    min_proficiency text NOT NULL DEFAULT 'BEGINNER'
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

-- [ENGINE] Final Hardened Readiness Evaluator (v2.9)
CREATE OR REPLACE FUNCTION v4_l3.fn_evaluate_readiness(
    _instance_id uuid,
    _actor_context_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    _instance record;
    _unready_dependency record;
    _req record;
    _available_count int;
    _governance jsonb;
BEGIN
    -- 1. Instance Check
    SELECT * FROM v4_l3.capability_instances WHERE id = _instance_id INTO _instance;
    IF NOT FOUND THEN RETURN jsonb_build_object('state', 'UNKNOWN', 'reason', 'INSTANCE_NOT_FOUND'); END IF;
    IF NOT _instance.is_active THEN RETURN jsonb_build_object('state', 'BLOCKED', 'reason', 'INSTANCE_INACTIVE'); END IF;

    -- 2. RECURSIVE Dependency Check with Internal Cycle Protection
    WITH RECURSIVE dep_tree AS (
        SELECT dependency_id, ARRAY[dependent_id] as visited_path
        FROM v4_l3.capability_dependencies WHERE dependent_id = _instance.definition_id
        UNION ALL
        SELECT d.dependency_id, dt.visited_path || d.dependent_id
        FROM v4_l3.capability_dependencies d
        JOIN dep_tree dt ON dt.dependency_id = d.dependent_id
        WHERE NOT (d.dependency_id = ANY(dt.visited_path))
    )
    SELECT ci.definition_id INTO _unready_dependency
    FROM dep_tree dt
    LEFT JOIN v4_l3.capability_instances ci ON dt.dependency_id = ci.definition_id AND ci.org_node_id = _instance.org_node_id
    WHERE ci.id IS NULL OR ci.is_active = false LIMIT 1;

    IF FOUND THEN RETURN jsonb_build_object('state', 'MISSING_DEPENDENCY', 'capability', _unready_dependency.definition_id); END IF;

    -- 3. Per-Resource Capacity & Competency Verification
    FOR _req IN SELECT * FROM v4_l3.capability_requirements WHERE capability_id = _instance.definition_id LOOP
        SELECT COALESCE(SUM(sub.net_cap), 0) INTO _available_count
        FROM (
            SELECT (r.total_capacity - COALESCE((SELECT SUM(capacity_consumed) FROM v4_l3.resource_reservations WHERE resource_id = r.id AND valid_until > now()), 0)) as net_cap
            FROM v4_l3.resource_registry r
            WHERE r.org_node_id = _instance.org_node_id AND r.resource_type = _req.resource_type
            AND r.health_status IN ('OPTIMAL', 'DEGRADED') AND r.availability_status = 'AVAILABLE' AND r.lifecycle_state = 'OPERATIONAL'
            AND (
                _req.resource_type <> 'HUMAN' 
                OR EXISTS (
                    SELECT 1 FROM v4_l3.competency_matrix c 
                    WHERE c.resource_id = r.id AND c.capability_id = _instance.definition_id
                    AND v4_l3.fn_proficiency_weight(c.proficiency_level) >= v4_l3.fn_proficiency_weight(_req.min_proficiency)
                    AND c.valid_from <= now() AND (c.valid_until IS NULL OR c.valid_until > now())
                )
            )
        ) sub;

        IF _available_count < _req.required_capacity THEN
            RETURN jsonb_build_object('state', 'INSUFFICIENT_CAPACITY', 'type', _req.resource_type, 'needed', _req.required_capacity, 'available', _available_count);
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
