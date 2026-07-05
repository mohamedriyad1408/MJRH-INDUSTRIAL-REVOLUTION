import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, TrendingUp, Award, Clock, Brain, AlertTriangle, Gauge, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getSurgeReportData } from "@/lib/scheduling-surge";
import { ItemSalesAnalyticsTab } from "@/components/item-sales-analytics";

export const Route = createFileRoute("/$tenant/reports")({
  head: () => ({ meta: [{ title: "التقارير والذكاء التشغيلي - MJRH" }] }),
  component: ReportsPage,
});

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const STAGE_AR: Record<string, string> = {
  received: "استلام",
  cleaning: "تنظيف",
  cleaning_done: "تنظيف منتهي",
  ironing: "كي",
  ironing_done: "كي منتهي",
  packing: "تغليف",
  packing_done: "تغليف منتهي",
  ready: "جاهز",
  out_for_delivery: "خارج للتوصيل",
  delivered: "تم التسليم",
  qc_passed: "QC ناجح",
  qc_failed: "QC فشل",
};

type Insight = { title: string; body: string; tone: "good" | "warn" | "bad" | "info"; action: string };

function ReportsPage() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const canView = hasRole("owner", "ops_manager", "cs_manager");
  const isOwner = hasRole("owner");
  const isOps = hasRole("ops_manager");
  const isCs = hasRole("cs_manager");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");
  const [surgeData, setSurgeData] = useState<any>(null);
  const [activeReportTab, setActiveReportTab] = useState<"overview" | "item_sales">("item_sales");

  async function load() {
    setLoading(true);
    const fromDate = new Date(year, month, 1);
    const toDate = new Date(year, month + 1, 0, 23, 59, 59);
    const from = fromDate.toISOString();
    const to = toDate.toISOString();
    const prevFrom = new Date(year, month - 1, 1).toISOString();
    const prevTo = new Date(year, month, 0, 23, 59, 59).toISOString();

    const addBranch = (q: any, column = "branch_id") => branchId === "all" ? q : q.eq(column, branchId);
    const branchOrderSelect = branchId === "all" ? "" : ",orders!inner(branch_id)";
    const [ordRes, prevOrdRes, expRes, empRes, itemRes, unitRes, qcRes, invRes, msgRes, proofRes, invoiceRes, pickupRes, lateDetailsRes] = await Promise.all([
      addBranch(supabase.from("orders").select("id,status,total,created_at,updated_at,order_type,is_urgent,payment_status,payment_method,customer_id,task_assignments(employee_id,station,assigned_at,completed_at)")).gte("created_at", from).lte("created_at", to),
      addBranch(supabase.from("orders").select("id,total,status,created_at")).gte("created_at", prevFrom).lte("created_at", prevTo),
      addBranch(supabase.from("expenses").select("amount,category,status,source_type,spent_at")).gte("spent_at", from).lte("spent_at", to).neq("status", "void"),
      addBranch(supabase.from("employees").select("id,full_name,job_role")).eq("is_active", true),
      (branchId === "all" ? supabase.from("order_items").select("name,service_type,qty,line_total,created_at").gte("created_at", from).lte("created_at", to) : supabase.from("order_items").select("name,service_type,qty,line_total,created_at,orders!inner(branch_id)").gte("created_at", from).lte("created_at", to).eq("orders.branch_id", branchId)),
      (branchId === "all" ? supabase.from("service_units").select("id,order_id,current_stage,needs_reclean,line_value,created_at,updated_at,assigned_ironing_employee_id,ironing_assigned_at,ironing_completed_at").gte("created_at", from).lte("created_at", to) : supabase.from("service_units").select(`id,order_id,current_stage,needs_reclean,line_value,created_at,updated_at,assigned_ironing_employee_id,ironing_assigned_at,ironing_completed_at${branchOrderSelect}`).gte("created_at", from).lte("created_at", to).eq("orders.branch_id", branchId)),
      supabase.from("qc_checks").select("id,result,severity,checked_at,service_unit_id").gte("checked_at", from).lte("checked_at", to).then((r: any) => r).catch(() => ({ data: [] })),
      addBranch(supabase.from("inventory_items").select("id,name,current_qty,reorder_level,avg_unit_cost,is_active")).eq("is_active", true).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("customer_messages").select("id,status,created_at").gte("created_at", from).lte("created_at", to).then((r: any) => r).catch(() => ({ data: [] })),
      addBranch(supabase.from("orders").select("id,payment_verification_status,total,created_at")).in("payment_verification_status", ["pending_review", "underpaid"]).then((r: any) => r).catch(() => ({ data: [] })),
      addBranch(supabase.from("orders").select("id,status,invoice_finalized_at,created_at")).in("status", ["packing", "ready"]).is("invoice_finalized_at", null).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("pickup_requests").select("id,status,created_at,driver_employee_id").in("status", ["pending", "assigned"]).then((r: any) => r).catch(() => ({ data: [] })),
      addBranch(supabase.from("orders").select("id,order_number,status,promised_delivery_at,updated_at,customers(full_name),task_assignments(employee_id,station,assigned_at,completed_at,employees(full_name))")).not("status", "in", "(delivered,cancelled)").lt("promised_delivery_at", new Date().toISOString()).limit(50).then((r: any) => r).catch(() => ({ data: [] })),
    ]);

    const orders = ordRes.data ?? [];
    const prevOrders = prevOrdRes.data ?? [];
    const expenses = expRes.data ?? [];
    const employees = empRes.data ?? [];
    const items = itemRes.data ?? [];
    const units = unitRes.data ?? [];
    const qc = qcRes.data ?? [];
    const inv = invRes.data ?? [];
    const messages = msgRes.data ?? [];
    const proofIssues = proofRes.data ?? [];
    const invoiceNeedsReview = invoiceRes.data ?? [];
    const activePickups = pickupRes.data ?? [];
    const lateDetails = lateDetailsRes.data ?? [];

    const validOrders = orders.filter((o: any) => o.status !== "cancelled");
    const validPrevOrders = prevOrders.filter((o: any) => o.status !== "cancelled");

    const totalRevenue = validOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const prevRevenue = validPrevOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const paidExpenses = expenses.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const payableExpenses = expenses.filter((e: any) => e.status === "payable").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const payrollAccrual = expenses.filter((e: any) => e.status === "payable" && e.category === "salaries").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const accruedExpenses = paidExpenses + payableExpenses;
    const totalExpenses = paidExpenses;
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
    const urgent = orders.filter((o: any) => o.is_urgent).length;
    const unpaidValue = validOrders.filter((o: any) => o.payment_status === "unpaid").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const avgOrder = validOrders.length ? totalRevenue / validOrders.length : 0;
    const revenueDelta = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;

    const stageCounts: Record<string, number> = {};
    units.forEach((u: any) => { stageCounts[u.current_stage || "unknown"] = (stageCounts[u.current_stage || "unknown"] ?? 0) + 1; });
    const bottleneck = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];

    const recleanCount = units.filter((u: any) => u.needs_reclean).length;
    const qcFailed = qc.filter((q: any) => q.result !== "passed").length;
    const qcRate = qc.length ? (qcFailed / qc.length) * 100 : 0;
    const lowStock = inv.filter((x: any) => Number(x.current_qty ?? 0) <= Number(x.reorder_level ?? 0));

    const cycles = orders
      .filter((o: any) => o.status === "delivered" && o.updated_at)
      .map((o: any) => (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 36e5)
      .filter((n: number) => Number.isFinite(n) && n >= 0);
    const avgCycleHours = cycles.length ? cycles.reduce((a: number, b: number) => a + b, 0) / cycles.length : 0;

    const stationStats: Record<string, { station: string; count: number; avgHours: number; completed: number; totalHours: number }> = {};
    orders.forEach((o: any) => {
      (o.task_assignments ?? []).forEach((ta: any) => {
        const key = ta.station || "unknown";
        if (!stationStats[key]) stationStats[key] = { station: key, count: 0, avgHours: 0, completed: 0, totalHours: 0 };
        stationStats[key].count++;
        if (ta.assigned_at && ta.completed_at) {
          const h = (new Date(ta.completed_at).getTime() - new Date(ta.assigned_at).getTime()) / 36e5;
          if (Number.isFinite(h) && h >= 0) { stationStats[key].completed++; stationStats[key].totalHours += h; }
        }
      });
    });
    const stations = Object.values(stationStats).map((s) => ({ ...s, avgHours: s.completed ? s.totalHours / s.completed : 0 })).sort((a, b) => b.count - a.count);

    const empProd: Record<string, { name: string; count: number; completed: number }> = {};
    employees.forEach((e: any) => { empProd[e.id] = { name: e.full_name, count: 0, completed: 0 }; });
    orders.forEach((o: any) => (o.task_assignments ?? []).forEach((ta: any) => {
      if (empProd[ta.employee_id]) { empProd[ta.employee_id].count++; if (ta.completed_at) empProd[ta.employee_id].completed++; }
    }));
    const topEmployees = Object.values(empProd).sort((a, b) => b.count - a.count).slice(0, 6);

    const svcMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    items.forEach((i: any) => {
      if (!svcMap[i.name]) svcMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
      svcMap[i.name].qty += Number(i.qty ?? 0);
      svcMap[i.name].revenue += Number(i.line_total ?? 0);
    });
    const topServices = Object.values(svcMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
    const queuedMessages = messages.filter((m: any) => m.status === "queued").length;
    const sentMessages = messages.filter((m: any) => m.status === "sent").length;
    const pendingPickups = activePickups.filter((p: any) => p.status === "pending" || !p.driver_employee_id).length;
    const lateByStage: Record<string, number> = {};
    const lateByEmployee: Record<string, { name: string; count: number; stages: Record<string, number> }> = {};
    lateDetails.forEach((o: any) => {
      const stage = o.status ?? "unknown";
      lateByStage[stage] = (lateByStage[stage] ?? 0) + 1;
      const assignments = (o.task_assignments ?? []).filter((ta: any) => ta.station === stage || (stage === "received" && ta.station === "reception"));
      const last = (assignments.length ? assignments : (o.task_assignments ?? [])).sort((a: any, b: any) => new Date(b.assigned_at ?? 0).getTime() - new Date(a.assigned_at ?? 0).getTime())[0];
      const empKey = last?.employee_id ?? "unassigned";
      const name = last?.employees?.full_name ?? "غير مُعيّن";
      if (!lateByEmployee[empKey]) lateByEmployee[empKey] = { name, count: 0, stages: {} };
      lateByEmployee[empKey].count += 1;
      lateByEmployee[empKey].stages[stage] = (lateByEmployee[empKey].stages[stage] ?? 0) + 1;
    });
    const lateEmployees = Object.values(lateByEmployee).sort((a, b) => b.count - a.count).slice(0, 6);

    const branchRows = branches.length ? branches : ((await supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at")).data ?? []);
    const [cmpOrdRes, cmpExpRes, cmpUnitsRes, labelIssueRes, cmpCashRes] = await Promise.all([
      supabase.from("orders").select("id,branch_id,total,status,payment_status,is_urgent,created_at").gte("created_at", from).lte("created_at", to).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("expenses").select("branch_id,amount,status,category,spent_at").gte("spent_at", from).lte("spent_at", to).neq("status", "void").then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("service_units").select("id,current_stage,needs_reclean,orders!inner(branch_id)").gte("created_at", from).lte("created_at", to).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("service_units").select("id,label_status,created_at").in("label_status", ["missing_label", "unclear_label"]).gte("created_at", from).lte("created_at", to).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("cash_accounts").select("branch_id,current_balance").eq("tenant_id", tenantId).eq("is_active", true).then((r: any) => r).catch(() => ({ data: [] })),
    ]);
    const branchComparison = (branchRows as any[]).map((b: any) => {
      const bo = (cmpOrdRes.data ?? []).filter((o: any) => o.branch_id === b.id);
      const validBo = bo.filter((o: any) => o.status !== "cancelled");
      const be = (cmpExpRes.data ?? []).filter((e: any) => e.branch_id === b.id);
      const bu = (cmpUnitsRes.data ?? []).filter((u: any) => u.orders?.branch_id === b.id);
      const bc = (cmpCashRes.data ?? []).filter((c: any) => c.branch_id === b.id);
      const cashSafeBalance = bc.reduce((sum: number, c: any) => sum + Number(c.current_balance ?? 0), 0);
      const salaries = be.filter((e: any) => e.category === "salaries").reduce((sum: number, e: any) => sum + Number(e.amount ?? 0), 0);
      const revenue = validBo.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const paidExpenses = be.filter((e: any) => e.status === "paid").reduce((sum: number, e: any) => sum + Number(e.amount ?? 0), 0);
      const payableExpenses = be.filter((e: any) => e.status === "payable").reduce((sum: number, e: any) => sum + Number(e.amount ?? 0), 0);
      const unpaid = validBo.filter((o: any) => o.payment_status !== "paid").reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const reclean = bu.filter((u: any) => u.needs_reclean).length;
      const qcFailedUnits = bu.filter((u: any) => u.current_stage === "qc_failed").length;
      return { id: b.id, name: b.name, orders: bo.length, delivered: bo.filter((o: any) => o.status === "delivered").length, revenue, paidExpenses, payableExpenses, salaries, cashSafeBalance, netCash: revenue - paidExpenses, avgOrder: validBo.length ? revenue / validBo.length : 0, unpaid, urgent: bo.filter((o: any) => o.is_urgent).length, pieces: bu.length, reclean, qcFailed: qcFailedUnits };
    }).sort((a: any, b: any) => b.revenue - a.revenue);

    const insights: Insight[] = [];
    if (revenueDelta !== null) insights.push({
      tone: revenueDelta >= 0 ? "good" : "bad",
      title: revenueDelta >= 0 ? "الإيراد طالع عن الشهر السابق" : "الإيراد نازل عن الشهر السابق",
      body: `${Math.abs(revenueDelta).toFixed(1)}% ${revenueDelta >= 0 ? "زيادة" : "انخفاض"} مقارنة بالشهر السابق.`,
      action: revenueDelta >= 0 ? "كرر مصدر النمو: راجع أكثر الخدمات والموظفين إنتاجية." : "راجع أسباب الانخفاض: عدد الطلبات، متوسط الفاتورة، والعملاء غير النشطين.",
    });
    if (Number(bottleneck[1]) > Math.max(8, units.length * 0.35)) insights.push({ tone: "warn", title: "عنق زجاجة ظاهر", body: `${bottleneck[1]} قطعة متكدسة في مرحلة ${STAGE_AR[bottleneck[0]] ?? bottleneck[0]}.`, action: "انقل موظف مؤقتًا لهذه المحطة أو افتح وردية قصيرة لتفريغ التكدس." });
    if (qcRate > 8 || recleanCount > 0) insights.push({ tone: "bad", title: "تسريب جودة", body: `${qcFailed} فشل QC و ${recleanCount} مرتجع تنظيف.`, action: "افتح محطة QC يوميًا قبل التغليف وراجع الفني/الخدمة المتكررة في الفشل." });
    if (unpaidValue > totalRevenue * 0.25) insights.push({ tone: "warn", title: "تحصيل مؤجل عالي", body: `الآجل الحالي ${fmtMoney(unpaidValue)} من إجمالي ${fmtMoney(totalRevenue)}.`, action: "فعّل رسالة واتساب آلية قبل التسليم وامنع خروج الطلب غير المدفوع إلا بإذن." });
    if (lowStock.length) insights.push({ tone: "warn", title: "مخزون معرض للنفاد", body: `${lowStock.length} صنف وصل أو تعدّى حد إعادة الطلب.`, action: "راجع صفحة المخزون واطلب الكيماويات/الأكياس قبل ضغط التشغيل." });
    if (!insights.length) insights.push({ tone: "good", title: "التشغيل مستقر", body: "لا توجد مؤشرات خطر واضحة في الفترة المختارة.", action: "استمر في متابعة الجودة والمخزون يوميًا." });

    setData({
      totalRevenue, prevRevenue, revenueDelta, totalExpenses, paidExpenses, payableExpenses, payrollAccrual, accruedExpenses, netProfit: totalRevenue - totalExpenses, accruedNetProfit: totalRevenue - accruedExpenses,
      totalOrders: orders.length, delivered, cancelled, urgent, unpaidValue, avgOrder, avgCycleHours,
      stageCounts, bottleneck, recleanCount, qcFailed, qcCount: qc.length, qcRate, lowStock,
      stations, topEmployees, topServices, insights,
      queuedMessages, sentMessages, proofIssues: proofIssues.length, invoiceNeedsReview: invoiceNeedsReview.length, pendingPickups,
      lateByStage, lateEmployees, branchComparison, labelIssues: labelIssueRes.data?.length ?? 0,
    });
    const { data: allActive } = await supabase.from("orders").select("id,order_number,status,notes").not("status", "in", "(delivered,cancelled)");
    setSurgeData(getSurgeReportData(allActive || []));
    setLoading(false);
  }

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at").then(({ data }: any) => setBranches(data ?? []));
  }, [tenantId]);

  useEffect(() => { if (canView) load(); }, [year, month, branchId]);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["الفرع", branchId === "all" ? "كل الفروع" : branches.find((b) => b.id === branchId)?.name ?? "فرع محدد"],
      ["المؤشر", "القيمة"],
      ["الإيرادات", data.totalRevenue],
      ["المصروفات المدفوعة", data.totalExpenses],
      ["مصروفات آجلة", data.payableExpenses],
      ["رواتب مستحقة ضمن الآجل", data.payrollAccrual],
      ["صافي الربح", data.netProfit],
      ["إجمالي الطلبات", data.totalOrders],
      ["متوسط الفاتورة", data.avgOrder],
      ["قيمة الآجل", data.unpaidValue],
      ["فشل QC", data.qcFailed],
      ["مرتجعات تنظيف", data.recleanCount],
      ["عنق الزجاجة", STAGE_AR[data.bottleneck[0]] ?? data.bottleneck[0]],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `mjrh-intelligence-${branchId === "all" ? "all" : branchId}-${year}-${month+1}.csv`; a.click();
    toast.success("تم تصدير التقرير");
  }

  const years = useMemo(() => [2024, 2025, 2026, 2027], []);
  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">التقارير متاحة للمالك ومدير التشغيل ومدير خدمة العملاء فقط</CardContent></Card>;

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Brain className="w-7 h-7 text-teal-600" />{t("reports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("common.allBranches")}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}><Download className="w-4 h-4 ms-1" />{t("common.export")}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveReportTab("item_sales")}
          className={`px-4 py-2 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${
            activeReportTab === "item_sales" ? "bg-teal-600 text-white shadow-md scale-[1.01]" : "bg-white text-slate-700 hover:bg-slate-200 border"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>📊 مبيعات وحركة إنتاج الأصناف (أسبوعي / شهري / سنوي)</span>
          <Badge className={`text-[10px] px-1.5 py-0 ${activeReportTab === "item_sales" ? "bg-white/20 text-white" : "bg-amber-500 text-white font-black"}`}>جديد</Badge>
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab("overview")}
          className={`px-4 py-2 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${
            activeReportTab === "overview" ? "bg-teal-600 text-white shadow-md scale-[1.01]" : "bg-white text-slate-700 hover:bg-slate-200 border"
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>📈 التقارير المالية والتشغيلية العامة</span>
        </button>
      </div>

      {activeReportTab === "item_sales" ? (
        <ItemSalesAnalyticsTab branchId={branchId} />
      ) : (
        loading ? <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div> : data && (
          <div className="space-y-6" dir={dir}>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <Kpi label={t("finance.revenueTab")} value={fmtMoney(data.totalRevenue, t("common.egp"))} tone="teal" sub={data.revenueDelta === null ? t("reports.noMonth") : `${data.revenueDelta >= 0 ? "+" : ""}${data.revenueDelta.toFixed(1)}%`} />
            <Kpi label={t("finance.netProfit")} value={fmtMoney(data.netProfit, t("common.egp"))} tone={data.netProfit >= 0 ? "green" : "red"} />
            <Kpi label={t("accounting.tab.expenses")} value={fmtMoney(data.payableExpenses, t("common.egp"))} tone="amber" sub={`Salaries: ${fmtMoney(data.payrollAccrual, t("common.egp"))}`} />
            <Kpi label={t("station.common.orders")} value={data.totalOrders} tone="blue" sub={`${data.delivered} ${t("reports.del")}`} />
            <Kpi label={t("reports.avgInvoice")} value={fmtMoney(data.avgOrder, t("common.egp"))} tone="slate" />
            <Kpi label={t("nav./receivables")} value={fmtMoney(data.unpaidValue, t("common.egp"))} tone="amber" />
            <Kpi label={t("station.qc.title")} value={`${data.qcRate.toFixed(1)}%`} tone={data.qcRate > 8 ? "red" : "green"} sub={t("reports.failureRate")} />
          </div>

          <BranchComparison rows={data.branchComparison ?? []} t={t} />

          <RoleFocus isOwner={isOwner} isOps={isOps} isCs={isCs} data={data} t={t} />

          <DelayResponsibility data={data} t={t} />

          {surgeData && (
            <Card className="border-teal-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/30 shadow-md">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-black flex items-center gap-2 text-slate-900">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <span>📊 مرصد كثافة المواعيد وأوقات الذروة الموزعة (Surge Load Monitor)</span>
                  </CardTitle>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 font-bold">🟢 عادي: {surgeData.normalCount}</Badge>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 font-bold">🟡 ذروة عادية: {surgeData.normalPeakCount}</Badge>
                    <Badge variant="outline" className="bg-orange-50 text-orange-800 font-bold">🟠 ذروة متوسطة: {surgeData.mediumPeakCount}</Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-800 font-bold">🔴 ذروة شديدة: {surgeData.severePeakCount}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  متابعة الضغط التشغيلي على فترات استلام وتسليم المندوب الموزعة على مدار اليوم وغداً (فترات ساعتين متصلتين).
                </p>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {surgeData.slots.map((st: any) => (
                  <div key={st.slot} className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${st.disabled ? "bg-red-50/80 border-red-300 opacity-90" : `${st.bgClass} bg-white`}`}>
                    <div className="flex items-center justify-between font-black">
                      <span className="text-slate-800 truncate">{st.slot}</span>
                      <Badge className={`text-[9px] ${st.disabled ? "bg-red-600 text-white" : st.level === "medium" ? "bg-orange-500 text-white" : st.level === "normal_peak" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}`}>
                        {st.badge}
                      </Badge>
                    </div>
                    <div className={`text-[11px] font-bold ${st.colorClass}`}>
                      {st.count} طلبات مجدولة
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{st.label}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-5 h-5 text-teal-700" />ماذا يقول النظام؟</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {data.insights.map((x: Insight, i: number) => <InsightCard key={i} item={x} />)}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4 text-teal-600" />خريطة التكدس حسب مرحلة القطعة</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.stageCounts).sort((a: any, b: any) => b[1] - a[1]).map(([stage, count]: any) => {
                  const max = Math.max(1, ...Object.values(data.stageCounts).map((n: any) => Number(n)));
                  return <div key={stage}>
                    <div className="flex justify-between text-xs mb-1"><span>{STAGE_AR[stage] ?? stage}</span><span>{count} قطعة</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-teal-500" style={{ width: `${Math.max(4, (Number(count) / max) * 100)}%` }} /></div>
                  </div>;
                })}
                {!Object.keys(data.stageCounts).length && <div className="text-center text-muted-foreground p-6">لا توجد قطع في الفترة المختارة</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" />الجودة والتسريبات</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Leak label="فشل QC" value={data.qcFailed} danger={data.qcFailed > 0} />
                <Leak label="مرتجع تنظيف" value={data.recleanCount} danger={data.recleanCount > 0} />
                <Leak label="مشاكل مارك/ليبل" value={data.labelIssues ?? 0} danger={(data.labelIssues ?? 0) > 0} />
                <Leak label="مخزون تحت الحد" value={data.lowStock.length} danger={data.lowStock.length > 0} />
                <Leak label="طلبات مستعجلة" value={data.urgent} danger={false} />
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Panel title="أداء المحطات" icon={<Clock className="w-4 h-4 text-blue-500" />}>
              {data.stations.map((s: any) => <Row key={s.station} left={STAGE_AR[s.station] ?? s.station} mid={`${s.count} مهمة`} right={s.avgHours ? `${s.avgHours.toFixed(1)}س` : "—"} />)}
              {!data.stations.length && <Empty />}
            </Panel>
            <Panel title="أكثر الموظفين إنتاجية" icon={<Award className="w-4 h-4 text-amber-500" />}>
              {data.topEmployees.map((e: any, i: number) => <Row key={i} left={`${i + 1}. ${e.name}`} mid={`${e.count} مهمة`} right={`${e.completed} منتهي`} />)}
              {!data.topEmployees.length && <Empty />}
            </Panel>
            <Panel title="أكثر الخدمات ربحًا" icon={<TrendingUp className="w-4 h-4 text-teal-500" />}>
              {data.topServices.map((s: any) => <Row key={s.name} left={s.name} mid={`${s.qty} قطعة`} right={fmtMoney(s.revenue)} />)}
              {!data.topServices.length && <Empty />}
            </Panel>
          </div>
        </div>
      ))}
    </div>
  );
}



function BranchComparison({ rows, t }: { rows: any[]; t: any }) {
  if (!rows.length) return <Card><CardContent className="p-4 text-sm text-muted-foreground text-center">{t("common.noRows")}</CardContent></Card>;
  const best = rows[0];
  return <Card className="border-teal-200 bg-teal-50/30"><CardHeader><CardTitle className="text-base">{t("reports.title")}</CardTitle></CardHeader><CardContent className="space-y-3">
    <div className="rounded-xl bg-white/80 border p-3 text-sm"><b>{t("reports.bestBranch")}</b> {best.name} — {fmtMoney(best.revenue, t("common.egp"))} · {t("finance.netProfit")} {fmtMoney(best.netCash, t("common.egp"))}</div>
    <div className="overflow-x-auto"><table className="w-full text-xs bg-white rounded-xl overflow-hidden"><thead className="bg-muted/60"><tr><th className="text-start p-2">{t("common.branch")}</th><th className="text-end p-2">{t("station.common.orders")}</th><th className="text-end p-2">{t("finance.revenueTab")}</th><th className="text-end p-2">{t("accounting.kpi.paidExpenses")}</th><th className="text-end p-2">{t("common.role")}</th><th className="text-end p-2">{t("finance.netProfit")}</th><th className="text-end p-2">{t("accounting.kpi.safes")}</th><th className="text-end p-2">{t("receivables.title")}</th><th className="text-end p-2">{t("station.common.pieces")}</th><th className="text-end p-2">{t("station.qc.qualityIssues")}</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id} className="border-t"><td className="p-2 font-bold">{r.name}</td><td className="p-2 text-end">{r.orders}</td><td className="p-2 text-end font-black text-teal-700">{fmtMoney(r.revenue, t("common.egp"))}</td><td className="p-2 text-end">{fmtMoney(r.paidExpenses, t("common.egp"))}</td><td className="p-2 text-end text-rose-700">{fmtMoney(r.salaries, t("common.egp"))}</td><td className={`p-2 text-end font-black ${r.netCash >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtMoney(r.netCash, t("common.egp"))}</td><td className="p-2 text-end text-blue-700 font-bold">{fmtMoney(r.cashSafeBalance, t("common.egp"))}</td><td className="p-2 text-end text-amber-700">{fmtMoney(r.unpaid, t("common.egp"))}</td><td className="p-2 text-end">{r.pieces}</td><td className="p-2 text-end">QC {r.qcFailed} / {t("station.common.reclean")} {r.reclean}</td></tr>)}
    </tbody></table></div>
  </CardContent></Card>;
}

function DelayResponsibility({ data, t }: { data: any; t: any }) {
  const stages = Object.entries(data.lateByStage ?? {}).sort((a: any, b: any) => b[1] - a[1]);
  const employees = data.lateEmployees ?? [];
  if (!stages.length && !employees.length) return <Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-4 text-sm text-emerald-700 font-bold text-center">{t("system.financialAuditOk")} ✅</CardContent></Card>;
  return <div className="grid md:grid-cols-2 gap-4">
    <Card className="border-amber-200 bg-amber-50/40"><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />{t("reports.delayByStage")}</CardTitle></CardHeader><CardContent className="space-y-2">
      {stages.map(([stage, count]: any) => <Row key={stage} left={t("stage." + stage, stage)} mid={t("brief.lateOrders")} right={String(count)} />)}
    </CardContent></Card>
    <Card className="border-red-200 bg-red-50/40"><CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{t("reports.whoNeedsFollowup")}</CardTitle></CardHeader><CardContent className="space-y-2">
      {employees.map((e: any) => <Row key={e.name} left={e.name} mid={Object.entries(e.stages).map(([s,c]: any) => `${t("stage." + s, s)}: ${c}`).join(", ")} right={String(e.count)} />)}
    </CardContent></Card>
  </div>;
}

function RoleFocus({ isOwner, isOps, isCs, data, t }: { isOwner: boolean; isOps: boolean; isCs: boolean; data: any; t: any }) {
  return <div className="grid lg:grid-cols-3 gap-4">
    {isOwner && <Card className="border-emerald-200 bg-emerald-50/50"><CardHeader><CardTitle className="text-sm">{t("brief.ownerTitle")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <FocusRow label={t("reports.netCashMonth")} value={fmtMoney(data.netProfit, t("common.egp"))} warn={data.netProfit < 0} />
      <FocusRow label={t("reports.payableMonth")} value={fmtMoney(data.payableExpenses, t("common.egp"))} warn={data.payableExpenses > 0} />
      <FocusRow label={t("reports.receivablesCustomer")} value={fmtMoney(data.unpaidValue, t("common.egp"))} warn={data.unpaidValue > 0} />
      <FocusRow label={t("reports.lowStock")} value={data.lowStock.length} warn={data.lowStock.length > 0} />
    </CardContent></Card>}
    {isOps && <Card className="border-blue-200 bg-blue-50/50"><CardHeader><CardTitle className="text-sm">{t("brief.opsTitle")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <FocusRow label={t("reports.bottleneck")} value={`${t("stage." + data.bottleneck[0], data.bottleneck[0])} (${data.bottleneck[1]})`} warn={Number(data.bottleneck[1]) > 0} />
      <FocusRow label={t("brief.reclean")} value={data.recleanCount} warn={data.recleanCount > 0} />
      <FocusRow label={t("reports.pendingPickups")} value={data.pendingPickups} warn={data.pendingPickups > 0} />
    </CardContent></Card>}
    {isCs && <Card className="border-amber-200 bg-amber-50/50"><CardHeader><CardTitle className="text-sm">{t("brief.csTitle")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <FocusRow label={t("brief.invoicesNeedReview")} value={data.invoiceNeedsReview} warn={data.invoiceNeedsReview > 0} />
      <FocusRow label={t("brief.proofsNeedReview")} value={data.proofIssues} warn={data.proofIssues > 0} />
      <FocusRow label={t("reports.readyWhatsapp")} value={data.queuedMessages} warn={data.queuedMessages > 0} />
    </CardContent></Card>}
  </div>;
}

function FocusRow({ label, value, warn }: { label: string; value: any; warn?: boolean }) {
  return <div className="flex items-center justify-between rounded-xl border bg-white/70 p-2"><span>{label}</span><Badge variant={warn ? "destructive" : "secondary"}>{value}</Badge></div>;
}

function Kpi({ label, value, sub, tone }: { label: string; value: any; sub?: string; tone: "teal" | "green" | "red" | "blue" | "amber" | "slate" }) {
  const cls: Record<string, string> = { teal: "border-teal-200 bg-teal-50 text-teal-800", green: "border-emerald-200 bg-emerald-50 text-emerald-800", red: "border-red-200 bg-red-50 text-red-800", blue: "border-blue-200 bg-blue-50 text-blue-800", amber: "border-amber-200 bg-amber-50 text-amber-800", slate: "border-slate-200 bg-slate-50 text-slate-800" };
  return <Card className={cls[tone]}><CardContent className="p-4"><div className="text-xs opacity-80">{label}</div><div className="text-xl font-black mt-1">{value}</div>{sub && <div className="text-[11px] mt-1 opacity-75">{sub}</div>}</CardContent></Card>;
}

function InsightCard({ item }: { item: Insight }) {
  const cls = item.tone === "good" ? "border-emerald-200 bg-emerald-50" : item.tone === "bad" ? "border-red-200 bg-red-50" : item.tone === "warn" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50";
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="flex items-center gap-2 font-black"><AlertTriangle className="w-4 h-4" />{item.title}</div><p className="text-sm mt-2 text-slate-700">{item.body}</p><div className="mt-3 text-xs font-bold text-slate-900">الإجراء المقترح: {item.action}</div></div>;
}

function Leak({ label, value, danger }: { label: string; value: number; danger: boolean }) {
  return <div className="flex items-center justify-between rounded-xl border p-3"><span>{label}</span><Badge variant={danger ? "destructive" : "secondary"}>{value}</Badge></div>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle></CardHeader><CardContent className="space-y-2">{children}</CardContent></Card>;
}

function Row({ left, mid, right }: { left: string; mid: string; right: string }) {
  return <div className="flex items-center justify-between gap-2 rounded-xl border p-2 text-xs"><div className="font-bold truncate">{left}</div><div className="text-muted-foreground">{mid}</div><div className="font-black text-teal-700">{right}</div></div>;
}
function Empty() { return <div className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات</div>; }
