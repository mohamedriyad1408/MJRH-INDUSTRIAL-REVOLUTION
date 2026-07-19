-- Sprint 4D — Administration & Governance (additive)

CREATE TABLE IF NOT EXISTS public.core_governance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key text NOT NULL UNIQUE,
  name_en text NOT NULL,
  scope text NOT NULL DEFAULT 'platform' CHECK (scope IN ('platform','organization','capability','template')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  rule_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_governance_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_governance_policies_read ON public.core_governance_policies;
CREATE POLICY core_governance_policies_read ON public.core_governance_policies FOR SELECT TO authenticated USING (is_active);

CREATE TABLE IF NOT EXISTS public.core_platform_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_core_platform_admin_audit_created ON public.core_platform_admin_audit(created_at DESC);
ALTER TABLE public.core_platform_admin_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_platform_admin_audit_super_read ON public.core_platform_admin_audit;
CREATE POLICY core_platform_admin_audit_super_read ON public.core_platform_admin_audit FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.core_backup_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  backup_key text NOT NULL,
  backup_type text NOT NULL DEFAULT 'logical',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','verified','failed','expired')),
  storage_ref text,
  verification_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  UNIQUE(tenant_id, backup_key)
);
ALTER TABLE public.core_backup_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_backup_registry_tenant_all ON public.core_backup_registry;
CREATE POLICY core_backup_registry_tenant_all ON public.core_backup_registry FOR ALL TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id)) WITH CHECK (tenant_id IS NULL OR public.can_access_tenant(tenant_id));
