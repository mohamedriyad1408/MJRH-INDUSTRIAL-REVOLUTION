-- MJRH V4 — ONBOARDING ENGINE: THE BIRTH CHANNEL (Phase 2)
-- Implementation of launch_enterprise and its helpers.

BEGIN;

-- 1. [INFRASTRUCTURE] Industry Catalog
CREATE TABLE IF NOT EXISTS v4_industry.catalog_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sovereign_root_id uuid NOT NULL REFERENCES v4_l1.nodes(id),
    name_ar text NOT NULL,
    name_en text NOT NULL,
    base_price numeric(12,2) DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 2. [HELPER] Payload Generator (Easy Mode Logic)
CREATE OR REPLACE FUNCTION v4_control.generate_payload_from_industry(
    _business_type text,
    _org_name text,
    _slug text,
    _primary_lang text DEFAULT 'ar'
) RETURNS jsonb AS $$
DECLARE
    _payload jsonb;
BEGIN
    -- Basic logic to switch between industries
    -- This can be expanded to read from a template table later
    IF _business_type = 'laundry' THEN
        _payload := jsonb_build_object(
            'legal_name', _org_name,
            'slug', _slug,
            'primary_lang', _primary_lang,
            'departments', jsonb_build_array(
                jsonb_build_object('key', 'FRONT_DESK', 'name_ar', 'الاستقبال', 'name_en', 'Front Desk'),
                jsonb_build_object('key', 'PROCESSING', 'name_ar', 'التشغيل', 'name_en', 'Processing'),
                jsonb_build_object('key', 'FINANCE', 'name_ar', 'المالية', 'name_en', 'Finance')
            ),
            'value_stream', jsonb_build_object(
                'name', 'Standard Laundry Flow',
                'activities', jsonb_build_array(
                    jsonb_build_object('name', 'RECEIVE', 'order', 10, 'mandate', 'OPERATIONAL_ENTRY', 'name_ar', 'استلام', 'name_en', 'Receive'),
                    jsonb_build_object('name', 'WASH', 'order', 20, 'mandate', 'OPERATIONAL_EXEC', 'name_ar', 'غسيل', 'name_en', 'Wash'),
                    jsonb_build_object('name', 'IRON', 'order', 30, 'mandate', 'OPERATIONAL_EXEC', 'name_ar', 'كي', 'name_en', 'Iron'),
                    jsonb_build_object('name', 'DELIVERY', 'order', 40, 'mandate', 'OPERATIONAL_EXIT', 'name_ar', 'تسليم', 'name_en', 'Delivery')
                )
            ),
            'branding', jsonb_build_object('primary_color', '#ef4444')
        );
    ELSE
        _payload := jsonb_build_object('error', 'Unsupported industry for Easy Mode');
    END IF;

    RETURN _payload;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. [ENGINE] Atomic Enterprise Launch
CREATE OR REPLACE FUNCTION v4_control.launch_enterprise(
    _payload jsonb,
    _owner_user_id uuid -- Maps to profiles.id
) RETURNS uuid 
SECURITY DEFINER
SET search_path = v4_control, v4_l1, v4_l2, v4_l3, v4_l4, v4_l7, v4_l10, v4_industry, public
AS $$
DECLARE
    _root_identity_id uuid;
    _root_node_id uuid;
    _stream_id uuid;
    _dept jsonb;
    _act jsonb;
    _goal jsonb;
    _item jsonb;
    _primary_lang text := COALESCE(_payload->>'primary_lang', 'ar');
    _slug text := _payload->>'slug';
    _legal_name text := _payload->>'legal_name';
