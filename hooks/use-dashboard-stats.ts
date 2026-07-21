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

      const [ordersRes, expensesRes, employeesRes, pickupsRes, unitsRes] = await Promise.all([
        supabase.from("orders").select("id,status,total,is_urgent,created_at,promised_delivery_at,payment_method,payment_status,order_type"),
        supabase.from("expenses").select("amount,category,spent_at").gte("spent_at", monthStart),
        supabase.from("employees").select("id,full_name,job_role,is_active").eq("is_active", true),
        supabase.from("pickup_requests").select("id,status,driver_employee_id").in("status", ["pending", "assigned"]),
        supabase.from("service_units").select("id,order_id,needs_reclean,current_stage,status"),
      ]);

      const orders: any[] = ordersRes.data ?? [];
      const expenses: any[] = expensesRes.data ?? [];
      const employees: any[] = employeesRes.data ?? [];
      const pickups: any[] = pickupsRes.data ?? [];
      const units: any[] = unitsRes.data ?? [];

      const todayOrders = orders.filter((o: any) => o.created_at >= todayIso);
      const active = orders.filter((o: any) => !["delivered", "cancelled"].includes(o.status));
      const urgent = active.filter((o: any) => o.is_urgent);
      const late = active.filter((o: any) => o.promised_delivery_at && o.promised_delivery_at < now);
      const delivered = orders.filter((o: any) => o.status === "delivered");
      const monthOrders = orders.filter((o: any) => o.created_at >= monthStart);

      const revToday = todayOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const revMonth = monthOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const cashToday = todayOrders.filter((o: any) => o.payment_method === "cash").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const instaToday = todayOrders.filter((o: any) => o.payment_method === "instapay").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
      const netProfit = revMonth - totalExpenses;

      const unitCountByOrder = new Map<string, number>();
      units.filter((u: any) => u.status !== "cancelled" && u.current_stage !== "cancelled").forEach((u: any) => unitCountByOrder.set(u.order_id, (unitCountByOrder.get(u.order_id) ?? 0) + 1));
      const recleanUnits = units.filter((u: any) => u.needs_reclean);
      const qcFailedUnits = units.filter((u: any) => u.current_stage === "qc_failed");
      const noPiecesOrders = active.filter((o: any) => !unitCountByOrder.get(o.id));
      const readyNoDriver = active.filter((o: any) => o.status === "ready" && !o.assigned_driver_employee_id);
      const unpaidOut = active.filter((o: any) => ["ready", "out_for_delivery"].includes(o.status) && o.payment_status !== "paid");
      const pendingPickupsNoDriver = pickups.filter((p: any) => p.status === "pending" || !p.driver_employee_id);
      const attention = [
        { key: "late", label: "طلبات متأخرة", count: late.length, href: "/orders", tone: "red" },
        { key: "reclean", label: "مرتجعات غسيل", count: recleanUnits.length, href: "/stations/cleaning", tone: "red" },
        { key: "qc", label: "مشاكل جودة", count: qcFailedUnits.length, href: "/stations/qc", tone: "red" },
        { key: "nopieces", label: "طلبات بلا قطع", count: noPiecesOrders.length, href: "/orders", tone: "amber" },
        { key: "nodriver", label: "جاهز بلا مندوب", count: readyNoDriver.length, href: "/live-map", tone: "amber" },
        { key: "unpaid", label: "طلبات جاهزة غير مدفوعة", count: unpaidOut.length, href: "/receivables", tone: "amber" },
        { key: "pickups", label: "استلامات تحتاج مندوب", count: pendingPickupsNoDriver.length, href: "/live-map", tone: "blue" },
      ].filter((x) => x.count > 0);

      // Station breakdown
      const stations: Record<string, number> = {
        received: 0, cleaning: 0, ironing: 0, packing: 0, ready: 0, out_for_delivery: 0,
      };
      active.forEach((o: any) => { if (o.status in stations) stations[o.status]++; });

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
        attention,
      };
    },
  });
}
