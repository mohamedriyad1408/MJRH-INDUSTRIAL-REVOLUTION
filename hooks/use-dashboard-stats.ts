import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ✅ Phase 3: Shared hook — used by Dashboard, Ops, CS, Manager
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    refetchInterval: 60_000, // real-time: refresh every minute
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const now = new Date().toISOString();
      const todayIso = today.toISOString();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [ordersRes, expensesRes, employeesRes, pickupsRes] = await Promise.all([
        supabase.from("orders").select("id,status,total,is_urgent,created_at,promised_delivery_at,payment_method,payment_status,order_type"),
        supabase.from("expenses").select("amount,category,spent_at").gte("spent_at", monthStart),
        supabase.from("employees").select("id,full_name,job_role,is_active").eq("is_active", true),
        supabase.from("pickup_requests").select("id,status").in("status", ["pending", "assigned"]),
      ]);

      const orders = ordersRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const employees = employeesRes.data ?? [];
      const pickups = pickupsRes.data ?? [];

      const todayOrders = orders.filter((o) => o.created_at >= todayIso);
      const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
      const urgent = active.filter((o) => o.is_urgent);
      const late = active.filter((o) => o.promised_delivery_at && o.promised_delivery_at < now);
      const delivered = orders.filter((o) => o.status === "delivered");
      const monthOrders = orders.filter((o) => o.created_at >= monthStart);

      const revToday = todayOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const revMonth = monthOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const cashToday = todayOrders.filter((o) => o.payment_method === "cash").reduce((s, o) => s + Number(o.total ?? 0), 0);
      const instaToday = todayOrders.filter((o) => o.payment_method === "instapay").reduce((s, o) => s + Number(o.total ?? 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
      const netProfit = revMonth - totalExpenses;

      // Station breakdown
      const stations: Record<string, number> = {
        received: 0, cleaning: 0, ironing: 0, packing: 0, ready: 0, out_for_delivery: 0,
      };
      active.forEach((o) => { if (o.status in stations) stations[o.status]++; });

      return {
        todayCount: todayOrders.length,
        urgent: urgent.length,
        delivered: delivered.length,
        late: late.length,
        active: active.length,
        revToday, revMonth, cashToday, instaToday,
        totalExpenses, netProfit,
        stations,
        employeeCount: employees.length,
        activePickups: pickups.length,
      };
    },
  });
}
