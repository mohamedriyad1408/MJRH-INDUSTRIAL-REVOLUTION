import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, TrendingUp, Award, Clock, Brain, AlertTriangle, Gauge, ShieldAlert, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useI18n, interpolate } from "@/lib/i18n";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports - MJRH" }] }),
  component: ReportsPage,
});

type Insight = { title: string; body: string; tone: "good" | "warn" | "bad" | "info"; action: string };

function ReportsPage() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir } = useI18n();

  const MONTHS = useMemo(() => [
    t("common.month.1", "January"),
    t("common.month.2", "February"),
    t("common.month.3", "March"),
    t("common.month.4", "April"),
    t("common.month.5", "May"),
    t("common.month.6", "June"),
    t("common.month.7", "July"),
    t("common.month.8", "August"),
    t("common.month.9", "September"),
    t("common.month.10", "October"),
    t("common.month.11", "November"),
    t("common.month.12", "December")
  ], [t]);

  const STAGE_LABELS: Record<string, string> = useMemo(() => ({
    received: t("stage.received"),
    cleaning: t("stage.cleaning"),
    cleaning_done: t("stage.cleaningDone"),
    ironing: t("stage.ironing"),
    ironing_done: t("stage.ironingDone"),
    packing: t("stage.packing"),
    packing_done: t("stage.packingDone"),
    ready: t("stage.ready"),
    out_for_delivery: t("common.status.order.out_for_delivery"),
    delivered: t("common.status.order.delivered"),
    qc_passed: t("common.qcPassed"),
    qc_failed: t("common.qcFailed"),
  }), [t]);

  const canView = hasRole("owner", "ops_manager", "cs_manager");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");

  const load = useCallback(async () => {
    if (!canView || !tenantId) return;
    setLoading(true);
    
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const prevStart = new Date(year, month - 1, 1).toISOString();
    const prevEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

    const [ordersRes, prevOrdersRes, expRes, suRes, qcRes, brRes, labelIssueRes, msgRes, pickupRes] = await Promise.all([
      supabase.from("orders").select("*").eq("tenant_id", tenantId).gte("created_at", start).lte("created_at", end),
      supabase.from("orders").select("total").eq("tenant_id", tenantId).gte("created_at", prevStart).lte("created_at", prevEnd).neq("status", "cancelled"),
      supabase.from("expenses").select("*").eq("tenant_id", tenantId).gte("spent_at", start).lte("spent_at", end).neq("status", "void"),
      supabase.from("service_units").select("*, orders!inner(id, order_number, branch_id, created_at)").eq("orders.tenant_id", tenantId).gte("orders.created_at", start).lte("orders.created_at", end),
      supabase.from("qc_checks").select("*").eq("tenant_id", tenantId).gte("checked_at", start).lte("checked_at", end),
      supabase.from("branches").select("id, name").eq("tenant_id", tenantId),
      supabase.from("service_units").select("id").eq("label_status", "missing_label").or("label_status.eq.unclear_label"),
      supabase.from("customer_messages").select("id, status").eq("tenant_id", tenantId).gte("created_at", start).lte("created_at", end),
      supabase.from("pickup_requests").select("id").eq("tenant_id", tenantId).eq("status", "pending"),
    ]);

    setBranches(brRes.data ?? []);
    
    const orders = (ordersRes.data ?? []).filter((o: any) => branchId === "all" || o.branch_id === branchId);
    const prevOrders = prevOrdersRes.data ?? [];
    const expenses = (expRes.data ?? []).filter((e: any) => branchId === "all" || e.branch_id === branchId);
    const units = (suRes.data ?? []).filter((u: any) => branchId === "all" || u.orders.branch_id === branchId);
    const qc = qcRes.data ?? [];

    const totalRevenue = orders.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + Number(o.total), 0);
    const prevRevenue = prevOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const revenueDelta = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    const paidExpenses = expenses.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + Number(e.amount), 0);
    const payableExpenses = expenses.filter((e: any) => e.status === "payable").reduce((s: number, e: any) => s + Number(e.amount), 0);
    const payrollAccrual = expenses.filter((e: any) => e.category === "salaries" && e.status === "payable").reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalExpenses = paidExpenses + payableExpenses;
    const accruedExpenses = paidExpenses + payableExpenses;
    
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
    const urgent = orders.filter((o: any) => o.is_urgent && o.status !== "cancelled").length;
    const unpaidValue = orders.filter((o: any) => o.status !== "cancelled" && o.payment_status !== "paid").reduce((s: number, o: any) => s + Number(o.total), 0);
    const avgOrder = orders.length ? totalRevenue / orders.length : 0;

    // Cycle time (received to ready)
    const avgCycleHours = 0; // Simplified for now

    // Stage bottleneck
    const stageCounts: Record<string, number> = {};
    units.forEach((u: any) => {
      if (u.status !== "cancelled") {
        stageCounts[u.current_stage] = (stageCounts[u.current_stage] || 0) + 1;
      }
    });
    const bottleneck = Object.entries(stageCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0] || ["none", 0];

    // Quality
    const recleanCount = units.filter((u: any) => u.needs_reclean).length;
    const qcFailed = qc.filter((q: any) => q.result === "failed").length;
    const qcRate = qc.length ? (qcFailed / qc.length) * 100 : 0;

    // Messages
    const queuedMessages = (msgRes.data ?? []).filter((m: any) => m.status === "pending").length;
    const sentMessages = (msgRes.data ?? []).filter((m: any) => m.status === "sent").length;
    const pendingPickups = pickupRes.data?.length ?? 0;

    const insights: Insight[] = [];
    if (totalRevenue > prevRevenue && prevRevenue > 0) insights.push({ tone: "good", title: t("reports.insight.revenueUp", "الإيراد طالع"), body: t("reports.insight.revenueUpDetail", "الإيراد طالع عن الشهر السابق"), action: t("reports.insight.revenueUpAction") });
    if (totalRevenue < prevRevenue && prevRevenue > 0) insights.push({ tone: "bad", title: t("reports.insight.revenueDown", "الإيراد نازل"), body: t("reports.insight.revenueDownDetail"), action: t("reports.insight.revenueDownAction") });
    
    if (Number(bottleneck[1]) > Math.max(8, units.length * 0.35)) insights.push({ tone: "warn", title: t("reports.insight.bottleneck"), body: interpolate(t("reports.insight.bottleneckDetail"), { count: bottleneck[1], stage: STAGE_LABELS[bottleneck[0]] ?? bottleneck[0] }), action: t("reports.insight.bottleneckAction") });
    if (qcRate > 8 || recleanCount > 0) insights.push({ tone: "bad", title: t("reports.insight.quality"), body: interpolate(t("reports.insight.qualityDetail"), { failed: qcFailed, reclean: recleanCount }), action: t("reports.insight.qualityAction") });
    
    if (!insights.length) insights.push({ tone: "good", title: t("reports.insight.stable"), body: t("reports.insight.stableDetail"), action: t("reports.insight.stableAction") });

    setData({
      totalRevenue, prevRevenue, revenueDelta, totalExpenses, paidExpenses, payableExpenses, payrollAccrual, accruedExpenses, netProfit: totalRevenue - totalExpenses, accruedNetProfit: totalRevenue - accruedExpenses,
      totalOrders: orders.length, delivered, cancelled, urgent, unpaidValue, avgOrder, avgCycleHours,
      stageCounts, bottleneck, recleanCount, qcFailed, qcCount: qc.length, qcRate,
      insights,
      queuedMessages, sentMessages, pendingPickups,
    });
    setLoading(false);
  }, [year, month, branchId, tenantId, canView, t, STAGE_LABELS]);

  useEffect(() => { load(); }, [load]);

  async function exportCsv() {
    if (!data) return;
    const rows = [
      [t("common.metric"), t("common.value")],
      [t("finance.totalRevenue"), data.totalRevenue],
      [t("finance.expenses"), data.totalExpenses],
      [t("finance.netProfit"), data.netProfit],
      [t("reports.avgInvoice"), data.avgOrder],
      [t("reports.bottleneck"), STAGE_LABELS[data.bottleneck[0]] ?? data.bottleneck[0]],
    ];
    const csv = rows.map((r: any) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `mjrh-intelligence-${year}-${month + 1}.csv`; a.click();
    toast.success(t("common.toastExported", "تم تصدير التقرير"));
  }

  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("reports.noAccess")}</CardContent></Card>;

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.allBranches")}</SelectItem>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
          <Select value={String(month)} onValueChange={(v: any) => setMonth(Number(v))}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m: any, i: number) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select>
          <Select value={String(year)} onValueChange={(v: any) => setYear(Number(v))}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{[2024, 2025, 2026, 2027].map((y: any) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 ms-1" /> CSV</Button>
        </div>
      </div>

      {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label={t("finance.totalRevenue")} value={fmtMoney(data.totalRevenue, t("common.egp"))} trend={data.revenueDelta} />
            <KpiCard label={t("finance.netProfit")} value={fmtMoney(data.netProfit, t("common.egp"))} tone={data.netProfit >= 0 ? "success" : "danger"} />
            <KpiCard label={t("reports.avgInvoice")} value={fmtMoney(data.avgOrder, t("common.egp"))} />
            <KpiCard label={t("reports.bottleneck")} value={STAGE_LABELS[data.bottleneck[0]] ?? data.bottleneck[0]} tone="warn" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4 text-teal-600" />{t("reports.systemTalk")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {data.insights.map((ins: Insight, i: number) => (
                  <div key={i} className={`p-4 rounded-2xl border ${ins.tone === "good" ? "bg-emerald-50 border-emerald-100" : ins.tone === "warn" ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
                    <div className="font-black text-sm mb-1">{ins.title}</div>
                    <div className="text-xs text-muted-foreground">{ins.body}</div>
                    <div className="mt-2 text-xs font-bold text-teal-700">{t("reports.suggestedAction")} {ins.action}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4 text-teal-600" />{t("reports.stuckByStage")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.stageCounts).map(([stage, count]: any) => (
                  <div key={stage} className="space-y-1">
                    <div className="flex justify-between text-xs"><span>{STAGE_LABELS[stage] ?? stage}</span><span className="font-bold">{count}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-teal-500" style={{ width: `${Math.min(100, (count / (data.totalOrders || 1)) * 200)}%` }} /></div>
                  </div>
                ))}
                {!Object.keys(data.stageCounts).length && <div className="text-center text-xs text-muted-foreground py-10">{t("reports.noPieces")}</div>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, trend, tone }: { label: string; value: string; trend?: number; tone?: "success" | "danger" | "warn" }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl font-black mt-1 ${tone === "success" ? "text-emerald-700" : tone === "danger" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-slate-900"}`}>{value}</div>
        {trend !== undefined && (
          <div className={`text-[10px] mt-1 flex items-center gap-1 font-bold ${trend >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
