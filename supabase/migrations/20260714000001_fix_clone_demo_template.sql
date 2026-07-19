-- Fix clone_demo_template: add required_role to SELECT

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
  SELECT * INTO tmpl FROM demo_templates WHERE slug = _template_slug AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demo template % not found', _template_slug;
  END IF;

  old_workflow_id := tmpl.workflow_definition_id;

  SELECT id INTO owner_id FROM auth.users WHERE email = _owner_email LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner user % not found - create auth user first', _owner_email;
  END IF;

  DELETE FROM tenants WHERE slug = _new_tenant_slug;

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

  INSERT INTO user_roles(user_id, role, tenant_id)
  VALUES (owner_id, 'owner', new_tenant_id)
  ON CONFLICT DO NOTHING;

  PERFORM seed_tenant_defaults(new_tenant_id, _new_tenant_name);
  PERFORM ensure_tenant_owner_employee(new_tenant_id);
  branch_id := default_branch_id_for(new_tenant_id);

  DELETE FROM workflow_stages WHERE tenant_id = new_tenant_id;

  INSERT INTO workflow_definitions(tenant_id, name, name_en, industry, is_template, is_active, description)
  SELECT new_tenant_id, tmpl.name_ar, tmpl.name_en, tmpl.industry, false, true, 'Cloned from template ' || tmpl.slug
  FROM demo_templates WHERE slug = _template_slug
  RETURNING id INTO new_workflow_id;

  INSERT INTO workflow_stages_v2(workflow_id, name_ar, name_en, slug, stage_order, required_role, sla_target_mins, sla_max_mins, required_fields, icon, color, is_initial, is_final, is_financial_trigger)
  SELECT new_workflow_id, name_ar, name_en, slug, stage_order, required_role, sla_target_mins, sla_max_mins, required_fields, icon, color, is_initial, is_final, is_financial_trigger
  FROM workflow_stages_v2 WHERE workflow_id = old_workflow_id
  ORDER BY stage_order;

  INSERT INTO workflow_transitions(workflow_id, from_stage_id, to_stage_id, condition_json, required_role)
  SELECT 
    new_workflow_id,
    (SELECT id FROM workflow_stages_v2 WHERE workflow_id = new_workflow_id AND slug = (SELECT slug FROM workflow_stages_v2 WHERE id = wt.from_stage_id)),
    (SELECT id FROM workflow_stages_v2 WHERE workflow_id = new_workflow_id AND slug = (SELECT slug FROM workflow_stages_v2 WHERE id = wt.to_stage_id)),
    condition_json,
    required_role
  FROM workflow_transitions wt WHERE wt.workflow_id = old_workflow_id;

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