BEGIN
    -- A. ATOMICITY: All or nothing logic starts here
    
    -- 1. Identity & Sovereign Root (L1)
    INSERT INTO v4_l1.identities (global_urn, legal_name, is_sovereign_root, sovereign_owner_id)
    VALUES ('urn:mjrh:' || _slug, _legal_name, true, _owner_user_id)
    RETURNING id INTO _root_identity_id;

    INSERT INTO v4_l1.nodes (identity_id, node_class, node_path, translation)
    VALUES (
        _root_identity_id, 
        'SOVEREIGN_ROOT', 
        text2ltree(replace(_slug, '-', '_')),
        jsonb_build_object(_primary_lang, _legal_name)
    ) RETURNING id INTO _root_node_id;

    -- 2. Owner Actor & Mandate (L2)
    -- We assume 'HUMAN' type for the initial owner
    INSERT INTO v4_l2.actors (identity_id, type, sovereign_root_id)
    VALUES (_owner_user_id, 'HUMAN', _root_node_id);

    -- Create Strategic Position for Owner
    WITH new_pos AS (
        INSERT INTO v4_l2.positions (node_id, job_id, lifecycle_status)
        VALUES (
            _root_node_id, 
            (SELECT id FROM v4_l2.job_blueprints WHERE code = 'LDR_TECH' LIMIT 1), -- Default for now, can be improved
            'ACTIVE'
        ) RETURNING id
    )
    INSERT INTO v4_l2.assignments (actor_id, position_id, assignment_type, effective_range)
    SELECT 
        (SELECT id FROM v4_l2.actors WHERE identity_id = _owner_user_id LIMIT 1),
        id, 'PRIMARY', tstzrange(now(), 'infinity')
    FROM new_pos;

    -- Grant Strategic Authority
    INSERT INTO v4_l2.authorities (assignment_id, domain, authority_class)
    VALUES (
        (SELECT a.id FROM v4_l2.assignments a JOIN v4_l2.actors act ON a.actor_id = act.id WHERE act.identity_id = _owner_user_id LIMIT 1),
        'STRATEGIC', 'STRATEGIC_GOVERNANCE'
    );

    -- 3. Departments (L1 Nodes)
    FOR _dept IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'departments', '[]'::jsonb)) LOOP
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class, node_path, translation)
        VALUES (
            _root_identity_id,
            _root_node_id,
            'INTERNAL_NODE',
            text2ltree(replace(_slug, '-', '_')) || text2ltree(lower(_dept->>'key')),
            jsonb_build_object('ar', _dept->>'name_ar', 'en', _dept->>'name_en')
        );
    END LOOP;

    -- 4. Value Stream & Activities (L4)
    IF _payload ? 'value_stream' THEN
        INSERT INTO v4_l4.value_streams (sovereign_root_id, name, version)
        VALUES (_root_node_id, _payload->'value_stream'->>'name', 1)
        RETURNING id INTO _stream_id;

        FOR _act IN SELECT * FROM jsonb_array_elements(_payload->'value_stream'->'activities') LOOP
            INSERT INTO v4_l4.activities (stream_id, name, sequence_order, mandate_required, translation)
            VALUES (
                _stream_id,
                _act->>'name',
                (_act->>'order')::int,
                _act->>'mandate',
                jsonb_build_object('ar', _act->>'name_ar', 'en', _act->>'name_en')
            );
        END LOOP;
    END IF;

    -- 5. Catalog Items (Industry)
    FOR _item IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'catalog', '[]'::jsonb)) LOOP
        INSERT INTO v4_industry.catalog_items (sovereign_root_id, name_ar, name_en, base_price)
        VALUES (_root_node_id, _item->>'name_ar', _item->>'name_en', (_item->>'price')::numeric);
    END LOOP;

    -- 6. Strategic Goals (L10)
    FOR _goal IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'goals', '[]'::jsonb)) LOOP
        INSERT INTO v4_l10.strategic_goals (sovereign_root_id, goal_name, target_metric, target_value, deadline)
        VALUES (_root_node_id, _goal->>'name', _goal->>'metric', (_goal->>'value')::numeric, (_goal->>'deadline')::date);
    END LOOP;

    -- 7. Branding & Preferences (L7)
    INSERT INTO v4_l7.branding_profiles (sovereign_root_id, theme_config)
    VALUES (_root_node_id, _payload->'branding');

    -- Record in Migration Log (Misnamed but used for onboarding record)
    INSERT INTO v4_control.migration_log (legacy_tenant_id, new_sovereign_root_id, status, metadata)
    VALUES (gen_random_uuid(), _root_node_id, 'SUCCESS', jsonb_build_object('source', 'onboarding_engine', 'payload', _payload));

    RETURN _root_node_id;

EXCEPTION WHEN OTHERS THEN
    -- Postgres handles rollback automatically in functions within transactions, 
    -- but we re-raise to ensure calling app knows it failed.
    RAISE EXCEPTION 'LAUNCH_FAILED: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMIT;
