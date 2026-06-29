-- MJRH V2 — Client error monitoring
-- Date: 2026-06-28
-- Captures frontend/runtime errors for production support without exposing secrets.

CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info','warning','error','fatal')),
  source text NOT NULL DEFAULT 'frontend',
  message text NOT NULL CHECK (length(message) <= 1000),
  stack text CHECK (stack IS NULL OR length(stack) <= 6000),
  path text CHECK (path IS NULL OR length(path) <= 600),
  user_agent text CHECK (user_agent IS NULL OR length(user_agent) <= 600),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_error_logs_created_idx ON public.client_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS client_error_logs_tenant_created_idx ON public.client_error_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS client_error_logs_unresolved_idx ON public.client_error_logs(tenant_id, created_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_error_logs_insert_anon_auth ON public.client_error_logs;
CREATE POLICY client_error_logs_insert_anon_auth ON public.client_error_logs
FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS client_error_logs_select_staff ON public.client_error_logs;
CREATE POLICY client_error_logs_select_staff ON public.client_error_logs
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id IS NOT NULL AND public.is_tenant_manager(auth.uid(), tenant_id))
);

DROP POLICY IF EXISTS client_error_logs_update_staff ON public.client_error_logs;
CREATE POLICY client_error_logs_update_staff ON public.client_error_logs
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id IS NOT NULL AND public.is_tenant_manager(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (tenant_id IS NOT NULL AND public.is_tenant_manager(auth.uid(), tenant_id))
);

GRANT INSERT ON public.client_error_logs TO anon, authenticated;
GRANT SELECT, UPDATE ON public.client_error_logs TO authenticated;
GRANT ALL ON public.client_error_logs TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_client_error_log(_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.client_error_logs WHERE id = _id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Error log not found'; END IF;
  IF NOT (public.is_privileged_context() OR public.is_super_admin(auth.uid()) OR (r.tenant_id IS NOT NULL AND public.is_tenant_manager(auth.uid(), r.tenant_id))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.client_error_logs
  SET resolved_at = now(), resolved_by = auth.uid(), resolution_notes = _notes
  WHERE id = _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_client_error_log(uuid,text) TO authenticated;
