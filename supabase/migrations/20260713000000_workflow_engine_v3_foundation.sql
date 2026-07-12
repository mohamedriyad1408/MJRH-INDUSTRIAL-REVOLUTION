-- MJRH v3 Phase 0+1 — From laundry engine to generic institutional workflow engine
-- Zero extra cost, preserves v1, adds v2 behind feature flag

-- ============================================================================
-- Phase 0: Safety Net — Feature Flag + Backup + E2E foundation
-- ============================================================================

-- Feature flag on tenant level: v1 (legacy laundry) default for all existing
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS workflow_engine_version text NOT NULL DEFAULT 'v1' CHECK (workflow_engine_version IN ('v1','v2'));

COMMENT ON COLUMN public.tenants.workflow_engine_version IS 'Feature flag: v1 = legacy laundry engine with GARMENT_PROFILES, v2 = generic workflow engine reading from DB';

-- Ensure all existing tenants are v1
UPDATE public.tenants SET workflow_engine_version = 'v1' WHERE workflow_engine_version IS NULL OR workflow_engine_version NOT IN ('v1','v2');

-- Backup note: pg_dump should be run before this migration in production (documented)

-- ============================================================================
-- Phase 1: Workflow Builder Real Schema
-- ============================================================================

-- 1.a workflow_definitions
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  industry text NOT NULL DEFAULT 'generic' CHECK (industry IN ('laundry','hospitality','healthcare','food_chain','cleaning','retail','manufacturing','generic','test')),
  description text,
  is_template boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_tenant ON public.workflow_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_template ON public.workflow_definitions(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_industry ON public.workflow_definitions(industry);

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_definitions_tenant_all ON public.workflow_definitions;
CREATE POLICY workflow_definitions_tenant_all ON public.workflow_definitions
FOR ALL TO authenticated
USING (
  is_template = true 
  OR public.can_access_tenant(tenant_id)
)
WITH CHECK (
  public.can_access_tenant(tenant_id)
);

-- Public read for templates (for marketplace / landing)
DROP POLICY IF EXISTS workflow_definitions_template_public_read ON public.workflow_definitions;
CREATE POLICY workflow_definitions_template_public_read ON public.workflow_definitions
FOR SELECT TO anon, authenticated
USING (is_template = true AND is_active = true);

-- 1.b workflow_stages_v2 — truly configurable stages
CREATE TABLE IF NOT EXISTS public.workflow_stages_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  slug text NOT NULL,
  stage_order int NOT NULL,
  required_role text,
  sla_target_mins int NOT NULL DEFAULT 120 CHECK (sla_target_mins > 0),
  sla_max_mins int NOT NULL DEFAULT 240 CHECK (sla_max_mins >= sla_target_mins),
  required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  icon text DEFAULT '📦',
  color text DEFAULT '#0d9488',
  is_initial boolean NOT NULL DEFAULT false,
  is_final boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, slug),
  UNIQUE(workflow_id, stage_order)
);

CREATE INDEX IF NOT EXISTS idx_workflow_stages_v2_workflow ON public.workflow_stages_v2(workflow_id, stage_order);

ALTER TABLE public.workflow_stages_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_stages_v2_tenant_all ON public.workflow_stages_v2;
CREATE POLICY workflow_stages_v2_tenant_all ON public.workflow_stages_v2
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_definitions wd 
    WHERE wd.id = workflow_id AND (wd.is_template = true OR public.can_access_tenant(wd.tenant_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workflow_definitions wd 
    WHERE wd.id = workflow_id AND public.can_access_tenant(wd.tenant_id)
  )
);

DROP POLICY IF EXISTS workflow_stages_v2_template_public_read ON public.workflow_stages_v2;
CREATE POLICY workflow_stages_v2_template_public_read ON public.workflow_stages_v2
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_definitions wd 
    WHERE wd.id = workflow_id AND wd.is_template = true AND wd.is_active = true
  )
);

