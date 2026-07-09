-- MJRH — Configurable Workflow Stages
-- Allows any business owner to define custom workflow stages
-- instead of hardcoded laundry-specific stages.

-- ═══════════════════════════════════════════════════════════════════════
-- 1) Workflow Stages Table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#0d9488',
  is_active BOOLEAN DEFAULT true,
  is_initial BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  requires_assignment BOOLEAN DEFAULT true,
  auto_move_on_complete BOOLEAN DEFAULT false,
  allowed_next_slugs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

COMMENT ON TABLE public.workflow_stages IS 'Custom workflow stages per tenant. Each business can define its own stations.';

-- RLS
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_stages_tenant_isolation ON public.workflow_stages
  USING (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid))
  WITH CHECK (tenant_id = (SELECT current_setting('app.current_tenant', true)::uuid));

-- Index
CREATE INDEX IF NOT EXISTS idx_workflow_stages_tenant_order
  ON public.workflow_stages (tenant_id, stage_order)
  WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════
-- 2) Workflow Templates (predefined stage sets for common businesses)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '📋',
  stages JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.workflow_templates IS 'Predefined workflow templates for different business types.';

-- Insert default templates
INSERT INTO public.workflow_templates (name, name_en, slug, description, icon, stages) VALUES
('مغسلة ملابس', 'Laundry', 'laundry', 'استقبال → فرز → غسيل → تجفيف → كي → تغليف → جودة → تسليم', '🧺',
  '[
    {"name": "الاستلام", "name_en": "Reception", "slug": "reception", "icon": "📦", "color": "#0d9488", "stage_order": 1, "is_initial": true},
    {"name": "الفرز", "name_en": "Sorting", "slug": "sorting", "icon": "🏷️", "color": "#6366f1", "stage_order": 2},
    {"name": "الغسيل", "name_en": "Cleaning", "slug": "cleaning", "icon": "✨", "color": "#3b82f6", "stage_order": 3},
    {"name": "التجفيف والتجميع", "name_en": "Drying & Assembly", "slug": "drying-assembly", "icon": "💨", "color": "#8b5cf6", "stage_order": 4},
    {"name": "الكي", "name_en": "Ironing", "slug": "ironing", "icon": "👔", "color": "#a855f7", "stage_order": 5},
    {"name": "التغليف", "name_en": "Packing", "slug": "packing", "icon": "📦", "color": "#f59e0b", "stage_order": 6},
    {"name": "فحص الجودة", "name_en": "Quality Check", "slug": "qc", "icon": "✅", "color": "#10b981", "stage_order": 7},
    {"name": "التسليم", "name_en": "Delivery", "slug": "delivery", "icon": "🚚", "color": "#f97316", "stage_order": 8, "is_final": true}
  ]'::jsonb),
('مغسلة سجاد', 'Carpet Cleaning', 'carpet', 'استلام → غسيل → تجفيف → تغليف → تسليم', '🧹',
  '[
    {"name": "الاستلام", "name_en": "Reception", "slug": "reception", "icon": "📦", "color": "#0d9488", "stage_order": 1, "is_initial": true},
    {"name": "الغسيل", "name_en": "Washing", "slug": "washing", "icon": "💧", "color": "#3b82f6", "stage_order": 2},
    {"name": "التجفيف", "name_en": "Drying", "slug": "drying", "icon": "💨", "color": "#8b5cf6", "stage_order": 3},
    {"name": "التغليف", "name_en": "Packing", "slug": "packing", "icon": "📦", "color": "#f59e0b", "stage_order": 4},
    {"name": "التسليم", "name_en": "Delivery", "slug": "delivery", "icon": "🚚", "color": "#f97316", "stage_order": 5, "is_final": true}
  ]'::jsonb),
('ورشة تصليح', 'Repair Workshop', 'repair', 'استلام → تشخيص → تصليح → فحص → تسليم', '🔧',
  '[
    {"name": "الاستلام", "name_en": "Intake", "slug": "intake", "icon": "📥", "color": "#0d9488", "stage_order": 1, "is_initial": true},
    {"name": "التشخيص", "name_en": "Diagnosis", "slug": "diagnosis", "icon": "🔍", "color": "#6366f1", "stage_order": 2},
    {"name": "التصليح", "name_en": "Repair", "slug": "repair", "icon": "🔧", "color": "#f59e0b", "stage_order": 3},
    {"name": "الفحص", "name_en": "Testing", "slug": "testing", "icon": "✅", "color": "#10b981", "stage_order": 4},
    {"name": "التسليم", "name_en": "Delivery", "slug": "delivery", "icon": "🚚", "color": "#f97316", "stage_order": 5, "is_final": true}
  ]'::jsonb),
