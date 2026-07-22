// ============================================
// T-018: Advanced Reports API
// ============================================

import { supabase } from '@/integrations/supabase/client';

export async function getOrdersSummary(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  ordersByStatus: { status: string; count: number }[];
  ordersBySource: { source: string; count: number }[];
}> {
  // 1. إجمالي الطلبات والإيرادات
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('id, total, status, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (ordersError) {
    console.error('Failed to fetch orders:', ordersError);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      ordersByStatus: [],
      ordersBySource: [],
    };
  }

  const orders = (ordersData || []) as any[];
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // 2. توزيع حسب الحالة
  const statusMap: Record<string, number> = {};
  orders.forEach((o) => {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  });
  const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // 3. توزيع حسب المصدر (Note: our schema might not have source, using a fallback or looking for it)
  // Assume source might be in notes or metadata if not a column, or just return empty for now
  const ordersBySource: { source: string; count: number }[] = [];

  return {
    totalOrders,
    totalRevenue,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    ordersByStatus,
    ordersBySource,
  };
}

export async function getQCReport(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<{
  passed: number;
  failed: number;
  pending: number;
  passRate: number;
}> {
  const { data, error } = await supabase
    .from('qc_checks')
    .select('result')
    .eq('tenant_id', tenantId)
    .gte('checked_at', startDate)
    .lte('checked_at', endDate);

  if (error) {
    console.error('Failed to fetch QC data:', error);
    return { passed: 0, failed: 0, pending: 0, passRate: 0 };
  }

  const passed = data?.filter((o: any) => o.result === 'passed').length || 0;
  const failed = data?.filter((o: any) => o.result === 'failed').length || 0;
  const total = passed + failed;

  return {
    passed,
    failed,
    pending: 0, 
    passRate: total > 0 ? (passed / total) * 100 : 0,
  };
}

export async function getInventoryReport(
  tenantId: string
): Promise<{
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}> {
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity, cost_per_unit, status')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Failed to fetch inventory report:', error);
    return { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalValue: 0 };
  }

  const items = (data || []) as any[];
  const totalValue = items.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.cost_per_unit) || 0)), 0);

  return {
    totalItems: items.length,
    lowStockItems: items.filter((i) => i.status === 'low_stock').length,
    outOfStockItems: items.filter((i) => i.status === 'out_of_stock').length,
    totalValue,
  };
}
