-- APDO operating model: Actor / Process / Data / Output
-- Every operational event should answer:
-- 1) Which branch? 2) Which cash safe/account? 3) Was a journal entry created?
-- 4) Where does it appear in reports? 5) Does it need a notification?

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS cash_account_id uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.pickup_requests ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.equipment_assets ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expenses_cash_account_idx ON public.expenses(cash_account_id);
CREATE INDEX IF NOT EXISTS pickup_requests_branch_idx ON public.pickup_requests(branch_id);
CREATE INDEX IF NOT EXISTS equipment_assets_branch_idx ON public.equipment_assets(branch_id);
CREATE INDEX IF NOT EXISTS app_notifications_branch_idx ON public.app_notifications(branch_id);

DROP TABLE IF EXISTS public.operation_events CASCADE;
CREATE TABLE public.operation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE DEFAULT public.current_tenant_id(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  actor_role text,
  process_key text NOT NULL,
  process_name text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  cash_account_id uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  report_bucket text NOT NULL DEFAULT 'operational',
  notification_id uuid REFERENCES public.app_notifications(id) ON DELETE SET NULL,
  requires_notification boolean NOT NULL DEFAULT false,
  notification_created boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operation_events_tenant_created_idx ON public.operation_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS operation_events_branch_created_idx ON public.operation_events(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS operation_events_source_idx ON public.operation_events(source_type, source_id);

ALTER TABLE public.operation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operation_events_tenant_select ON public.operation_events;
CREATE POLICY operation_events_tenant_select ON public.operation_events
FOR SELECT TO authenticated
USING (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id));
DROP POLICY IF EXISTS operation_events_staff_insert ON public.operation_events;
CREATE POLICY operation_events_staff_insert ON public.operation_events
FOR INSERT TO authenticated
WITH CHECK (public.can_access_tenant(tenant_id) AND public.can_access_branch(tenant_id, branch_id));

CREATE OR REPLACE FUNCTION public.record_operation_event(
  _process_key text,
  _process_name text,
  _source_type text,
  _source_id uuid DEFAULT NULL,
  _branch_id uuid DEFAULT NULL,
  _cash_account_id uuid DEFAULT NULL,
  _journal_entry_id uuid DEFAULT NULL,
  _report_bucket text DEFAULT 'operational',
  _requires_notification boolean DEFAULT false,
  _notification_id uuid DEFAULT NULL,
  _data jsonb DEFAULT '{}'::jsonb,
  _output jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  eid uuid;
BEGIN
  tid := COALESCE(public.current_tenant_id(), (_data->>'tenant_id')::uuid);
  INSERT INTO public.operation_events(
    tenant_id, branch_id, actor_id, process_key, process_name, source_type, source_id,
    cash_account_id, journal_entry_id, report_bucket, requires_notification, notification_id,
    notification_created, data, output
  ) VALUES (
    tid, _branch_id, auth.uid(), _process_key, _process_name, _source_type, _source_id,
    _cash_account_id, _journal_entry_id, COALESCE(_report_bucket, 'operational'), COALESCE(_requires_notification, false), _notification_id,
    _notification_id IS NOT NULL, COALESCE(_data, '{}'::jsonb), COALESCE(_output, '{}'::jsonb)
  ) RETURNING id INTO eid;
  RETURN eid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_operation_event(text,text,text,uuid,uuid,uuid,uuid,text,boolean,uuid,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE VIEW public.operation_answer_matrix AS
SELECT
  oe.id,
  oe.created_at,
  oe.tenant_id,
  oe.branch_id,
  b.name AS branch_name,
  oe.actor_id,
  oe.process_key,
  oe.process_name,
  oe.source_type,
  oe.source_id,
  oe.cash_account_id,
  ca.name AS cash_account_name,
  COALESCE(oe.journal_entry_id, je.id) AS journal_entry_id,
  oe.report_bucket,
  oe.notification_id,
  oe.requires_notification,
  CASE WHEN oe.branch_id IS NOT NULL THEN 'answered' ELSE 'missing_branch' END AS branch_answer,
  CASE WHEN oe.cash_account_id IS NOT NULL THEN 'answered' WHEN COALESCE((oe.output->>'cash_impact')::boolean, false) = false THEN 'not_applicable' ELSE 'missing_cash_account' END AS cash_answer,
  CASE WHEN COALESCE(oe.journal_entry_id, je.id) IS NOT NULL THEN 'answered' WHEN COALESCE((oe.output->>'journal_required')::boolean, false) = false THEN 'not_applicable' ELSE 'missing_journal' END AS journal_answer,
  CASE WHEN oe.report_bucket IS NOT NULL AND oe.report_bucket <> '' THEN 'answered' ELSE 'missing_report_bucket' END AS report_answer,
  CASE WHEN oe.requires_notification = false THEN 'not_required' WHEN oe.notification_id IS NOT NULL THEN 'answered' ELSE 'missing_notification' END AS notification_answer,
  oe.data,
  oe.output
FROM public.operation_events oe
LEFT JOIN public.branches b ON b.id = oe.branch_id
LEFT JOIN public.cash_accounts ca ON ca.id = oe.cash_account_id
LEFT JOIN public.journal_entries je ON je.tenant_id = oe.tenant_id AND je.source_type = oe.source_type AND je.source_id = oe.source_id AND je.status <> 'void';

GRANT SELECT ON public.operation_answer_matrix TO authenticated;

CREATE OR REPLACE FUNCTION public.set_pickup_default_branch_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.branch_id IS NULL AND NEW.converted_order_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id FROM public.orders WHERE id = NEW.converted_order_id;
  END IF;
  IF NEW.branch_id IS NULL THEN
    NEW.branch_id := COALESCE(public.current_employee_branch_id(), public.default_branch_id_for(public.current_tenant_id()));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pickup_requests_default_branch ON public.pickup_requests;
CREATE TRIGGER trg_pickup_requests_default_branch
BEFORE INSERT OR UPDATE OF converted_order_id, branch_id ON public.pickup_requests
FOR EACH ROW EXECUTE FUNCTION public.set_pickup_default_branch_id();
