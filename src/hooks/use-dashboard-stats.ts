import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * MJRH — Unified Dashboard Stats (V4 Sovereign Edition)
 * Projects metrics from v4_l4 (Execution), v4_l5 (Evidence), and v4_l6 (Observability).
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats-v4"],
    refetchInterval: 30_000, 
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [workOrdersRes, auditVaultRes, actorsRes] = await Promise.all([
        supabase.from("v4_l4.work_orders" as any).select("id, status, payload, created_at"),
        supabase.from("v4_l5.v_audit_vault" as any)
          .select("fact_payload, occurred_at")
          .eq("fact_type", "ACTIVITY_COMPLETED"),
        supabase.from("v4_l2.actors" as any).select("id").eq("type", "HUMAN"),
      ]);

      const workOrders: any[] = workOrdersRes.data ?? [];
      const auditFacts: any[] = auditVaultRes.data ?? [];
      const actorCount = actorsRes.data?.length || 0;

      const todayOrders = workOrders.filter((o: any) => o.created_at >= todayIso);
      const active = workOrders.filter((o: any) => o.status === "RUNNING");
      const delivered = workOrders.filter((o: any) => o.status === "COMPLETED");

      const revToday = auditFacts
        .filter(f => f.occurred_at >= todayIso && f.fact_payload?.event === 'FINANCIAL_RECOGNITION')
        .reduce((sum, f) => sum + Number(f.fact_payload?.amount || 0), 0);

      const revMonth = auditFacts
        .filter(f => f.occurred_at >= monthStart && f.fact_payload?.event === 'FINANCIAL_RECOGNITION')
        .reduce((sum, f) => sum + Number(f.fact_payload?.amount || 0), 0);

      const attention = [
        { key: "active", label: "نبضات قيد التشغيل", count: active.length, href: "/work-orders", tone: "red" },
        { key: "delivered", label: "تم تسليمه اليوم", count: todayOrders.filter(o => o.status === 'COMPLETED').length, href: "/reports", tone: "green" },
      ].filter((x) => x.count > 0);

      const stations: Record<string, number> = {};
      active.forEach((o: any) => { 
          const key = o.status.toLowerCase();
          stations[key] = (stations[key] || 0) + 1; 
      });

      return {
        todayCount: todayOrders.length,
        urgent: active.filter(o => o.payload?.priority === 'high').length, // Mapped
        late: active.filter(o => o.payload?.sla_breached).length, // Mapped
        delivered: delivered.length,
        active: active.length,
        revToday, 
        revMonth,
        cashToday: revToday * 0.8, // Placeholder
        totalExpenses: revMonth * 0.4, // Placeholder
        netProfit: revMonth * 0.6, // Placeholder
        stations,
        employeeCount: actorCount,
        activePickups: 0, // Placeholder
        attention,
      };
    },
  });
}
