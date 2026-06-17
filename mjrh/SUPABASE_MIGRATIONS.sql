-- ============================================================
-- MJRH — Supabase Migrations
-- Run these in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add user_id to employees (link auth user to employee record)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- 2. Add driver location fields to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- 3. Add public_token to orders (for customer tracking)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_token TEXT DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_token ON orders(public_token);

-- 4. Add promised_delivery_at to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promised_delivery_at TIMESTAMPTZ;

-- 5. Order attachments table (customer photos + internal photos)
CREATE TABLE IF NOT EXISTS order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  source TEXT DEFAULT 'customer', -- 'customer' | 'internal'
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE order_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_access" ON order_attachments USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));

-- 6. Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'weekly'
  year INT NOT NULL,
  month INT,
  week INT,
  expected_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_access" ON budgets USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));

-- 7. Budget items table (expense line items)
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual NUMERIC(12,2),
  notes TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_access" ON budget_items USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));

-- 8. Storage bucket for order photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-attachments', 'order-attachments', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'order-attachments');
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');

-- ============================================================
-- Done! 8 migrations applied.
-- ============================================================
