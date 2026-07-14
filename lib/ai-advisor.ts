import { supabase } from "@/integrations/supabase/client";

export type AiInsightSeverity = "critical" | "warning" | "info" | "success";
export type AiInsightCategory = "bottleneck" | "inventory" | "workforce" | "maintenance" | "finance" | "sla";

export type AiAdvisorInsight = {
  id: string;
  category: AiInsightCategory;
  severity: AiInsightSeverity;
  titleKey: string;
  descriptionKey: string;
  values: Record<string, string | number>;
  actionLabelKey?: string;
  actionHref?: string;
  metricImpact?: string;
};

export type ExecutiveSummaryMetrics = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  activeOrdersCount: number;
  urgentOrdersCount: number;
  slaBreachCount: number;
  slaComplianceRate: number;
  activeEmployeesCount: number;
  equipmentAlertCount: number;
  lowStockItemsCount: number;
  branches: {
    id: string;
    name: string;
    revenue: number;
    expenses: number;
    profit: number;
    orderCount: number;
    slaCompliance: number;
    employeeCount: number;
    efficiencyScore: number;
  }[];
  stationCounts: Record<string, number>;
};

export async function fetchExecutiveMetrics(tenantId: string, selectedBranchId?: string): Promise<ExecutiveSummaryMetrics> {
  const [
    branchesRes,
    ordersRes,
    expensesRes,
    employeesRes,
    equipmentRes,
    inventoryRes,
  ] = await Promise.all([
    supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true),
    supabase.from("orders").select("id,status,total,is_urgent,created_at,promised_delivery_at,branch_id,payment_status"),
    supabase.from("expenses").select("id,amount,category,spent_at,branch_id"),
    supabase.from("employees").select("id,full_name,job_role,is_active,branch_id,station").eq("is_active", true),
    supabase.from("equipment_assets").select("id,name,status,next_maintenance_at,branch_id"),
    supabase.from("inventory_items").select("id,name,current_qty,reorder_level,branch_id").eq("is_active", true),
  ]);

  const rawBranches: { id: string; name: string }[] = branchesRes.data ?? [];
  const rawOrders: { id: string; status: string; total: number; is_urgent: boolean; created_at: string; promised_delivery_at?: string; branch_id?: string; payment_status?: string }[] = ordersRes.data ?? [];
  const rawExpenses: { id: string; amount: number; category: string; spent_at: string; branch_id?: string }[] = expensesRes.data ?? [];
  const rawEmployees: { id: string; full_name: string; job_role?: string; is_active: boolean; branch_id?: string; station?: string }[] = employeesRes.data ?? [];
  const rawEquipment: { id: string; name: string; status: string; next_maintenance_at?: string; branch_id?: string }[] = equipmentRes.data ?? [];
  const rawInventory: { id: string; name: string; current_qty: number; reorder_level: number; branch_id?: string }[] = inventoryRes.data ?? [];

  const now = new Date().toISOString();

  // Filter by branch if selected
  const filterByBranch = <T extends { branch_id?: string }>(list: T[]): T[] => {
    if (!selectedBranchId || selectedBranchId === "all") return list;
    return list.filter((x) => x.branch_id === selectedBranchId);
  };

  const orders = filterByBranch(rawOrders);
  const expenses = filterByBranch(rawExpenses);
  const employees = filterByBranch(rawEmployees);
  const equipment = filterByBranch(rawEquipment);
  const inventory = filterByBranch(rawInventory);

  const validOrders = orders.filter((o) => o.status !== "cancelled");
  const totalRevenue = validOrders.reduce((acc, o) => acc + Number(o.total ?? 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount ?? 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const urgentOrdersCount = activeOrders.filter((o) => o.is_urgent).length;
  const slaBreachCount = activeOrders.filter((o) => o.promised_delivery_at && o.promised_delivery_at < now).length;
  const slaComplianceRate = activeOrders.length > 0 ? ((activeOrders.length - slaBreachCount) / activeOrders.length) * 100 : 100;

  const equipmentAlertCount = equipment.filter((eq) => eq.status === "needs_maintenance" || eq.status === "down" || (eq.next_maintenance_at && eq.next_maintenance_at < now)).length;
  const lowStockItemsCount = inventory.filter((inv) => Number(inv.current_qty ?? 0) <= Number(inv.reorder_level ?? 0)).length;

  const stationCounts: Record<string, number> = {
    received: 0, cleaning: 0, drying_assembly: 0, ironing: 0, packing: 0, qc: 0, ready: 0, out_for_delivery: 0,
  };
  activeOrders.forEach((o) => {
    const s = o.status;
    if (s in stationCounts) stationCounts[s] = (stationCounts[s] ?? 0) + 1;
  });

  const branchSummary = rawBranches.map((b) => {
    const bOrders = rawOrders.filter((o) => o.branch_id === b.id);
    const bExpenses = rawExpenses.filter((e) => e.branch_id === b.id);
    const bEmployees = rawEmployees.filter((em) => em.branch_id === b.id);

    const validBOrders = bOrders.filter((o) => o.status !== "cancelled");
    const bRev = validBOrders.reduce((acc, o) => acc + Number(o.total ?? 0), 0);
    const bExp = bExpenses.reduce((acc, e) => acc + Number(e.amount ?? 0), 0);
    const bProf = bRev - bExp;

    const bActive = bOrders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    const bSlaBreach = bActive.filter((o) => o.promised_delivery_at && o.promised_delivery_at < now).length;
    const bSlaCompliance = bActive.length > 0 ? ((bActive.length - bSlaBreach) / bActive.length) * 100 : 100;

    const bEff = bEmployees.length > 0 ? bRev / bEmployees.length : bRev;

    return {
      id: b.id,
      name: b.name,
      revenue: bRev,
      expenses: bExp,
      profit: bProf,
      orderCount: bOrders.length,
      slaCompliance: bSlaCompliance,
      employeeCount: bEmployees.length,
      efficiencyScore: Math.round(bEff),
    };
  });

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    activeOrdersCount: activeOrders.length,
    urgentOrdersCount,
    slaBreachCount,
    slaComplianceRate,
    activeEmployeesCount: employees.length,
    equipmentAlertCount,
    lowStockItemsCount,
    branches: branchSummary,
    stationCounts,
  };
}

