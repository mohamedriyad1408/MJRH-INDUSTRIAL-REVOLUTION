-- MJRH V4 — Layer 3: Readiness & Capability (Final Frozen Core v2.8)
CREATE SCHEMA IF NOT EXISTS v4_l3;
CREATE EXTENSION IF NOT EXISTS ltree;

-- [TABLE] Capability Definitions
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

-- [TABLE] Resource Registry (Weighted Capacity Model)
CREATE TABLE v4_l3.resource_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_node_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    resource_type text NOT NULL,
    health_score int DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    total_capacity int NOT NULL DEFAULT 1,
    availability_status text NOT NULL DEFAULT 'AVAILABLE',
    lifecycle_state text NOT NULL DEFAULT 'OPERATIONAL',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Resource Reservations (L3/L4 Interface)
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

-- [ENGINE] Final Hardened Readiness Evaluator
CREATE OR REPLACE FUNCTION v4_l3.fn_evaluate_readiness(
    _instance_id uuid,
    _actor_context_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    _instance record;
    _unready_dependency text;
    _req record;
    _net_available_capacity int;
    _governance jsonb;
BEGIN
    -- 1. Structural Check
    SELECT * FROM v4_l3.capability_instances WHERE id = _instance_id INTO _instance;
    IF NOT FOUND THEN RETURN jsonb_build_object('state', 'UNKNOWN'); END IF;
    IF NOT _instance.is_active THEN RETURN jsonb_build_object('state', 'BLOCKED', 'reason', 'INACTIVE'); END IF;

    -- 2. DAG Dependency Validation
    WITH RECURSIVE dep_tree AS (
        SELECT dependency_id FROM v4_l3.capability_dependencies WHERE dependent_id = _instance.definition_id
        UNION
        SELECT d.dependency_id FROM v4_l3.capability_dependencies d
        INNER JOIN dep_tree dt ON dt.dependency_id = d.dependent_id
    )
    SELECT dt.dependency_id INTO _unready_dependency
    FROM dep_tree dt
    LEFT JOIN v4_l3.capability_instances ci ON dt.dependency_id = ci.definition_id AND ci.org_node_id = _instance.org_node_id
    WHERE ci.id IS NULL OR ci.is_active = false LIMIT 1;

    IF FOUND THEN RETURN jsonb_build_object('state', 'MISSING_DEPENDENCY', 'capability', _unready_dependency); END IF;

    -- 3. Weighted Capacity & Reservation Check
    FOR _req IN SELECT * FROM v4_l3.capability_requirements WHERE capability_id = _instance.definition_id LOOP
        SELECT COALESCE(SUM(r.total_capacity), 0) - COALESCE((SELECT SUM(capacity_consumed) FROM v4_l3.resource_reservations WHERE resource_id = r.id AND valid_until > now()), 0)
        INTO _net_available_capacity
        FROM v4_l3.resource_registry r
        WHERE r.org_node_id = _instance.org_node_id AND r.resource_type = _req.resource_type
        AND r.health_score > 20 AND r.availability_status = 'AVAILABLE' AND r.lifecycle_state = 'OPERATIONAL';

        IF _net_available_capacity < _req.required_capacity THEN
            RETURN jsonb_build_object('state', 'INSUFFICIENT_CAPACITY', 'type', _req.resource_type, 'needed', _req.required_capacity, 'available', _net_available_capacity);
        END IF;
    END LOOP;

    RETURN jsonb_build_object('state', 'READY', 'evaluated_at', now());
END;
$$ LANGUAGE plpgsql STABLE;
