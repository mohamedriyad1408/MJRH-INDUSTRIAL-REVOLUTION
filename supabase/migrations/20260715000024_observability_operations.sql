-- Sprint 4E — Observability & Operations (additive)

CREATE TABLE IF NOT EXISTS public.core_observability_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_observability_metrics_key ON public.core_observability_metrics(metric_key, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_observability_metrics_tenant ON public.core_observability_metrics(tenant_id, recorded_at DESC);
ALTER TABLE public.core_observability_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_observability_metrics_read ON public.core_observability_metrics;
CREATE POLICY core_observability_metrics_read ON public.core_observability_metrics FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id));

CREATE TABLE IF NOT EXISTS public.core_observability_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('debug','info','warn','error','critical')),
  source text NOT NULL DEFAULT 'platform',
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_observability_logs_level ON public.core_observability_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_observability_logs_tenant ON public.core_observability_logs(tenant_id, created_at DESC);
ALTER TABLE public.core_observability_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_observability_logs_read ON public.core_observability_logs;
CREATE POLICY core_observability_logs_read ON public.core_observability_logs FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id));

CREATE TABLE IF NOT EXISTS public.core_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key text NOT NULL UNIQUE,
  name_en text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy','degraded','down','unknown')),
  last_checked_at timestamptz,
  last_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_health_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_health_checks_read ON public.core_health_checks;
CREATE POLICY core_health_checks_read ON public.core_health_checks FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.record_observability_metric(_tenant_id uuid, _metric_key text, _value numeric, _dimensions jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE mid uuid;
BEGIN
  INSERT INTO public.core_observability_metrics(tenant_id,metric_key,metric_value,dimensions) VALUES(_tenant_id,_metric_key,_value,COALESCE(_dimensions,'{}'::jsonb)) RETURNING id INTO mid;
  RETURN mid;
END $$;
GRANT EXECUTE ON FUNCTION public.record_observability_metric(uuid,text,numeric,jsonb) TO authenticated;
