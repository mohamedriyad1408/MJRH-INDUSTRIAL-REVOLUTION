-- MJRH — Phase 3: Marketplace, Custom Roles, Export/Import
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custom_roles_tenant_all ON public.custom_roles;
CREATE POLICY custom_roles_tenant_all ON public.custom_roles FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));
CREATE INDEX IF NOT EXISTS idx_custom_roles_tenant ON public.custom_roles (tenant_id) WHERE is_active = true;
GRANT ALL ON public.custom_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_roles TO authenticated;
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    INSERT INTO public.custom_roles (tenant_id, name, name_en, slug, description, permissions, is_system)
    VALUES
      (t.id, 'مالك', 'Owner', 'owner', 'مالك المشروع', '{"all": true}'::jsonb, true),
      (t.id, 'مدير تشغيل', 'Operations Manager', 'ops_manager', 'مدير التشغيل', '{"can_manage_stations": true, "can_view_reports": true, "can_manage_staff": true}'::jsonb, true),
      (t.id, 'مدير خدمة عملاء', 'CS Manager', 'cs_manager', 'مدير خدمة العملاء', '{"can_manage_orders": true, "can_manage_customers": true, "can_view_reports": true}'::jsonb, true),
      (t.id, 'موظف', 'Employee', 'employee', 'موظف عادي', '{"can_view_orders": true}'::jsonb, true),
      (t.id, 'مندوب', 'Courier', 'courier', 'مندوب توصيل', '{"can_view_driver": true}'::jsonb, true)
    ON CONFLICT (tenant_id, slug) DO NOTHING;
  END LOOP;
END $$;
ALTER TABLE public.workflow_templates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.workflow_templates ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.workflow_templates ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0;
ALTER TABLE public.workflow_templates ADD COLUMN IF NOT EXISTS preview_image_url TEXT;
ALTER TABLE public.workflow_templates ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.workflow_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.workflow_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
UPDATE public.workflow_templates SET category = 'laundry', is_featured = true WHERE slug = 'laundry';
UPDATE public.workflow_templates SET category = 'cleaning' WHERE slug = 'carpet';
UPDATE public.workflow_templates SET category = 'repair' WHERE slug = 'repair';
UPDATE public.workflow_templates SET category = 'carwash' WHERE slug = 'carwash';
UPDATE public.workflow_templates SET category = 'cleaning' WHERE slug = 'cleaning';
UPDATE public.workflow_templates SET category = 'restaurant' WHERE slug = 'restaurant';
CREATE OR REPLACE FUNCTION public.export_workflow_template(_tenant_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT jsonb_build_object('version','1.0','exported_at',now(),'tenant_id',_tenant_id,'stages',COALESCE((SELECT jsonb_agg(row_to_json(s) ORDER BY s.stage_order) FROM public.workflow_stages s WHERE s.tenant_id = _tenant_id AND s.is_active = true), '[]'::jsonb),'categories',COALESCE((SELECT jsonb_agg(row_to_json(c) ORDER BY c.sort_order) FROM public.service_categories c WHERE c.tenant_id = _tenant_id AND c.is_active = true), '[]'::jsonb),'custom_roles',COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY r.name) FROM public.custom_roles r WHERE r.tenant_id = _tenant_id AND r.is_active = true AND r.is_system = false), '[]'::jsonb)) INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.export_workflow_template(UUID) TO authenticated;
CREATE OR REPLACE FUNCTION public.import_workflow_template(_tenant_id UUID, _payload JSONB) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _stage JSONB; _count INTEGER := 0;
BEGIN
  IF NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _payload IS NULL OR NOT (_payload ? 'stages') THEN RAISE EXCEPTION 'Invalid payload: missing stages'; END IF;
  UPDATE public.workflow_stages SET is_active = false, updated_at = now() WHERE tenant_id = _tenant_id AND is_active = true;
  FOR _stage IN SELECT * FROM jsonb_array_elements(_payload->'stages') LOOP
    INSERT INTO public.workflow_stages (tenant_id, name, name_en, slug, stage_order, icon, color, is_initial, is_final, is_active) VALUES (_tenant_id, COALESCE(_stage->>'name', _stage->>'slug'), _stage->>'name_en', _stage->>'slug', COALESCE((_stage->>'stage_order')::integer, _count + 1), COALESCE(_stage->>'icon', '📦'), COALESCE(_stage->>'color', '#0d9488'), COALESCE((_stage->>'is_initial')::boolean, false), COALESCE((_stage->>'is_final')::boolean, false), true) ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name, name_en = EXCLUDED.name_en, stage_order = EXCLUDED.stage_order, icon = EXCLUDED.icon, color = EXCLUDED.color, is_initial = EXCLUDED.is_initial, is_final = EXCLUDED.is_final, is_active = true, updated_at = now();
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.import_workflow_template(UUID, JSONB) TO authenticated;
