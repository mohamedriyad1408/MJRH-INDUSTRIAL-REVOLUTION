-- Sprint 4C — Marketplace & Capability Distribution (additive)

CREATE TABLE IF NOT EXISTS public.core_marketplace_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key text NOT NULL UNIQUE,
  package_type text NOT NULL CHECK (package_type IN ('capability','template','data_pack','integration')),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  publisher text NOT NULL DEFAULT 'MJRH',
  current_version text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','deprecated','retired')),
  rating numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.core_marketplace_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_marketplace_packages_read ON public.core_marketplace_packages;
CREATE POLICY core_marketplace_packages_read ON public.core_marketplace_packages FOR SELECT TO authenticated USING (status IN ('published','deprecated'));

CREATE TABLE IF NOT EXISTS public.core_marketplace_package_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key text NOT NULL REFERENCES public.core_marketplace_packages(package_key) ON DELETE CASCADE,
  version text NOT NULL,
  release_notes text,
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  checksum text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','yanked')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(package_key, version)
);
ALTER TABLE public.core_marketplace_package_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_marketplace_package_versions_read ON public.core_marketplace_package_versions;
CREATE POLICY core_marketplace_package_versions_read ON public.core_marketplace_package_versions FOR SELECT TO authenticated USING (status='published');

CREATE TABLE IF NOT EXISTS public.core_organization_package_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_key text NOT NULL REFERENCES public.core_marketplace_packages(package_key),
  version text NOT NULL,
  status text NOT NULL DEFAULT 'installed' CHECK (status IN ('installed','enabled','disabled','failed','removed')),
  installed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  installed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(tenant_id, package_key)
);
ALTER TABLE public.core_organization_package_installs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_org_package_installs_tenant_all ON public.core_organization_package_installs;
CREATE POLICY core_org_package_installs_tenant_all ON public.core_organization_package_installs FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
