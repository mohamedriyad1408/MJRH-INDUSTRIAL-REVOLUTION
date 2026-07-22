-- ============================================
-- T-007: تفعيل فحص الجودة (QC Logic)
-- ============================================

-- 1. إضافة أعمدة QC إلى جدول orders
DO $$ 
BEGIN
  -- qc_status added in Sprint 0, just adding constraint if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qc_status') THEN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_qc_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_qc_status_check CHECK (qc_status IN ('PASSED', 'FAILED', 'Pending'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qc_notes') THEN
    ALTER TABLE public.orders ADD COLUMN qc_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qc_checked_by') THEN
    ALTER TABLE public.orders ADD COLUMN qc_checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qc_checked_at') THEN
    ALTER TABLE public.orders ADD COLUMN qc_checked_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. إضافة قيد لمنع التسليم بدون QC أو مع QC فاشل
-- POL-001: No Delivery Before QC
CREATE OR REPLACE FUNCTION public.check_order_ready_for_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كانت الحالة الجديدة هي READY أو DELIVERED
    IF NEW.status IN ('ready', 'delivered') THEN
        -- تحقق من وجود qc_status
        IF NEW.qc_status IS NULL OR NEW.qc_status = 'Pending' THEN
            RAISE EXCEPTION 'POL-001: لا يمكن التسليم قبل إجراء فحص الجودة (qc_status مطلوب)';
        END IF;
        -- تحقق من أن qc_status = PASSED
        IF NEW.qc_status != 'PASSED' THEN
            RAISE EXCEPTION 'POL-001: لا يمكن التسليم والطلب لم يجتز فحص الجودة (qc_status = %)', NEW.qc_status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق القيد على عمليات UPDATE على جدول orders
DROP TRIGGER IF EXISTS enforce_qc_before_delivery ON public.orders;
CREATE TRIGGER enforce_qc_before_delivery
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_order_ready_for_delivery();

-- 3. تحديث جدول event_log (إضافة أعمدة للمساعدة في التتبع إذا لم تكن موجودة)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_log' AND column_name = 'occurred_at') THEN
    ALTER TABLE public.event_log ADD COLUMN occurred_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 4. إنشاء فهرس لـ qc_status لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_orders_qc_status ON public.orders(qc_status);
CREATE INDEX IF NOT EXISTS idx_orders_qc_checked_at ON public.orders(qc_checked_at);
