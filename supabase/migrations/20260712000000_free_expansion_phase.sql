-- MJRH Free Expansion Phase — Zero Cost
-- Implements: Fairness Engine, Recurring Packages, Before/After Photos, Win-back, Onboarding, Advisor extra rules
-- All using existing free infrastructure: Supabase Postgres, pg_cron optional, storage bucket unit-media, wa.me links

-- ============================================================================
-- 1) FAIRNESS ENGINE — Workload Index + Burnout Flag
-- ============================================================================

-- View: daily workload per employee per station
CREATE OR REPLACE VIEW public.v_workload_index_daily
WITH (security_invoker = true)
AS
WITH daily_counts AS (
  -- From task_assignments (generic stations)
  SELECT 
    tenant_id, 
    branch_id, 
    employee_id, 
    station::text as station,
    DATE(assigned_at) as work_date, 
    COUNT(*)::int as units_count
  FROM public.task_assignments
  WHERE employee_id IS NOT NULL
  GROUP BY tenant_id, branch_id, employee_id, station, DATE(assigned_at)
  UNION ALL
  -- From service_units ironing assignments
  SELECT 
    tenant_id, 
    branch_id, 
    assigned_ironing_employee_id as employee_id, 
    'ironing'::text as station,
    DATE(ironing_assigned_at) as work_date, 
    COUNT(*)::int as units_count
  FROM public.service_units
  WHERE assigned_ironing_employee_id IS NOT NULL 
    AND ironing_assigned_at IS NOT NULL
  GROUP BY tenant_id, branch_id, assigned_ironing_employee_id, DATE(ironing_assigned_at)
),
aggregated AS (
  SELECT tenant_id, branch_id, employee_id, work_date, station, SUM(units_count) as units_count
  FROM daily_counts
  GROUP BY tenant_id, branch_id, employee_id, work_date, station
),
averages AS (
  SELECT tenant_id, branch_id, work_date, station, 
         AVG(units_count)::numeric as avg_units, 
         COUNT(DISTINCT employee_id) as employee_count
  FROM aggregated
  GROUP BY tenant_id, branch_id, work_date, station
)
SELECT a.tenant_id, a.branch_id, a.employee_id, a.work_date, a.station, a.units_count,
       av.avg_units,
       CASE WHEN COALESCE(av.avg_units,0) > 0 THEN (a.units_count::numeric / av.avg_units) ELSE 1::numeric END as wli,
       av.employee_count
FROM aggregated a
JOIN averages av ON a.tenant_id = av.tenant_id 
  AND (a.branch_id IS NOT DISTINCT FROM av.branch_id)
  AND a.work_date = av.work_date 
  AND a.station = av.station;

COMMENT ON VIEW public.v_workload_index_daily IS 'Fairness Engine WLI: لكل موظف، لكل يوم = وحدات منفذة ÷ متوسط المحطة في نفس اليوم';

-- View: burnout risk — WLI > 1.5 لمدة 3 أيام متتالية
CREATE OR REPLACE VIEW public.v_burnout_risk
WITH (security_invoker = true)
AS
WITH wli_filtered AS (
  SELECT * FROM public.v_workload_index_daily WHERE wli > 1.5
),
ordered AS (
  SELECT *, 
    ROW_NUMBER() OVER (PARTITION BY tenant_id, employee_id, station ORDER BY work_date) as rn,
    work_date - (ROW_NUMBER() OVER (PARTITION BY tenant_id, employee_id, station ORDER BY work_date))::int as grp_date
  FROM wli_filtered
),
grouped AS (
  SELECT tenant_id, branch_id, employee_id, station, 
         COUNT(*) as consecutive_days, 
         MIN(work_date) as start_date, 
         MAX(work_date) as end_date, 
         AVG(wli)::numeric as avg_wli,
         grp_date
  FROM ordered
  GROUP BY tenant_id, branch_id, employee_id, station, grp_date
)
SELECT tenant_id, branch_id, employee_id, station, consecutive_days, start_date, end_date, avg_wli
FROM grouped
WHERE consecutive_days >= 3;

COMMENT ON VIEW public.v_burnout_risk IS 'Burnout Flag: موظف WLI فوق 1.5 لمدة 3 أيام متتالية';

-- Function to generate burnout notifications (zero-cost, uses existing app_notifications)
CREATE OR REPLACE FUNCTION public.generate_burnout_alerts(_tenant_id uuid DEFAULT public.current_tenant_id())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_count int := 0;
  rec RECORD;
  today date := CURRENT_DATE;
