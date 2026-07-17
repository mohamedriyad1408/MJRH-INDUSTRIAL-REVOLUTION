-- MJRH V2 — Financial audit view cleanup after payroll journal repair
-- Date: 2026-06-27

-- Cancelled orders should not keep posted order_payment cash transactions.
UPDATE public.cash_transactions ct
SET status = 'void'
FROM public.orders o
WHERE ct.source_type = 'order_payment'
  AND ct.source_id = o.id
  AND o.status = 'cancelled'
  AND ct.status <> 'void';

UPDATE public.journal_entries je
SET status = 'void', updated_at = now()
FROM public.orders o
WHERE je.source_type IN ('order_payment','order_receivable')
  AND je.source_id = o.id
  AND o.status = 'cancelled'
  AND je.status <> 'void';

CREATE OR REPLACE VIEW public.financial_operation_audit AS
SELECT
  o.tenant_id,
  o.branch_id,
  'finance'::text AS domain,
  'paid_order_missing_cash_tx'::text AS issue_key,
  'طلب مدفوع بلا حركة خزنة'::text AS title,
  ('طلب #' || COALESCE(o.order_number::text, o.id::text) || ' مسجل مدفوع ولا توجد له حركة خزنة order_payment')::text AS detail,
  '/orders/' || o.id::text AS href,
  'order'::text AS source_type,
  o.id AS source_id,
  'danger'::text AS severity,
  o.updated_at AS created_at
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND o.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM public.cash_transactions ct
    WHERE ct.tenant_id = o.tenant_id AND ct.source_type = 'order_payment' AND ct.source_id = o.id AND COALESCE(ct.status,'posted') <> 'void'
  )
UNION ALL
SELECT
  o.tenant_id,
  o.branch_id,
  'accounting',
  'paid_order_missing_journal',
  'طلب مدفوع بلا قيد تحصيل',
  ('طلب #' || COALESCE(o.order_number::text, o.id::text) || ' مدفوع ولا يوجد له قيد order_payment'),
  '/orders/' || o.id::text,
  'order',
  o.id,
  'danger',
  o.updated_at
FROM public.orders o
WHERE o.payment_status = 'paid'
  AND o.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = o.tenant_id AND je.source_type = 'order_payment' AND je.source_id = o.id AND je.status <> 'void'
  )
UNION ALL
SELECT
  o.tenant_id,
  o.branch_id,
  'accounting',
  'receivable_order_missing_journal',
  'طلب آجل بلا قيد ذمة',
  ('طلب #' || COALESCE(o.order_number::text, o.id::text) || ' غير مدفوع ولا يوجد له قيد ذمة order_receivable'),
  '/orders/' || o.id::text,
  'order',
  o.id,
  'warn',
  o.created_at
FROM public.orders o
WHERE o.payment_status <> 'paid'
  AND o.status <> 'cancelled'
  AND COALESCE(o.total,0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = o.tenant_id AND je.source_type = 'order_receivable' AND je.source_id = o.id AND je.status <> 'void'
  )
UNION ALL
SELECT
  e.tenant_id,
  e.branch_id,
  'finance',
  'paid_expense_missing_cash_account',
  'مصروف مدفوع بلا خزنة',
  COALESCE(e.description, 'مصروف') || ' — ' || COALESCE(e.amount,0)::text,
  '/finance',
  'expense',
  e.id,
  'danger',
  e.spent_at
FROM public.expenses e
WHERE e.status = 'paid'
  AND e.cash_account_id IS NULL
  AND COALESCE(e.source_type,'') NOT IN ('payroll_line')
UNION ALL
SELECT
  e.tenant_id,
  e.branch_id,
  'accounting',
  'paid_expense_missing_journal',
  'مصروف مدفوع بلا قيد',
  COALESCE(e.description, 'مصروف') || ' — ' || COALESCE(e.amount,0)::text,
  '/ledger',
  'expense',
  e.id,
  'danger',
  e.spent_at
FROM public.expenses e
WHERE e.status = 'paid'
  AND NOT (
    COALESCE(e.source_type,'') IN ('payroll_line','auto_payroll_line')
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.tenant_id = e.tenant_id
        AND je.source_type = 'payroll_payment'
        AND je.source_id = e.source_id
        AND je.status <> 'void'
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = e.tenant_id AND je.source_type = 'expense_payment' AND je.source_id = e.id AND je.status <> 'void'
  )
UNION ALL
SELECT
  e.tenant_id,
  e.branch_id,
  'accounting',
  'payable_expense_missing_journal',
  'مصروف آجل بلا قيد استحقاق',
  COALESCE(e.description, 'مصروف آجل') || ' — ' || COALESCE(e.amount,0)::text,
  '/ledger',
  'expense',
  e.id,
  'warn',
  e.spent_at
FROM public.expenses e
WHERE e.status = 'payable'
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = e.tenant_id AND je.source_type = 'expense_payable' AND je.source_id = e.id AND je.status <> 'void'
  )
UNION ALL
SELECT
  ct.tenant_id,
  ca.branch_id,
  'accounting',
  'cash_tx_missing_journal',
  'حركة خزنة بلا قيد',
  COALESCE(ct.description, 'حركة خزنة') || ' — ' || COALESCE(ct.amount,0)::text,
  '/accounting',
  'cash_transaction',
  ct.id,
  'danger',
  ct.happened_at
FROM public.cash_transactions ct
LEFT JOIN public.cash_accounts ca ON ca.id = ct.cash_account_id
WHERE COALESCE(ct.status,'posted') <> 'void'
  AND COALESCE(ct.source_type,'manual_cash_transaction') IN ('manual_cash_transaction','expense','employee_advance','payroll_payment','order_payment')
  AND NOT (
    ct.source_type = 'order_payment'
    AND EXISTS (SELECT 1 FROM public.orders xo WHERE xo.id = ct.source_id AND xo.status = 'cancelled')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.tenant_id = ct.tenant_id
      AND je.source_id = COALESCE(ct.source_id, ct.id)
      AND je.status <> 'void'
      AND je.source_type IN ('manual_cash_transaction','expense_payment','order_payment','payroll_payment','employee_advance')
  )
UNION ALL
SELECT tenant_id, branch_id, 'readiness', 'order_missing_branch', 'طلب بلا فرع', 'طلب #' || COALESCE(order_number::text, id::text), '/orders/' || id::text, 'order', id, 'danger', created_at
FROM public.orders WHERE branch_id IS NULL AND status <> 'cancelled'
UNION ALL
SELECT tenant_id, branch_id, 'readiness', 'cash_account_missing_branch', 'خزنة بلا فرع', name, '/accounting', 'cash_account', id, 'danger', created_at
FROM public.cash_accounts WHERE branch_id IS NULL AND is_active = true
UNION ALL
SELECT tenant_id, branch_id, 'readiness', 'inventory_item_missing_branch', 'صنف مخزون بلا فرع', name, '/inventory', 'inventory_item', id, 'warn', created_at
FROM public.inventory_items WHERE branch_id IS NULL AND is_active = true;;

GRANT SELECT ON public.financial_operation_audit TO authenticated;

UPDATE public.cash_accounts ca
SET current_balance = public.cash_account_expected_balance(ca.id), updated_at = now();