export async function generateAiAdvisorInsights(tenantId: string, selectedBranchId?: string): Promise<AiAdvisorInsight[]> {
  const metrics = await fetchExecutiveMetrics(tenantId, selectedBranchId);
  const insights: AiAdvisorInsight[] = [];

  // 0. Extra rules — Busiest day & Late payers (zero-cost SQL aggregation)
  try {
    const [busiestRes, lateRes, burnoutRes] = await Promise.all([
      supabase.from("v_busiest_day").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("v_late_payers").select("*").eq("tenant_id", tenantId).limit(3),
      supabase.from("v_burnout_risk").select("*").eq("tenant_id", tenantId).limit(3),
    ]);

    const busiest: any = (busiestRes as any).data;
    if (busiest && busiest.pct_above_avg > 15) {
      insights.push({
        id: "extra-busiest",
        category: "workforce",
        severity: busiest.pct_above_avg > 50 ? "warning" : "info",
        titleKey: "ai.busiestDay.title",
        descriptionKey: "ai.busiestDay.desc",
        values: { day: busiest.day_name, pct: busiest.pct_above_avg, count: busiest.cnt },
        actionLabelKey: "ai.busiestDay.action",
        actionHref: "/staff/schedule",
        metricImpact: `${busiest.pct_above_avg}% Peak vs Avg`,
      } as any);
    }

    const latePayers: any[] = (lateRes as any).data ?? [];
    latePayers.forEach((lp, idx) => {
      insights.push({
        id: `extra-late-${idx}`,
        category: "finance",
        severity: lp.delay_vs_avg > 7 ? "warning" : "info",
        titleKey: "ai.latePayer.title",
        descriptionKey: "ai.latePayer.desc",
        values: { customer: lp.customer_name || "عميل", delay: lp.delay_vs_avg, avg: Math.round(Number(lp.cust_avg_days || 0)) },
        actionLabelKey: "ai.latePayer.action",
        actionHref: "/receivables",
        metricImpact: `${lp.delay_vs_avg}d Late vs Avg`,
      } as any);
    });

    const burnout: any[] = (burnoutRes as any).data ?? [];
    burnout.forEach((br, idx) => {
      insights.push({
        id: `extra-burnout-${idx}`,
        category: "workforce",
        severity: "warning",
        titleKey: "ai.burnout.title",
        descriptionKey: "ai.burnout.desc",
        values: { employee: br.employee_id.slice(0, 8), days: br.consecutive_days, wli: Number(br.avg_wli).toFixed(2), station: br.station },
        actionLabelKey: "ai.burnout.action",
        actionHref: "/staff/fairness",
        metricImpact: `WLI ${Number(br.avg_wli).toFixed(2)} x3d`,
      } as any);
    });
  } catch (e) {
    console.warn("extra rules failed", e);
  }

  // 1. Station Bottlenecks
  const maxStationEntry = Object.entries(metrics.stationCounts).reduce((max, cur) => cur[1] > max[1] ? cur : max, ["received", 0]);
  if (maxStationEntry[1] > 5) {
    insights.push({
      id: "bottleneck-1",
      category: "bottleneck",
      severity: maxStationEntry[1] > 15 ? "critical" : "warning",
      titleKey: "ai.bottleneck.title",
      descriptionKey: "ai.bottleneck.desc",
      values: { station: maxStationEntry[0], count: maxStationEntry[1] },
      actionLabelKey: "ai.bottleneck.action",
      actionHref: `/stations/${maxStationEntry[0]}`,
      metricImpact: `-${Math.min(maxStationEntry[1] * 2, 25)}% SLA Speed`,
    });
  }

  // 2. SLA Monitoring
  if (metrics.slaBreachCount > 0) {
    insights.push({
      id: "sla-1",
      category: "sla",
      severity: metrics.slaBreachCount > 5 ? "critical" : "warning",
      titleKey: "ai.sla.title",
      descriptionKey: "ai.sla.desc",
      values: { count: metrics.slaBreachCount, rate: Math.round(metrics.slaComplianceRate) },
      actionLabelKey: "ai.sla.action",
      actionHref: "/orders",
      metricImpact: `${metrics.slaBreachCount} Overdue Orders`,
    });
  } else {
    insights.push({
      id: "sla-ok",
      category: "sla",
      severity: "success",
      titleKey: "ai.slaOk.title",
      descriptionKey: "ai.slaOk.desc",
      values: { rate: Math.round(metrics.slaComplianceRate) },
      metricImpact: "100% On-Time Fulfillment",
    });
  }

  // 3. Inventory & Packaging Alert
  if (metrics.lowStockItemsCount > 0) {
    insights.push({
      id: "inv-1",
      category: "inventory",
      severity: metrics.lowStockItemsCount > 3 ? "critical" : "warning",
      titleKey: "ai.inventory.title",
      descriptionKey: "ai.inventory.desc",
      values: { count: metrics.lowStockItemsCount },
      actionLabelKey: "ai.inventory.action",
      actionHref: "/inventory",
      metricImpact: "Potential Packaging Halt",
    });
  }

  // 4. Predictive Maintenance
  if (metrics.equipmentAlertCount > 0) {
    insights.push({
      id: "maint-1",
      category: "maintenance",
      severity: "warning",
      titleKey: "ai.maintenance.title",
      descriptionKey: "ai.maintenance.desc",
      values: { count: metrics.equipmentAlertCount },
      actionLabelKey: "ai.maintenance.action",
      actionHref: "/inventory",
      metricImpact: "Downtime Risk",
    });
  }

  // 5. Smart Scheduling & Workforce
  if (metrics.activeOrdersCount > 20 && metrics.activeEmployeesCount < 3) {
    insights.push({
      id: "workforce-1",
      category: "workforce",
      severity: "warning",
      titleKey: "ai.workforce.title",
      descriptionKey: "ai.workforce.desc",
      values: { orders: metrics.activeOrdersCount, emps: metrics.activeEmployeesCount },
      actionLabelKey: "ai.workforce.action",
      actionHref: "/staff/schedule",
      metricImpact: "Suboptimal Labor Ratio",
    });
  }

  // 6. Profit Analytics & Cash Drag
  if (metrics.netProfit < 0) {
    insights.push({
      id: "finance-1",
      category: "finance",
      severity: "critical",
      titleKey: "ai.financeNeg.title",
      descriptionKey: "ai.financeNeg.desc",
      values: { deficit: Math.abs(metrics.netProfit) },
      actionLabelKey: "ai.financeNeg.action",
      actionHref: "/reports",
      metricImpact: "Negative Unit Economics",
    });
  } else if (metrics.profitMargin > 0 && metrics.profitMargin < 15) {
    insights.push({
      id: "finance-2",
      category: "finance",
      severity: "info",
      titleKey: "ai.financeLow.title",
      descriptionKey: "ai.financeLow.desc",
      values: { margin: Math.round(metrics.profitMargin) },
      actionLabelKey: "ai.financeLow.action",
      actionHref: "/reports",
      metricImpact: "Margin Expansion Needed",
    });
  } else {
    insights.push({
      id: "finance-ok",
      category: "finance",
      severity: "success",
      titleKey: "ai.financeOk.title",
      descriptionKey: "ai.financeOk.desc",
      values: { margin: Math.round(metrics.profitMargin) },
      metricImpact: "Healthy Bottom Line",
    });
  }

  return insights;
}
