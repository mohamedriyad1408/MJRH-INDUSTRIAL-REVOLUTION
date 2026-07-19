-- Sprint 3C — Report & Dashboard Engine (additive)

CREATE TABLE IF NOT EXISTS public.core_report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ownership_level text NOT NULL DEFAULT 'ORGANIZATION' CHECK (ownership_level IN ('CORE','CAPABILITY','TEMPLATE','ORGANIZATION')),
  capability_key text REFERENCES public.core_capability_registry(capability_key),
  report_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  source_entity text NOT NULL DEFAULT 'custom',
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_visualization text NOT NULL DEFAULT 'table',
  export_formats text[] NOT NULL DEFAULT ARRAY['csv','pdf'],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','deprecated','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, report_key)
);
CREATE INDEX IF NOT EXISTS idx_core_report_defs_tenant ON public.core_report_definitions(tenant_id,status);
ALTER TABLE public.core_report_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_report_definitions_tenant_all ON public.core_report_definitions;
CREATE POLICY core_report_definitions_tenant_all ON public.core_report_definitions FOR ALL TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id)) WITH CHECK (tenant_id IS NULL OR public.can_access_tenant(tenant_id));
DROP TRIGGER IF EXISTS trg_core_report_definitions_updated ON public.core_report_definitions;
CREATE TRIGGER trg_core_report_definitions_updated BEFORE UPDATE ON public.core_report_definitions FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

CREATE TABLE IF NOT EXISTS public.core_dashboard_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  dashboard_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  audience_roles text[] NOT NULL DEFAULT ARRAY['owner'],
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','deprecated','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dashboard_key)
);
ALTER TABLE public.core_dashboard_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_dashboard_definitions_tenant_all ON public.core_dashboard_definitions;
CREATE POLICY core_dashboard_definitions_tenant_all ON public.core_dashboard_definitions FOR ALL TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id)) WITH CHECK (tenant_id IS NULL OR public.can_access_tenant(tenant_id));

CREATE TABLE IF NOT EXISTS public.core_dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  dashboard_id uuid REFERENCES public.core_dashboard_definitions(id) ON DELETE CASCADE,
  widget_key text NOT NULL,
  widget_type text NOT NULL DEFAULT 'metric',
  title_ar text NOT NULL,
  title_en text NOT NULL,
  report_key text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (dashboard_id, widget_key)
);
ALTER TABLE public.core_dashboard_widgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_dashboard_widgets_tenant_all ON public.core_dashboard_widgets;
CREATE POLICY core_dashboard_widgets_tenant_all ON public.core_dashboard_widgets FOR ALL TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id)) WITH CHECK (tenant_id IS NULL OR public.can_access_tenant(tenant_id));
