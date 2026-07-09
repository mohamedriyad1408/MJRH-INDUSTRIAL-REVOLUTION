-- MJRH — Multi-Currency + Self-Service Onboarding + Platform Features
-- Date: 2026-07-09
-- Adds: currency support, signup RPC, backup helpers, realtime-friendly indexes

-- ═══════════════════════════════════════════════════════════════════════
-- 1) Multi-Currency: Add currency column to app_settings
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EGP';

COMMENT ON COLUMN public.app_settings.currency IS 'Tenant default currency code (EGP, USD, EUR, SAR, AED, QAR, KWD, BHD)';

-- ═══════════════════════════════════════════════════════════════════════
-- 2) Self-Service Onboarding: RPC to create tenant from client
--    This function allows unauthenticated users to create a tenant
--    during signup. It uses SECURITY DEFINER so it can insert into
--    protected tables. The function validates inputs and prevents abuse.
-- ═══════════════════════════════════════════════════════════════════════

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
BEGIN
  -- Validate inputs
  IF _user_id IS NULL OR _name IS NULL OR _slug IS NULL THEN
    RAISE EXCEPTION 'المدخلات الأساسية ناقصة';
  END IF;

  IF length(_slug) < 2 OR length(_slug) > 40 THEN
    RAISE EXCEPTION 'الرابط يجب أن يكون بين 2 و40 حرف';
  END IF;

  IF _slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط';
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug) THEN
    RAISE EXCEPTION 'هذا الرابط مستخدم بالفعل';
  END IF;

  -- Check user doesn't already own a tenant with this slug
  IF EXISTS (
    SELECT 1 FROM public.tenants WHERE owner_user_id = _user_id AND slug = _slug
  ) THEN
    RAISE EXCEPTION 'لديك مشروع بهذا الرابط بالفعل';
  END IF;

  -- Create tenant
  INSERT INTO public.tenants (name, slug, business_type, owner_user_id, is_active, industry_profile)
  VALUES (_name, _slug, _business_type, _user_id, true, jsonb_build_object('source', 'self_signup', 'currency', _currency))
  RETURNING id INTO _tenant_id;

  -- Create owner role
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (_user_id, 'owner', _tenant_id);

  -- Create default branch
  INSERT INTO public.branches (tenant_id, name, is_active)
  VALUES (_tenant_id, 'الفرع الرئيسي', true)
  RETURNING id INTO _branch_id;

  -- Create owner employee record
  INSERT INTO public.employees (
    tenant_id, branch_id, profile_id, full_name, email,
    job_title, role, job_role, monthly_salary, commission_percent, is_active
  ) VALUES (
    _tenant_id, _branch_id, _user_id, _owner_full_name,
    (SELECT email FROM auth.users WHERE id = _user_id),
    'مالك المشروع', 'owner', 'other', 0, 0, true
  );

  -- Create app_settings with currency
  INSERT INTO public.app_settings (tenant_id, business_name, currency)
  VALUES (_tenant_id, _name, _currency)
  ON CONFLICT (tenant_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    currency = EXCLUDED.currency;

  -- Create default cash account
  PERFORM public.ensure_default_cash_account_for(_tenant_id);

  -- Create default chart of accounts
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);

  -- Seed tenant defaults (services, areas, etc.)
  PERFORM public.seed_tenant_defaults(_tenant_id, _name);

  -- Log the onboarding event
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

COMMENT ON FUNCTION public.self_service_create_tenant IS 'Creates a new tenant with all defaults during self-service onboarding. Returns tenant_id.';

-- ═══════════════════════════════════════════════════════════════════════
-- 3) Backup verification: helper view for critical table row counts
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.table_row_counts AS
SELECT 'tenants' AS table_name, COUNT(*) AS row_count FROM public.tenants
UNION ALL SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL SELECT 'order_items', COUNT(*) FROM public.order_items
UNION ALL SELECT 'service_units', COUNT(*) FROM public.service_units
UNION ALL SELECT 'customers', COUNT(*) FROM public.customers
UNION ALL SELECT 'employees', COUNT(*) FROM public.employees
UNION ALL SELECT 'branches', COUNT(*) FROM public.branches
UNION ALL SELECT 'cash_accounts', COUNT(*) FROM public.cash_accounts
UNION ALL SELECT 'cash_transactions', COUNT(*) FROM public.cash_transactions
UNION ALL SELECT 'journal_entries', COUNT(*) FROM public.journal_entries
UNION ALL SELECT 'journal_lines', COUNT(*) FROM public.journal_lines
UNION ALL SELECT 'app_settings', COUNT(*) FROM public.app_settings
UNION ALL SELECT 'user_roles', COUNT(*) FROM public.user_roles
UNION ALL SELECT 'service_items', COUNT(*) FROM public.service_items
UNION ALL SELECT 'app_notifications', COUNT(*) FROM public.app_notifications
UNION ALL SELECT 'operation_events', COUNT(*) FROM public.operation_events;

GRANT SELECT ON public.table_row_counts TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 4) Real-time friendly indexes for commonly subscribed tables
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_status
  ON public.orders (tenant_id, status)
  WHERE status NOT IN ('delivered', 'cancelled');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_units_tenant_stage
  ON public.service_units (tenant_id, current_stage)
  WHERE current_stage NOT IN ('delivered', 'cancelled');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_notifications_tenant_unread
  ON public.app_notifications (tenant_id, audience)
  WHERE read_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickup_requests_tenant_status
  ON public.pickup_requests (tenant_id, status)
  WHERE status IN ('pending', 'assigned');

-- ═══════════════════════════════════════════════════════════════════════
-- 5) Enable realtime for key tables (Supabase Realtime)
-- ═══════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_requests;
