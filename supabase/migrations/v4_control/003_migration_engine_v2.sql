-- MJRH V4 — SOVEREIGN ETL: MIGRATION ENGINE (v2.0 Hardened)
-- STATUS: PRODUCTION_READY

CREATE TABLE IF NOT EXISTS v4_control.migration_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_tenant_id uuid UNIQUE NOT NULL,
    new_sovereign_root_id uuid NOT NULL,
    migrated_at timestamptz DEFAULT now(),
    status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION v4_control.migrate_legacy_tenant(
    _legacy_tenant_id uuid
) RETURNS uuid 
SECURITY DEFINER
SET search_path = v4_control, v4_l1, v4_l2, v4_l4, v4_industry, public
AS $$
DECLARE
    _legacy record;
    _new_identity_id uuid;
    _new_root_node_id uuid;
    _new_stream_id uuid;
    _template record;
    _activity_map jsonb := '{}'::jsonb;
    _user record;
    _order record;
    _current_activity_uuid uuid;
    _job_blueprint_id uuid;
    i int;
BEGIN
    -- 1. PRE-FLIGHT CHECK
    IF EXISTS (SELECT 1 FROM v4_control.migration_log WHERE legacy_tenant_id = _legacy_tenant_id) THEN
        RAISE EXCEPTION 'TENANT_ALREADY_MIGRATED: %', _legacy_tenant_id;
    END IF;

    SELECT * INTO _legacy FROM public.tenants WHERE id = _legacy_tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'LEGACY_TENANT_NOT_FOUND'; END IF;

    -- 2. SEED REQUIRED BLUEPRINTS
    INSERT INTO v4_l2.job_blueprints (code, title_ar, title_en)
    VALUES ('LDR_TECH', 'فني تشغيل', 'Operations Technician')
    ON CONFLICT (code) DO NOTHING;
    
    SELECT id INTO _job_blueprint_id FROM v4_l2.job_blueprints WHERE code = 'LDR_TECH';

    -- 3. L1: IDENTITY & SOVEREIGN ROOT
    INSERT INTO v4_l1.identities (global_urn, legal_name, is_sovereign_root, sovereign_owner_id)
    VALUES ('urn:mjrh:' || _legacy.slug, _legacy.name, true, _legacy.owner_user_id)
    RETURNING id INTO _new_identity_id;

    INSERT INTO v4_l1.nodes (identity_id, node_class, node_path, current_state)
    VALUES (_new_identity_id, 'SOVEREIGN_ROOT', text2ltree(replace(_legacy.slug, '-', '_')), 'ACTIVE')
    RETURNING id INTO _new_root_node_id;

    -- 4. L2: ACTORS & ASSIGNMENTS
    FOR _user IN 
        SELECT p.id, p.full_name FROM public.profiles p
        WHERE p.id IN (
            SELECT user_id FROM public.user_roles WHERE tenant_id = _legacy_tenant_id
            UNION
            SELECT owner_user_id FROM public.tenants WHERE id = _legacy_tenant_id AND owner_user_id IS NOT NULL
        )
    LOOP
        INSERT INTO v4_l2.actors (identity_id, type, sovereign_root_id)
        VALUES (_user.id, 'HUMAN', _new_root_node_id)
        ON CONFLICT (identity_id) DO NOTHING;

        WITH new_pos AS (
            INSERT INTO v4_l2.positions (node_id, job_id, lifecycle_status)
            VALUES (_new_root_node_id, _job_blueprint_id, 'ACTIVE')
            ON CONFLICT (node_id) DO UPDATE SET lifecycle_status = 'ACTIVE'
            RETURNING id
        )
        INSERT INTO v4_l2.assignments (actor_id, position_id, assignment_type, effective_range)
        SELECT (SELECT id FROM v4_l2.actors WHERE identity_id = _user.id), id, 'PRIMARY', tstzrange(now(), 'infinity')
        FROM new_pos ON CONFLICT DO NOTHING;
    END LOOP;

    -- 5. L4: VALUE STREAM & ACTIVITIES
    SELECT * INTO _template FROM v4_industry.laundry_template WHERE name = 'Industrial Laundry v1';
    
    INSERT INTO v4_l4.value_streams (sovereign_root_id, name, version)
    VALUES (_new_root_node_id, 'Migrated Standard Stream', 1)
    RETURNING id INTO _new_stream_id;

    FOR i IN 0..jsonb_array_length(_template.value_stream_config->'activities') - 1 LOOP
        INSERT INTO v4_l4.activities (stream_id, name, sequence_order, mandate_required)
        VALUES (
            _new_stream_id, 
            (_template.value_stream_config->'activities'->i->>'name'), 
            (i + 1) * 10, 
            (_template.value_stream_config->'activities'->i->>'mandate')
        )
        RETURNING id INTO _current_activity_uuid;
        
        _activity_map := _activity_map || jsonb_build_object((_template.value_stream_config->'activities'->i->>'name'), _current_activity_uuid);
    END LOOP;

    -- 6. L4: DUAL MIGRATION
    -- Part A: Work Orders (V3)
    FOR _order IN SELECT * FROM public.work_orders WHERE tenant_id = _legacy_tenant_id
    LOOP
        INSERT INTO v4_l4.work_orders (node_id, stream_id, current_activity_id, status, payload)
        VALUES (
            _new_root_node_id, _new_stream_id, 
            (_activity_map->>'WASH')::uuid,
            'RUNNING',
            row_to_json(_order)::jsonb || jsonb_build_object('migration_source', 'public.work_orders')
        );
    END LOOP;

    -- Part B: Orders (V2)
    FOR _order IN 
        SELECT * FROM public.orders WHERE tenant_id = _legacy_tenant_id
        AND id NOT IN (SELECT (payload->>'id')::uuid FROM v4_l4.work_orders WHERE node_id = _new_root_node_id)
    LOOP
        _current_activity_uuid := CASE 
            WHEN _order.status = 'received' THEN (_activity_map->>'RECEIVE')::uuid
            WHEN _order.status = 'cleaning' THEN (_activity_map->>'WASH')::uuid
            WHEN _order.status = 'ironing'  THEN (_activity_map->>'IRON')::uuid
            WHEN _order.status = 'delivered' THEN (_activity_map->>'DELIVERY')::uuid
            ELSE (_activity_map->>'RECEIVE')::uuid
        END;

        INSERT INTO v4_l4.work_orders (node_id, stream_id, current_activity_id, status, payload)
        VALUES (
            _new_root_node_id, _new_stream_id, _current_activity_uuid,
            CASE WHEN _order.status = 'delivered' THEN 'COMPLETED' ELSE 'RUNNING' END,
            row_to_json(_order)::jsonb || jsonb_build_object('migration_source', 'public.orders')
        );
    END LOOP;

    -- 7. AUDIT & LOG
    INSERT INTO v4_control.migration_log (legacy_tenant_id, new_sovereign_root_id, status, metadata)
    VALUES (_legacy_tenant_id, _new_root_node_id, 'SUCCESS', jsonb_build_object('identity_id', _new_identity_id));

    RETURN _new_root_node_id;
END;
$$ LANGUAGE plpgsql;
