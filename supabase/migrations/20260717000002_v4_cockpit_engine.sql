-- MJRH V4 — COMMAND CENTER: THE SOVEREIGN COCKPIT (Phase 3)
-- Unified entry point for all organizational awareness.

BEGIN;

-- 1. [L7] User Preferences for UI state and Language
CREATE TABLE IF NOT EXISTS v4_l7.user_preferences (
    actor_id uuid PRIMARY KEY REFERENCES v4_l2.actors(id) ON DELETE CASCADE,
    preferred_language text DEFAULT 'ar',
    ui_mode text DEFAULT 'grid', -- 'list', 'grid', 'cards'
    last_login timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. [L7] The Unified Command RPC
-- Aggregates data from L1-L10 in a single localized payload.
CREATE OR REPLACE FUNCTION v4_l7.rpc_get_personal_cockpit()
RETURNS jsonb
SECURITY DEFINER
SET search_path = v4_l7, v4_l10, v4_l6, v4_l4, v4_l3, v4_l2, v4_l1, public
AS $$
DECLARE
    _actor_id uuid;
    _identity_id uuid;
    _node_id uuid;
    _root_id uuid;
    _lang text;
    _is_manager boolean;
    _result jsonb;
BEGIN
    -- 1. Resolve Actor Identity from Session
    SELECT id, identity_id, sovereign_root_id INTO _actor_id, _identity_id, _root_id 
    FROM v4_l2.actors WHERE identity_id = auth.uid() LIMIT 1;
    
    IF NOT FOUND THEN RAISE EXCEPTION 'UNAUTHORIZED: Actor record missing.'; END IF;

    -- 2. Resolve Language Preference
    SELECT COALESCE(preferred_language, 'ar') INTO _lang 
    FROM v4_l7.user_preferences WHERE actor_id = _actor_id;
    _lang := COALESCE(_lang, 'ar');

    -- 3. Resolve Node Context (Primary assignment location)
    SELECT n.id INTO _node_id 
    FROM v4_l2.assignments a 
    JOIN v4_l2.positions p ON a.position_id = p.id
    JOIN v4_l1.nodes n ON p.node_id = n.id
    WHERE a.actor_id = _actor_id AND a.lifecycle_status = 'ACTIVE'
    LIMIT 1;

    -- 4. Check if Managerial Role (Strategic Governance mandate)
    SELECT EXISTS (
        SELECT 1 FROM v4_l2.authorities auth
        JOIN v4_l2.assignments ass ON auth.assignment_id = ass.id
        WHERE ass.actor_id = _actor_id AND auth.authority_class = 'STRATEGIC_GOVERNANCE'
    ) INTO _is_manager;

    -- 5. Build Final Payload
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
        -- My Tasks (L4)
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
        -- System Consciousness (L6)
        'alerts', (
            SELECT jsonb_agg(jsonb_build_object(
                'title', title,
                'body', body,
                'created_at', created_at
            )) FROM v4_l6.alerts 
            WHERE sovereign_root_id = _root_id AND is_read = false
            LIMIT 5
        ),
        -- Strategic Compass (L10)
        'strategic_compass', (
            SELECT jsonb_agg(jsonb_build_object(
                'goal', goal_name,
                'target', target_value,
                'current', current_value,
                'status', status
            )) FROM v4_l10.strategic_goals 
            WHERE sovereign_root_id = (SELECT id FROM v4_l1.nodes WHERE id = _root_id)
        ),
        -- Fleet / Assets (L3)
        'fleet_status', (
            SELECT jsonb_agg(jsonb_build_object(
                'metric', metric_key,
                'value', metric_value,
                'time', occurred_at
            )) FROM v4_l3.asset_telemetry
            WHERE node_id = _node_id
            ORDER BY occurred_at DESC LIMIT 10
        )
    );

    RETURN _result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. [L7] Helper to change language preference
CREATE OR REPLACE FUNCTION v4_l7.rpc_update_user_language(_lang text)
RETURNS void
SECURITY DEFINER
SET search_path = v4_l7, v4_l2, public
AS $$
BEGIN
    INSERT INTO v4_l7.user_preferences (actor_id, preferred_language)
    VALUES ((SELECT id FROM v4_l2.actors WHERE identity_id = auth.uid() LIMIT 1), _lang)
    ON CONFLICT (actor_id) DO UPDATE SET preferred_language = _lang, updated_at = now();
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION v4_l7.rpc_get_personal_cockpit TO authenticated;
GRANT EXECUTE ON FUNCTION v4_l7.rpc_update_user_language TO authenticated;

COMMIT;
