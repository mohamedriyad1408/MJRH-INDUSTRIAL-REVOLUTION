import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CalendarCheck, CheckCircle2, ClipboardCheck, Loader2, LockKeyhole, Map, PackageCheck, PlayCircle, RefreshCw, Sparkles, Wallet } from "lucide-react";
import { interpolate, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/daily-operations")({
  head: () => ({ meta: [{ title: "Daily Ops - MJRH" }] }),
  component: DailyOperationsPage,
});

type Step = { key: string; title: string; detail: string; href?: string; ok: boolean; danger?: boolean; action?: () => Promise<void> | void };

type OpsData = {
  tenantReady: any | null;
  activeCash: number;
  closedCash: number;
  financialDanger: number;
  apdoMissing: number;
  lowStock: number;
  lateOrders: number;
  openPickups: number;
  readyNoDriver: number;
  unpaidReady: number;
  invoiceReview: number;
  ordersToday: number;
  revenueToday: number;
  cashIn: number;
  cashOut: number;
};

function todayKey() { return new Date().toISOString().slice(0, 10); }

function DailyOperationsPage() {
  const { hasRole, tenantId, user } = useAuth();
  const { t, dir } = useI18n();
  const canUse = hasRole("owner", "ops_manager", "cs_manager");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [data, setData] = useState<OpsData | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const storageKey = `mjrh_daily_ops_${tenantId ?? "none"}_${todayKey()}`;

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch { setDone({}); }
  }, [storageKey]);

  function mark(key: string, val = true) {
    const next = { ...done, [key]: val };
    setDone(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function load() {
    if (!canUse || !tenantId) { setLoading(false); return; }
    setLoading(true);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();
    const today = startIso.slice(0, 10);
    const now = new Date().toISOString();

    const [tenantReady, activeCash, closedCash, fin, apdo, lowStock, late, pickups, readyNoDriver, unpaid, invoices, orders, cash] = await Promise.all([
      supabase.from("tenant_bootstrap_health").select("*").eq("tenant_id", tenantId).maybeSingle().then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("cash_accounts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("daily_cash_closings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("closing_date", today).eq("status", "closed"),
      supabase.from("financial_operation_audit").select("source_id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("severity", "danger").then((r: any) => r).catch(() => ({ count: 0 })),
      supabase.from("operation_answer_matrix").select("id").eq("tenant_id", tenantId).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true).lte("current_qty", 0).then((r: any) => r).catch(() => ({ count: 0 })),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).not("status", "in", "(delivered,cancelled)").lt("promised_delivery_at", now),
      supabase.from("pickup_requests").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["pending", "assigned"]),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "ready").is("assigned_driver_employee_id", null),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["ready", "out_for_delivery"]).neq("payment_status", "paid"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
      supabase.from("orders").select("id,total,status,created_at").eq("tenant_id", tenantId).gte("created_at", startIso),
      supabase.from("cash_transactions").select("amount,direction,source_type,happened_at,cash_accounts!inner(tenant_id)").eq("cash_accounts.tenant_id", tenantId).gte("happened_at", startIso).neq("status", "void").then((r: any) => r).catch(() => ({ data: [] })),
    ]);

    const apdoRows = apdo.data ?? [];
    const apdoMissing = apdoRows.filter((r: any) => r.branch_answer !== "answered" || r.cash_answer === "missing_cash_account" || r.journal_answer === "missing_journal" || r.report_answer !== "answered" || r.notification_answer === "missing_notification").length;
    const os = orders.data ?? [];
    const cs = cash.data ?? [];
    setData({
      tenantReady: tenantReady.data ?? null,
      activeCash: activeCash.count ?? 0,
      closedCash: closedCash.count ?? 0,
      financialDanger: fin.count ?? 0,
      apdoMissing,
      lowStock: lowStock.count ?? 0,
      lateOrders: late.count ?? 0,
      openPickups: pickups.count ?? 0,
      readyNoDriver: readyNoDriver.count ?? 0,
      unpaidReady: unpaid.count ?? 0,
      invoiceReview: invoices.count ?? 0,
      ordersToday: os.length,
      revenueToday: os.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0),
      cashIn: cs.filter((x: any) => x.direction === "in" && x.source_type !== "cash_transfer").reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
      cashOut: cs.filter((x: any) => x.direction === "out" && x.source_type !== "cash_transfer").reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
    });
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tenantId, canUse]);

  async function runAction(key: string, fn: () => Promise<void>) {
    setRunning(key);
    try { await fn(); mark(key); await load(); }
    finally { setRunning(null); }
  }

  async function runSmartAlerts() {
    if (!tenantId) return;
    const { data, error } = await supabase.rpc("generate_smart_operational_alerts", { _tenant_id: tenantId });
    if (error) toast.error(error.message); else toast.success(interpolate(t("dailyOps.toastAlerts"), { count: data ?? 0 }));
  }

  async function repairFinance() {
    if (!tenantId) return;
    const { data, error } = await supabase.rpc("repair_financial_operation_audit", { _tenant_id: tenantId, _max_items: 100 });
    if (error) toast.error(error.message); else toast.success(interpolate(t("dailyOps.toastFinanceRepair"), { fixed: data?.fixed ?? 0, remaining: data?.remaining ?? 0 }));
  }

  async function saveReport(kind: "start" | "end") {
    if (!data) return;
    const title = kind === "start" ? t("dailyOps.step.startReport.title") : t("dailyOps.step.endReport.title");
    const body = [
      title,
      `${t("common.date")}: ${new Date().toLocaleDateString("ar-EG")}`,
      `${t("dailyOps.step.ready.title")}: ${data.tenantReady?.is_ready ? t("dailyOps.step.ready.ok") : t("dailyOps.step.ready.fail")}`,
      `${t("dailyOps.kpi.finance")}: ${data.financialDanger}`,
      `${t("dailyOps.step.apdo.title")}: ${data.apdoMissing}`,
      `${t("today.kpi.ordersToday")}: ${data.ordersToday}`,
      `${t("today.kpi.revenueToday")}: ${fmtMoney(data.revenueToday)}`,
      `${t("dailyOps.kpi.cashIn")}: ${fmtMoney(data.cashIn)}`,
      `${t("common.out")}: ${fmtMoney(data.cashOut)}`,
      `${t("dailyOps.kpi.safes")}: ${data.closedCash}/${data.activeCash}`,
      `${t("dailyOps.step.late.title")}: ${data.lateOrders}`,
      `${t("dailyOps.step.map.title")}: ${data.readyNoDriver}`,
      `${t("dailyOps.step.receivables.title")}: ${data.unpaidReady}`,
    ].join("\n");
    const { error } = await supabase.from("app_notifications").insert({ tenant_id: tenantId, audience: "owner", title, body, href: "/daily-operations", tone: data.financialDanger || data.apdoMissing ? "warning" : "success" });
    if (error) toast.error(error.message); else toast.success(t("dailyOps.toastReportSaved"));
  }

  const startSteps: Step[] = useMemo(() => data ? [
    { key: "ready", title: t("dailyOps.step.ready.title"), detail: data.tenantReady?.is_ready ? t("dailyOps.step.ready.ok") : t("dailyOps.step.ready.fail"), href: "/system-health", ok: !!data.tenantReady?.is_ready, danger: !data.tenantReady?.is_ready },
    { key: "finance", title: t("dailyOps.step.finance.title"), detail: data.financialDanger ? `${data.financialDanger} ${t("system.report.danger")}` : t("dailyOps.step.finance.ok"), href: "/system-health", ok: data.financialDanger === 0, danger: data.financialDanger > 0, action: () => runAction("finance", repairFinance) },
    { key: "alerts", title: t("dailyOps.step.alerts.title"), detail: t("dailyOps.step.alerts.detail"), ok: !!done.alerts, action: () => runAction("alerts", runSmartAlerts) },
    { key: "map", title: t("dailyOps.step.map.title"), detail: data.readyNoDriver || data.openPickups ? `Pickups ${data.openPickups} / Ready ${data.readyNoDriver}` : t("dailyOps.step.map.ok"), href: "/live-map", ok: data.readyNoDriver === 0 },
    { key: "start-report", title: t("dailyOps.step.startReport.title"), detail: t("dailyOps.step.startReport.detail"), ok: !!done["start-report"], action: () => runAction("start-report", () => saveReport("start")) },
  ] : [], [data, done, t]);

  const monitorSteps: Step[] = useMemo(() => data ? [
    { key: "orders", title: t("dailyOps.step.orders.title"), detail: `${data.ordersToday} ${t("stations.common.orders")} · ${fmtMoney(data.revenueToday, t("common.egp"))}`, href: "/today", ok: true },
    { key: "late", title: t("dailyOps.step.late.title"), detail: data.lateOrders ? `${data.lateOrders} ${t("notif.orderLate")}` : t("dailyOps.step.late.ok"), href: "/today", ok: data.lateOrders === 0, danger: data.lateOrders > 0 },
    { key: "invoice", title: t("dailyOps.step.invoice.title"), detail: data.invoiceReview ? `${data.invoiceReview} ${t("system.check.invoice.fix")}` : t("dailyOps.step.invoice.ok"), href: "/orders", ok: data.invoiceReview === 0 },
    { key: "receivables", title: t("dailyOps.step.receivables.title"), detail: data.unpaidReady ? `${data.unpaidReady} ${t("system.check.unpaid.fix")}` : t("dailyOps.step.receivables.ok"), href: "/receivables", ok: data.unpaidReady === 0 },
    { key: "stock", title: t("dailyOps.step.stock.title"), detail: data.lowStock ? `${data.lowStock} ${t("system.check.stock.fix")}` : t("dailyOps.step.stock.ok"), href: "/inventory", ok: data.lowStock === 0 },
  ] : [], [data, t]);

  const endSteps: Step[] = useMemo(() => data ? [
    { key: "cash-close", title: t("dailyOps.step.cash.title"), detail: `${data.closedCash}/${data.activeCash} ${t("cashClosing.allBranches")}`, href: "/cash-closing", ok: data.activeCash > 0 && data.closedCash >= data.activeCash, danger: !(data.activeCash > 0 && data.closedCash >= data.activeCash) },
    { key: "apdo", title: t("dailyOps.step.apdo.title"), detail: data.apdoMissing ? `${data.apdoMissing} ${t("system.check.apdo.fix")}` : t("dailyOps.step.apdo.ok"), href: "/system-health", ok: data.apdoMissing === 0 },
    { key: "reports", title: t("dailyOps.step.reports.title"), detail: t("dailyOps.step.reports.detail"), href: "/reports", ok: true },
    { key: "end-report", title: t("dailyOps.step.endReport.title"), detail: t("dailyOps.step.endReport.detail"), ok: !!done["end-report"], action: () => runAction("end-report", () => saveReport("end")) },
  ] : [], [data, done, t]);

  // جاهزية العمل أثناء اليوم لا يجب أن تنقص بسبب مهام نهاية اليوم مثل إقفال الخزنة.
  // إقفال الخزن وتقرير نهاية اليوم يظهران كمهام منفصلة في قسم "أنهِ اليوم".
  const workReadinessSteps = [...startSteps, ...monitorSteps];
  const endOfDayScore = data ? Math.round((endSteps.filter((s) => s.ok).length / Math.max(1, endSteps.length)) * 100) : 0;
  const score = data ? Math.round((workReadinessSteps.filter((s) => s.ok).length / Math.max(1, workReadinessSteps.length)) * 100) : 0;

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("dailyOps.ownerOnly")}</CardContent></Card>;
  if (loading || !data) return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div>;

  return <div className="space-y-5" dir={dir}>
    <div className="rounded-3xl bg-gradient-to-br from-violet-700 via-slate-900 to-teal-800 text-white p-5 shadow-xl overflow-hidden relative">
      <div className="absolute -top-20 -left-16 w-48 h-48 rounded-full bg-teal-300/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 w-56 h-56 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-black flex items-center gap-2"><CalendarCheck className="w-7 h-7 text-teal-200" />{t("dailyOps.title")}</h1><p className="text-sm text-white/75 mt-1">{t("dailyOps.subtitle")}</p></div>
        <div className="text-center rounded-3xl bg-white/10 border border-white/15 p-4 min-w-32"><div className="text-xs text-white/70">{t("dailyOps.score")}</div><div className="text-4xl font-black text-teal-200">{score}%</div><div className="text-[11px] text-white/60 mt-1">{t("dailyOps.scoreEnd")} {endOfDayScore}%</div></div>
      </div>
    </div>

    <div className="grid md:grid-cols-5 gap-3">
      <Kpi label={t("today.kpi.ordersToday")} value={data.ordersToday} />
      <Kpi label={t("today.kpi.revenueToday")} value={fmtMoney(data.revenueToday, t("common.egp"))} />
      <Kpi label={t("dailyOps.kpi.cashIn")} value={fmtMoney(data.cashIn, t("common.egp"))} />
      <Kpi label={t("dailyOps.kpi.finance")} value={data.financialDanger} warn={data.financialDanger > 0} />
      <Kpi label={t("dailyOps.kpi.safes")} value={`${data.closedCash}/${data.activeCash}`} warn={!(data.activeCash > 0 && data.closedCash >= data.activeCash)} />
    </div>

    <Section title={t("dailyOps.sec.start")} icon={<PlayCircle />} steps={startSteps} running={running} mark={mark} t={t} />
    <Section title={t("dailyOps.sec.monitor")} icon={<Sparkles />} steps={monitorSteps} running={running} mark={mark} t={t} />
    <Section title={t("dailyOps.sec.end")} icon={<LockKeyhole />} steps={endSteps} running={running} mark={mark} t={t} />
  </div>;
}