BEGIN
  IF _tenant_id IS NULL THEN RETURN 0; END IF;

  FOR rec IN 
    SELECT br.employee_id, br.station, br.consecutive_days, br.avg_wli, e.full_name
    FROM public.v_burnout_risk br
    JOIN public.employees e ON e.id = br.employee_id
    WHERE br.tenant_id = _tenant_id
      AND br.end_date >= today - interval '1 day'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.app_notifications 
      WHERE tenant_id = _tenant_id 
        AND title = 'تنبيه إرهاق: ' || rec.full_name
        AND created_at::date = today
    ) THEN
      INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
      VALUES (
        _tenant_id, 
        NULL,
        'تنبيه إرهاق: ' || rec.full_name,
        rec.full_name || ' في محطة ' || rec.station || ' عبء فوق 1.5 لمدة ' || rec.consecutive_days || ' أيام (متوسط WLI ' || round(rec.avg_wli,2) || '). فكر في إعادة توزيع المناوبة.',
        '/staff/scorecard',
        'warning'
      );
      created_count := created_count + 1;
    END IF;
  END LOOP;

  RETURN created_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_burnout_alerts(uuid) TO authenticated;

-- ============================================================================
-- 2) RECURRING PACKAGES — Customer Subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'باقة شهرية',
  item_quota int NOT NULL DEFAULT 20 CHECK (item_quota > 0),
  remaining_quota int NOT NULL DEFAULT 20 CHECK (remaining_quota >= 0),
  price numeric(12,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date NOT NULL DEFAULT (CURRENT_DATE + interval '1 month')::date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(tenant_id, customer_id, plan_name, start_date)
);

CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_tenant_customer ON public.customer_subscriptions(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_tenant_status ON public.customer_subscriptions(tenant_id, status, renewal_date);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_renewal ON public.customer_subscriptions(renewal_date) WHERE status = 'active';

ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_subscriptions_tenant_all ON public.customer_subscriptions;
CREATE POLICY customer_subscriptions_tenant_all ON public.customer_subscriptions
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- Trigger to set remaining_quota on insert and update updated_at
CREATE OR REPLACE FUNCTION public.set_customer_subscription_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.remaining_quota IS NULL THEN
    NEW.remaining_quota := NEW.item_quota;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_subscriptions_defaults ON public.customer_subscriptions;
CREATE TRIGGER trg_customer_subscriptions_defaults
BEFORE INSERT OR UPDATE ON public.customer_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_customer_subscription_defaults();

-- View: subscription balances with customer info
CREATE OR REPLACE VIEW public.v_subscription_balances
WITH (security_invoker = true)
AS
SELECT cs.*, c.full_name as customer_name, c.phone as customer_phone, b.name as branch_name
FROM public.customer_subscriptions cs
JOIN public.customers c ON c.id = cs.customer_id
LEFT JOIN public.branches b ON b.id = cs.branch_id;

-- Function: deduct quota when order created (called from frontend or trigger)
CREATE OR REPLACE FUNCTION public.deduct_subscription_quota(
  _tenant_id uuid,
  _customer_id uuid,
  _items_count int,
  _order_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
BEGIN
  -- Find active subscription with enough quota, ordered by renewal_date asc (earliest expiring first)
  SELECT * INTO sub
  FROM public.customer_subscriptions
  WHERE tenant_id = _tenant_id 
    AND customer_id = _customer_id 
    AND status = 'active'
    AND remaining_quota >= _items_count
    AND renewal_date >= CURRENT_DATE
  ORDER BY renewal_date ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.customer_subscriptions
  SET remaining_quota = remaining_quota - _items_count,
      updated_at = now()
  WHERE id = sub.id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.deduct_subscription_quota(uuid, uuid, int, uuid) TO authenticated;

-- Function: renew monthly subscriptions (to be called by pg_cron or manually)
CREATE OR REPLACE FUNCTION public.renew_monthly_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  renewed int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM public.customer_subscriptions
    WHERE status = 'active' AND renewal_date <= CURRENT_DATE
  LOOP
    -- Expire old if remaining quota not used? Keep as expired, create new cycle
    UPDATE public.customer_subscriptions
    SET status = 'expired', updated_at = now()
    WHERE id = rec.id;

    INSERT INTO public.customer_subscriptions(
      tenant_id, branch_id, customer_id, plan_name, item_quota, remaining_quota, price, 
      start_date, renewal_date, status, notes, created_by
    ) VALUES (
      rec.tenant_id, rec.branch_id, rec.customer_id, rec.plan_name, rec.item_quota, rec.item_quota, rec.price,
      CURRENT_DATE, (CURRENT_DATE + interval '1 month')::date, 'active', 'تجديد تلقائي شهري', rec.created_by
    );

    -- Create accounting journal for renewal if price > 0 (using existing expense/income logic would be separate)
    -- For now just notification
    INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone)
    VALUES (
      rec.tenant_id, rec.branch_id, 'owner',
      'تم تجديد اشتراك: ' || rec.plan_name,
      'العميل ' || (SELECT full_name FROM public.customers WHERE id = rec.customer_id) || ' تم تجديد باقته ' || rec.plan_name || ' تلقائياً.',
      '/customers',
      'info'
    );

    renewed := renewed + 1;
  END LOOP;

  RETURN renewed;
END;
$$;
GRANT EXECUTE ON FUNCTION public.renew_monthly_subscriptions() TO authenticated;

-- Try to enable pg_cron if available (Supabase free may have it, if not this will be skipped safely)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'renew-subscriptions-monthly',
      '0 2 1 * *', -- first day of month at 2am
      $$
      SELECT public.renew_monthly_subscriptions();
      $$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- ============================================================================
-- 3) BEFORE/AFTER PHOTOS — Visual Documentation
-- ============================================================================