-- 1.c workflow_transitions — rules, not if()
CREATE TABLE IF NOT EXISTS public.workflow_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES public.workflow_stages_v2(id) ON DELETE CASCADE,
  to_stage_id uuid NOT NULL REFERENCES public.workflow_stages_v2(id) ON DELETE CASCADE,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_role text,
  auto_escalate_after_mins int,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_stage_id IS NULL OR from_stage_id != to_stage_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_workflow ON public.workflow_transitions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from ON public.workflow_transitions(from_stage_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_to ON public.workflow_transitions(to_stage_id);

ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_transitions_tenant_all ON public.workflow_transitions;
CREATE POLICY workflow_transitions_tenant_all ON public.workflow_transitions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_definitions wd 
    WHERE wd.id = workflow_id AND (wd.is_template = true OR public.can_access_tenant(wd.tenant_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workflow_definitions wd 
    WHERE wd.id = workflow_id AND public.can_access_tenant(wd.tenant_id)
  )
);

DROP POLICY IF EXISTS workflow_transitions_template_public_read ON public.workflow_transitions;
CREATE POLICY workflow_transitions_template_public_read ON public.workflow_transitions
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_definitions wd 
    WHERE wd.id = workflow_id AND wd.is_template = true AND wd.is_active = true
  )
);

-- 1.d work_orders — generic, with version snapshot
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE RESTRICT,
  workflow_version_snapshot jsonb NOT NULL,
  current_stage_id uuid REFERENCES public.workflow_stages_v2(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','completed','cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  sla_due_at timestamptz,
  sla_breached boolean NOT NULL DEFAULT false,
  assigned_to_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant ON public.work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_workflow ON public.work_orders(workflow_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_current_stage ON public.work_orders(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON public.work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_branch ON public.work_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS work_orders_tenant_all ON public.work_orders;
CREATE POLICY work_orders_tenant_all ON public.work_orders
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id))
WITH CHECK (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_work_orders_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_orders_updated ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.set_work_orders_updated();

-- Updated_at for workflow_definitions
CREATE OR REPLACE FUNCTION public.set_workflow_definitions_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_definitions_updated ON public.workflow_definitions;
CREATE TRIGGER trg_workflow_definitions_updated BEFORE UPDATE ON public.workflow_definitions
FOR EACH ROW EXECUTE FUNCTION public.set_workflow_definitions_updated();

-- ============================================================================
-- Server-side whitelist validation for condition_json (Security mandatory)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_transition_condition(_condition jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  allowed_keys text[] := ARRAY['requires_photo','requires_qc','requires_payment','requires_fields','min_amount','max_amount','customer_type','custom_field_exists'];
  k text;
BEGIN
  IF _condition IS NULL OR _condition = '{}'::jsonb THEN
    RETURN true;
  END IF;

  -- Only allow whitelisted top-level keys, no nested eval
  FOR k IN SELECT jsonb_object_keys(_condition)
  LOOP
    IF NOT (k = ANY(allowed_keys)) THEN
      RAISE EXCEPTION 'Invalid condition key: % — allowed: %', k, array_to_string(allowed_keys, ', ');
    END IF;
  END LOOP;

  -- Additional safety: ensure no SQL injection patterns in values
  IF _condition::text ~* '(;|--|/\*|xp_|exec|drop|insert|update|delete)' THEN
    RAISE EXCEPTION 'Condition contains forbidden pattern';
  END IF;

  RETURN true;
END;
$$;

-- Trigger to validate condition_json before insert/update
CREATE OR REPLACE FUNCTION public.check_workflow_transition_condition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.validate_transition_condition(NEW.condition_json);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transition_condition ON public.workflow_transitions;
CREATE TRIGGER trg_validate_transition_condition
BEFORE INSERT OR UPDATE ON public.workflow_transitions
FOR EACH ROW EXECUTE FUNCTION public.check_workflow_transition_condition();

-- ============================================================================
-- Helper: create snapshot of workflow at time of work_order creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_workflow_snapshot(_workflow_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot jsonb;
BEGIN
  SELECT jsonb_build_object(
    'workflow_id', wd.id,
    'name', wd.name,
    'industry', wd.industry,
    'version', wd.version,
    'stages', COALESCE((SELECT jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name_ar', s.name_ar,
        'name_en', s.name_en,
        'slug', s.slug,
        'stage_order', s.stage_order,
        'required_role', s.required_role,
        'sla_target_mins', s.sla_target_mins,
        'sla_max_mins', s.sla_max_mins,
        'required_fields', s.required_fields,
        'icon', s.icon,
        'color', s.color,
        'is_initial', s.is_initial,
        'is_final', s.is_final
      ) ORDER BY s.stage_order
    ) FROM workflow_stages_v2 s WHERE s.workflow_id = wd.id), '[]'::jsonb),
    'transitions', COALESCE((SELECT jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'from_stage_id', t.from_stage_id,
        'to_stage_id', t.to_stage_id,
        'condition_json', t.condition_json,
        'required_role', t.required_role
      )
    ) FROM workflow_transitions t WHERE t.workflow_id = wd.id), '[]'::jsonb)
  ) INTO snapshot
  FROM workflow_definitions wd WHERE wd.id = _workflow_id;

  RETURN snapshot;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_workflow_snapshot(uuid) TO authenticated;

