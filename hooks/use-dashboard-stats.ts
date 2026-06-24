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
        (supabase as any).from("pickup_requests").select("id,status,driver_employee_id").in("status", ["pending", "assigned"]),
        (supabase as any).from("service_units").select("id,order_id,needs_reclean,current_stage,status"),
      ]);

      const orders = ordersRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const employees = employeesRes.data ?? [];
      const pickups = pickupsRes.data ?? [];
      const units = unitsRes.data ?? [];

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


      const unitCountByOrder = new Map<string, number>();
      (units as any[]).filter((u) => u.status !== "cancelled" && u.current_stage !== "cancelled").forEach((u: any) => unitCountByOrder.set(u.order_id, (unitCountByOrder.get(u.order_id) ?? 0) + 1));
      const recleanUnits = (units as any[]).filter((u) => u.needs_reclean);
      const qcFailedUnits = (units as any[]).filter((u) => u.current_stage === "qc_failed");
      const noPiecesOrders = active.filter((o) => !unitCountByOrder.get(o.id));
      const readyNoDriver = active.filter((o) => o.status === "ready" && !(o as any).assigned_driver_employee_id);
      const unpaidOut = active.filter((o) => ["ready", "out_for_delivery"].includes(o.status) && o.payment_status !== "paid");
      const pendingPickupsNoDriver = (pickups as any[]).filter((p) => p.status === "pending" || !p.driver_employee_id);
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
        attention,
      };
    },
  });
}
