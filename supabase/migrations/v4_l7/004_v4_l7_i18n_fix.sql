-- MJRH V4 — i18n LOGIC REPAIR: DYNAMIC TRANSLATION RESOLVER (v1.1)
-- Purpose: Force the OS to return localized names instead of raw DB strings.

BEGIN;

-- 1. [L7] Update Navigation Resolver to be Language-Aware
CREATE OR REPLACE FUNCTION v4_l7.fn_v_get_actor_navigation(_actor_id uuid, _lang text DEFAULT 'ar')
RETURNS jsonb
SET search_path = v4_l7, v4_l2, v4_l1, public
AS $$
DECLARE
    _sov_root_id uuid;
    _nav_tree jsonb;
BEGIN
    SELECT sovereign_root_id INTO _sov_root_id FROM v4_l2.actors WHERE id = _actor_id;

    SELECT jsonb_agg(sub) INTO _nav_tree
    FROM (
        SELECT 
            fs.id,
            -- Logic: Priority to i18n label, fallback to raw activity name
            COALESCE(fs.ui_config->'i18n'->_lang->>'label', a.name) as activity_name,
            vs.name as stream_name,
            fs.ui_config->>'icon' as icon,
            fs.ui_config->>'route' as route
        FROM v4_l7.form_schemas fs
        JOIN v4_l4.activities a ON fs.activity_id = a.id
        JOIN v4_l4.value_streams vs ON a.stream_id = vs.id
        WHERE vs.sovereign_root_id = _sov_root_id
        AND v4_l2.fn_v_has_effective_mandate(_actor_id, a.mandate_required, vs.sovereign_root_id)
        ORDER BY vs.name, a.sequence_order
    ) sub;

    RETURN COALESCE(_nav_tree, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. [L7] Update UI Metadata Resolver for Branding Translation
CREATE OR REPLACE FUNCTION v4_l7.fn_v_get_ui_metadata(_work_order_id uuid, _actor_id uuid, _lang text DEFAULT 'ar')
RETURNS jsonb
SET search_path = v4_l7, v4_l6, v4_l4, v4_l3, v4_l2, v4_l1, public
AS $$
DECLARE
    _wo record;
    _activity record;
    _branding_row record;
    _branding_final jsonb;
    _form_schema jsonb;
BEGIN
    SELECT * FROM v4_l4.work_orders WHERE id = _work_order_id INTO _wo;
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- Resolve Localized Branding
    SELECT * INTO _branding_row 
    FROM v4_l7.branding_profiles 
    WHERE sovereign_root_id = (v4_l1.resolve_sovereign_root(_wo.node_id)->>'sovereign_id')::uuid;

    _branding_final := _branding_row.theme_config || _branding_row.assets || jsonb_build_object(
        'effective_name', COALESCE(_branding_row.theme_config->'i18n'->_lang->>'org_name', 'MJRH Enterprise'),
        'effective_tagline', COALESCE(_branding_row.theme_config->'i18n'->_lang->>'tagline', '')
    );

    SELECT schema_json INTO _form_schema FROM v4_l7.form_schemas WHERE activity_id = _wo.current_activity_id;
    SELECT * FROM v4_l4.activities WHERE id = _wo.current_activity_id INTO _activity;
    
    RETURN jsonb_build_object(
        'work_order', jsonb_build_object('id', _wo.id, 'status', _wo.status),
        'ui', jsonb_build_object('branding', _branding_final, 'form_schema', _form_schema)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. [RPC] Update Unified Entry Point
CREATE OR REPLACE FUNCTION v4_l7.rpc_get_app_context(_work_order_id uuid DEFAULT NULL, _lang text DEFAULT 'ar')
RETURNS jsonb
SECURITY DEFINER
SET search_path = v4_l7, v4_l4, v4_l2, v4_l1, public
AS $$
DECLARE
    _actor_id uuid;
    _nav jsonb;
    _meta jsonb := '{}'::jsonb;
BEGIN
    SELECT id INTO _actor_id FROM v4_l2.actors WHERE identity_id = auth.uid() LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'UNREGISTERED_ACTOR'; END IF;

    -- Pass language context down the stack
    _nav := v4_l7.fn_v_get_actor_navigation(_actor_id, _lang);

    IF _work_order_id IS NOT NULL THEN
        _meta := v4_l7.fn_v_get_ui_metadata(_work_order_id, _actor_id, _lang);
    END IF;

    RETURN jsonb_build_object(
        'actor_id', _actor_id,
        'navigation', _nav,
        'active_context', _meta,
        'current_lang', _lang
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