function Kpi({ label, value, warn }: { label: string; value: any; warn?: boolean }) {
  return <Card className={warn ? "border-amber-200 bg-amber-50" : "bg-white/80"}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-black mt-1">{value}</div></CardContent></Card>;
}

function Section({ title, icon, steps, running, mark, t }: { title: string; icon: React.ReactNode; steps: Step[]; running: string | null; mark: (key: string, val?: boolean) => void; t: any }) {
  return <Card className="bg-white/80 backdrop-blur"><CardHeader><CardTitle className="text-base flex items-center gap-2 text-teal-900"><span className="text-teal-600 [&_svg]:w-5 [&_svg]:h-5">{icon}</span>{title}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-3">
    {steps.map((s) => <div key={s.key} className={`rounded-2xl border p-3 ${s.danger ? "bg-red-50 border-red-200" : s.ok ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-start justify-between gap-2"><div><div className="font-black flex items-center gap-2">{s.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}{s.title}</div><div className="text-xs text-muted-foreground mt-1">{s.detail}</div></div><Badge variant={s.ok ? "secondary" : s.danger ? "destructive" : "outline"}>{s.ok ? t("dailyOps.status.done") : t("dailyOps.status.todo")}</Badge></div>
      <div className="flex flex-wrap gap-2 mt-3">{s.href && <Button asChild size="sm" variant="outline"><Link to={s.href as any}>{t("dailyOps.btn.open")}</Link></Button>}{s.action && <Button size="sm" onClick={s.action} disabled={running === s.key}>{running === s.key ? <Loader2 className="w-3 h-3 animate-spin ms-1" /> : <RefreshCw className="w-3 h-3 ms-1" />}{t("dailyOps.btn.run")}</Button>}<Button size="sm" variant="ghost" onClick={() => mark(s.key, !s.ok)}><ClipboardCheck className="w-3 h-3 ms-1" />{s.ok ? t("dailyOps.btn.undone") : t("dailyOps.btn.done")}</Button></div>
    </div>)}
  </CardContent></Card>;
}
