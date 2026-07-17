-- MJRH V4 — i18n REPAIR: IDENTITY TRANSLATION DNA (v1.2)
-- Purpose: Add translation support to identities and fix the cockpit name resolution.

BEGIN;

-- 1. [L1] Add translation column to identities
ALTER TABLE v4_l1.identities ADD COLUMN IF NOT EXISTS translation jsonb DEFAULT '{}'::jsonb;

-- 2. [L1] Backfill translation for the Dry-Tech identity
UPDATE v4_l1.identities
SET translation = jsonb_build_object(
    'ar', 'دراي تيك للمغاسل الصناعية',
    'en', 'Dry-Tech Industrial Laundry'
)
WHERE global_urn = 'urn:mjrh:dry-tech-cairo';

-- 3. [L7] Fix Cockpit RPC to use the identity translation
CREATE OR REPLACE FUNCTION v4_l7.rpc_get_personal_cockpit(_lang text DEFAULT 'ar')
RETURNS jsonb
SECURITY DEFINER
SET search_path = v4_l7, v4_l10, v4_l6, v4_l4, v4_l3, v4_l2, v4_l1, public
AS $$
DECLARE
    _actor_id uuid;
    _identity_id uuid;
    _node_id uuid;
    _root_id uuid;
    _is_manager boolean;
    _result jsonb;
BEGIN
    -- 1. Resolve Actor Identity from Session
    SELECT id, identity_id, sovereign_root_id INTO _actor_id, _identity_id, _root_id 
    FROM v4_l2.actors WHERE identity_id = auth.uid() LIMIT 1;
    
    IF NOT FOUND THEN RAISE EXCEPTION 'UNAUTHORIZED: Actor record missing.'; END IF;

    -- 2. Resolve Node Context (Primary assignment location)
    SELECT n.id INTO _node_id 
    FROM v4_l2.assignments a 
    JOIN v4_l2.positions p ON a.position_id = p.id
    JOIN v4_l1.nodes n ON p.node_id = n.id
    WHERE a.actor_id = _actor_id AND a.lifecycle_status = 'ACTIVE'
    LIMIT 1;

    -- 3. Check if Managerial Role
    SELECT EXISTS (
        SELECT 1 FROM v4_l2.authorities auth
        JOIN v4_l2.assignments ass ON auth.assignment_id = ass.id
        WHERE ass.actor_id = _actor_id AND auth.authority_class = 'STRATEGIC_GOVERNANCE'
    ) INTO _is_manager;

    -- 4. Build Final Payload with corrected identity translation
    _result := jsonb_build_object(
        'timestamp', now(),
        'identity', (
            SELECT jsonb_build_object(
                'name', COALESCE(translation->>_lang, legal_name),
                'urn', global_urn
            ) FROM v4_l1.identities WHERE id = (SELECT identity_id FROM v4_l1.nodes WHERE id = _root_id)
        ),
        'actor', (
            SELECT jsonb_build_object(
                'full_name', (SELECT full_name FROM public.profiles WHERE id = _identity_id),
                'lang', _lang,
                'is_manager', _is_manager
            )
        ),
        'tasks', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', wo.id,
                'status', wo.status,
                'activity_name', COALESCE(act.translation->>_lang, act.name),
                'updated_at', wo.updated_at
            )) FROM v4_l4.work_orders wo
            JOIN v4_l4.activities act ON wo.current_activity_id = act.id
            WHERE wo.actor_id = _actor_id AND wo.status IN ('PENDING', 'RUNNING')
        ),
        'alerts', (
            SELECT jsonb_agg(jsonb_build_object(
                'title', title,
                'body', body,
                'created_at', created_at
            )) FROM v4_l6.alerts 
            WHERE sovereign_root_id = _root_id AND is_read = false
            LIMIT 5
        ),
        'strategic_compass', (
            SELECT jsonb_agg(jsonb_build_object(
                'goal', goal_name,
                'target', target_value,
                'current', current_value,
                'status', status
            )) FROM v4_l10.strategic_goals 
            WHERE sovereign_root_id = (SELECT id FROM v4_l1.nodes WHERE id = _root_id)
        )
    );

    RETURN _result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. [L10] Update Onboarding Engine to populate identity translation
