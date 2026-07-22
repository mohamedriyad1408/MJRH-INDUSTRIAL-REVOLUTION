-- ============================================
-- T-032: Performance Optimization Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON public.orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_tenant ON public.orders(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_units_order_id ON public.service_units(order_id);