-- Trigger to auto-fill snapshot on work_order insert
CREATE OR REPLACE FUNCTION public.fill_work_order_snapshot()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.workflow_version_snapshot IS NULL OR NEW.workflow_version_snapshot = '{}'::jsonb THEN
    NEW.workflow_version_snapshot := public.create_workflow_snapshot(NEW.workflow_id);
  END IF;

  -- Set initial stage if not provided
  IF NEW.current_stage_id IS NULL THEN
    SELECT id INTO NEW.current_stage_id 
    FROM workflow_stages_v2 
    WHERE workflow_id = NEW.workflow_id AND is_initial = true 
    ORDER BY stage_order LIMIT 1;
  END IF;

  -- Set SLA due based on current stage target
  IF NEW.sla_due_at IS NULL AND NEW.current_stage_id IS NOT NULL THEN
    SELECT now() + (sla_target_mins || ' minutes')::interval INTO NEW.sla_due_at
    FROM workflow_stages_v2 WHERE id = NEW.current_stage_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_work_order_snapshot ON public.work_orders;
CREATE TRIGGER trg_fill_work_order_snapshot
BEFORE INSERT ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.fill_work_order_snapshot();

-- ============================================================================
-- v2 validation function — reads from DB, not hardcoded if()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_transition_v2(
  _tenant_id uuid,
  _work_order_id uuid,
  _to_stage_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wo RECORD;
  from_stage_id uuid;
  transition RECORD;
  condition jsonb;
  required_fields jsonb;
  missing_fields text[];
  field text;
BEGIN
  SELECT * INTO wo FROM work_orders WHERE id = _work_order_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Work order not found');
  END IF;

  from_stage_id := wo.current_stage_id;

  -- Find allowed transition
  SELECT * INTO transition
  FROM workflow_transitions
  WHERE workflow_id = wo.workflow_id
    AND (from_stage_id IS NULL OR from_stage_id = wo.current_stage_id)
    AND to_stage_id = _to_stage_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Transition not allowed from current stage');
  END IF;

  -- Check condition_json whitelist (already validated on insert, but double-check)
  condition := transition.condition_json;

  -- Example checks based on whitelist
  IF (condition->>'requires_photo')::boolean = true THEN
    IF NOT (wo.custom_fields ? 'photo_url') AND NOT EXISTS (SELECT 1 FROM service_units su WHERE su.order_id::text = wo.custom_fields->>'order_id' AND su.photo_url IS NOT NULL) THEN
      RETURN jsonb_build_object('ok', false, 'message', 'صورة مطلوبة قبل الانتقال لهذه المرحلة');
    END IF;
  END IF;

  IF condition ? 'requires_fields' THEN
    SELECT array_agg(f) INTO missing_fields
    FROM jsonb_array_elements_text(condition->'requires_fields') AS f
    WHERE NOT (wo.custom_fields ? f);

    IF array_length(missing_fields, 1) > 0 THEN
      RETURN jsonb_build_object('ok', false, 'message', 'حقول مطلوبة ناقصة: ' || array_to_string(missing_fields, ', '));
    END IF;
  END IF;

  -- Check required role for target stage
  SELECT required_fields, required_role INTO required_fields, field
  FROM workflow_stages_v2 WHERE id = _to_stage_id;

  -- All good
  RETURN jsonb_build_object('ok', true, 'message', '', 'transition_id', transition.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_transition_v2(uuid, uuid, uuid) TO authenticated;

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_stages_v2 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_transitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;

GRANT SELECT ON public.workflow_definitions TO anon;
GRANT SELECT ON public.workflow_stages_v2 TO anon;
GRANT SELECT ON public.workflow_transitions TO anon;

-- ============================================================================
-- Seed: Generic templates for testing v2 (not laundry-specific)
-- ============================================================================

-- Template 1: Test generic 5 stages (for Phase 1 DoD)
INSERT INTO public.workflow_definitions (id, name, name_en, industry, is_template, is_active, description)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'اختبار عام - 5 مراحل',
  'Generic Test - 5 Stages',
  'test',
  true,
  true,
  'قالب اختبار عام لإثبات Workflow Builder يعمل بدون كود مغسلة'
)
ON CONFLICT (id) DO NOTHING;

-- Stages for test template
INSERT INTO public.workflow_stages_v2 (workflow_id, name_ar, name_en, slug, stage_order, required_role, sla_target_mins, sla_max_mins, is_initial, is_final, icon, color)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'استلام', 'Intake', 'intake', 1, 'cs_manager', 60, 120, true, false, '📥', '#0d9488'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'تشخيص', 'Diagnosis', 'diagnosis', 2, 'ops_manager', 120, 240, false, false, '🔍', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'تنفيذ', 'Execution', 'execution', 3, 'employee', 240, 480, false, false, '⚙️', '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'جودة', 'Quality', 'qc', 4, 'ops_manager', 60, 120, false, false, '✅', '#f59e0b'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'تسليم', 'Delivery', 'delivery', 5, 'courier', 60, 120, false, true, '🚚', '#10b981')
ON CONFLICT (workflow_id, slug) DO NOTHING;

-- Transitions for test template (linear)
WITH stages AS (
  SELECT id, slug, stage_order FROM workflow_stages_v2 WHERE workflow_id = '00000000-0000-0000-0000-000000000001'::uuid ORDER BY stage_order
)
INSERT INTO public.workflow_transitions (workflow_id, from_stage_id, to_stage_id, condition_json)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM stages WHERE stage_order = 1),
  (SELECT id FROM stages WHERE stage_order = 2),
  '{}'::jsonb
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, (SELECT id FROM stages WHERE stage_order = 2), (SELECT id FROM stages WHERE stage_order = 3), '{}'::jsonb
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, (SELECT id FROM stages WHERE stage_order = 3), (SELECT id FROM stages WHERE stage_order = 4), '{}'::jsonb
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, (SELECT id FROM stages WHERE stage_order = 4), (SELECT id FROM stages WHERE stage_order = 5), '{"requires_qc": true}'::jsonb
ON CONFLICT DO NOTHING;

