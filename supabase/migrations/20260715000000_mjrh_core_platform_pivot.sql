-- MJRH Core Platform Pivot
-- The laundry implementation is no longer the product foundation.
-- This migration adds a generic operating-system layer and makes setup mandatory.

-- ============================================================================
-- 1) Generic Core configuration tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_setup_profiles (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  setup_version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed','archived')),
  organization jsonb NOT NULL DEFAULT '{}'::jsonb,
  branches jsonb NOT NULL DEFAULT '[]'::jsonb,
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  tax jsonb NOT NULL DEFAULT '{}'::jsonb,
  operational_model text,
  workflow_style text,
  accounting jsonb NOT NULL DEFAULT '{}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_numbering jsonb NOT NULL DEFAULT '{}'::jsonb,
  approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.core_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, department_key)
);

CREATE TABLE IF NOT EXISTS public.core_navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_key text NOT NULL,
  item_key text NOT NULL,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  route text NOT NULL,
  icon text NOT NULL DEFAULT 'LayoutDashboard',
  required_roles text[] NOT NULL DEFAULT ARRAY['owner','ops_manager','cs_manager','employee'],
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, item_key)
);

CREATE TABLE IF NOT EXISTS public.core_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  approval_level int NOT NULL DEFAULT 0,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role_key)
);

CREATE TABLE IF NOT EXISTS public.core_workflow_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  blueprint_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  style text NOT NULL DEFAULT 'department_task_flow',
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, blueprint_key)
);

CREATE TABLE IF NOT EXISTS public.core_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  form_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, form_key)
);

CREATE TABLE IF NOT EXISTS public.core_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  numbering jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, document_key)
);

CREATE TABLE IF NOT EXISTS public.core_financial_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  accounting_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_core_departments_tenant ON public.core_departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_navigation_tenant ON public.core_navigation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_roles_tenant ON public.core_roles(tenant_id);

ALTER TABLE public.core_setup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_financial_event_types ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'core_setup_profiles','core_departments','core_navigation_items','core_roles',
    'core_workflow_blueprints','core_forms','core_documents','core_financial_event_types'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_all ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_tenant_all ON public.%I FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id))', tbl, tbl);
  END LOOP;
END $$;

-- Expand the old 5-step onboarding check into the Core OS 8-step wizard.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tenant_onboarding'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%current_step%'
  LOOP
    EXECUTE format('ALTER TABLE public.tenant_onboarding DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.tenant_onboarding
  ADD CONSTRAINT tenant_onboarding_current_step_core_check CHECK (current_step >= 1 AND current_step <= 8);

-- ============================================================================
-- 2) Setup completion gate and generator
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_core_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_core_setup_profiles_updated ON public.core_setup_profiles;
CREATE TRIGGER trg_core_setup_profiles_updated
BEFORE UPDATE ON public.core_setup_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

DROP TRIGGER IF EXISTS trg_core_departments_updated ON public.core_departments;
CREATE TRIGGER trg_core_departments_updated
BEFORE UPDATE ON public.core_departments
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

CREATE OR REPLACE FUNCTION public.can_enter_platform(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_completed FROM public.tenant_onboarding WHERE tenant_id = _tenant_id), false)
     AND COALESCE((SELECT status = 'completed' FROM public.core_setup_profiles WHERE tenant_id = _tenant_id), false);
$$;

