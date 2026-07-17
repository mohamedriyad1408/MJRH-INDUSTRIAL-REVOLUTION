-- Label/mark issue safety net: notify operations when a piece is marked missing/unclear.
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS source_id uuid;
CREATE INDEX IF NOT EXISTS app_notifications_source_idx ON public.app_notifications(source_type, source_id);


CREATE OR REPLACE FUNCTION public.notify_label_issue_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bid uuid;
  ord_no bigint;
BEGIN
  IF NEW.label_status IN ('missing_label','unclear_label') AND (TG_OP = 'INSERT' OR NEW.label_status IS DISTINCT FROM OLD.label_status) THEN
    SELECT branch_id, order_number INTO bid, ord_no FROM public.orders WHERE id = NEW.order_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.app_notifications
      WHERE tenant_id = NEW.tenant_id
        AND source_type = 'label_issue'
        AND source_id = NEW.id
        AND read_at IS NULL
    ) THEN
      INSERT INTO public.app_notifications(tenant_id, branch_id, audience, title, body, href, tone, source_type, source_id)
      VALUES (
        NEW.tenant_id,
        bid,
        'ops',
        'مشكلة مارك/ليبل تحتاج حل',
        'طلب #' || COALESCE(ord_no::text,'?') || ' — ' || COALESCE(NEW.label_code,'بدون كود') || ' — ' || NEW.name || ' — الحالة: ' || NEW.label_status,
        '/stations/drying-assembly',
        CASE WHEN NEW.label_status = 'missing_label' THEN 'danger' ELSE 'warning' END,
        'label_issue',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_label_issue_change ON public.service_units;
CREATE TRIGGER trg_notify_label_issue_change
AFTER INSERT OR UPDATE OF label_status ON public.service_units
FOR EACH ROW EXECUTE FUNCTION public.notify_label_issue_change();
