-- Sprint 3A — Dynamic Form Engine
-- Additive migration. Defines generic dynamic forms, sections, fields, validation and rendering schema.

-- ============================================================================
-- 1) Extend existing core_forms as canonical form definitions
-- ============================================================================

ALTER TABLE public.core_forms
  ADD COLUMN IF NOT EXISTS ownership_level text NOT NULL DEFAULT 'ORGANIZATION' CHECK (ownership_level IN ('CORE','CAPABILITY','TEMPLATE','ORGANIZATION')),
  ADD COLUMN IF NOT EXISTS capability_key text REFERENCES public.core_capability_registry(capability_key),
  ADD COLUMN IF NOT EXISTS source_template_slug text,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','deprecated','archived')),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.core_forms IS 'Canonical dynamic form definitions. Sections and fields live in core_form_sections/core_form_fields; schema remains compatibility/render cache.';
COMMENT ON COLUMN public.core_forms.ownership_level IS 'CORE/CAPABILITY/TEMPLATE source or ORGANIZATION runtime form definition.';
COMMENT ON COLUMN public.core_forms.version IS 'Form definition version. Submissions should store version snapshot.';

CREATE INDEX IF NOT EXISTS idx_core_forms_tenant_status ON public.core_forms(tenant_id, status) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_forms_capability ON public.core_forms(tenant_id, capability_key) WHERE is_active;

DROP TRIGGER IF EXISTS trg_core_forms_updated ON public.core_forms;
CREATE TRIGGER trg_core_forms_updated
BEFORE UPDATE ON public.core_forms
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 2) Sections and fields
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_form_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.core_forms(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 100,
  visibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_core_form_sections_form ON public.core_form_sections(form_id, sort_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_form_sections_tenant ON public.core_form_sections(tenant_id) WHERE is_active;

ALTER TABLE public.core_form_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_form_sections_tenant_all ON public.core_form_sections;
CREATE POLICY core_form_sections_tenant_all ON public.core_form_sections
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_core_form_sections_updated ON public.core_form_sections;
CREATE TRIGGER trg_core_form_sections_updated
BEFORE UPDATE ON public.core_form_sections
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

CREATE TABLE IF NOT EXISTS public.core_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.core_forms(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.core_form_sections(id) ON DELETE SET NULL,
  field_key text NOT NULL,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','textarea','number','money','date','datetime','select','multi_select','checkbox','file','signature','phone','email','url','boolean','rating','json')),
  placeholder text,
  help_text text,
  required boolean NOT NULL DEFAULT false,
  default_value jsonb,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 100,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_core_form_fields_form ON public.core_form_fields(form_id, sort_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_form_fields_section ON public.core_form_fields(section_id, sort_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_core_form_fields_tenant ON public.core_form_fields(tenant_id) WHERE is_active;

ALTER TABLE public.core_form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_form_fields_tenant_all ON public.core_form_fields;
CREATE POLICY core_form_fields_tenant_all ON public.core_form_fields
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_core_form_fields_updated ON public.core_form_fields;
CREATE TRIGGER trg_core_form_fields_updated
BEFORE UPDATE ON public.core_form_fields
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 3) Form submissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.core_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.core_forms(id) ON DELETE RESTRICT,
  form_key text NOT NULL,
  form_version int NOT NULL,
  source_entity text,
  source_id uuid,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','approved','rejected','archived')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_form_submissions_form ON public.core_form_submissions(form_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_form_submissions_source ON public.core_form_submissions(tenant_id, source_entity, source_id) WHERE source_entity IS NOT NULL AND source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_form_submissions_tenant ON public.core_form_submissions(tenant_id, submitted_at DESC);

ALTER TABLE public.core_form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_form_submissions_tenant_all ON public.core_form_submissions;
CREATE POLICY core_form_submissions_tenant_all ON public.core_form_submissions
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

DROP TRIGGER IF EXISTS trg_core_form_submissions_updated ON public.core_form_submissions;
CREATE TRIGGER trg_core_form_submissions_updated
BEFORE UPDATE ON public.core_form_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_core_updated_at();

-- ============================================================================
-- 4) Dynamic render schema and validation helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.render_core_form_schema(_tenant_id uuid, _form_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT * FROM public.core_forms
    WHERE tenant_id=_tenant_id AND form_key=_form_key AND is_active AND status IN ('active','draft')
    ORDER BY version DESC LIMIT 1
  ), sections AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'section_key', s.section_key,
      'title_ar', s.title_ar,
      'title_en', s.title_en,
      'description', s.description,
      'sort_order', s.sort_order,
      'visibility_rules', s.visibility_rules,
      'fields', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', fld.id,
          'field_key', fld.field_key,
          'label_ar', fld.label_ar,
          'label_en', fld.label_en,
          'field_type', fld.field_type,
          'placeholder', fld.placeholder,
          'help_text', fld.help_text,
          'required', fld.required,
          'default_value', fld.default_value,
          'options', fld.options,
          'validation_rules', fld.validation_rules,
          'visibility_rules', fld.visibility_rules,
          'sort_order', fld.sort_order
        ) ORDER BY fld.sort_order)
        FROM public.core_form_fields fld
        WHERE fld.form_id=(SELECT id FROM f) AND fld.section_id=s.id AND fld.is_active
      ), '[]'::jsonb)
    ) ORDER BY s.sort_order), '[]'::jsonb) AS value
    FROM public.core_form_sections s
    WHERE s.form_id=(SELECT id FROM f) AND s.is_active
  ), orphan_fields AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', fld.id,
      'field_key', fld.field_key,
      'label_ar', fld.label_ar,
      'label_en', fld.label_en,
      'field_type', fld.field_type,
      'required', fld.required,
      'default_value', fld.default_value,
      'options', fld.options,
      'validation_rules', fld.validation_rules,
      'visibility_rules', fld.visibility_rules,
      'sort_order', fld.sort_order
    ) ORDER BY fld.sort_order), '[]'::jsonb) AS value
    FROM public.core_form_fields fld
    WHERE fld.form_id=(SELECT id FROM f) AND fld.section_id IS NULL AND fld.is_active
  )
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM f) THEN '{}'::jsonb ELSE jsonb_build_object(
    'form_id', (SELECT id FROM f),
    'form_key', (SELECT form_key FROM f),
    'name_ar', (SELECT name_ar FROM f),
    'name_en', (SELECT name_en FROM f),
    'version', (SELECT version FROM f),
    'ownership_level', (SELECT ownership_level FROM f),
    'capability_key', (SELECT capability_key FROM f),
    'metadata', (SELECT metadata FROM f),
    'sections', (SELECT value FROM sections),
    'fields', (SELECT value FROM orphan_fields)
  ) END;
