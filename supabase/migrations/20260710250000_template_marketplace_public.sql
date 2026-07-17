-- MJRH — Template Marketplace Public
CREATE OR REPLACE VIEW public.marketplace_stats WITH (security_invoker = true) AS
SELECT COUNT(*) as total_templates, COUNT(*) FILTER (WHERE is_active = true) as active_templates, COUNT(*) FILTER (WHERE is_featured = true) as featured_templates, COALESCE(SUM(downloads),0) as total_downloads, COUNT(DISTINCT category) as categories_count FROM public.workflow_templates;
GRANT SELECT ON public.marketplace_stats TO anon;
GRANT SELECT ON public.marketplace_stats TO authenticated;
DROP POLICY IF EXISTS workflow_templates_public_read ON public.workflow_templates;
DROP POLICY IF EXISTS workflow_templates_anon_read ON public.workflow_templates;
CREATE POLICY workflow_templates_public_read ON public.workflow_templates FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY workflow_templates_anon_read ON public.workflow_templates FOR SELECT TO anon USING (is_active = true);
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.workflow_templates TO anon;
GRANT SELECT ON public.workflow_templates TO authenticated;
GRANT ALL ON public.workflow_templates TO service_role;
