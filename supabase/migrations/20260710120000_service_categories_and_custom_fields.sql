-- MJRH — Service Categories + Custom Fields (Generic Platform)
-- Phase 2 of Project Platform Pivot: Make services generic across industries

-- 1) Service Categories table (e.g., رجالي، حريمي، أطفال، ستائر... or for workshop: موبايل، لابتوب...)
-- Table may already exist from old migrations with different schema, so we ensure new columns exist

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns for generic platform
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📦';
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#0d9488';
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS description TEXT;

-- Backfill slug and sort_order from existing data
UPDATE public.service_categories SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9\u0600-\u06FF]+', '-', 'g')) WHERE slug IS NULL;
UPDATE public.service_categories SET slug = regexp_replace(slug, '^-|-$', '', 'g') WHERE slug IS NOT NULL;
UPDATE public.service_categories SET sort_order = COALESCE(display_order, 0) WHERE sort_order IS NULL OR sort_order = 0;

-- Ensure unique constraint on tenant_id + slug (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_categories_tenant_id_slug_key') THEN
    ALTER TABLE public.service_categories ADD CONSTRAINT service_categories_tenant_id_slug_key UNIQUE (tenant_id, slug);
  END IF;
END $$;

COMMENT ON TABLE public.service_categories IS 'Custom service categories per tenant/project. Allows any business to define its own service groups.';

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_categories_tenant_all ON public.service_categories;
DROP POLICY IF EXISTS service_categories_isolation ON public.service_categories;
DROP POLICY IF EXISTS sc_tenant ON public.service_categories;
CREATE POLICY service_categories_tenant_all ON public.service_categories
  FOR ALL TO authenticated
  USING (public.can_access_tenant(tenant_id))
  WITH CHECK (public.can_access_tenant(tenant_id));

CREATE INDEX IF NOT EXISTS idx_service_categories_tenant ON public.service_categories (tenant_id, sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_service_categories_tenant_active ON public.service_categories (tenant_id) WHERE is_active = true;

GRANT ALL ON public.service_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;

-- 2) Add custom_fields JSONB to service_items for industry-specific attributes
ALTER TABLE public.service_items
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.service_items.custom_fields IS 'Industry-specific custom fields, e.g., fabric_type, car_model, device_type, etc. Defined per tenant category.';

CREATE INDEX IF NOT EXISTS idx_service_items_category ON public.service_items (tenant_id, category_id) WHERE is_active = true;

-- 3) Migrate existing hardcoded categories (if any) into new table for each tenant
DO $$
DECLARE
  t record;
  cat_names text[] := ARRAY['رجالي', 'حريمي', 'أطفال', 'مفروشات', 'ستائر', 'سجاد', 'بدل', 'عبايات', 'إصلاحات', 'عام'];
  cat_name text;
  cat_slug text;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    FOREACH cat_name IN ARRAY cat_names LOOP
      cat_slug := lower(regexp_replace(cat_name, '[^a-zA-Z0-9\u0600-\u06FF]+', '-', 'g'));
      cat_slug := regexp_replace(cat_slug, '^-|-$', '', 'g');
      IF cat_slug = '' THEN CONTINUE; END IF;
      INSERT INTO public.service_categories (tenant_id, name, slug, sort_order)
      VALUES (t.id, cat_name, cat_slug, array_position(cat_names, cat_name))
      ON CONFLICT (tenant_id, slug) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 4) Update seed_tenant_defaults to ensure categories exist for new tenants
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid, _tenant_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  btype text;
  copied_count integer := 0;
BEGIN
  SELECT COALESCE(business_type, 'laundry') INTO btype FROM public.tenants WHERE id = _tenant_id;

  INSERT INTO public.app_settings (tenant_id, business_name)
  VALUES (_tenant_id, COALESCE(_tenant_name, 'Business'))
  ON CONFLICT (tenant_id) DO UPDATE SET business_name = COALESCE(public.app_settings.business_name, EXCLUDED.business_name);

  PERFORM public.ensure_default_branch_for(_tenant_id, _tenant_name);
  PERFORM public.ensure_default_cash_account_for(_tenant_id);
  PERFORM public.ensure_default_chart_accounts_for(_tenant_id);
  PERFORM public.ensure_default_workflow_for(_tenant_id);

  -- Ensure default categories
  INSERT INTO public.service_categories (tenant_id, name, slug, sort_order)
  VALUES
    (_tenant_id, 'عام', 'general', 0),
    (_tenant_id, 'رجالي', 'men', 1),
    (_tenant_id, 'حريمي', 'women', 2),
    (_tenant_id, 'أطفال', 'kids', 3),
    (_tenant_id, 'مفروشات', 'linens', 4),
    (_tenant_id, 'إصلاحات', 'repairs', 5)
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  IF btype = 'laundry' THEN
    INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
    SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
    FROM (
      SELECT DISTINCT ON (name, service_type) name, service_type, unit_price, is_active
      FROM public.service_items
      WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
      ORDER BY name, service_type, created_at DESC
    ) x
    WHERE NOT EXISTS (
      SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name AND s.service_type = x.service_type
    );
    GET DIAGNOSTICS copied_count = ROW_COUNT;
    PERFORM public.seed_laundry_service_catalog(_tenant_id);
  ELSE
    INSERT INTO public.service_items (tenant_id, name, service_type, unit_price, is_active, category_id)
    SELECT _tenant_id, x.name, x.service_type, x.unit_price, x.is_active, NULL
    FROM (
      SELECT DISTINCT ON (name) name, service_type, unit_price, is_active
      FROM public.service_items
      WHERE tenant_id IS NOT NULL AND tenant_id <> _tenant_id
      ORDER BY name, created_at DESC
    ) x
    WHERE NOT EXISTS (SELECT 1 FROM public.service_items s WHERE s.tenant_id = _tenant_id AND s.name = x.name);
  END IF;

  INSERT INTO public.tenant_features(tenant_id, feature_key, enabled)
  VALUES
    (_tenant_id,'orders',true),
    (_tenant_id,'customer_portal',true),
    (_tenant_id,'driver_map',true),
    (_tenant_id,'inventory',true),
    (_tenant_id,'accounting',true),
    (_tenant_id,'cash_closing',true),
    (_tenant_id,'apdo',true),
    (_tenant_id,'customer_returns',true),
    (_tenant_id,'ironing_distribution',true),
    (_tenant_id,'payment_proofs',true)
  ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(uuid, text) TO authenticated;
