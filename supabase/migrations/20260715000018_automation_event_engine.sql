-- Sprint 3D — Automation & Event Engine (additive)

CREATE TABLE IF NOT EXISTS public.core_domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  producer text NOT NULL DEFAULT 'system',
  source_entity text,
  source_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_domain_events_tenant ON public.core_domain_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_domain_events_key ON public.core_domain_events(event_key, created_at DESC);
ALTER TABLE public.core_domain_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_domain_events_tenant_all ON public.core_domain_events;
CREATE POLICY core_domain_events_tenant_all ON public.core_domain_events FOR ALL TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id)) WITH CHECK (tenant_id IS NULL OR public.can_access_tenant(tenant_id));

CREATE TABLE IF NOT EXISTS public.core_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ownership_level text NOT NULL DEFAULT 'ORGANIZATION' CHECK (ownership_level IN ('CORE','CAPABILITY','TEMPLATE','ORGANIZATION')),
  capability_key text REFERENCES public.core_capability_registry(capability_key),
  rule_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  trigger_event_key text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  retry_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, rule_key)
);
ALTER TABLE public.core_automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_automation_rules_tenant_all ON public.core_automation_rules;
CREATE POLICY core_automation_rules_tenant_all ON public.core_automation_rules FOR ALL TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id)) WITH CHECK (tenant_id IS NULL OR public.can_access_tenant(tenant_id));
DROP TRIGGER IF EXISTS trg_core_automation_rules_updated ON public.core_automation_rules;
CREATE TRIGGER trg_core_automation_rules_updated BEFORE UPDATE ON public.core_automation_rules FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

CREATE TABLE IF NOT EXISTS public.core_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.core_automation_rules(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.core_domain_events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.core_automation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_automation_runs_tenant_all ON public.core_automation_runs;
CREATE POLICY core_automation_runs_tenant_all ON public.core_automation_runs FOR ALL TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id)) WITH CHECK (tenant_id IS NULL OR public.can_access_tenant(tenant_id));

CREATE OR REPLACE FUNCTION public.emit_core_domain_event(_tenant_id uuid, _event_key text, _producer text DEFAULT 'system', _source_entity text DEFAULT NULL, _source_id uuid DEFAULT NULL, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid;
BEGIN
  IF _tenant_id IS NOT NULL AND auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  INSERT INTO public.core_domain_events(tenant_id,event_key,producer,source_entity,source_id,payload) VALUES(_tenant_id,_event_key,_producer,_source_entity,_source_id,COALESCE(_payload,'{}'::jsonb)) RETURNING id INTO eid;
  INSERT INTO public.core_automation_runs(tenant_id, rule_id, event_id, status, result)
  SELECT _tenant_id, r.id, eid, 'queued', jsonb_build_object('queued_by','emit_core_domain_event') FROM public.core_automation_rules r WHERE r.is_active AND (r.tenant_id=_tenant_id OR r.tenant_id IS NULL) AND r.trigger_event_key=_event_key;
  RETURN eid;
END $$;
GRANT EXECUTE ON FUNCTION public.emit_core_domain_event(uuid,text,text,text,uuid,jsonb) TO authenticated;
