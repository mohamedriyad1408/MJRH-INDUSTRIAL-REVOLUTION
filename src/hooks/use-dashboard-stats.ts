import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats(tenantSlug?: string) {
  const isLegacy = tenantSlug === "dry-tech" || tenantSlug === "laundry-showcase";

  return useQuery({
    queryKey: ["dashboard-stats", tenantSlug],
    refetchInterval: 30_000, 
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      if (isLegacy) {
        const [ordersRes, expensesRes, employeesRes, pickupsRes] = await Promise.all([
            supabase.from("orders").select("id,status,total,is_urgent,created_at,promised_delivery_at"),
            supabase.from("expenses").select("amount,category,spent_at").gte("spent_at", monthStart),
            supabase.from("employees").select("id,is_active").eq("is_active", true),
            supabase.from("pickup_requests").select("id").in("status", ["pending", "assigned"]),
        ]);

        const orders: any[] = ordersRes.data ?? [];
        const expenses: any[] = expensesRes.data ?? [];
        const employees: any[] = employeesRes.data ?? [];
        const now = new Date().toISOString();

        const todayOrders = orders.filter((o: any) => o.created_at >= todayIso);
        const active = orders.filter((o: any) => !["delivered", "cancelled"].includes(o.status));
        const revToday = todayOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
        const revMonth = orders.filter(o => o.created_at >= monthStart).reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
        const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);

        return {
            todayCount: todayOrders.length,
            urgent: active.filter(o => o.is_urgent).length,
            delivered: orders.filter(o => o.status === "delivered" && o.created_at >= todayIso).length,
            late: active.filter((o: any) => o.promised_delivery_at && o.promised_delivery_at < now).length,
            active: active.length,
            revToday, revMonth,
            cashToday: revToday,
            totalExpenses,
            netProfit: revMonth - totalExpenses,
            employeeCount: employees.length,
            activePickups: pickupsRes.data?.length || 0,
            stations: { received: 0, cleaning: 0, ironing: 0, packing: 0, ready: 0 } as Record<string, number>,
            attention: [] as any[]
        };
      }

      return {
        todayCount: 0,
        urgent: 0,
        delivered: 0,
        late: 0,
        active: 0,
        revToday: 0, revMonth: 0,
        cashToday: 0,
        totalExpenses: 0,
        netProfit: 0,
        employeeCount: 0,
        activePickups: 0,
        stations: { received: 0, cleaning: 0, ironing: 0, packing: 0, ready: 0 } as Record<string, number>,
        attention: [] as any[]
      };
    },
  });
}
