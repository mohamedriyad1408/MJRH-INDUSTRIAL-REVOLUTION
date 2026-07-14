-- MJRH V4 — Layer 3: Readiness & Capability (v1.0 Implementation)
CREATE SCHEMA IF NOT EXISTS v4_l3;

-- [TABLE] Capability Catalog (Definitions)
CREATE TABLE v4_l3.capability_definitions (
    id text PRIMARY KEY, -- e.g., 'ops.laundry', 'fin.ledger'
    name_en text NOT NULL,
    version text NOT NULL,
    config_schema jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [TABLE] Capability Instances (Anchored to L1)
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

-- [TABLE] Resource Registry (Abstract & Typed)
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

-- [TABLE] Competency Matrix (Versioned)
CREATE TABLE v4_l3.competency_matrix (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL REFERENCES v4_l3.resource_registry(id),
    capability_id text NOT NULL REFERENCES v4_l3.capability_definitions(id),
    proficiency_level text NOT NULL, -- e.g., 'EXPERT', 'BEGINNER'
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- [ENGINE] Readiness Evaluator (The Core Formula)
CREATE OR REPLACE FUNCTION v4_l3.fn_evaluate_readiness(
    _instance_id uuid,
    _actor_context_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    _instance record;
    _dep_ready boolean;
    _resource_fail boolean;
    _governance jsonb;
BEGIN
    -- 1. Fetch Instance State
    SELECT * FROM v4_l3.capability_instances WHERE id = _instance_id INTO _instance;
    IF NOT FOUND THEN RETURN jsonb_build_object('state', 'UNKNOWN', 'reason', 'INSTANCE_NOT_FOUND'); END IF;
    IF NOT _instance.is_active THEN RETURN jsonb_build_object('state', 'BLOCKED', 'reason', 'INSTANCE_INACTIVE'); END IF;

    -- 2. Dependency Check (Simplified recursive logic)
    SELECT NOT EXISTS (
        SELECT 1 FROM v4_l3.capability_dependencies d
        JOIN v4_l3.capability_instances i ON d.dependency_id = i.definition_id
        WHERE d.dependent_id = _instance.definition_id
        AND i.org_node_id = _instance.org_node_id
        AND i.is_active = false
    ) INTO _dep_ready;

    IF NOT _dep_ready THEN RETURN jsonb_build_object('state', 'MISSING_DEPENDENCY'); END IF;

    -- 3. Resource Health Check (Look for CRITICAL/FAIL assets in the node)
    SELECT EXISTS (
        SELECT 1 FROM v4_l3.resource_registry 
        WHERE org_node_id = _instance.org_node_id 
        AND health_status IN ('CRITICAL', 'FAIL')
    ) INTO _resource_fail;

    IF _resource_fail THEN RETURN jsonb_build_object('state', 'BLOCKED', 'reason', 'CRITICAL_RESOURCE_FAILURE'); END IF;

    -- 4. Governance Validation (L2 Integration)
    IF _actor_context_id IS NOT NULL THEN
        _governance := v4_l2.fn_evaluate_governance(_actor_context_id, _instance.org_node_id, 'capability.pulse', 'system');
        IF (_governance->>'decision' <> 'ALLOW') THEN
            RETURN jsonb_build_object('state', 'POLICY_BLOCKED', 'reason', _governance->>'reason');
        END IF;
    END IF;

    RETURN jsonb_build_object('state', 'READY', 'evaluated_at', now());
END;
$$ LANGUAGE plpgsql STABLE;
