
-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  description text,
  spent_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_staff_select ON public.expenses
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY expenses_staff_insert ON public.expenses
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY expenses_owner_update ON public.expenses
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'));
CREATE POLICY expenses_owner_delete ON public.expenses
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'));

-- Advance requests
CREATE TYPE advance_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.advance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  technician_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text,
  status advance_status NOT NULL DEFAULT 'pending',
  requested_by uuid,
  decided_by uuid,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY adv_staff_select ON public.advance_requests
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY adv_staff_insert ON public.advance_requests
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY adv_owner_update ON public.advance_requests
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'));
CREATE POLICY adv_owner_delete ON public.advance_requests
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'));

CREATE TRIGGER advance_requests_touch
BEFORE UPDATE ON public.advance_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_expenses_spent_at ON public.expenses(spent_at DESC);
CREATE INDEX idx_adv_status ON public.advance_requests(status, created_at DESC);
