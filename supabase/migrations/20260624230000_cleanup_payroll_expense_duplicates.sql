-- Clean duplicate payroll expenses created while payroll flow was being refined.
-- Keeps the current automatic monthly payroll expense and voids older legacy payroll_line expenses for the same employee/month.

UPDATE public.expenses old
SET status = 'void',
    description = COALESCE(old.description, '') || ' [ملغي تلقائيًا: تكرار راتب شهري]'
WHERE old.category = 'salaries'
  AND old.source_type = 'payroll_line'
  AND COALESCE(old.status, 'paid') <> 'void'
  AND EXISTS (
    SELECT 1
    FROM public.expenses newer
    WHERE newer.tenant_id = old.tenant_id
      AND newer.employee_id IS NOT DISTINCT FROM old.employee_id
      AND newer.category = 'salaries'
      AND newer.source_type = 'auto_payroll_line'
      AND date_trunc('month', newer.spent_at) = date_trunc('month', old.spent_at)
      AND COALESCE(newer.status, 'paid') <> 'void'
  );

-- A safer helper for dashboards: active expenses only.
CREATE OR REPLACE VIEW public.v_active_expenses AS
SELECT *
FROM public.expenses
WHERE COALESCE(status, 'paid') <> 'void';
GRANT SELECT ON public.v_active_expenses TO authenticated;
