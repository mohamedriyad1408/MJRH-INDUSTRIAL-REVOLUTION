-- Sprint 3B — Document & Template Engine (additive)

CREATE TABLE IF NOT EXISTS public.core_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ownership_level text NOT NULL DEFAULT 'ORGANIZATION' CHECK (ownership_level IN ('CORE','CAPABILITY','TEMPLATE','ORGANIZATION')),
  capability_key text REFERENCES public.core_capability_registry(capability_key),
  template_key text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  document_type text NOT NULL DEFAULT 'document',
  locale text NOT NULL DEFAULT 'ar',
  version int NOT NULL DEFAULT 1,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_channels text[] NOT NULL DEFAULT ARRAY['print'],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','deprecated','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_key, locale, version)
);
CREATE INDEX IF NOT EXISTS idx_core_doc_templates_tenant ON public.core_document_templates(tenant_id, status);
ALTER TABLE public.core_document_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_document_templates_tenant_all ON public.core_document_templates;
CREATE POLICY core_document_templates_tenant_all ON public.core_document_templates FOR ALL TO authenticated USING (tenant_id IS NULL OR public.can_access_tenant(tenant_id)) WITH CHECK (tenant_id IS NULL OR public.can_access_tenant(tenant_id));
DROP TRIGGER IF EXISTS trg_core_document_templates_updated ON public.core_document_templates;
CREATE TRIGGER trg_core_document_templates_updated BEFORE UPDATE ON public.core_document_templates FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

CREATE TABLE IF NOT EXISTS public.core_document_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.core_document_templates(id) ON DELETE SET NULL,
  template_key text NOT NULL,
  source_entity text,
  source_id uuid,
  output_type text NOT NULL DEFAULT 'html' CHECK (output_type IN ('html','pdf','print','email','whatsapp','sms','json')),
  rendered_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_text text,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','sent','failed','archived')),
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_core_doc_outputs_tenant ON public.core_document_outputs(tenant_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_doc_outputs_source ON public.core_document_outputs(tenant_id, source_entity, source_id) WHERE source_entity IS NOT NULL AND source_id IS NOT NULL;
ALTER TABLE public.core_document_outputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS core_document_outputs_tenant_all ON public.core_document_outputs;
CREATE POLICY core_document_outputs_tenant_all ON public.core_document_outputs FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

CREATE OR REPLACE FUNCTION public.generate_core_document(_tenant_id uuid, _template_key text, _variables jsonb DEFAULT '{}'::jsonb, _source_entity text DEFAULT NULL, _source_id uuid DEFAULT NULL, _output_type text DEFAULT 'html')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tpl record; out_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT * INTO tpl FROM public.core_document_templates WHERE (tenant_id=_tenant_id OR tenant_id IS NULL) AND template_key=_template_key AND status='active' ORDER BY tenant_id NULLS LAST, version DESC LIMIT 1;
  IF tpl.id IS NULL THEN RAISE EXCEPTION 'Document template not found: %', _template_key; END IF;
  INSERT INTO public.core_document_outputs(tenant_id, template_id, template_key, source_entity, source_id, output_type, rendered_payload, rendered_text, generated_by)
  VALUES (_tenant_id, tpl.id, _template_key, _source_entity, _source_id, _output_type, jsonb_build_object('layout',tpl.layout,'variables',COALESCE(_variables,'{}'::jsonb)), COALESCE(tpl.name_en,tpl.template_key), auth.uid()) RETURNING id INTO out_id;
  RETURN out_id;
END $$;
GRANT EXECUTE ON FUNCTION public.generate_core_document(uuid,text,jsonb,text,uuid,text) TO authenticated;