CREATE OR REPLACE FUNCTION public.complete_mjrh_core_setup(_tenant_id uuid, _setup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dep jsonb;
  role_row jsonb;
  br jsonb;
  org jsonb := COALESCE(_setup->'organization', '{}'::jsonb);
  _user uuid := auth.uid();
  _org_name text := COALESCE(NULLIF(org->>'name',''), (SELECT name FROM public.tenants WHERE id = _tenant_id), 'Organization');
  _currency text := COALESCE(NULLIF(org->>'currency',''), 'EGP');
  _dept_count int := 0;
BEGIN
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;

  IF NOT public.can_access_tenant(_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF jsonb_array_length(COALESCE(_setup->'departments','[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one department is required';
  END IF;

  UPDATE public.tenants
  SET name = _org_name,
      business_type = COALESCE(NULLIF(org->>'business_type',''), 'configured'),
      industry_profile = COALESCE(industry_profile, '{}'::jsonb)
        || jsonb_build_object(
          'core_platform', true,
          'industry', org->>'industry',
          'business_type', org->>'business_type',
          'configured_by_setup_wizard', true,
          'configured_at', now()
        )
  WHERE id = _tenant_id;

  INSERT INTO public.app_settings (tenant_id, business_name, currency)
  VALUES (_tenant_id, _org_name, _currency)
  ON CONFLICT (tenant_id) DO UPDATE SET business_name = EXCLUDED.business_name, currency = EXCLUDED.currency;

  INSERT INTO public.core_setup_profiles (
    tenant_id, status, organization, branches, working_hours, tax, operational_model,
    workflow_style, accounting, notifications, document_numbering, approvals, branding,
    raw_setup, completed_by, completed_at
  ) VALUES (
    _tenant_id, 'completed', org, COALESCE(_setup->'branches','[]'::jsonb),
    COALESCE(_setup->'working_hours','{}'::jsonb), COALESCE(_setup->'tax','{}'::jsonb),
    _setup->>'operational_model', _setup->>'workflow_style', COALESCE(_setup->'accounting','{}'::jsonb),
    COALESCE(_setup->'notifications','{}'::jsonb), COALESCE(_setup->'document_numbering','{}'::jsonb),
    COALESCE(_setup->'approvals','[]'::jsonb), COALESCE(_setup->'branding','{}'::jsonb),
    _setup, _user, now()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    status = 'completed', organization = EXCLUDED.organization, branches = EXCLUDED.branches,
    working_hours = EXCLUDED.working_hours, tax = EXCLUDED.tax, operational_model = EXCLUDED.operational_model,
    workflow_style = EXCLUDED.workflow_style, accounting = EXCLUDED.accounting,
    notifications = EXCLUDED.notifications, document_numbering = EXCLUDED.document_numbering,
    approvals = EXCLUDED.approvals, branding = EXCLUDED.branding, raw_setup = EXCLUDED.raw_setup,
    completed_by = EXCLUDED.completed_by, completed_at = now();

  FOR br IN SELECT * FROM jsonb_array_elements(COALESCE(_setup->'branches','[]'::jsonb)) LOOP
    IF NULLIF(br->>'name','') IS NOT NULL THEN
      INSERT INTO public.branches (tenant_id, name, is_active)
      VALUES (_tenant_id, br->>'name', true)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  FOR dep IN SELECT * FROM jsonb_array_elements(COALESCE(_setup->'departments','[]'::jsonb)) LOOP
    INSERT INTO public.core_departments (tenant_id, department_key, name_ar, name_en, is_default, sort_order, config)
    VALUES (
      _tenant_id,
      dep->>'key',
      COALESCE(NULLIF(dep->>'name_ar',''), dep->>'key'),
      COALESCE(NULLIF(dep->>'name_en',''), dep->>'key'),
      true,
      _dept_count * 10,
      dep
    )
    ON CONFLICT (tenant_id, department_key) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      is_active = true,
      config = EXCLUDED.config,
      sort_order = EXCLUDED.sort_order;

    INSERT INTO public.core_navigation_items (tenant_id, department_key, item_key, label_ar, label_en, route, icon, sort_order)
    VALUES (
      _tenant_id,
      dep->>'key',
      (dep->>'key') || '_workspace',
      COALESCE(NULLIF(dep->>'name_ar',''), dep->>'key'),
      COALESCE(NULLIF(dep->>'name_en',''), dep->>'key'),
      CASE dep->>'key'
        WHEN 'owner_dashboard' THEN '/dashboard'
        WHEN 'customer_service' THEN '/cs'
        WHEN 'operations' THEN '/work-orders'
        WHEN 'accounting' THEN '/accounting'
        WHEN 'sales' THEN '/crm'
        WHEN 'marketing' THEN '/marketing'
        WHEN 'hr' THEN '/staff'
        WHEN 'legal' THEN '/legal'
        WHEN 'administration' THEN '/settings'
        ELSE '/dashboard'
      END,
      'LayoutDashboard',
      _dept_count * 10
    )
    ON CONFLICT (tenant_id, item_key) DO UPDATE SET
      label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      route = EXCLUDED.route,
      is_active = true,
      sort_order = EXCLUDED.sort_order;

    _dept_count := _dept_count + 1;
  END LOOP;

  FOR role_row IN SELECT * FROM jsonb_array_elements(COALESCE(_setup->'roles','[]'::jsonb)) LOOP
    INSERT INTO public.core_roles (tenant_id, role_key, name_ar, name_en, approval_level, permissions)
    VALUES (
      _tenant_id,
      role_row->>'key',
      COALESCE(NULLIF(role_row->>'name_ar',''), role_row->>'key'),
      COALESCE(NULLIF(role_row->>'name_en',''), role_row->>'key'),
      COALESCE((role_row->>'approval_level')::int, 0),
      role_row
    )
    ON CONFLICT (tenant_id, role_key) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      approval_level = EXCLUDED.approval_level,
      permissions = EXCLUDED.permissions,
      is_active = true;
  END LOOP;

  INSERT INTO public.core_workflow_blueprints (tenant_id, blueprint_key, name_ar, name_en, style, definition)
  VALUES (
    _tenant_id,
    'default_operating_flow',
    'تدفق التشغيل الافتراضي',
    'Default Operating Flow',
    COALESCE(_setup->>'workflow_style', 'department_task_flow'),
    jsonb_build_object(
      'actors', jsonb_build_array(),
      'departments', COALESCE(_setup->'departments','[]'::jsonb),
      'tasks', jsonb_build_array(),
      'documents', jsonb_build_array(),
      'approvals', COALESCE(_setup->'approvals','[]'::jsonb)
    )
  )
  ON CONFLICT (tenant_id, blueprint_key) DO UPDATE SET style = EXCLUDED.style, definition = EXCLUDED.definition, is_active = true;

  INSERT INTO public.core_documents (tenant_id, document_key, name_ar, name_en, numbering, schema)
  VALUES (_tenant_id, 'generic_document', 'مستند عام', 'Generic Document', COALESCE(_setup->'document_numbering','{}'::jsonb), '{}'::jsonb)
  ON CONFLICT (tenant_id, document_key) DO UPDATE SET numbering = EXCLUDED.numbering, is_active = true;

  INSERT INTO public.core_financial_event_types (tenant_id, event_key, name_ar, name_en, accounting_rule, approval_required)
  VALUES (_tenant_id, 'generic_financial_event', 'حدث مالي عام', 'Generic Financial Event', COALESCE(_setup->'accounting','{}'::jsonb), true)
  ON CONFLICT (tenant_id, event_key) DO UPDATE SET accounting_rule = EXCLUDED.accounting_rule, is_active = true;

  INSERT INTO public.tenant_onboarding (tenant_id, current_step, completed_steps, branch_data, catalog_choice, staff_data, payment_method, is_completed, completed_at)
  VALUES (
    _tenant_id, 8, '[1,2,3,4,5,6,7,8]'::jsonb, COALESCE(_setup->'branches','[]'::jsonb),
    'manual', COALESCE(_setup->'roles','[]'::jsonb), COALESCE(_setup->'accounting'->>'basis','cash'), true, now()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    current_step = 8,
    completed_steps = '[1,2,3,4,5,6,7,8]'::jsonb,
    branch_data = EXCLUDED.branch_data,
    staff_data = EXCLUDED.staff_data,
    payment_method = EXCLUDED.payment_method,
    is_completed = true,
    completed_at = now();

  INSERT INTO public.tenant_features(tenant_id, feature_key, enabled)
  VALUES
    (_tenant_id,'core_platform',true),
    (_tenant_id,'configuration_engine',true),
    (_tenant_id,'organization_engine',true),
    (_tenant_id,'department_engine',true),
    (_tenant_id,'workflow_engine',true),
    (_tenant_id,'actor_engine',true),
    (_tenant_id,'task_engine',true),
    (_tenant_id,'financial_engine',true),
    (_tenant_id,'notification_engine',true),
    (_tenant_id,'reporting_engine',true),
    (_tenant_id,'permissions_engine',true)
  ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = true;

  RETURN jsonb_build_object('tenant_id', _tenant_id, 'status', 'completed', 'departments', _dept_count, 'can_enter_platform', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_enter_platform(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_mjrh_core_setup(uuid, jsonb) TO authenticated;

-- ============================================================================
-- 3) New self-service tenant creation: create account/org only; no industry seed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.self_service_create_tenant(
  _user_id UUID,
  _name TEXT,
  _slug TEXT,
  _business_type TEXT DEFAULT 'configured_by_wizard',
  _currency TEXT DEFAULT 'EGP',
  _owner_full_name TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _branch_id UUID;
  _existing_count INTEGER;
BEGIN
  IF _user_id IS NULL OR _name IS NULL OR _slug IS NULL THEN
    RAISE EXCEPTION 'المدخلات الأساسية ناقصة';
  END IF;

  IF length(_slug) < 2 OR length(_slug) > 40 THEN
    RAISE EXCEPTION 'الرابط يجب أن يكون بين 2 و40 حرف';
  END IF;

  IF _slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط';
  END IF;

  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug) THEN
    RAISE EXCEPTION 'هذا الرابط مستخدم بالفعل';
  END IF;

  SELECT COUNT(*) INTO _existing_count FROM public.tenants WHERE owner_user_id = _user_id;
  IF _existing_count >= 3 THEN
    RAISE EXCEPTION 'لا يمكنك إنشاء أكثر من 3 منظمات';
  END IF;

  INSERT INTO public.tenants (name, slug, business_type, owner_user_id, is_active, industry_profile)
  VALUES (_name, _slug, COALESCE(_business_type, 'configured_by_wizard'), _user_id, true,
          jsonb_build_object('source', 'self_signup', 'currency', _currency, 'requires_setup_wizard', true, 'core_platform', true))
  RETURNING id INTO _tenant_id;

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (_user_id, 'owner', _tenant_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.branches (tenant_id, name, is_active)
  VALUES (_tenant_id, 'الفرع الرئيسي', true)
  RETURNING id INTO _branch_id;

  INSERT INTO public.employees (
    tenant_id, branch_id, profile_id, full_name, email,
    job_title, role, job_role, monthly_salary, commission_percent, is_active
  ) VALUES (
    _tenant_id, _branch_id, _user_id, COALESCE(NULLIF(_owner_full_name,''), 'Owner'),
    (SELECT email FROM auth.users WHERE id = _user_id),
    'Owner', 'owner', 'owner', 0, 0, true
  );

  INSERT INTO public.app_settings (tenant_id, business_name, currency)
  VALUES (_tenant_id, _name, _currency)
  ON CONFLICT (tenant_id) DO UPDATE SET business_name = EXCLUDED.business_name, currency = EXCLUDED.currency;

  INSERT INTO public.tenant_onboarding (tenant_id, current_step, is_completed, branch_data, catalog_choice)
  VALUES (_tenant_id, 1, false, jsonb_build_array(jsonb_build_object('name','الفرع الرئيسي')), 'manual')
  ON CONFLICT (tenant_id) DO NOTHING;

  INSERT INTO public.core_setup_profiles (tenant_id, status, organization, branches, raw_setup)
  VALUES (
    _tenant_id,
    'draft',
    jsonb_build_object('name', _name, 'currency', _currency, 'business_type', _business_type),
    jsonb_build_array(jsonb_build_object('name','الفرع الرئيسي')),
    jsonb_build_object('created_by', 'self_service_create_tenant')
  )
  ON CONFLICT (tenant_id) DO NOTHING;

  INSERT INTO public.tenant_features(tenant_id, feature_key, enabled)
  VALUES
    (_tenant_id,'core_platform',true),
    (_tenant_id,'configuration_engine',true),
    (_tenant_id,'setup_required',true)
  ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = true;

  RETURN _tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.self_service_create_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.self_service_create_tenant IS 'Creates only account + organization shell. The mandatory setup wizard generates the platform.';
COMMENT ON FUNCTION public.complete_mjrh_core_setup IS 'Generates MJRH Core Platform from configuration. No industry-specific code or manual demo inserts.';
