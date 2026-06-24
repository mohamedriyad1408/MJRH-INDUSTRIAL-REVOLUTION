-- MJRH V2: operational intelligence foundation + QC + inventory/equipment + CRM loyalty/messages + tenant billing
-- Designed as additive, tenant-safe extensions. No destructive changes.

-- ============ QC CHECKS ============
CREATE TABLE IF NOT EXISTS public.qc_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  service_unit_id uuid REFERENCES public.service_units(id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('passed','reclean','repair','lost','damaged')),
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('low','normal','high','critical')),
  notes text,
  photo_url text,
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qc_checks_tenant_idx ON public.qc_checks(tenant_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS qc_checks_order_idx ON public.qc_checks(order_id);
CREATE INDEX IF NOT EXISTS qc_checks_unit_idx ON public.qc_checks(service_unit_id);
ALTER TABLE public.qc_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qc_checks_tenant_all ON public.qc_checks;
CREATE POLICY qc_checks_tenant_all ON public.qc_checks
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qc_checks TO authenticated;
GRANT ALL ON public.qc_checks TO service_role;

-- ============ INVENTORY ============
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text NOT NULL DEFAULT 'consumable',
  unit text NOT NULL DEFAULT 'وحدة',
  current_qty numeric(12,2) NOT NULL DEFAULT 0,
  reorder_level numeric(12,2) NOT NULL DEFAULT 0,
  avg_unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  supplier text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS inventory_items_tenant_idx ON public.inventory_items(tenant_id, is_active);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_items_tenant_all ON public.inventory_items;
CREATE POLICY inventory_items_tenant_all ON public.inventory_items
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase','usage','adjustment','waste','return')),
  qty numeric(12,2) NOT NULL,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_movements_tenant_idx ON public.inventory_movements(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_item_idx ON public.inventory_movements(item_id, created_at DESC);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_movements_tenant_all ON public.inventory_movements;
CREATE POLICY inventory_movements_tenant_all ON public.inventory_movements
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;

CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  delta numeric;
BEGIN
  delta := CASE NEW.movement_type
    WHEN 'purchase' THEN NEW.qty
    WHEN 'return' THEN NEW.qty
    WHEN 'usage' THEN -NEW.qty
    WHEN 'waste' THEN -NEW.qty
    ELSE NEW.qty
  END;

  UPDATE public.inventory_items
  SET current_qty = current_qty + delta,
      avg_unit_cost = CASE WHEN NEW.movement_type = 'purchase' AND NEW.unit_cost > 0 THEN NEW.unit_cost ELSE avg_unit_cost END,
      updated_at = now()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_apply_inventory_movement ON public.inventory_movements;
CREATE TRIGGER trg_apply_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_movement();

-- ============ EQUIPMENT ============
CREATE TABLE IF NOT EXISTS public.equipment_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'machine',
  serial_no text,
  status text NOT NULL DEFAULT 'working' CHECK (status IN ('working','needs_service','out_of_service','retired')),
  purchase_date date,
  purchase_cost numeric(12,2) NOT NULL DEFAULT 0,
  last_maintenance_at date,
  next_maintenance_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS equipment_assets_tenant_idx ON public.equipment_assets(tenant_id, status);
ALTER TABLE public.equipment_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_assets_tenant_all ON public.equipment_assets;
CREATE POLICY equipment_assets_tenant_all ON public.equipment_assets
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_assets TO authenticated;
GRANT ALL ON public.equipment_assets TO service_role;

-- ============ CRM: LOYALTY + MESSAGES ============
CREATE TABLE IF NOT EXISTS public.customer_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic','silver','gold','vip')),
  lifetime_spend numeric(12,2) NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, customer_id)
);
CREATE INDEX IF NOT EXISTS customer_loyalty_tenant_idx ON public.customer_loyalty(tenant_id, points DESC);
ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_loyalty_tenant_all ON public.customer_loyalty;
CREATE POLICY customer_loyalty_tenant_all ON public.customer_loyalty
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_loyalty TO authenticated;
GRANT ALL ON public.customer_loyalty TO service_role;

CREATE TABLE IF NOT EXISTS public.customer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','sms','email','call')),
  template_key text,
  phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','sent','failed')),
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_messages_tenant_idx ON public.customer_messages(tenant_id, created_at DESC);
ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_messages_tenant_all ON public.customer_messages;
CREATE POLICY customer_messages_tenant_all ON public.customer_messages
FOR ALL TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_messages TO authenticated;
GRANT ALL ON public.customer_messages TO service_role;

-- ============ SAAS BILLING ============
CREATE TABLE IF NOT EXISTS public.tenant_billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','paid','overdue','void')),
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS tenant_billing_invoices_tenant_idx ON public.tenant_billing_invoices(tenant_id, status, due_date);
ALTER TABLE public.tenant_billing_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_billing_invoices_super_all ON public.tenant_billing_invoices;
CREATE POLICY tenant_billing_invoices_super_all ON public.tenant_billing_invoices
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS tenant_billing_invoices_tenant_read ON public.tenant_billing_invoices;
CREATE POLICY tenant_billing_invoices_tenant_read ON public.tenant_billing_invoices
FOR SELECT TO authenticated
USING (public.can_access_tenant(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_billing_invoices TO authenticated;
GRANT ALL ON public.tenant_billing_invoices TO service_role;

-- Shared updated_at triggers
DROP TRIGGER IF EXISTS trg_inventory_items_upd ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_upd BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_equipment_assets_upd ON public.equipment_assets;
CREATE TRIGGER trg_equipment_assets_upd BEFORE UPDATE ON public.equipment_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_tenant_billing_invoices_upd ON public.tenant_billing_invoices;
CREATE TRIGGER trg_tenant_billing_invoices_upd BEFORE UPDATE ON public.tenant_billing_invoices
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
