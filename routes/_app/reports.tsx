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

export const Route = createFileRoute("/_app/reports")({
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
  const { hasRole } = useAuth();
  const canView = hasRole("owner", "ops_manager", "cs_manager");
  const isOwner = hasRole("owner");
  const isOps = hasRole("ops_manager");
  const isCs = hasRole("cs_manager");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function load() {
    setLoading(true);
    const fromDate = new Date(year, month, 1);
    const toDate = new Date(year, month + 1, 0, 23, 59, 59);
    const from = fromDate.toISOString();
    const to = toDate.toISOString();
    const prevFrom = new Date(year, month - 1, 1).toISOString();
    const prevTo = new Date(year, month, 0, 23, 59, 59).toISOString();

    const [ordRes, prevOrdRes, expRes, empRes, itemRes, unitRes, qcRes, invRes, msgRes, proofRes, invoiceRes, pickupRes, lateDetailsRes] = await Promise.all([
      (supabase as any).from("orders").select("id,status,total,created_at,updated_at,order_type,is_urgent,payment_status,payment_method,customer_id,task_assignments(employee_id,station,assigned_at,completed_at)").gte("created_at", from).lte("created_at", to),
      (supabase as any).from("orders").select("id,total,status,created_at").gte("created_at", prevFrom).lte("created_at", prevTo),
      (supabase as any).from("expenses").select("amount,category,status,source_type,spent_at").gte("spent_at", from).lte("spent_at", to).neq("status", "void"),
      (supabase as any).from("employees").select("id,full_name,job_role").eq("is_active", true),
      (supabase as any).from("order_items").select("name,service_type,qty,line_total,created_at").gte("created_at", from).lte("created_at", to),
      (supabase as any).from("service_units").select("id,order_id,current_stage,needs_reclean,line_value,created_at,updated_at,assigned_ironing_employee_id,ironing_assigned_at,ironing_completed_at").gte("created_at", from).lte("created_at", to),
      (supabase as any).from("qc_checks").select("id,result,severity,checked_at,service_unit_id").gte("checked_at", from).lte("checked_at", to).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("inventory_items").select("id,name,current_qty,reorder_level,avg_unit_cost,is_active").eq("is_active", true).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("customer_messages").select("id,status,created_at").gte("created_at", from).lte("created_at", to).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("orders").select("id,payment_verification_status,total,created_at").in("payment_verification_status", ["pending_review", "underpaid"]).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("orders").select("id,status,invoice_finalized_at,created_at").in("status", ["packing", "ready"]).is("invoice_finalized_at", null).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("pickup_requests").select("id,status,created_at,driver_employee_id").in("status", ["pending", "assigned"]).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("orders").select("id,order_number,status,promised_delivery_at,updated_at,customers(full_name),task_assignments(employee_id,station,assigned_at,completed_at,employees(full_name))").not("status", "in", "(delivered,cancelled)").lt("promised_delivery_at", new Date().toISOString()).limit(50).then((r: any) => r).catch(() => ({ data: [] })),
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

    const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const prevRevenue = prevOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const paidExpenses = expenses.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const payableExpenses = expenses.filter((e: any) => e.status === "payable").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const payrollAccrual = expenses.filter((e: any) => e.status === "payable" && e.category === "salaries").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const accruedExpenses = paidExpenses + payableExpenses;
    const totalExpenses = paidExpenses;
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
    const urgent = orders.filter((o: any) => o.is_urgent).length;
    const unpaidValue = orders.filter((o: any) => o.payment_status === "unpaid").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const avgOrder = orders.length ? totalRevenue / orders.length : 0;
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
      lateByStage, lateEmployees,
    });
    setLoading(false);
  }

  useEffect(() => { if (canView) load(); }, [year, month]);

  function exportCSV() {
    if (!data) return;
    const rows = [
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
    const a = document.createElement("a"); a.href = url; a.download = `mjrh-intelligence-${year}-${month+1}.csv`; a.click();
    toast.success("تم تصدير التقرير");
  }

  const years = useMemo(() => [2024, 2025, 2026, 2027], []);
  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">التقارير متاحة للمالك ومدير التشغيل ومدير خدمة العملاء فقط</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Brain className="w-7 h-7 text-teal-600" />التقارير والذكاء التشغيلي</h1>
          <p className="text-sm text-muted-foreground">النظام لا يعرض أرقام فقط — يكتشف التكدس، تسريب الجودة، خطر المخزون، التحصيل، ومتابعات خدمة العملاء.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}><Download className="w-4 h-4 ms-1" />تصدير</Button>
        </div>
      </div>

      {loading ? <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div> : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <Kpi label="الإيرادات" value={fmtMoney(data.totalRevenue)} tone="teal" sub={data.revenueDelta === null ? "لا يوجد شهر سابق" : `${data.revenueDelta >= 0 ? "+" : ""}${data.revenueDelta.toFixed(1)}%`} />
            <Kpi label="صافي نقدي" value={fmtMoney(data.netProfit)} tone={data.netProfit >= 0 ? "green" : "red"} />
            <Kpi label="مصروفات آجلة" value={fmtMoney(data.payableExpenses)} tone="amber" sub={`رواتب: ${fmtMoney(data.payrollAccrual)}`} />
            <Kpi label="الطلبات" value={data.totalOrders} tone="blue" sub={`${data.delivered} مسلّم`} />
            <Kpi label="متوسط الفاتورة" value={fmtMoney(data.avgOrder)} tone="slate" />
            <Kpi label="الآجل" value={fmtMoney(data.unpaidValue)} tone="amber" />
            <Kpi label="جودة QC" value={`${data.qcRate.toFixed(1)}%`} tone={data.qcRate > 8 ? "red" : "green"} sub="نسبة الفشل" />
          </div>

          <RoleFocus isOwner={isOwner} isOps={isOps} isCs={isCs} data={data} />

          <DelayResponsibility data={data} />

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
      )}
    </div>
  );
}