CREATE OR REPLACE FUNCTION v4_control.launch_enterprise(
    _payload jsonb,
    _owner_user_id uuid
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
    -- 1. Identity & Sovereign Root (Populating both Identity and Node translations)
    INSERT INTO v4_l1.identities (global_urn, legal_name, is_sovereign_root, sovereign_owner_id, translation)
    VALUES (
        'urn:mjrh:' || _slug, 
        _legal_name, 
        true, 
        _owner_user_id,
        jsonb_build_object(_primary_lang, _legal_name)
    ) RETURNING id INTO _root_identity_id;

    INSERT INTO v4_l1.nodes (identity_id, node_class, node_path, translation)
    VALUES (
        _root_identity_id, 
        'SOVEREIGN_ROOT', 
        text2ltree(replace(_slug, '-', '_')),
        jsonb_build_object(_primary_lang, _legal_name)
    ) RETURNING id INTO _root_node_id;

    -- [REMAINDER OF LOGIC UNCHANGED]
    -- 2. Owner Actor & Mandate
    INSERT INTO v4_l2.actors (identity_id, type, sovereign_root_id)
    VALUES (_owner_user_id, 'HUMAN', _root_node_id);

    WITH new_pos AS (
        INSERT INTO v4_l2.positions (node_id, job_id, lifecycle_status)
        VALUES (_root_node_id, (SELECT id FROM v4_l2.job_blueprints WHERE code = 'LDR_TECH' LIMIT 1), 'ACTIVE') 
        RETURNING id
    )
    INSERT INTO v4_l2.assignments (actor_id, position_id, assignment_type, effective_range)
    SELECT (SELECT id FROM v4_l2.actors WHERE identity_id = _owner_user_id LIMIT 1), id, 'PRIMARY', tstzrange(now(), 'infinity')
    FROM new_pos;

    INSERT INTO v4_l2.authorities (assignment_id, domain, authority_class)
    VALUES (
        (SELECT a.id FROM v4_l2.assignments a JOIN v4_l2.actors act ON a.actor_id = act.id WHERE act.identity_id = _owner_user_id LIMIT 1),
        'STRATEGIC', 'STRATEGIC_GOVERNANCE'
    );

    -- 3. Departments
    FOR _dept IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'departments', '[]'::jsonb)) LOOP
        INSERT INTO v4_l1.nodes (identity_id, parent_id, node_class, node_path, translation)
        VALUES (
            _root_identity_id, _root_node_id, 'INTERNAL_NODE',
            text2ltree(replace(_slug, '-', '_')) || text2ltree(lower(_dept->>'key')),
            jsonb_build_object('ar', _dept->>'name_ar', 'en', _dept->>'name_en')
        );
    END LOOP;

    -- 4. Value Stream
    IF _payload ? 'value_stream' THEN
        INSERT INTO v4_l4.value_streams (sovereign_root_id, name, version)
        VALUES (_root_node_id, _payload->'value_stream'->>'name', 1)
        RETURNING id INTO _stream_id;

        FOR _act IN SELECT * FROM jsonb_array_elements(_payload->'value_stream'->'activities') LOOP
            INSERT INTO v4_l4.activities (stream_id, name, sequence_order, mandate_required, translation)
            VALUES (
                _stream_id, _act->>'name', (_act->>'order')::int, _act->>'mandate',
                jsonb_build_object('ar', _act->>'name_ar', 'en', _act->>'name_en')
            );
        END LOOP;
    END IF;

    -- 5. Catalog
    FOR _item IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'catalog', '[]'::jsonb)) LOOP
        INSERT INTO v4_industry.catalog_items (sovereign_root_id, name_ar, name_en, base_price)
        VALUES (_root_node_id, _item->>'name_ar', _item->>'name_en', (_item->>'price')::numeric);
    END LOOP;

    -- 6. Goals
    FOR _goal IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'goals', '[]'::jsonb)) LOOP
        INSERT INTO v4_l10.strategic_goals (sovereign_root_id, goal_name, target_metric, target_value, deadline)
        VALUES (_root_node_id, _goal->>'name', _goal->>'metric', (_goal->>'value')::numeric, (_goal->>'deadline')::date);
    END LOOP;

    -- 7. Branding
    INSERT INTO v4_l7.branding_profiles (sovereign_root_id, theme_config)
    VALUES (_root_node_id, _payload->'branding');

    INSERT INTO v4_control.migration_log (legacy_tenant_id, new_sovereign_root_id, status, metadata)
    VALUES (gen_random_uuid(), _root_node_id, 'SUCCESS', jsonb_build_object('source', 'onboarding_engine', 'payload', _payload));

    RETURN _root_node_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
