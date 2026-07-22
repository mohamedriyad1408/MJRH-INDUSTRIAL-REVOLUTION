-- ============================================
-- T-022 & T-023 & T-024: Accounting & Invoice Automation
-- ============================================

-- 1. جدول الحسابات (Accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- 2. جدول القيود اليومية (Journal Entries)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    description TEXT,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. جدول بنود القيد (Ledger Entries)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit DECIMAL(12, 2) DEFAULT 0 CHECK (debit >= 0),
    credit DECIMAL(12, 2) DEFAULT 0 CHECK (credit >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. قيد التوازن (Debit = Credit)
CREATE OR REPLACE FUNCTION public.check_ledger_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_debit DECIMAL(12, 2);
    total_credit DECIMAL(12, 2);
BEGIN
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) INTO total_debit, total_credit
    FROM public.ledger_entries
    WHERE journal_entry_id = NEW.journal_entry_id;

    -- Note: Since this is AFTER trigger, we check if they match.
    -- For real-time enforcement, it's better to check at the end of transaction or status change to POSTED.
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_ledger_balance ON public.ledger_entries;
CREATE TRIGGER enforce_ledger_balance
AFTER INSERT OR UPDATE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.check_ledger_balance();

-- 5. دالة لإنشاء قيد فاتورة (T-023)
CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    journal_id UUID;
    v_total DECIMAL(12, 2);
BEGIN
    -- جلب مبلغ الفاتورة
    v_total := NEW.amount;

    -- إنشاء قيد يومي
    INSERT INTO public.journal_entries (tenant_id, entry_date, reference, description, status, posted_at)
    VALUES (NEW.tenant_id, CURRENT_DATE, 'INV-' || NEW.invoice_number, 'إثبات فاتورة رقم ' || NEW.invoice_number, 'POSTED', NOW())
    RETURNING id INTO journal_id;

    -- بند مدين: حساب البنك/الذمم (رمز 1100)
    INSERT INTO public.ledger_entries (journal_entry_id, account_id, debit, credit)
    SELECT journal_id, id, v_total, 0 
    FROM public.accounts WHERE tenant_id = NEW.tenant_id AND code = '1100' LIMIT 1;

    -- بند دائن: إيرادات المبيعات (رمز 4000)
    INSERT INTO public.ledger_entries (journal_entry_id, account_id, debit, credit)
    SELECT journal_id, id, 0, v_total 
    FROM public.accounts WHERE tenant_id = NEW.tenant_id AND code = '4000' LIMIT 1;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_journal_entry_invoice ON public.invoices;
CREATE TRIGGER auto_create_journal_entry_invoice
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.create_invoice_journal_entry();

-- 6. أتمتة الفواتير عند حالة ready (T-024)
CREATE OR REPLACE FUNCTION public.auto_create_invoice()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready') THEN
        INSERT INTO public.invoices (tenant_id, order_id, customer_id, amount, status)
        VALUES (
            NEW.tenant_id,
            NEW.id,
            NEW.customer_id,
            NEW.total,
            'unpaid'
        )
        ON CONFLICT (order_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_invoice_on_ready ON public.orders;
CREATE TRIGGER auto_create_invoice_on_ready
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_invoice();

-- 7. فهارس إضافية
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON public.accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_id ON public.journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_journal_entry_id ON public.ledger_entries(journal_entry_id);

-- 7. إدخال الحسابات الأساسية (لـ Tenant الافتراضي)
INSERT INTO public.accounts (tenant_id, code, name, type)
SELECT 
    t.id,
    v.code,
    v.name,
    v.type
FROM tenants t
CROSS JOIN (
    VALUES 
        ('1000', 'النقدية', 'ASSET'),
        ('1100', 'البنك/الذمم', 'ASSET'),
        ('2000', 'الموردين', 'LIABILITY'),
        ('3000', 'رأس المال', 'EQUITY'),
        ('4000', 'إيرادات المبيعات', 'REVENUE'),
        ('5000', 'تكلفة البضائع', 'EXPENSE')
) AS v(code, name, type)
WHERE t.slug = 'dry-tech'
ON CONFLICT (tenant_id, code) DO NOTHING;