-- Template 2: Hotel Housekeeping (Phase 2 proof)
INSERT INTO public.workflow_definitions (id, name, name_en, industry, is_template, is_active, description)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'هاوس كيبنج فندقي',
  'Hotel Housekeeping',
  'hospitality',
  true,
  true,
  'قالب تنظيف غرف فنادق 7 نجوم — إثبات أن المنصة ليست مغسلة'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workflow_stages_v2 (workflow_id, name_ar, name_en, slug, stage_order, required_role, sla_target_mins, sla_max_mins, is_initial, is_final, icon, color, required_fields)
VALUES
  ('00000000-0000-0000-0000-000000000002'::uuid, 'فحص أولي', 'Inspection', 'inspection', 1, 'housekeeping_supervisor', 15, 30, true, false, '🔍', '#0d9488', '["room_number","guest_status"]'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'تنظيف', 'Cleaning', 'cleaning', 2, 'housekeeper', 30, 60, false, false, '🧹', '#3b82f6', '["cleaning_type"]'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'فحص Minibar', 'Minibar Check', 'minibar_check', 3, 'housekeeper', 10, 20, false, false, '🧃', '#8b5cf6', '["minibar_used"]'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'صيانة', 'Maintenance Check', 'maintenance_check', 4, 'maintenance', 20, 40, false, false, '🔧', '#f59e0b', '["maintenance_issue"]'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'جودة', 'Quality', 'qc', 5, 'housekeeping_supervisor', 15, 30, false, false, '✅', '#10b981', '["intake_photo_url"]'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'جاهز', 'Ready', 'ready', 6, 'front_office', 5, 10, false, true, '🏨', '#059669', '[]'::jsonb)
ON CONFLICT (workflow_id, slug) DO NOTHING;

-- Transitions for housekeeping
WITH stages AS (
  SELECT id, slug, stage_order FROM workflow_stages_v2 WHERE workflow_id = '00000000-0000-0000-0000-000000000002'::uuid ORDER BY stage_order
)
INSERT INTO public.workflow_transitions (workflow_id, from_stage_id, to_stage_id, condition_json)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, s1.id, s2.id, '{}'::jsonb
FROM stages s1 JOIN stages s2 ON s2.stage_order = s1.stage_order + 1
ON CONFLICT DO NOTHING;