function DelayResponsibility({ data }: { data: any }) {
  const stages = Object.entries(data.lateByStage ?? {}).sort((a: any, b: any) => b[1] - a[1]);
  const employees = data.lateEmployees ?? [];
  if (!stages.length && !employees.length) return <Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-4 text-sm text-emerald-700 font-bold text-center">لا توجد طلبات متأخرة تحتاج تحليل مسؤولية ✅</CardContent></Card>;
  return <div className="grid md:grid-cols-2 gap-4">
    <Card className="border-amber-200 bg-amber-50/40"><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />التأخير حسب المرحلة</CardTitle></CardHeader><CardContent className="space-y-2">
      {stages.map(([stage, count]: any) => <Row key={stage} left={STAGE_AR[stage] ?? stage} mid="طلبات متأخرة" right={String(count)} />)}
    </CardContent></Card>
    <Card className="border-red-200 bg-red-50/40"><CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />من يحتاج متابعة؟</CardTitle></CardHeader><CardContent className="space-y-2">
      {employees.map((e: any) => <Row key={e.name} left={e.name} mid={Object.entries(e.stages).map(([s,c]: any) => `${STAGE_AR[s] ?? s}: ${c}`).join("، ")} right={String(e.count)} />)}
    </CardContent></Card>
  </div>;
}

function RoleFocus({ isOwner, isOps, isCs, data }: { isOwner: boolean; isOps: boolean; isCs: boolean; data: any }) {
  return <div className="grid lg:grid-cols-3 gap-4">
    {isOwner && <Card className="border-emerald-200 bg-emerald-50/50"><CardHeader><CardTitle className="text-sm">ملخص المالك</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <FocusRow label="صافي نقدي للشهر" value={fmtMoney(data.netProfit)} warn={data.netProfit < 0} />
      <FocusRow label="رواتب/مصروفات آجلة" value={fmtMoney(data.payableExpenses)} warn={data.payableExpenses > 0} />
      <FocusRow label="آجل عند العملاء" value={fmtMoney(data.unpaidValue)} warn={data.unpaidValue > 0} />
      <FocusRow label="مخزون تحت الحد" value={data.lowStock.length} warn={data.lowStock.length > 0} />
    </CardContent></Card>}
    {isOps && <Card className="border-blue-200 bg-blue-50/50"><CardHeader><CardTitle className="text-sm">ملخص مدير التشغيل</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <FocusRow label="عنق الزجاجة" value={`${STAGE_AR[data.bottleneck[0]] ?? data.bottleneck[0]} (${data.bottleneck[1]})`} warn={Number(data.bottleneck[1]) > 0} />
      <FocusRow label="مرتجعات غسيل" value={data.recleanCount} warn={data.recleanCount > 0} />
      <FocusRow label="طلبات استلام بلا مندوب" value={data.pendingPickups} warn={data.pendingPickups > 0} />
    </CardContent></Card>}
    {isCs && <Card className="border-amber-200 bg-amber-50/50"><CardHeader><CardTitle className="text-sm">ملخص خدمة العملاء</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <FocusRow label="فواتير تحتاج اعتماد" value={data.invoiceNeedsReview} warn={data.invoiceNeedsReview > 0} />
      <FocusRow label="إيصالات تحتاج مراجعة" value={data.proofIssues} warn={data.proofIssues > 0} />
      <FocusRow label="رسائل واتساب جاهزة" value={data.queuedMessages} warn={data.queuedMessages > 0} />
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
