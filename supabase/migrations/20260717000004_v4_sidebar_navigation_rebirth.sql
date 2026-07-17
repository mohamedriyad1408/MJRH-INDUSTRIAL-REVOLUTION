-- MJRH V4 — SIDEBAR REBIRTH: DYNAMIC NAVIGATION (v1.5)
-- Purpose: Update Cockpit RPC to return grouped navigation based on L2 mandates and L1 structure.

BEGIN;

-- 1. Correct any typos in public.core_navigation_items (The Forensic Fix)
UPDATE public.core_navigation_items 
SET label_ar = 'الفرز والتصنيف' 
WHERE label_ar = 'الفوز والتصنيف' OR item_key = 'sorting_workspace';

-- 2. Update the Unified Cockpit RPC
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
    _navigation jsonb;
    _result jsonb;
BEGIN
    -- 1. Resolve Actor Identity from Session
    SELECT id, identity_id, sovereign_root_id INTO _actor_id, _identity_id, _root_id 
    FROM v4_l2.actors WHERE identity_id = auth.uid() LIMIT 1;
    
    IF NOT FOUND THEN RETURN NULL; END IF;

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

    -- 4. Check if Managerial Role
    SELECT EXISTS (
        SELECT 1 FROM v4_l2.authorities auth
        JOIN v4_l2.assignments ass ON auth.assignment_id = ass.id
        WHERE ass.actor_id = _actor_id AND auth.authority_class = 'STRATEGIC_GOVERNANCE'
    ) INTO _is_manager;

    -- 5. Build Dynamic Navigation
    WITH nav_items AS (
        SELECT 
            department_key,
            jsonb_agg(jsonb_build_object(
                'label', COALESCE(label_ar, label_en),
                'url', route,
                'icon', icon
            ) ORDER BY sort_order) as items
        FROM public.core_navigation_items
        WHERE tenant_id = (SELECT id FROM public.tenants WHERE id = (SELECT identity_id FROM v4_l1.nodes WHERE id = _root_id))
        AND is_active = true
        AND (
            required_roles && (
                SELECT array_agg(role) 
                FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND tenant_id = (SELECT id FROM public.tenants WHERE id = (SELECT identity_id FROM v4_l1.nodes WHERE id = _root_id))
            )
            OR _is_manager -- Managers see everything for now as per V4 policy
        )
        GROUP BY department_key
    )
    SELECT jsonb_agg(jsonb_build_object(
        'group', 
        CASE 
            WHEN department_key = 'main' THEN 'الرئيسية'
            WHEN department_key = 'operations' THEN 'التشغيل'
            WHEN department_key = 'commerce' THEN 'المبيعات'
            WHEN department_key = 'finance' THEN 'المالية'
            WHEN department_key = 'admin' THEN 'الإدارة'
            WHEN department_key = 'laundry_operations' THEN 'محطات الغسيل'
            ELSE department_key
        END,
        'items', items
    ) ORDER BY (
        CASE 
            WHEN department_key = 'main' THEN 1
            WHEN department_key = 'operations' THEN 2
            WHEN department_key = 'laundry_operations' THEN 3
            WHEN department_key = 'commerce' THEN 4
            WHEN department_key = 'finance' THEN 5
            WHEN department_key = 'admin' THEN 6
            ELSE 100
        END
    )) INTO _navigation
    FROM nav_items;

    -- 6. Build Final Payload
    _result := jsonb_build_object(
        'timestamp', now(),
        'identity', (
            SELECT jsonb_build_object(
                'name', COALESCE(translation->>_lang, legal_name),
                'urn', global_urn
            ) FROM v4_l1.identities WHERE id = (SELECT identity_id FROM v4_l1.nodes WHERE id = _root_id)
        ),
        'actor', jsonb_build_object(
            'full_name', (SELECT full_name FROM public.profiles WHERE id = _identity_id),
            'lang', _lang,
            'is_manager', _is_manager
        ),
        'navigation', COALESCE(_navigation, '[]'::jsonb),
        'tasks', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', wo.id,
                'status', wo.status,
                'activity_name', COALESCE(act.translation->>_lang, act.name),
                'updated_at', wo.updated_at
            )) FROM v4_l4.work_orders wo
            JOIN v4_l4.activities act ON wo.current_activity_id = act.id
            WHERE wo.actor_id = _actor_id AND wo.status IN ('PENDING', 'RUNNING')
        )
    );

    RETURN _result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
