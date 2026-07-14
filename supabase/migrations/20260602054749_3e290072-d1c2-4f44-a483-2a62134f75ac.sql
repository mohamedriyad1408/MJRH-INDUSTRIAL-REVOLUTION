
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.user_roles
  WHERE user_id = auth.uid() AND tenant_id IS NOT NULL
  LIMIT 1
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'customers','orders','order_items','order_status_history',
    'service_items','employees','work_schedules','leave_requests',
    'holidays','advance_requests','expenses','technicians'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()',
      t
    );
  END LOOP;
END $$;