('غسيل سيارات', 'Car Wash', 'carwash', 'حجز → غسيل → تلميع → فحص → تسليم', '🚗',
  '[
    {"name": "الحجز", "name_en": "Booking", "slug": "booking", "icon": "📅", "color": "#0d9488", "stage_order": 1, "is_initial": true},
    {"name": "الغسيل", "name_en": "Washing", "slug": "washing", "icon": "💧", "color": "#3b82f6", "stage_order": 2},
    {"name": "التلميع", "name_en": "Polishing", "slug": "polishing", "icon": "✨", "color": "#f59e0b", "stage_order": 3},
    {"name": "الفحص", "name_en": "Inspection", "slug": "inspection", "icon": "✅", "color": "#10b981", "stage_order": 4},
    {"name": "التسليم", "name_en": "Handover", "slug": "handover", "icon": "🚗", "color": "#f97316", "stage_order": 5, "is_final": true}
  ]'::jsonb),
('تنظيف منازل', 'Home Cleaning', 'cleaning', 'حجز → فريق → تنظيف → فحص → اعتماد', '🏠',
  '[
    {"name": "الحجز", "name_en": "Booking", "slug": "booking", "icon": "📅", "color": "#0d9488", "stage_order": 1, "is_initial": true},
    {"name": "تعيين الفريق", "name_en": "Team Assignment", "slug": "team-assignment", "icon": "👥", "color": "#6366f1", "stage_order": 2},
    {"name": "التنظيف", "name_en": "Cleaning", "slug": "cleaning", "icon": "🧹", "color": "#3b82f6", "stage_order": 3},
    {"name": "الفحص", "name_en": "Inspection", "slug": "inspection", "icon": "✅", "color": "#10b981", "stage_order": 4},
    {"name": "الاعتماد", "name_en": "Approval", "slug": "approval", "icon": "👍", "color": "#f97316", "stage_order": 5, "is_final": true}
  ]'::jsonb),
('مطعم توصيل', 'Restaurant Delivery', 'restaurant', 'طلب → تحضير → تغليف → تسليم', '🍽️',
  '[
    {"name": "الطلب", "name_en": "Order", "slug": "order", "icon": "📝", "color": "#0d9488", "stage_order": 1, "is_initial": true},
    {"name": "التحضير", "name_en": "Preparation", "slug": "preparation", "icon": "👨‍🍳", "color": "#f59e0b", "stage_order": 2},
    {"name": "التغليف", "name_en": "Packaging", "slug": "packaging", "icon": "📦", "color": "#8b5cf6", "stage_order": 3},
    {"name": "التسليم", "name_en": "Delivery", "slug": "delivery", "icon": "🚚", "color": "#f97316", "stage_order": 4, "is_final": true}
  ]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 3) RPC: Apply workflow template to tenant
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.apply_workflow_template(
  _tenant_id UUID,
  _template_slug TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _template RECORD;
  _stage JSONB;
  _count INTEGER := 0;
BEGIN
  -- Get template
  SELECT * INTO _template FROM public.workflow_templates WHERE slug = _template_slug AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'القالب غير موجود: %', _template_slug;
  END IF;

  -- Deactivate existing stages
  UPDATE public.workflow_stages SET is_active = false, updated_at = now()
  WHERE tenant_id = _tenant_id AND is_active = true;

  -- Insert template stages
  FOR _stage IN SELECT * FROM jsonb_array_elements(_template.stages)
  LOOP
    INSERT INTO public.workflow_stages (
      tenant_id, name, name_en, slug, stage_order, icon, color,
      is_initial, is_final, is_active
    ) VALUES (
      _tenant_id,
      _stage->>'name',
      _stage->>'name_en',
      _stage->>'slug',
      (_stage->>'stage_order')::integer,
      _stage->>'icon',
      _stage->>'color',
      COALESCE((_stage->>'is_initial')::boolean, false),
      COALESCE((_stage->>'is_final')::boolean, false),
      true
    )
    ON CONFLICT (tenant_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      name_en = EXCLUDED.name_en,
      stage_order = EXCLUDED.stage_order,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      is_initial = EXCLUDED.is_initial,
      is_final = EXCLUDED.is_final,
      is_active = true,
      updated_at = now();

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_workflow_template(UUID, TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 4) RPC: Get tenant workflow stages
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_workflow_stages(_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_en TEXT,
  slug TEXT,
  stage_order INTEGER,
  icon TEXT,
  color TEXT,
  is_initial BOOLEAN,
  is_final BOOLEAN,
  requires_assignment BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ws.id, ws.name, ws.name_en, ws.slug, ws.stage_order,
         ws.icon, ws.color, ws.is_initial, ws.is_final, ws.requires_assignment
  FROM public.workflow_stages ws
  WHERE ws.tenant_id = _tenant_id AND ws.is_active = true
  ORDER BY ws.stage_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_workflow_stages(UUID) TO authenticated;