ALTER TABLE public.service_units
  ADD COLUMN IF NOT EXISTS intake_photo_url text,
  ADD COLUMN IF NOT EXISTS delivery_photo_url text;

COMMENT ON COLUMN public.service_units.intake_photo_url IS 'صورة القطعة عند الاستلام - Before';
COMMENT ON COLUMN public.service_units.delivery_photo_url IS 'صورة القطعة عند التسليم - After';

-- Storage bucket already exists: unit-media is public true
-- Ensure policies allow anon read for customer tracking portal (photos visible to customer)
DROP POLICY IF EXISTS unit_media_public_read ON storage.objects;
CREATE POLICY unit_media_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'unit-media');

-- ============================================================================
-- 5) WIN-BACK CAMPAIGNS — Zero-cost using existing whatsapp queue
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_winback_campaigns(_tenant_id uuid DEFAULT public.current_tenant_id(), _days_threshold int DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_count int := 0;
  rec RECORD;
BEGIN
  IF _tenant_id IS NULL THEN RETURN 0; END IF;

  FOR rec IN
    SELECT c.id as customer_id, c.full_name, c.phone, MAX(o.created_at) as last_order_at
    FROM public.customers c
    JOIN public.orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id
    WHERE c.tenant_id = _tenant_id
      AND o.status != 'cancelled'
    GROUP BY c.id, c.full_name, c.phone
    HAVING MAX(o.created_at) < now() - (_days_threshold || ' days')::interval
  LOOP
    -- Avoid duplicate winback in last 30 days
    IF EXISTS (
      SELECT 1 FROM public.customer_messages 
      WHERE tenant_id = _tenant_id 
        AND customer_id = rec.customer_id 
        AND template_key = 'winback'
        AND created_at > now() - interval '30 days'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.customer_messages(
      tenant_id, customer_id, phone, channel, template_key, message, status, created_by
    ) VALUES (
      _tenant_id, rec.customer_id, rec.phone, 'whatsapp', 'winback',
      'وحشتنا ' || COALESCE(rec.full_name, '') || '! 🌟 عندك خصم خاص 15% على طلبك القادم لمدة 7 أيام. اطلب الآن: ' || (SELECT public_url FROM public.tenants WHERE id = _tenant_id),
      'queued',
      NULL
    );

    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_winback_campaigns(uuid, int) TO authenticated;

-- Optional cron for winback daily at 10am
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'winback-campaigns-daily',
      '0 10 * * *',
      $$
      SELECT public.generate_winback_campaigns();
      $$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- ============================================================================
-- 6) ONBOARDING WIZARD — Self-serve 5 steps
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_onboarding (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_step int NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),
  completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  branch_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  catalog_choice text NOT NULL DEFAULT 'default' CHECK (catalog_choice IN ('default','import','manual')),
  staff_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_method text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_tenant ON public.tenant_onboarding(tenant_id);
ALTER TABLE public.tenant_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_onboarding_tenant_all ON public.tenant_onboarding;
CREATE POLICY tenant_onboarding_tenant_all ON public.tenant_onboarding
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

CREATE OR REPLACE FUNCTION public.set_tenant_onboarding_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.is_completed AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_onboarding_updated ON public.tenant_onboarding;
CREATE TRIGGER trg_tenant_onboarding_updated
BEFORE UPDATE ON public.tenant_onboarding
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_onboarding_updated();

-- ============================================================================
-- 7) ADVISOR EXTRA RULES — Busiest day + Late payers (zero AI, SQL aggregation)
-- ============================================================================

