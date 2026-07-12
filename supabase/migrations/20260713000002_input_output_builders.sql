-- MJRH v3.1 — Input Builder + Output Builder (Zero Cost)
-- Implements field_definitions_v2, field_values, report_definitions, report_schedules
-- All with whitelist validation (security mandatory) and size limits

-- ============================================================================
-- 1) Input Builder — field_definitions_v2
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.field_definitions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label_ar text NOT NULL,
  label_en text,
  field_type text NOT NULL CHECK (field_type IN ('text','number','date','select','multiselect','photo','signature','qr_scan','barcode_scan','file_upload','checkbox','rating','location')),
  input_method text NOT NULL DEFAULT 'manual' CHECK (input_method IN ('manual','scan','voice_to_text','import_csv','api_webhook')),
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  applies_to_stage_id uuid REFERENCES public.workflow_stages_v2(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, field_key),
  UNIQUE(tenant_id, workflow_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_field_defs_tenant ON public.field_definitions_v2(tenant_id);
CREATE INDEX IF NOT EXISTS idx_field_defs_workflow ON public.field_definitions_v2(workflow_id);
CREATE INDEX IF NOT EXISTS idx_field_defs_stage ON public.field_definitions_v2(applies_to_stage_id);
CREATE INDEX IF NOT EXISTS idx_field_defs_active ON public.field_definitions_v2(is_active) WHERE is_active = true;

ALTER TABLE public.field_definitions_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS field_defs_tenant_all ON public.field_definitions_v2;
CREATE POLICY field_defs_tenant_all ON public.field_definitions_v2
FOR ALL TO authenticated
USING (
  workflow_id IS NULL OR EXISTS (
    SELECT 1 FROM public.workflow_definitions wd 
    WHERE wd.id = workflow_id AND (wd.is_template = true OR public.can_access_tenant(wd.tenant_id))
  ) OR public.can_access_tenant(tenant_id)
)
WITH CHECK (
  public.can_access_tenant(tenant_id)
);

-- Public read for templates (input builder preview)
DROP POLICY IF EXISTS field_defs_template_public_read ON public.field_definitions_v2;
CREATE POLICY field_defs_template_public_read ON public.field_definitions_v2
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_definitions wd 
    WHERE wd.id = workflow_id AND wd.is_template = true AND wd.is_active = true
  )
  OR workflow_id IS NULL
);

