import { supabase } from "@/integrations/supabase/client";

// ============================================
// T-009: Observability (Dashboard Stats)
// ============================================

export interface DashboardStats {
  totalOrders: number;
  ordersByStatus: {
    status: string;
    count: number;
  }[];
  recentEvents: {
    id: string;
    event_type: string;
    occurred_at: string;
    order_id?: string;
    payload: any;
  }[];
  qcStats: {
    passed: number;
    failed: number;
    pending: number;
  };
}

export async function fetchDashboardStats(
  tenantId: string
): Promise<DashboardStats | null> {
  try {
    // 1. إجمالي الطلبات
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // 2. توزيع الطلبات حسب الحالة
    const { data: ordersData } = await supabase
      .from('orders')
      .select('status')
      .eq('tenant_id', tenantId);

    const statusCounts: Record<string, number> = {};
    ordersData?.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    
    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // 3. الأحداث الأخيرة (آخر 20)
    const { data: recentEvents } = await supabase
      .from('event_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('occurred_at', { ascending: false })
      .limit(20);

    // 4. إحصائيات QC
    const { data: qcData } = await supabase
      .from('orders')
      .select('qc_status')
      .eq('tenant_id', tenantId);

    const qcStats = {
      passed: 0,
      failed: 0,
      pending: 0,
    };
    qcData?.forEach((row) => {
      if (row.qc_status === 'PASSED') qcStats.passed++;
      else if (row.qc_status === 'FAILED') qcStats.failed++;
      else qcStats.pending++;
    });

    return {
      totalOrders: totalOrders || 0,
      ordersByStatus,
      recentEvents: (recentEvents as any) || [],
      qcStats,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return null;
  }
}