$$;

GRANT EXECUTE ON FUNCTION public.render_core_form_schema(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_core_form_submission(_tenant_id uuid, _form_key text, _data jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT id FROM public.core_forms
    WHERE tenant_id=_tenant_id AND form_key=_form_key AND is_active AND status IN ('active','draft')
    ORDER BY version DESC LIMIT 1
  ), required_fields AS (
    SELECT field_key, label_en
    FROM public.core_form_fields
    WHERE form_id=(SELECT id FROM f) AND is_active AND required
  ), missing AS (
    SELECT field_key, label_en
    FROM required_fields
    WHERE NOT (_data ? field_key) OR _data->>field_key IS NULL OR btrim(COALESCE(_data->>field_key,'')) = ''
  )
  SELECT jsonb_build_object(
    'valid', NOT EXISTS (SELECT 1 FROM missing) AND EXISTS (SELECT 1 FROM f),
    'form_exists', EXISTS (SELECT 1 FROM f),
    'missing_required', COALESCE((SELECT jsonb_agg(jsonb_build_object('field_key', field_key, 'label_en', label_en)) FROM missing), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.validate_core_form_submission(uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_core_form(
  _tenant_id uuid,
  _form_key text,
  _data jsonb,
  _source_entity text DEFAULT NULL,
  _source_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f record;
  validation jsonb;
  submission_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_tenant(_tenant_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT * INTO f FROM public.core_forms
  WHERE tenant_id=_tenant_id AND form_key=_form_key AND is_active AND status IN ('active','draft')
  ORDER BY version DESC LIMIT 1;

  IF f.id IS NULL THEN RAISE EXCEPTION 'Form not found: %', _form_key; END IF;

  validation := public.validate_core_form_submission(_tenant_id, _form_key, COALESCE(_data,'{}'::jsonb));
  IF COALESCE((validation->>'valid')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Form validation failed: %', validation::text;
  END IF;

  INSERT INTO public.core_form_submissions(tenant_id, form_id, form_key, form_version, source_entity, source_id, submitted_by, data, validation_result, metadata)
  VALUES (_tenant_id, f.id, f.form_key, f.version, _source_entity, _source_id, auth.uid(), COALESCE(_data,'{}'::jsonb), validation, COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO submission_id;

  RETURN submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_core_form(uuid, text, jsonb, text, uuid, jsonb) TO authenticated;

-- ============================================================================
-- 5) Seed minimal dynamic forms for existing initialized organizations through templates later.
-- No automatic form generation is performed here; generator/pack pipeline will own that.
-- ============================================================================
