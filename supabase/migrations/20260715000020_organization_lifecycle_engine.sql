-- Sprint 4A — Organization Lifecycle Engine (additive)

CREATE TABLE IF NOT EXISTS public.core_organization_lifecycle (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  lifecycle_status text NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('trial','active','suspended','archived')),
  plan_key text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  archived_at timestamptz,
  suspension_reason text,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_organization_lifecycle ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_org_lifecycle_tenant_all ON public.core_organization_lifecycle;
CREATE POLICY core_org_lifecycle_tenant_all ON public.core_organization_lifecycle FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
DROP TRIGGER IF EXISTS trg_core_org_lifecycle_updated ON public.core_organization_lifecycle;
CREATE TRIGGER trg_core_org_lifecycle_updated BEFORE UPDATE ON public.core_organization_lifecycle FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

CREATE TABLE IF NOT EXISTS public.core_organization_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_organization_lifecycle_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_org_lifecycle_events_tenant_all ON public.core_organization_lifecycle_events;
CREATE POLICY core_org_lifecycle_events_tenant_all ON public.core_organization_lifecycle_events FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

CREATE OR REPLACE FUNCTION public.set_organization_lifecycle_status(_tenant_id uuid, _status text, _reason text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_status text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  IF _status NOT IN ('trial','active','suspended','archived') THEN RAISE EXCEPTION 'Invalid lifecycle status: %', _status; END IF;
  SELECT lifecycle_status INTO old_status FROM public.core_organization_lifecycle WHERE tenant_id=_tenant_id;
  INSERT INTO public.core_organization_lifecycle(tenant_id,lifecycle_status,trial_started_at,activated_at,suspended_at,archived_at,suspension_reason)
  VALUES(_tenant_id,_status,CASE WHEN _status='trial' THEN now() END,CASE WHEN _status='active' THEN now() END,CASE WHEN _status='suspended' THEN now() END,CASE WHEN _status='archived' THEN now() END,CASE WHEN _status='suspended' THEN _reason END)
  ON CONFLICT (tenant_id) DO UPDATE SET lifecycle_status=EXCLUDED.lifecycle_status, activated_at=COALESCE(core_organization_lifecycle.activated_at,EXCLUDED.activated_at), suspended_at=CASE WHEN EXCLUDED.lifecycle_status='suspended' THEN now() ELSE core_organization_lifecycle.suspended_at END, archived_at=CASE WHEN EXCLUDED.lifecycle_status='archived' THEN now() ELSE core_organization_lifecycle.archived_at END, suspension_reason=EXCLUDED.suspension_reason, updated_at=now();
  INSERT INTO public.core_organization_lifecycle_events(tenant_id,from_status,to_status,reason,actor_user_id,metadata) VALUES(_tenant_id,old_status,_status,_reason,auth.uid(),COALESCE(_metadata,'{}'::jsonb));
  UPDATE public.tenants SET is_active = (_status <> 'suspended' AND _status <> 'archived') WHERE id=_tenant_id;
  RETURN jsonb_build_object('tenant_id',_tenant_id,'from',old_status,'to',_status);
END $$;
GRANT EXECUTE ON FUNCTION public.set_organization_lifecycle_status(uuid,text,text,jsonb) TO authenticated;