-- Whitelist validation for validation_rules and visibility_condition
CREATE OR REPLACE FUNCTION public.validate_field_definition_rules(_rules jsonb, _visibility jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  allowed_rule_keys text[] := ARRAY['required','min','max','regex','options','maxLength','minLength','pattern'];
  allowed_visibility_keys text[] := ARRAY['field','operator','value','logic'];
  allowed_operators text[] := ARRAY['eq','neq','gt','lt','gte','lte','contains','in','not_in','exists','not_exists'];
  k text;
  op text;
BEGIN
  -- Validate validation_rules
  IF _rules IS NOT NULL AND _rules != '{}'::jsonb THEN
    FOR k IN SELECT jsonb_object_keys(_rules)
    LOOP
      IF NOT (k = ANY(allowed_rule_keys)) THEN
        RAISE EXCEPTION 'Invalid validation_rules key: % — allowed: %', k, array_to_string(allowed_rule_keys, ', ');
      END IF;
    END LOOP;

    -- Check for forbidden patterns (no JS eval)
    IF _rules::text ~* '(eval|function|=>|prototype|__proto__|constructor|process|require|import)' THEN
      RAISE EXCEPTION 'validation_rules contains forbidden JS pattern';
    END IF;
  END IF;

  -- Validate visibility_condition
  IF _visibility IS NOT NULL AND _visibility != '{}'::jsonb THEN
    FOR k IN SELECT jsonb_object_keys(_visibility)
    LOOP
      IF NOT (k = ANY(allowed_visibility_keys)) THEN
        RAISE EXCEPTION 'Invalid visibility_condition key: % — allowed: %', k, array_to_string(allowed_visibility_keys, ', ');
      END IF;
    END LOOP;

    -- Check operator whitelist
    IF _visibility ? 'operator' THEN
      op := _visibility->>'operator';
      IF NOT (op = ANY(allowed_operators)) THEN
        RAISE EXCEPTION 'Invalid visibility operator: % — allowed: %', op, array_to_string(allowed_operators, ', ');
      END IF;
    END IF;

    IF _visibility::text ~* '(eval|function|=>|prototype|__proto__|constructor|process|require|import|;|--|/\*)' THEN
      RAISE EXCEPTION 'visibility_condition contains forbidden pattern';
    END IF;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_field_definition_rules()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.validate_field_definition_rules(NEW.validation_rules, NEW.visibility_condition);
  
  -- Auto-set is_required from validation_rules if present
  IF (NEW.validation_rules->>'required')::boolean IS NOT NULL THEN
    NEW.is_required := (NEW.validation_rules->>'required')::boolean;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_field_definition_rules ON public.field_definitions_v2;
CREATE TRIGGER trg_check_field_definition_rules
BEFORE INSERT OR UPDATE ON public.field_definitions_v2
FOR EACH ROW EXECUTE FUNCTION public.check_field_definition_rules();

-- field_values — actual entered values per work_order
CREATE TABLE IF NOT EXISTS public.field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  field_definition_id uuid NOT NULL REFERENCES public.field_definitions_v2(id) ON DELETE CASCADE,
  value jsonb NOT NULL,
  entered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  input_method_used text NOT NULL DEFAULT 'manual' CHECK (input_method_used IN ('manual','scan','voice_to_text','import_csv','api_webhook','photo','signature','qr_scan','barcode_scan','file_upload')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(work_order_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_field_values_work_order ON public.field_values(work_order_id);
CREATE INDEX IF NOT EXISTS idx_field_values_field_def ON public.field_values(field_definition_id);

ALTER TABLE public.field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS field_values_tenant_all ON public.field_values;
CREATE POLICY field_values_tenant_all ON public.field_values
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id AND public.can_access_tenant(wo.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id AND public.can_access_tenant(wo.tenant_id)
  )
);

-- Size limit trigger for photo/file_upload (free storage protection)
CREATE OR REPLACE FUNCTION public.check_field_value_size()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  val_text text;
  max_len int := 500000; -- 500KB base64 limit for free tier protection
BEGIN
  val_text := NEW.value::text;
  IF length(val_text) > max_len THEN
    RAISE EXCEPTION 'Field value too large (% bytes, max % bytes) — compress image or reduce file size (free storage protection)', length(val_text), max_len;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_field_value_size ON public.field_values;
CREATE TRIGGER trg_check_field_value_size
BEFORE INSERT OR UPDATE ON public.field_values
FOR EACH ROW EXECUTE FUNCTION public.check_field_value_size();

-- ============================================================================
-- 2) Output Builder — report_definitions and schedules
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  description text,
  source_entity text NOT NULL CHECK (source_entity IN ('work_orders','field_values','orders','service_units','journal_entries','expenses','customers','workload_index','busiest_day','late_payers','consolidated_pnl')),
  selected_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters jsonb NOT NULL DEFAULT '[]'::jsonb,
  group_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  chart_type text NOT NULL DEFAULT 'table' CHECK (chart_type IN ('table','bar','line','pie','kpi_card','none')),
  visible_to_roles text[] NOT NULL DEFAULT ARRAY['owner','ops_manager'],
  export_formats text[] NOT NULL DEFAULT ARRAY['pdf','csv'],
  is_template boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_defs_tenant ON public.report_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_defs_source ON public.report_definitions(source_entity);

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_defs_tenant_all ON public.report_definitions;
CREATE POLICY report_defs_tenant_all ON public.report_definitions
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- Template public read
DROP POLICY IF EXISTS report_defs_template_public_read ON public.report_definitions;
CREATE POLICY report_defs_template_public_read ON public.report_definitions
FOR SELECT TO anon, authenticated
USING (is_template = true AND is_active = true);

-- Validation for report definitions (whitelist, no raw SQL)
CREATE OR REPLACE FUNCTION public.validate_report_definition(_def jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  allowed_source text[] := ARRAY['work_orders','field_values','orders','service_units','journal_entries','expenses','customers','workload_index','busiest_day','late_payers','consolidated_pnl'];
  allowed_operators text[] := ARRAY['eq','neq','gt','lt','gte','lte','contains','in','not_in','exists','is_null','not_null','between'];
  allowed_chart text[] := ARRAY['table','bar','line','pie','kpi_card','none'];
  src text;
  chart text;
  filter jsonb;
  op text;
BEGIN
  src := _def->>'source_entity';
  IF src IS NOT NULL AND NOT (src = ANY(allowed_source)) THEN
    RAISE EXCEPTION 'Invalid source_entity: % — allowed: %', src, array_to_string(allowed_source, ', ');
  END IF;

  chart := _def->>'chart_type';
  IF chart IS NOT NULL AND NOT (chart = ANY(allowed_chart)) THEN
    RAISE EXCEPTION 'Invalid chart_type: % — allowed: %', chart, array_to_string(allowed_chart, ', ');
  END IF;

  -- Validate filters don't contain SQL injection
  IF _def ? 'filters' THEN
    FOR filter IN SELECT * FROM jsonb_array_elements(_def->'filters')
    LOOP
      op := filter->>'operator';
      IF op IS NOT NULL AND NOT (op = ANY(allowed_operators)) THEN
        RAISE EXCEPTION 'Invalid filter operator: % — allowed: %', op, array_to_string(allowed_operators, ', ');
      END IF;
      IF filter::text ~* '(;|--|/\*|drop|insert|update|delete|exec|xp_)' THEN
        RAISE EXCEPTION 'Filter contains forbidden SQL pattern';
      END IF;
    END LOOP;
  END IF;

  -- Check no JS eval
  IF _def::text ~* '(eval|function\s*\(|=>|prototype|__proto__|constructor|process\.|require\(|import\s)' THEN
    RAISE EXCEPTION 'Report definition contains forbidden JS pattern';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_report_definition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.validate_report_definition(
    jsonb_build_object(
      'source_entity', NEW.source_entity,
      'chart_type', NEW.chart_type,
      'filters', NEW.filters
    )
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_report_definition ON public.report_definitions;
CREATE TRIGGER trg_check_report_definition
BEFORE INSERT OR UPDATE ON public.report_definitions
FOR EACH ROW EXECUTE FUNCTION public.check_report_definition();

-- report_schedules
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.report_definitions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','monthly','monday_9am','custom')),
  cron_expression text,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_method text NOT NULL DEFAULT 'dashboard' CHECK (delivery_method IN ('dashboard','email','whatsapp_queue')),
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_tenant ON public.report_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_report ON public.report_schedules(report_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON public.report_schedules(next_run_at) WHERE is_active = true;

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_schedules_tenant_all ON public.report_schedules;
CREATE POLICY report_schedules_tenant_all ON public.report_schedules
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

-- Function to schedule reports via pg_cron (free)
CREATE OR REPLACE FUNCTION public.schedule_report_delivery()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  scheduled int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT rs.*, rd.name_ar, rd.tenant_id as rd_tenant
    FROM report_schedules rs
    JOIN report_definitions rd ON rd.id = rs.report_id
    WHERE rs.is_active = true
      AND (rs.next_run_at IS NULL OR rs.next_run_at <= now())
  LOOP
    -- Create notification for dashboard delivery
    IF rec.delivery_method = 'dashboard' THEN
      INSERT INTO app_notifications(tenant_id, audience, title, body, href, tone)
      VALUES (
        rec.tenant_id,
        'owner',
        'تقرير مجدول: ' || rec.name_ar,
        'التقرير الدوري ' || rec.name_ar || ' جاهز للعرض — تردد: ' || rec.frequency,
        '/reports',
        'info'
      );
    ELSIF rec.delivery_method = 'whatsapp_queue' THEN
      -- Use existing whatsapp_queue system (zero-cost, wa.me manual)
      -- Insert into customer_messages as report delivery (for owner)
      INSERT INTO customer_messages(tenant_id, phone, channel, template_key, message, status)
      SELECT 
        rec.tenant_id,
        c.phone,
        'whatsapp',
        'report_delivery',
        'التقرير الدوري: ' || rec.name_ar || ' — ' || 'رابط: https://mjrh.vercel.app/' || (SELECT slug FROM tenants WHERE id = rec.tenant_id) || '/reports',
        'queued'
      FROM jsonb_array_elements_text(rec.recipients) AS recipient_phone
      JOIN customers c ON c.phone = recipient_phone AND c.tenant_id = rec.tenant_id
      LIMIT 5; -- Limit to prevent spam
    END IF;

    -- Update next_run
    UPDATE report_schedules 
    SET last_run_at = now(),
        next_run_at = CASE 
          WHEN frequency = 'daily' THEN now() + interval '1 day'
          WHEN frequency = 'weekly' THEN now() + interval '7 days'
          WHEN frequency = 'monthly' THEN now() + interval '1 month'
          WHEN frequency = 'monday_9am' THEN date_trunc('week', now()) + interval '1 week' + interval '9 hours' -- Next Monday 9am
          ELSE now() + interval '1 day'
        END
    WHERE id = rec.id;

    scheduled := scheduled + 1;
  END LOOP;

  RETURN scheduled;
END;
$$;
GRANT EXECUTE ON FUNCTION public.schedule_report_delivery() TO authenticated;

-- Try to schedule via pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('schedule-reports', '0 * * * *', $$SELECT public.schedule_report_delivery();$$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ============================================================================
-- Seed: Example field for Housekeeping minibar (DoD test)
-- ============================================================================

-- Insert example field definition for minibar status (for hospitality template)
-- This will be created via UI in real flow, but we seed one for E2E DoD

INSERT INTO public.field_definitions_v2 (
  tenant_id,
  workflow_id,
  field_key,
  label_ar,
  label_en,
  field_type,
  input_method,
  validation_rules,
  applies_to_stage_id,
  display_order,
  is_active,
  is_required
)
SELECT 
  NULL, -- tenant_id NULL means template for all (or use first tenant)
  '00000000-0000-0000-0000-000000000002'::uuid, -- hospitality template
  'minibar_status',
  'حالة الميني بار',
  'Minibar Status',
  'select',
  'manual',
  '{"required": true, "options": ["فاضي","نص","كامل","empty","half","full"]}'::jsonb,
  (SELECT id FROM workflow_stages_v2 WHERE workflow_id = '00000000-0000-0000-0000-000000000002' AND slug = 'minibar_check' LIMIT 1),
  1,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM field_definitions_v2 WHERE field_key = 'minibar_status' AND workflow_id = '00000000-0000-0000-0000-000000000002'
)
ON CONFLICT DO NOTHING;

-- Example report definition for DoD: "عدد الغرف المتأخرة عن SLA هذا الأسبوع مجمعة حسب الطابق"
INSERT INTO public.report_definitions (
  id,
  tenant_id,
  name_ar,
  name_en,
  source_entity,
  selected_fields,
  filters,
  group_by,
  sort_by,
  chart_type,
  visible_to_roles,
  export_formats,
  is_template,
  is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  (SELECT id FROM tenants LIMIT 1), -- Use first tenant as example, will be overridden per tenant
  'عدد الغرف المتأخرة عن SLA هذا الأسبوع مجمعة حسب الطابق',
  'Rooms delayed beyond SLA this week grouped by floor',
  'work_orders',
  '["id","title","custom_fields.room_number","custom_fields.floor","current_stage_id","sla_breached"]'::jsonb,
  '[{"field":"sla_breached","operator":"eq","value":true},{"field":"created_at","operator":"gte","value":"now-7d"}]'::jsonb,
  '["custom_fields.floor"]'::jsonb,
  '[{"field":"custom_fields.floor","direction":"asc"}]'::jsonb,
  'bar',
  ARRAY['owner','ops_manager'],
  ARRAY['pdf','csv'],
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_definitions_v2 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_schedules TO authenticated;

GRANT SELECT ON public.field_definitions_v2 TO anon;
GRANT SELECT ON public.report_definitions TO anon;
