-- MJRH V4 — Layer 7: DYNAMIC INTERFACE (v1.0 - PERSISTENCE)
CREATE SCHEMA IF NOT EXISTS v4_l7;

-- [TABLE] Form Schemas
-- Links Layer 4 Activities to UI input requirements.
CREATE TABLE v4_l7.form_schemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES v4_l4.activities(id) ON DELETE CASCADE,
    schema_json jsonb NOT NULL, -- Standard JSON Schema
    ui_config jsonb DEFAULT '{}'::jsonb, -- Layout hints (columns, groups)
    is_active boolean DEFAULT true,
    UNIQUE (activity_id)
);

-- [TABLE] Sovereign Branding
-- Global UI overrides for each Sovereign Root.
CREATE TABLE v4_l7.branding_profiles (
    sovereign_root_id uuid PRIMARY KEY REFERENCES v4_l1.nodes(id),
    theme_config jsonb NOT NULL DEFAULT '{}'::jsonb, -- Colors, typography
    assets jsonb NOT NULL DEFAULT '{}'::jsonb, -- Logos, icons
    updated_at timestamptz DEFAULT now()
);

-- [ORCHESTRATOR] Metadata Bundle Resolver
-- Fetches everything a UI needs to render a Work Order's current step.
CREATE OR REPLACE FUNCTION v4_l7.fn_v_get_ui_metadata(_work_order_id uuid, _actor_id uuid)
RETURNS jsonb
SET search_path = v4_l7, v4_l6, v4_l4, v4_l3, v4_l2, v4_l1, public
AS $$
DECLARE
    _wo record;
    _activity record;
    _branding jsonb;
    _form_schema jsonb;
    _readiness jsonb;
    _can_execute boolean;
BEGIN
    -- 1. Get Work Order Context
    SELECT * FROM v4_l4.work_orders WHERE id = _work_order_id INTO _wo;
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- 2. Resolve Branding
    SELECT theme_config || assets INTO _branding 
    FROM v4_l7.branding_profiles 
    WHERE sovereign_root_id = (v4_l1.resolve_sovereign_root(_wo.node_id)->>'sovereign_id')::uuid;

    -- 3. Resolve Form Schema for Current Activity
    SELECT schema_json INTO _form_schema FROM v4_l7.form_schemas WHERE activity_id = _wo.current_activity_id;

    -- 4. Check L2 Authority & L3 Readiness for UI Gating
    -- This is a pre-check for UI state (Enable/Disable buttons)
    SELECT * FROM v4_l4.activities WHERE id = _wo.current_activity_id INTO _activity;
    
    _can_execute := EXISTS (
        SELECT 1 FROM v4_l2.assignments a
        JOIN v4_l2.authorities auth ON a.id = auth.assignment_id
        WHERE a.actor_id = _actor_id 
        AND a.lifecycle_status = 'ACTIVE'
        AND auth.authority_class = _activity.mandate_required
    );

    _readiness := v4_l3.fn_evaluate_readiness(
        (SELECT id FROM v4_l3.capability_instances WHERE definition_id = _activity.capability_definition_id AND org_node_id = _wo.node_id LIMIT 1)
    );

    RETURN jsonb_build_object(
        'work_order', jsonb_build_object('id', _wo.id, 'status', _wo.status, 'payload', _wo.payload),
        'activity', jsonb_build_object('id', _activity.id, 'name', _activity.name, 'mandate_required', _activity.mandate_required),
        'ui', jsonb_build_object('branding', _branding, 'form_schema', _form_schema),
        'gates', jsonb_build_object('can_execute', _can_execute, 'readiness', _readiness)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- [RLS]
ALTER TABLE v4_l7.form_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE v4_l7.branding_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_v4_l7_branding_isolation ON v4_l7.branding_profiles
FOR ALL TO authenticated
USING (
    subltree((SELECT node_path FROM v4_l1.nodes WHERE id = sovereign_root_id), 0, 1)::text = current_setting('app.current_sovereign_label', true)
);
