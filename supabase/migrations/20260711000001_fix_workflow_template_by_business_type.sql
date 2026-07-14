-- Fix ensure_default_workflow_for to apply template based on business_type
CREATE OR REPLACE FUNCTION public.ensure_default_workflow_for(_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  btype TEXT;
  template_slug TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.workflow_stages WHERE tenant_id = _tenant_id AND is_active = true) THEN
    RETURN;
  END IF;
  SELECT COALESCE(business_type, 'laundry') INTO btype FROM public.tenants WHERE id = _tenant_id;
  template_slug := CASE
    WHEN btype IN ('carpet', 'carpet_cleaning') THEN 'carpet'
    WHEN btype IN ('repair', 'tailoring', 'dry_cleaning', 'linen_service') THEN 'repair'
    WHEN btype IN ('carwash') THEN 'carwash'
    WHEN btype IN ('cleaning') THEN 'cleaning'
    WHEN btype IN ('restaurant', 'restaurant_delivery') THEN 'restaurant'
    WHEN btype IN ('laundry', 'laundry_chain', 'other', 'retail', 'manufacturing', 'services', 'generic') THEN 'laundry'
    ELSE 'laundry'
  END;
  PERFORM public.apply_workflow_template(_tenant_id, template_slug);
  IF NOT EXISTS (SELECT 1 FROM public.workflow_stages WHERE tenant_id = _tenant_id AND is_active = true) THEN
    PERFORM public.apply_workflow_template(_tenant_id, 'laundry');
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_default_workflow_for(UUID) TO authenticated;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.tenants WHERE NOT EXISTS (SELECT 1 FROM public.workflow_stages WHERE tenant_id = tenants.id AND is_active = true) LOOP
    PERFORM public.ensure_default_workflow_for(r.id);
  END LOOP;
END $$;
