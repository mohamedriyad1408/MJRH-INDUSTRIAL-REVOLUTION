-- Sprint 3E — Integration & Public API Foundation (additive)

CREATE TABLE IF NOT EXISTS public.core_integration_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text NOT NULL UNIQUE,
  name_en text NOT NULL,
  provider text NOT NULL,
  category text NOT NULL DEFAULT 'external',
  auth_type text NOT NULL DEFAULT 'api_key',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','deprecated','disabled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_integration_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_integration_registry_read ON public.core_integration_registry;
CREATE POLICY core_integration_registry_read ON public.core_integration_registry FOR SELECT TO authenticated USING (status='active');

CREATE TABLE IF NOT EXISTS public.core_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  key_prefix text NOT NULL DEFAULT 'mjrh',
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key_name)
);
ALTER TABLE public.core_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_api_keys_tenant_all ON public.core_api_keys;
CREATE POLICY core_api_keys_tenant_all ON public.core_api_keys FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

CREATE TABLE IF NOT EXISTS public.core_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  integration_key text REFERENCES public.core_integration_registry(integration_key),
  url text NOT NULL,
  subscribed_events text[] NOT NULL DEFAULT ARRAY[]::text[],
  secret_hash text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_webhook_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_webhook_endpoints_tenant_all ON public.core_webhook_endpoints;
CREATE POLICY core_webhook_endpoints_tenant_all ON public.core_webhook_endpoints FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

CREATE TABLE IF NOT EXISTS public.core_api_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.core_api_keys(id) ON DELETE SET NULL,
  integration_key text,
  action text NOT NULL,
  resource text,
  status text NOT NULL DEFAULT 'ok',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_api_audit_tenant ON public.core_api_audit_log(tenant_id, created_at DESC);
ALTER TABLE public.core_api_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_api_audit_log_tenant_read ON public.core_api_audit_log;
CREATE POLICY core_api_audit_log_tenant_read ON public.core_api_audit_log FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id));
