-- MJRH — Fix seed_tenant_defaults to restore tenant_features + preserve workflow
-- Root Cause: 20260709130000_configurable_workflow_stages.sql overrode seed_tenant_defaults
-- and removed tenant_features insertion, causing verify:new-tenant to fail with:
-- "Missing tenant features: {accounting,apdo,...}"
-- This is a forward repair migration (per DEPLOYMENT_RUNBOOK).

CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid, _tenant_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  btype text;
  copied_count integer := 0;
BEGIN
  SELECT COALESCE(business_type, 'laundry') INTO btype FROM public.tenants WHERE id = _tenant_id;

  INSERT INTO public.app_settings (tenant_id, business_name)
  VALUES (_tenant_id, COALESCE(_tenant_name, 'Business'))
  ON CONFLICT (tenant_id) DO UPDATE SET business_name = COALESCE(public.app_settings.business_name, EXCLUDED.business_name);

  PERFORM public.ensure_default_branch_for(_tenant_id, _tenant_name);
  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);
  PERFORM public.ensure_default_workflow_for(_tenant_id);

  IF btype = 'laundry' THEN
    INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
    SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
    FROM (
      SELECT DISTINCT ON (name, service_type) name, service_type, unit_price, is_active
      FROM public.service_items
      WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
      ORDER BY name, service_type, created_at DESC
    ) x
    WHERE NOT EXISTS (
      SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name AND s.service_type = x.service_type
    );
    GET DIAGNOSTICS copied_count = ROW_COUNT;

    PERFORM public.seed_laundry_service_catalog(_tenant_id);
  ELSE
    -- For non-laundry business types, still copy some generic services if available
    INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
    SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
    FROM (
      SELECT DISTINCT ON (name) name, service_type, unit_price, is_active
      FROM public.service_items
      WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
      ORDER BY name, created_at DESC
    ) x
    WHERE NOT EXISTS (SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name);
  END IF;

  -- Restore tenant_features (required for verify:new-tenant)
  INSERT INTO public.tenant_features(tenant_id, feature_key, enabled)
  VALUES
    (_tenant_id,'orders',true),
    (_tenant_id,'customer_portal',true),
    (_tenant_id,'driver_map',true),
    (_tenant_id,'inventory',true),
    (_tenant_id,'accounting',true),
    (_tenant_id,'cash_closing',true),
    (_tenant_id,'apdo',true),
    (_tenant_id,'customer_returns',true),
    (_tenant_id,'ironing_distribution',true),
    (_tenant_id,'payment_proofs',true)
  ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(uuid, text) TO authenticated;

-- Also fix self_service_create_tenant which had duplicate definition in previous migration
-- Ensure it calls the corrected seed_tenant_defaults and has tenant limit
CREATE OR REPLACE FUNCTION public.self_service_create_tenant(
  _user_id UUID,
  _name TEXT,
  _slug TEXT,
  _business_type TEXT DEFAULT 'laundry',
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
    RAISE EXCEPTION 'لا يمكنك إنشاء أكثر من 3 مشاريع';
  END IF;

  INSERT INTO public.tenants (name, slug, business_type, owner_user_id, is_active, industry_profile)
  VALUES (_name, _slug, _business_type, _user_id, true, jsonb_build_object('source', 'self_signup', 'currency', _currency))
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
    _tenant_id, _branch_id, _user_id, _owner_full_name,
    (SELECT email FROM auth.users WHERE id = _user_id),
    'مالك المشروع', 'owner', 'other', 0, 0, true
  );

  INSERT INTO public.app_settings (tenant_id, business_name, currency)
  VALUES (_tenant_id, _name, _currency)
  ON CONFLICT (tenant_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    currency = EXCLUDED.currency;

  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);
  PERFORM public.seed_tenant_defaults(_tenant_id, _name);

  PERFORM public.record_operation_event(
    'tenant_bootstrapped',
    'تسجيل ذاتي — مشروع جديد',
    'tenant',
    _tenant_id,
    _branch_id,
    NULL,
    'admin/onboarding',
    false,
    jsonb_build_object('tenant_id', _tenant_id, 'currency', _currency, 'source', 'self_signup'),
    jsonb_build_object('cash_impact', false, 'journal_required', false, 'appears_in_report', true)
  );

  RETURN _tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.self_service_create_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Repair any existing tenants that might be missing features due to previous broken seed
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name FROM public.tenants LOOP
    PERFORM public.seed_tenant_defaults(r.id, r.name);
  END LOOP;
END $$;
