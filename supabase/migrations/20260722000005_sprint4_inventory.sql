-- ============================================
-- T-017: Inventory Management
-- ============================================

-- 1. جدول الموردين
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. جدول المخزون
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    min_quantity DECIMAL(12, 2) DEFAULT 0,
    max_quantity DECIMAL(12, 2) DEFAULT 0,
    cost_per_unit DECIMAL(12, 2) DEFAULT 0,
    location TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'low_stock', 'out_of_stock', 'discontinued')),
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. جدول حركة المخزون
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('restock', 'consume', 'adjustment', 'return')),
    quantity DECIMAL(12, 2) NOT NULL,
    previous_quantity DECIMAL(12, 2) NOT NULL,
    new_quantity DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. فهارس
CREATE INDEX idx_inventory_tenant_id ON inventory(tenant_id);
CREATE INDEX idx_inventory_supplier_id ON inventory(supplier_id);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_transactions_inventory_id ON inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_order_id ON inventory_transactions(order_id);

-- 5. RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
