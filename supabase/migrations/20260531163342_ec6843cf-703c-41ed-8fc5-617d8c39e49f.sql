
-- Employees table (replaces/extends technicians for full staff management)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID,  -- nullable: links to auth user if they log in
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  job_title TEXT NOT NULL,
  role app_role,  -- nullable for non-system staff
  station service_type,  -- for technicians
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  monthly_salary NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_staff_select ON public.employees FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));
CREATE POLICY emp_owner_insert ON public.employees FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY emp_owner_update ON public.employees FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY emp_owner_delete ON public.employees FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER trg_employees_touch BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Work schedules: weekly recurring shifts
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, day_of_week)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
GRANT ALL ON public.work_schedules TO service_role;

ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_staff_select ON public.work_schedules FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));
CREATE POLICY ws_managers_write ON public.work_schedules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'ops_manager') OR has_role(auth.uid(), 'cs_manager'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'ops_manager') OR has_role(auth.uid(), 'cs_manager'));

CREATE TRIGGER trg_ws_touch BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Leave request status enum
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.leave_type AS ENUM ('annual', 'sick', 'unpaid', 'emergency');

CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  leave_type leave_type NOT NULL DEFAULT 'annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  requested_by UUID,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY lr_staff_select ON public.leave_requests FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));
CREATE POLICY lr_staff_insert ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));
CREATE POLICY lr_managers_update ON public.leave_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'ops_manager') OR has_role(auth.uid(), 'cs_manager'));
CREATE POLICY lr_owner_delete ON public.leave_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_lr_touch BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Holidays (company-wide)
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY hol_staff_select ON public.holidays FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));
CREATE POLICY hol_owner_write ON public.holidays FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'))
  WITH CHECK (has_role(auth.uid(), 'owner'));

-- Link advance_requests to employees
ALTER TABLE public.advance_requests ADD COLUMN IF NOT EXISTS employee_id UUID;
