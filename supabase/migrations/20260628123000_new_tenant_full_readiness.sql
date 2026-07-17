-- MJRH V2 — New tenant full readiness after all feature additions
-- Date: 2026-06-28
-- Ensures every newly created laundry has the full operating base: branch, cash safe, chart accounts, catalog, APDO, features.

CREATE OR REPLACE FUNCTION public.ensure_default_cash_account_for(_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  bid uuid;
BEGIN
  bid := public.default_branch_id_for(_tenant_id);

  SELECT id INTO cid
  FROM public.cash_accounts
  WHERE tenant_id = _tenant_id AND name = 'الخزنة الرئيسية'
  LIMIT 1;

  IF cid IS NULL THEN
    INSERT INTO public.cash_accounts(tenant_id, branch_id, name, account_type, opening_balance, current_balance, is_active)
    VALUES (_tenant_id, bid, 'الخزنة الرئيسية', 'cash', 0, 0, true)
    RETURNING id INTO cid;
  ELSE
    UPDATE public.cash_accounts
    SET branch_id = COALESCE(branch_id, bid), is_active = true, updated_at = now()
    WHERE id = cid;
  END IF;
  RETURN cid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_default_cash_account_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.seed_laundry_service_catalog(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.service_items(tenant_id, name, service_type, unit_price, is_active)
  VALUES
    (_tenant_id,'قميص تنظيف وكي','both',45,true),
    (_tenant_id,'قميص مكوي','ironing',20,true),
    (_tenant_id,'بنطلون تنظيف وكي','both',50,true),
    (_tenant_id,'بنطلون مكوي','ironing',25,true),
    (_tenant_id,'تيشيرت تنظيف وكي','both',35,true),
    (_tenant_id,'تيشيرت مكوي','ironing',15,true),
    (_tenant_id,'بلوزة تنظيف وكي','both',45,true),
    (_tenant_id,'بلوزة مكوية','ironing',25,true),
    (_tenant_id,'جاكيت تنظيف وكي','both',85,true),
    (_tenant_id,'جاكيت مكوي','ironing',45,true),
    (_tenant_id,'بدلة تنظيف وكي','both',150,true),
    (_tenant_id,'بدلة مكوية','ironing',80,true),
    (_tenant_id,'بدلة رجالي قطعتين','both',250,true),
    (_tenant_id,'عباية تنظيف وكي','both',90,true),
    (_tenant_id,'عباية مكوية','ironing',50,true),
    (_tenant_id,'فستان تنظيف وكي','both',130,true),
    (_tenant_id,'فستان مكوي','ironing',70,true),
    (_tenant_id,'ملاية تنظيف وكي','both',60,true),
    (_tenant_id,'ملاية مكوية','ironing',35,true),
    (_tenant_id,'ستارة تنظيف وكي','both',120,true),
    (_tenant_id,'ستارة مكوية','ironing',60,true),
    (_tenant_id,'لحاف تنظيف','both',220,true),
    (_tenant_id,'بطانية تنظيف','both',180,true),
    (_tenant_id,'سجادة صغيرة تنظيف','both',120,true),
    (_tenant_id,'تركيب زرار','cleaning',15,true),
    (_tenant_id,'تقصير بنطلون','cleaning',40,true),
    (_tenant_id,'تقصير كم','cleaning',50,true),
    (_tenant_id,'تركيب سوستة','cleaning',70,true),
    (_tenant_id,'تغيير سوستة جاكيت','cleaning',120,true),
    (_tenant_id,'رتق قطع بسيط','cleaning',45,true),
    (_tenant_id,'رتق قطع كبير','cleaning',90,true),
    (_tenant_id,'إصلاح بطانة','cleaning',100,true)
  ON CONFLICT DO NOTHING;
END;
$$;

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

  IF btype = 'laundry' THEN
    -- Try copying the latest current catalog from existing tenants first.
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

    -- Guaranteed fallback catalog for first/empty production project.
    PERFORM public.seed_laundry_service_catalog(_tenant_id);
  END IF;

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

CREATE OR REPLACE FUNCTION public.after_tenant_created_or_owner_changed_bootstrap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_tenant_defaults(NEW.id, NEW.name);
  PERFORM public.ensure_tenant_owner_employee(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_bootstrap_all ON public.tenants;
CREATE TRIGGER trg_tenant_bootstrap_all
AFTER INSERT OR UPDATE OF owner_user_id, name ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.after_tenant_created_or_owner_changed_bootstrap();

-- Remove older duplicate insert-only trigger to avoid running bootstrap twice on new tenants.
DROP TRIGGER IF EXISTS trg_seed_tenant_defaults ON public.tenants;

DROP VIEW IF EXISTS public.tenant_bootstrap_health;
CREATE VIEW public.tenant_bootstrap_health AS
SELECT
  t.id AS tenant_id,
  t.name,
  t.slug,
  t.business_type,
  EXISTS (SELECT 1 FROM public.app_settings s WHERE s.tenant_id = t.id) AS has_settings,
  EXISTS (SELECT 1 FROM public.branches b WHERE b.tenant_id = t.id AND b.is_active) AS has_branch,
  EXISTS (SELECT 1 FROM public.cash_accounts ca WHERE ca.tenant_id = t.id AND ca.is_active) AS has_cash_account,
  (SELECT count(*) FROM public.chart_accounts a WHERE a.tenant_id = t.id AND a.is_active) >= 10 AS has_chart_accounts,
  EXISTS (SELECT 1 FROM public.employees e WHERE e.tenant_id = t.id AND e.is_active) AS has_employee,
  (SELECT count(*) FROM public.service_items si WHERE si.tenant_id = t.id AND si.is_active) >= 10 AS has_catalog,
  EXISTS (SELECT 1 FROM public.tenant_features tf WHERE tf.tenant_id = t.id AND tf.feature_key = 'customer_returns' AND tf.enabled) AS has_customer_returns_feature,
  EXISTS (SELECT 1 FROM public.tenant_features tf WHERE tf.tenant_id = t.id AND tf.feature_key = 'ironing_distribution' AND tf.enabled) AS has_ironing_distribution_feature,
  (
    EXISTS (SELECT 1 FROM public.app_settings s WHERE s.tenant_id = t.id)
    AND EXISTS (SELECT 1 FROM public.branches b WHERE b.tenant_id = t.id AND b.is_active)
    AND EXISTS (SELECT 1 FROM public.cash_accounts ca WHERE ca.tenant_id = t.id AND ca.is_active)
    AND (SELECT count(*) FROM public.chart_accounts a WHERE a.tenant_id = t.id AND a.is_active) >= 10
    AND EXISTS (SELECT 1 FROM public.employees e WHERE e.tenant_id = t.id AND e.is_active)
    AND (SELECT count(*) FROM public.service_items si WHERE si.tenant_id = t.id AND si.is_active) >= 10
  ) AS is_ready
FROM public.tenants t;
GRANT SELECT ON public.tenant_bootstrap_health TO authenticated;

-- Repair all existing tenants against the newest readiness rules.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name FROM public.tenants LOOP
    PERFORM public.seed_tenant_defaults(r.id, r.name);
    PERFORM public.ensure_tenant_owner_employee(r.id);
  END LOOP;
END $$;
