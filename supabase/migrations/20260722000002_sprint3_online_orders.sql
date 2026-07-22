-- ============================================
-- T-011: Online Order Flow
-- ============================================

-- 1. إضافة عمود queue_status للطلبات الأونلاين
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'queue_status') THEN
    ALTER TABLE public.orders ADD COLUMN queue_status TEXT DEFAULT 'PENDING';
    -- Adding check constraint separately for robustness
    ALTER TABLE public.orders ADD CONSTRAINT orders_queue_status_check CHECK (queue_status IN ('PENDING', 'IN_QUEUE', 'RECEIVED'));
  END IF;
END $$;

-- 2. إضافة عمود source_metadata للبيانات الإضافية
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'source_metadata') THEN
    ALTER TABLE public.orders ADD COLUMN source_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 3. إضافة عمود source إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'source') THEN
    ALTER TABLE public.orders ADD COLUMN source TEXT DEFAULT 'WALK_IN';
  END IF;
END $$;

-- 4. إضافة فهرس لـ queue_status
CREATE INDEX IF NOT EXISTS idx_orders_queue_status ON public.orders(queue_status) WHERE source = 'ONLINE';
