-- Make self-service organization creation idempotent with legacy owner employee bootstrap.
-- Some existing tenant triggers may create the owner employee before self_service_create_tenant does.
-- The function must upsert the owner employee instead of failing on tenant/email uniqueness.

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
    'Owner', 'owner', 'other', 0, 0, true
  )
  ON CONFLICT (tenant_id, email) DO UPDATE SET
    branch_id = COALESCE(public.employees.branch_id, EXCLUDED.branch_id),
    profile_id = COALESCE(public.employees.profile_id, EXCLUDED.profile_id),
    full_name = COALESCE(NULLIF(public.employees.full_name, ''), EXCLUDED.full_name),
    job_title = EXCLUDED.job_title,
    role = EXCLUDED.role,
    job_role = EXCLUDED.job_role,
    is_active = true;

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


COMMENT ON FUNCTION public.self_service_create_tenant IS 'Creates only account + organization shell. The mandatory setup wizard/generator initializes the platform. Owner employee uses generic job_role=other and is upserted safely.';
