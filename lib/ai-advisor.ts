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

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1';
const HUGGINGFACE_API_KEY = (import.meta.env.VITE_HUGGINGFACE_API_KEY as string) || '';

export async function getAIRecommendations(tenantId: string): Promise<string[]> {
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('status, total, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!orders || orders.length === 0) {
            return ["لا توجد بيانات كافية لتوليد توصيات."];
        }

        const totalOrders = orders.length;
        const revenue = orders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
        const avgOrderValue = revenue / totalOrders;
        const pendingOrders = orders.filter((o: any) => o.status === 'received' || o.status === 'cleaning').length;
        const readyOrders = orders.filter((o: any) => o.status === 'ready').length;

        const prompt = `
أنت مستشار ذكي لمنصة إدارة المغاسل MJRH.
لديك البيانات التالية للفترة الأخيرة:
- إجمالي الطلبات: ${totalOrders}
- إجمالي الإيرادات: ${revenue.toFixed(0)} ج.م
- متوسط قيمة الفاتورة: ${avgOrderValue.toFixed(0)} ج.م
- طلبات قيد التشغيل: ${pendingOrders}
- طلبات جاهزة للتسليم: ${readyOrders}

قدم 3 توصيات عملية قصيرة ومباشرة باللغة العربية لتحسين الأداء أو زيادة الربحية.
`;

        if (!HUGGINGFACE_API_KEY) {
            return [
                "توصية: لاحظنا زيادة في الطلبات الجاهزة، يفضل تفعيل حملة واتساب للتذكير بالاستلام.",
                "تحليل: متوسط الفاتورة جيد، جرب تقديم خصم للطلبات المستعجلة لزيادة الإيراد السريع.",
                "تنبيه: يوجد ضغط في مرحلة التشغيل، يفضل توزيع المهام بشكل أفضل بين الموظفين."
            ];
        }

        const response = await fetch(HUGGINGFACE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: { max_new_tokens: 200, temperature: 0.7 },
            }),
        });

        if (!response.ok) {
            console.error('AI API Error:', response.status);
            return ["⚠️ تعذر الاتصال بخدمة الذكاء الاصطناعي حالياً."];
        }

        const data = await response.json();
        const generatedText = data[0]?.generated_text || "";
        const result = generatedText
            .replace(prompt, "")
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 5 && (line.includes('•') || line.match(/^\d\./) || line.length > 20))
            .slice(0, 3);

        return result.length > 0 ? result : ["جاري تحليل البيانات بشكل أعمق..."];
    } catch (error) {
        console.error('AI Advisor Error:', error);
        return ["⚠️ حدث خطأ في معالجة التوصيات."];
    }
}

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

  // Rules
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
  }

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
  }

  return insights;
}
