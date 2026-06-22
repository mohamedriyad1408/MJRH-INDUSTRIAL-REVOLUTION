-- Employee attendance: low-cost check in/out for all staff.

CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_at timestamptz NOT NULL DEFAULT now(),
  check_out_at timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  check_out_lat double precision,
  check_out_lng double precision,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_attendance_employee_date_idx ON public.employee_attendance(employee_id, work_date DESC);
CREATE INDEX IF NOT EXISTS employee_attendance_tenant_date_idx ON public.employee_attendance(tenant_id, work_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS employee_attendance_one_open_shift_idx
ON public.employee_attendance(employee_id)
WHERE check_out_at IS NULL;

ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_attendance_tenant_select ON public.employee_attendance;
CREATE POLICY employee_attendance_tenant_select ON public.employee_attendance
FOR SELECT TO authenticated
USING (public.can_access_tenant(tenant_id));

DROP POLICY IF EXISTS employee_attendance_tenant_insert ON public.employee_attendance;
CREATE POLICY employee_attendance_tenant_insert ON public.employee_attendance
FOR INSERT TO authenticated
WITH CHECK (public.can_access_tenant(tenant_id));

DROP POLICY IF EXISTS employee_attendance_tenant_update ON public.employee_attendance;
CREATE POLICY employee_attendance_tenant_update ON public.employee_attendance
FOR UPDATE TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));

CREATE OR REPLACE FUNCTION public.set_employee_attendance_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.employees WHERE id = NEW.employee_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_attendance_tenant ON public.employee_attendance;
CREATE TRIGGER trg_employee_attendance_tenant
BEFORE INSERT OR UPDATE ON public.employee_attendance
FOR EACH ROW EXECUTE FUNCTION public.set_employee_attendance_tenant();
