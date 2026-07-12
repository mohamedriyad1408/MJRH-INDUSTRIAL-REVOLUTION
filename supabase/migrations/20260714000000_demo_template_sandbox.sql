-- MJRH Demo Template System + Sandbox Layer
-- Implements: Production -> Templates -> Sandbox -> Rollback
-- Each Demo is Clone from Template, if messed Delete and Clone again
-- Independent login per Demo for investor without live demo

-- Demo Templates: full tenant template (not just workflow)
CREATE TABLE IF NOT EXISTS public.demo_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  industry text NOT NULL CHECK (industry IN ('hospitality','manufacturing','healthcare','food_chain','cleaning','laundry','retail','generic')),
  description_ar text,
  description_en text,
  icon text DEFAULT '🏨',
  color text DEFAULT '#0d9488',
  workflow_definition_id uuid REFERENCES public.workflow_definitions(id) ON DELETE SET NULL,
  branding_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_templates_industry ON public.demo_templates(industry);
CREATE INDEX IF NOT EXISTS idx_demo_templates_active ON public.demo_templates(is_active) WHERE is_active = true;

ALTER TABLE public.demo_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_templates_public_read ON public.demo_templates;
CREATE POLICY demo_templates_public_read ON public.demo_templates
FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS demo_templates_admin_all ON public.demo_templates;
CREATE POLICY demo_templates_admin_all ON public.demo_templates
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Demo Sandboxes: cloned instances from templates
CREATE TABLE IF NOT EXISTS public.demo_sandboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.demo_templates(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  demo_username text NOT NULL,
  demo_email text NOT NULL,
  demo_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','messed','deleted','resetting')),
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_reset_at timestamptz,
  reset_count int NOT NULL DEFAULT 0,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_demo_sandboxes_template ON public.demo_sandboxes(template_id);
CREATE INDEX IF NOT EXISTS idx_demo_sandboxes_tenant ON public.demo_sandboxes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demo_sandboxes_status ON public.demo_sandboxes(status);

ALTER TABLE public.demo_sandboxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_sandboxes_public_read ON public.demo_sandboxes;
CREATE POLICY demo_sandboxes_public_read ON public.demo_sandboxes
FOR SELECT TO anon, authenticated
USING (is_public = true);

DROP POLICY IF EXISTS demo_sandboxes_admin_all ON public.demo_sandboxes;
CREATE POLICY demo_sandboxes_admin_all ON public.demo_sandboxes
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Function to clone template to sandbox tenant
CREATE OR REPLACE FUNCTION public.clone_demo_template(
  _template_slug text,
  _new_tenant_slug text,
  _new_tenant_name text,
  _owner_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tmpl record;
  owner_id uuid;
  new_tenant_id uuid;
  new_workflow_id uuid;
  old_workflow_id uuid;
  branch_id uuid;
  sandbox_id uuid;
BEGIN
  -- Find template
  SELECT * INTO tmpl FROM demo_templates WHERE slug = _template_slug AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demo template % not found', _template_slug;
  END IF;

  old_workflow_id := tmpl.workflow_definition_id;

  -- Find or create owner user
  SELECT id INTO owner_id FROM auth.users WHERE email = _owner_email LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner user % not found - create auth user first', _owner_email;
  END IF;

  -- Delete existing tenant if exists (for reset)
  DELETE FROM tenants WHERE slug = _new_tenant_slug;

  -- Create new tenant from template
  INSERT INTO tenants(name, slug, business_type, owner_user_id, workflow_engine_version, is_active, notes, public_url, industry_profile, custom_config, branding_config)
  VALUES (
    _new_tenant_name,
    _new_tenant_slug,
    tmpl.industry,
    owner_id,
    'v2',
    true,
    'Sandbox clone from template ' || tmpl.slug || ' — Production->Templates->Sandbox->Rollback',
    'https://mjrh.vercel.app/' || _new_tenant_slug,
    jsonb_build_object('industry', tmpl.industry, 'demo', true, 'template_slug', tmpl.slug),
    tmpl.custom_config,
    tmpl.branding_config
  )
  RETURNING id INTO new_tenant_id;

  -- Owner role
  INSERT INTO user_roles(user_id, role, tenant_id)
  VALUES (owner_id, 'owner', new_tenant_id)
  ON CONFLICT DO NOTHING;

  -- Seed defaults (branches, etc.) but without old laundry workflow_stages
  PERFORM seed_tenant_defaults(new_tenant_id, _new_tenant_name);
  PERFORM ensure_tenant_owner_employee(new_tenant_id);
  branch_id := default_branch_id_for(new_tenant_id);

  -- Delete old laundry workflow_stages if seed created them
  DELETE FROM workflow_stages WHERE tenant_id = new_tenant_id;

  -- Clone workflow definition from template
  INSERT INTO workflow_definitions(tenant_id, name, name_en, industry, is_template, is_active, description)
  SELECT new_tenant_id, tmpl.name_ar, tmpl.name_en, tmpl.industry, false, true, 'Cloned from template ' || tmpl.slug
  FROM demo_templates WHERE slug = _template_slug
  RETURNING id INTO new_workflow_id;

  -- Clone stages
  INSERT INTO workflow_stages_v2(workflow_id, name_ar, name_en, slug, stage_order, required_role, sla_target_mins, sla_max_mins, required_fields, icon, color, is_initial, is_final, is_financial_trigger)
  SELECT new_workflow_id, name_ar, name_en, slug, stage_order, required_role, sla_target_mins, sla_max_mins, required_fields, icon, color, is_initial, is_final, is_financial_trigger
  FROM workflow_stages_v2 WHERE workflow_id = old_workflow_id
  ORDER BY stage_order;

  -- Clone transitions
  INSERT INTO workflow_transitions(workflow_id, from_stage_id, to_stage_id, condition_json, required_role)
  SELECT 
    new_workflow_id,
    (SELECT id FROM workflow_stages_v2 WHERE workflow_id = new_workflow_id AND slug = (SELECT slug FROM workflow_stages_v2 WHERE id = wt.from_stage_id)),
    (SELECT id FROM workflow_stages_v2 WHERE workflow_id = new_workflow_id AND slug = (SELECT slug FROM workflow_stages_v2 WHERE id = wt.to_stage_id)),
    condition_json,
    required_role
  FROM workflow_transitions wt WHERE wt.workflow_id = old_workflow_id;

  -- Clone field definitions
  INSERT INTO field_definitions_v2(tenant_id, workflow_id, field_key, label_ar, label_en, field_type, input_method, validation_rules, visibility_condition, applies_to_stage_id, display_order, is_active)
  SELECT 
    new_tenant_id,
    new_workflow_id,
    field_key,
    label_ar,
    label_en,
    field_type,
    input_method,
    validation_rules,
    visibility_condition,
    (SELECT id FROM workflow_stages_v2 WHERE workflow_id = new_workflow_id AND slug = (SELECT slug FROM workflow_stages_v2 WHERE id = fd.applies_to_stage_id)),
    display_order,
    is_active
  FROM field_definitions_v2 fd WHERE fd.workflow_id = old_workflow_id;

  -- Create demo sandbox record
  INSERT INTO demo_sandboxes(template_id, tenant_id, demo_username, demo_email, demo_user_id, status)
  VALUES (tmpl.id, new_tenant_id, split_part(_owner_email, '@', 1), _owner_email, owner_id, 'active')
  RETURNING id INTO sandbox_id;

  RETURN jsonb_build_object(
    'tenant_id', new_tenant_id,
    'tenant_slug', _new_tenant_slug,
    'workflow_id', new_workflow_id,
    'sandbox_id', sandbox_id,
    'owner_email', _owner_email
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.clone_demo_template(text, text, text, text) TO authenticated;

-- Function to delete sandbox (rollback)
CREATE OR REPLACE FUNCTION public.delete_demo_sandbox(_sandbox_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sb record;
BEGIN
  SELECT * INTO sb FROM demo_sandboxes WHERE id = _sandbox_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Delete tenant (CASCADE will delete related work_orders, field_values, etc.)
  DELETE FROM tenants WHERE id = sb.tenant_id;

  UPDATE demo_sandboxes SET status = 'deleted', last_reset_at = now() WHERE id = _sandbox_id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_demo_sandbox(uuid) TO authenticated;

-- Function to reset (delete + clone again)
CREATE OR REPLACE FUNCTION public.reset_demo_sandbox(_sandbox_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sb record;
  tmpl record;
  result jsonb;
BEGIN
  SELECT * INTO sb FROM demo_sandboxes WHERE id = _sandbox_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sandbox not found'; END IF;

  SELECT * INTO tmpl FROM demo_templates WHERE id = sb.template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template not found'; END IF;

  -- Delete old
  PERFORM delete_demo_sandbox(_sandbox_id);

  -- Clone again with same slug
  SELECT clone_demo_template(tmpl.slug, (SELECT slug FROM tenants WHERE id = sb.tenant_id LIMIT 1) || '-reset-' || substr(md5(random()::text),1,4), tmpl.name_ar || ' Reset', sb.demo_email) INTO result;

  UPDATE demo_sandboxes SET reset_count = reset_count + 1, status = 'active', last_reset_at = now() WHERE id = _sandbox_id;

  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_demo_sandbox(uuid) TO authenticated;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_sandboxes TO authenticated;
GRANT SELECT ON public.demo_templates TO anon;
GRANT SELECT ON public.demo_sandboxes TO anon;

-- Seed demo templates from existing workflow_definitions templates
INSERT INTO public.demo_templates(slug, name_ar, name_en, industry, description_ar, description_en, icon, color, workflow_definition_id, branding_config, custom_config, is_active, is_public)
SELECT 
  'hotel-demo-template',
  'فندق 7 نجوم - Housekeeping',
  '7-Star Hotel - Housekeeping',
  'hospitality',
  'Demo template لفندق 7 نجوم — 6 مراحل: فحص أولي، تنظيف، فحص Minibar، صيانة، جودة، جاهز',
  'Demo template for 7-star hotel — 6 stages',
  '🏨',
  '#0f172a',
  '00000000-0000-0000-0000-000000000002'::uuid,
  jsonb_build_object('logo_url', '/hotel-logo.png', 'primary_color', '#0f172a', 'hide_mjrh_branding', true),
  jsonb_build_object('departments', '["Front Office","Housekeeping","Minibar","Maintenance","F&B"]'),
  true,
  true
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.demo_templates(slug, name_ar, name_en, industry, description_ar, description_en, icon, color, workflow_definition_id, is_active, is_public)
SELECT 
  'factory-demo-template',
  'مصنع أثاث - Furniture Factory',
  'Furniture Factory',
  'manufacturing',
  'Demo template لمصنع أثاث — Design, Cutting, Assembly, Painting, QC, Packing',
  'Demo template for furniture factory',
  '🏭',
  '#92400e',
  '00000000-0000-0000-0000-000000000001'::uuid,
  true,
  true
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.demo_templates(slug, name_ar, name_en, industry, description_ar, description_en, icon, color, workflow_definition_id, is_active, is_public)
SELECT 
  'hospital-demo-template',
  'مستشفى - Hospital',
  'Hospital',
  'healthcare',
  'Demo template لمستشفى — Reception, Nursing, Lab, Pharmacy, Billing',
  'Demo template for hospital',
  '🏥',
  '#dc2626',
  '00000000-0000-0000-0000-000000000001'::uuid,
  true,
  true
ON CONFLICT (slug) DO NOTHING;
