-- Sprint 2E — Route / Action Permission Adoption
-- Additive migration. Introduces denial audit and assert helpers; does not remove legacy fallback.

CREATE TABLE IF NOT EXISTS public.core_authorization_denials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  capability_key text NOT NULL,
  resource_key text NOT NULL,
  action_key text NOT NULL,
  permission_key text NOT NULL,
  resource_id uuid,
  reason text NOT NULL DEFAULT 'permission_denied',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.core_authorization_denials IS 'Audit log for denied authorization checks. Used by route/API permission adoption.';

CREATE INDEX IF NOT EXISTS idx_core_auth_denials_tenant ON public.core_authorization_denials(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_auth_denials_actor ON public.core_authorization_denials(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_auth_denials_permission ON public.core_authorization_denials(permission_key, created_at DESC);

ALTER TABLE public.core_authorization_denials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_authorization_denials_tenant_read ON public.core_authorization_denials;
CREATE POLICY core_authorization_denials_tenant_read ON public.core_authorization_denials
FOR SELECT TO authenticated
USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id));

-- Inserts are controlled by SECURITY DEFINER function below.

CREATE OR REPLACE FUNCTION public.assert_actor_permission(
  _tenant_id uuid,
  _actor_user_id uuid,
  _capability_key text,
  _resource_key text,
  _action_key text,
  _resource_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
  pkey text := _capability_key || '.' || _resource_key || '.' || _action_key;
BEGIN
  allowed := public.actor_has_permission(_tenant_id, _actor_user_id, _capability_key, _resource_key, _action_key);

  IF NOT allowed THEN
    INSERT INTO public.core_authorization_denials(
      tenant_id, actor_user_id, capability_key, resource_key, action_key, permission_key, resource_id, reason, metadata
    ) VALUES (
      _tenant_id, _actor_user_id, _capability_key, _resource_key, _action_key, pkey, _resource_id, 'permission_denied', COALESCE(_metadata,'{}'::jsonb)
    );
    RAISE EXCEPTION 'Permission denied: %', pkey USING ERRCODE = '42501';
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.assert_actor_permission(uuid, uuid, text, text, text, uuid, jsonb) IS 'Generic runtime authorization enforcement helper. Logs denial and raises insufficient_privilege.';
GRANT EXECUTE ON FUNCTION public.assert_actor_permission(uuid, uuid, text, text, text, uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_current_actor_permission(
  _tenant_id uuid,
  _capability_key text,
  _resource_key text,
  _action_key text,
  _resource_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.assert_actor_permission(_tenant_id, auth.uid(), _capability_key, _resource_key, _action_key, _resource_id, _metadata);
$$;

GRANT EXECUTE ON FUNCTION public.assert_current_actor_permission(uuid, text, text, text, uuid, jsonb) TO authenticated;