-- View: busiest day of week per tenant
CREATE OR REPLACE VIEW public.v_busiest_day
WITH (security_invoker = true)
AS
WITH daily AS (
  SELECT tenant_id, EXTRACT(DOW FROM created_at)::int as dow, COUNT(*) as cnt
  FROM public.orders
  WHERE status != 'cancelled'
  GROUP BY tenant_id, EXTRACT(DOW FROM created_at)
),
avg_per_day AS (
  SELECT tenant_id, AVG(cnt)::numeric as avg_cnt FROM daily GROUP BY tenant_id
),
ranked AS (
  SELECT d.tenant_id, d.dow, d.cnt, a.avg_cnt,
         CASE WHEN a.avg_cnt > 0 THEN ((d.cnt - a.avg_cnt) / a.avg_cnt * 100)::int ELSE 0 END as pct_above_avg,
         ROW_NUMBER() OVER (PARTITION BY d.tenant_id ORDER BY d.cnt DESC) as rn
  FROM daily d
  JOIN avg_per_day a ON d.tenant_id = a.tenant_id
)
SELECT tenant_id, dow, 
  CASE dow WHEN 0 THEN 'الأحد' WHEN 1 THEN 'الإثنين' WHEN 2 THEN 'الثلاثاء' WHEN 3 THEN 'الأربعاء' WHEN 4 THEN 'الخميس' WHEN 5 THEN 'الجمعة' WHEN 6 THEN 'السبت' ELSE 'غير معروف' END as day_name,
  cnt, avg_cnt, pct_above_avg
FROM ranked
WHERE rn = 1;

COMMENT ON VIEW public.v_busiest_day IS 'يوم X دايمًا أعلى ضغط بمعدل نسبة% — فكر تزود مناوبة';

-- View: late payers — عملاء يتأخرون في السداد
CREATE OR REPLACE VIEW public.v_late_payers
WITH (security_invoker = true)
AS
WITH order_payment AS (
  SELECT tenant_id, customer_id, 
         EXTRACT(DAY FROM (COALESCE(paid_at, delivered_at, now()) - created_at))::int as days_to_pay,
         payment_status
  FROM public.orders
  WHERE status IN ('delivered','ready','out_for_delivery') AND customer_id IS NOT NULL
),
avg_tenant AS (
  SELECT tenant_id, AVG(days_to_pay)::numeric as avg_days FROM order_payment GROUP BY tenant_id
),
customer_avg AS (
  SELECT tenant_id, customer_id, AVG(days_to_pay)::numeric as cust_avg_days, COUNT(*) as order_count
  FROM order_payment
  GROUP BY tenant_id, customer_id
  HAVING COUNT(*) >= 2
)
SELECT ca.tenant_id, ca.customer_id, c.full_name as customer_name, c.phone,
       ca.cust_avg_days, at.avg_days as tenant_avg_days,
       (ca.cust_avg_days - at.avg_days)::int as delay_vs_avg,
       ca.order_count
FROM customer_avg ca
JOIN avg_tenant at ON ca.tenant_id = at.tenant_id
JOIN public.customers c ON c.id = ca.customer_id
WHERE ca.cust_avg_days > at.avg_days + 2
ORDER BY delay_vs_avg DESC;

COMMENT ON VIEW public.v_late_payers IS 'العميل X بيتأخر في السداد بمعدل كذا يوم عن باقي العملاء';

-- ============================================================================
-- 4) DRIVER ROUTE ORDERING — Helper view for nearest-neighbor (no API)
-- We don't need DB view, but create helper function for distance calc already exists in JS.
-- Create a view that exposes ready orders with lat/lng for route optimization.
-- ============================================================================

CREATE OR REPLACE VIEW public.v_driver_route_tasks
WITH (security_invoker = true)
AS
SELECT o.id as order_id, o.tenant_id, o.branch_id, o.customer_id, 
       c.full_name as customer_name, c.phone,
       o.delivery_lat, o.delivery_lng, o.delivery_address,
       o.status, o.is_urgent, o.promised_delivery_at,
       (SELECT COUNT(*) FROM public.service_units su WHERE su.order_id = o.id) as pieces,
       o.total
FROM public.orders o
LEFT JOIN public.customers c ON c.id = o.customer_id
WHERE o.status IN ('ready','out_for_delivery')
  AND o.delivery_lat IS NOT NULL AND o.delivery_lng IS NOT NULL;

COMMENT ON VIEW public.v_driver_route_tasks IS 'Tasks ready for Haversine nearest-neighbor route ordering (zero-cost)';

-- ============================================================================
-- GRANTS & FINAL
-- ============================================================================

GRANT SELECT ON public.v_workload_index_daily TO authenticated;
GRANT SELECT ON public.v_burnout_risk TO authenticated;
GRANT SELECT ON public.v_subscription_balances TO authenticated;
GRANT SELECT ON public.v_busiest_day TO authenticated;
GRANT SELECT ON public.v_late_payers TO authenticated;
GRANT SELECT ON public.v_driver_route_tasks TO authenticated;
