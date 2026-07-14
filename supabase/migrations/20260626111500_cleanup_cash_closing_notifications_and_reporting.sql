-- Clean stale cash-closing warnings and keep reporting interpretation simple.
-- If all active safes were closed for today, any old "not closed" warnings are marked read.

DO $$
DECLARE
  r record;
  today date := CURRENT_DATE;
  active_count int;
  closed_count int;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    SELECT COUNT(*) INTO active_count FROM public.cash_accounts WHERE tenant_id = r.id AND is_active;
    SELECT COUNT(*) INTO closed_count FROM public.daily_cash_closings WHERE tenant_id = r.id AND closing_date = today;
    IF active_count > 0 AND closed_count >= active_count THEN
      UPDATE public.app_notifications
      SET read_at = COALESCE(read_at, now())
      WHERE tenant_id = r.id
        AND read_at IS NULL
        AND (
          title ILIKE '%الخزنة لم تقفل%'
          OR title ILIKE '%الخزن لم تكتمل%'
          OR body ILIKE '%الخزنة لم تقفل%'
          OR body ILIKE '%إقفال الخزنة: لم%'
        );
    END IF;
  END LOOP;
END $$;
