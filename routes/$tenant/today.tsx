import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarCheck, ClipboardList, Map, Wallet, BarChart3, ShieldCheck, Bell, Loader2, Truck, AlertTriangle, RotateCcw, CreditCard } from "lucide-react";
import { autoAssignDrivers } from "@/lib/driver-assignment";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/today")({
  head: () => ({ meta: [{ title: "مركز اليوم" }] }),
  component: TodayCenter,
});

type Summary = {
  ordersToday: number;
  revenueToday: number;
  cashIn: number;
  cashOut: number;
  activeOrders: number;
  lateOrders: number;
  openPickups: number;
  readyNoDriver: number;
  reclean: number;
  qcIssues: number;
  labelIssues: number;
  unpaidReady: number;
  invoiceReview: number;
  proofReview: number;
  cashClosings: number;
  cashSafes: number;
  deliveredToday: number;
  lastClosingDiff: number | null;
  lastClosingAccount: string | null;
  driverCollections: number;
  driverTips: number;
  stuckByStage: Record<string, number>;
  delayByStage: Record<string, number>;
};

function TodayCenter() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const canView = hasRole("owner", "ops_manager", "cs_manager");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Summary | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [latestReports, setLatestReports] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");

  function withBranch(q: any, table = "branch_id") {
    return branchId === "all" ? q : q.eq(table, branchId);
  }

  function orderQuery(select: string, options?: any) {
    return withBranch(supabase.from("orders").select(select, options));
  }

  function unitQuery(select: string, options?: any) {
    const q = supabase.from("service_units").select(branchId === "all" ? select : `${select},orders!inner(branch_id)`, options);
    return branchId === "all" ? q : q.eq("orders.branch_id", branchId);
  }

  function cashTxQuery(select: string) {
    const q = supabase.from("cash_transactions").select(branchId === "all" ? select : `${select},cash_accounts!inner(branch_id)`);
    return branchId === "all" ? q : q.eq("cash_accounts.branch_id", branchId);
  }

  async function load() {
    if (!canView) return;
    setLoading(true);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();
    const todayStr = start.toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const [orders, cash, pickups, readyNoDriver, reclean, qc, labels, unpaid, invoices, proofs, closings,
      lateDetail, pickupDetail, noDriverDetail, recleanDetail, qcDetail, labelDetail, unpaidDetail, invoiceDetail, proofDetail,
      deliveredToday, lastClosing, driverCash, reportsRes, cashSafesRes] = await Promise.all([
      orderQuery("id,total,status,promised_delivery_at,created_at").gte("created_at", startIso),
      cashTxQuery("amount,direction,happened_at,source_type").gte("happened_at", startIso).neq("status", "void").then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("pickup_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "assigned"]),
      orderQuery("id", { count: "exact", head: true }).eq("status", "ready").is("assigned_driver_employee_id", null),
      unitQuery("id", { count: "exact", head: true }).eq("needs_reclean", true),
      unitQuery("id", { count: "exact", head: true }).eq("current_stage", "qc_failed"),
      unitQuery("id", { count: "exact", head: true }).in("label_status", ["missing_label", "unclear_label"]),
      orderQuery("id", { count: "exact", head: true }).in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid"),
      orderQuery("id", { count: "exact", head: true }).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
      orderQuery("id", { count: "exact", head: true }).in("payment_verification_status", ["pending_review", "underpaid"]),
      withBranch(supabase.from("daily_cash_closings").select("id", { count: "exact", head: true })).eq("closing_date", todayStr),
      orderQuery("id,order_number,status,promised_delivery_at,customers(full_name)").lt("promised_delivery_at", now).not("status", "in", "(delivered,cancelled)").limit(4),
      supabase.from("pickup_requests").select("id,customer_name,status").in("status", ["pending", "assigned"]).limit(4),
      orderQuery("id,order_number,customers(full_name)").eq("status", "ready").is("assigned_driver_employee_id", null).limit(4),
      unitQuery("id,label_code,name,order_id,reclean_reason,orders(order_number)").eq("needs_reclean", true).limit(4),
      unitQuery("id,label_code,name,order_id,orders(order_number)").eq("current_stage", "qc_failed").limit(4),
      unitQuery("id,label_code,name,order_id,label_status,orders(order_number)").in("label_status", ["missing_label", "unclear_label"]).limit(4),
      orderQuery("id,order_number,total,customers(full_name)").in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid").limit(4),
      orderQuery("id,order_number,status,customers(full_name)").in("status", ["packing", "ready"]).is("invoice_finalized_at", null).limit(4),
      orderQuery("id,order_number,payment_verification_status,customers(full_name)").in("payment_verification_status", ["pending_review", "underpaid"]).limit(4),
      orderQuery("id", { count: "exact", head: true }).eq("status", "delivered").gte("updated_at", startIso),
      withBranch(supabase.from("daily_cash_closings").select("difference,cash_accounts(name),closed_at")).order("closed_at", { ascending: false }).limit(1).maybeSingle().then((r: any) => r).catch(() => ({ data: null })),
      cashTxQuery("amount,source_type,happened_at").in("source_type", ["order_payment", "driver_tip_delivery", "driver_tip"]).gte("happened_at", startIso).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("app_notifications").select("id,title,body,href,tone,created_at").ilike("title", "%تقرير%").order("created_at", { ascending: false }).limit(5).then((r: any) => r).catch(() => ({ data: [] })),
      withBranch(supabase.from("cash_accounts").select("id", { count: "exact", head: true })).eq("is_active", true).then((r: any) => r).catch(() => ({ count: 0 })),
    ]);
    const os = orders.data ?? [];
    const cs = cash.data ?? [];
    const driverTx = driverCash.data ?? [];
    const stuckByStage = os
      .filter((o: any) => !["delivered", "cancelled"].includes(o.status))
      .reduce((m: Record<string, number>, o: any) => { m[o.status] = (m[o.status] ?? 0) + 1; return m; }, {});
    const delayByStage = (lateDetail.data ?? [])
      .reduce((m: Record<string, number>, o: any) => { m[o.status ?? "unknown"] = (m[o.status ?? "unknown"] ?? 0) + 1; return m; }, {});

    const issueDetails = [
      ...(lateDetail.data ?? []).map((o: any) => ({ type: "متأخر", title: `طلب #${o.order_number}`, sub: o.customers?.full_name ?? "عميل", href: `/orders/${o.id}`, tone: "red", icon: AlertTriangle })),
      ...(pickupDetail.data ?? []).map((p: any) => ({ type: "استلام", title: p.customer_name, sub: p.status === "pending" ? "بانتظار مندوب" : "مندوب في الطريق", href: "/live-map", tone: "blue", icon: Truck })),
      ...(noDriverDetail.data ?? []).map((o: any) => ({ type: "مندوب", title: `طلب #${o.order_number}`, sub: "جاهز بلا مندوب", href: "/live-map", tone: "amber", icon: Truck, quick: "assignDrivers" })),
      ...(recleanDetail.data ?? []).map((u: any) => ({ type: "مرتجع", title: `${u.label_code} — ${u.name}`, sub: `طلب #${u.orders?.order_number ?? "?"}`, href: `/orders/${u.order_id}`, tone: "red", icon: RotateCcw })),
      ...(qcDetail.data ?? []).map((u: any) => ({ type: "جودة", title: `${u.label_code} — ${u.name}`, sub: `طلب #${u.orders?.order_number ?? "?"}`, href: `/orders/${u.order_id}`, tone: "red", icon: ShieldCheck })),
      ...(labelDetail.data ?? []).map((u: any) => ({ type: "مارك", title: `${u.label_code} — ${u.name}`, sub: `طلب #${u.orders?.order_number ?? "?"} — ${u.label_status === "missing_label" ? "بدون مارك" : "غير واضح"}`, href: "/stations/drying-assembly", tone: "red", icon: AlertTriangle })),
      ...(unpaidDetail.data ?? []).map((o: any) => ({ type: "دفع", title: `طلب #${o.order_number}`, sub: `${Number(o.total ?? 0).toLocaleString("en-US")} جنيه`, href: `/orders/${o.id}`, tone: "amber", icon: CreditCard })),
      ...(invoiceDetail.data ?? []).map((o: any) => ({ type: "فاتورة", title: `طلب #${o.order_number}`, sub: "تحتاج اعتماد", href: `/orders/${o.id}`, tone: "amber", icon: CreditCard })),
      ...(proofDetail.data ?? []).map((o: any) => ({ type: "إيصال", title: `طلب #${o.order_number}`, sub: o.payment_verification_status === "underpaid" ? "أقل من المطلوب" : "قيد المراجعة", href: `/orders/${o.id}`, tone: "red", icon: CreditCard })),
    ];
    setDetails(issueDetails.slice(0, 12));
    setLatestReports(reportsRes.data ?? []);
    setData({
      ordersToday: os.length,
      revenueToday: os.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0),
      cashIn: cs.filter((x: any) => x.direction === "in" && x.source_type !== "cash_transfer").reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
      cashOut: cs.filter((x: any) => x.direction === "out" && x.source_type !== "cash_transfer").reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
      activeOrders: os.filter((o: any) => !["delivered", "cancelled"].includes(o.status)).length,
      lateOrders: os.filter((o: any) => o.promised_delivery_at && o.promised_delivery_at < now && !["delivered", "cancelled"].includes(o.status)).length,
      openPickups: pickups.count ?? 0,
      readyNoDriver: readyNoDriver.count ?? 0,
      reclean: reclean.count ?? 0,
      qcIssues: qc.count ?? 0,
      labelIssues: labels.count ?? 0,
      unpaidReady: unpaid.count ?? 0,
      invoiceReview: invoices.count ?? 0,
      proofReview: proofs.count ?? 0,
      cashClosings: closings.count ?? 0,
      cashSafes: cashSafesRes.count ?? 0,
      deliveredToday: deliveredToday.count ?? 0,
      lastClosingDiff: lastClosing.data ? Number(lastClosing.data.difference ?? 0) : null,
      lastClosingAccount: lastClosing.data?.cash_accounts?.name ?? null,
      driverCollections: driverTx.filter((x: any) => x.source_type === "order_payment").reduce((sum: number, x: any) => sum + Number(x.amount ?? 0), 0),
      driverTips: driverTx.filter((x: any) => ["driver_tip_delivery", "driver_tip"].includes(x.source_type)).reduce((sum: number, x: any) => sum + Number(x.amount ?? 0), 0),
      stuckByStage,
      delayByStage,
    });
    setLoading(false);
  }

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at").then(({ data }: any) => setBranches(data ?? []));
  }, [tenantId]);

  useEffect(() => { load(); }, [canView, branchId]);

  const critical = useMemo(() => {
    if (!data) return 0;
    return data.lateOrders + data.reclean + data.qcIssues + data.labelIssues + data.unpaidReady + data.readyNoDriver + data.proofReview;
  }, [data]);

  async function runAssignDrivers() {
    setAssigning(true);
    try {
      const r = await autoAssignDrivers();
      toast.success(r.assigned ? `تم توزيع ${r.assigned} مهمة` : "لا توجد مهام قابلة للتوزيع الآن");
      load();
    } catch (e: any) { toast.error(e?.message ?? "تعذر التوزيع"); }
    finally { setAssigning(false); }
  }

  async function saveDailyReport() {
    if (!data) return;
    const branchName = branchId === "all" ? "كل الفروع" : branches.find((b) => b.id === branchId)?.name ?? "فرع محدد";
    const body = [
      `مركز اليوم - ${branchName}`,
      `طلبات اليوم: ${data.ordersToday}`,
      `إيراد اليوم: ${fmtMoney(data.revenueToday)}`,
      `داخل الخزنة: ${fmtMoney(data.cashIn)}`,
      `خارج الخزنة: ${fmtMoney(data.cashOut)}`,
      `طلبات متأخرة: ${data.lateOrders}`,
      `استلامات مفتوحة: ${data.openPickups}`,
      `مرتجعات غسيل: ${data.reclean}`,
      `مشاكل جودة: ${data.qcIssues}`,
      `مشاكل مارك/ليبل: ${data.labelIssues}`,
      `جاهز غير مدفوع: ${data.unpaidReady}`,
      `إقفالات خزنة اليوم: ${data.cashClosings}/${data.cashSafes}`,
    ].join("\n");
    const { error } = await supabase.from("app_notifications").insert({
      audience: "owner",
      title: "تقرير مركز اليوم",
      body,
      href: "/today",
      tone: critical ? "warning" : "success",
    });
    if (error) toast.error(error.message); else toast.success("تم حفظ تقرير مركز اليوم في التنبيهات");
  }


  function endOfDayReportText() {
    if (!data) return "";
    const today = new Date().toLocaleDateString("ar-EG");
    const problems = details.length
      ? details.map((d) => `- ${d.type}: ${d.title} — ${d.sub}`).join("\n")
      : "لا توجد مشاكل عاجلة مفتوحة";
    return [
      `تقرير نهاية اليوم - ${today} - ${branchId === "all" ? "كل الفروع" : branches.find((b) => b.id === branchId)?.name ?? "فرع محدد"}`,
      "",
      "أولًا: الحركة",
      `- طلبات اليوم: ${data.ordersToday}`,
      `- تم تسليمها اليوم: ${data.deliveredToday}`,
      `- طلبات نشطة: ${data.activeOrders}`,
      `- طلبات متأخرة: ${data.lateOrders}`,
      `- أسباب التأخير: ${Object.entries(data.delayByStage).map(([k,v]) => `${stageAr(k)} ${v}`).join("، ") || "لا يوجد"}`,
      `- استلامات مفتوحة: ${data.openPickups}`,
      `- توزيع الطلبات النشطة: ${Object.entries(data.stuckByStage).map(([k,v]) => `${stageAr(k)} ${v}`).join("، ") || "لا يوجد"}`,
      "",
      "ثانيًا: الماليات",
      `- إيراد اليوم: ${fmtMoney(data.revenueToday)}`,
      `- داخل الخزنة: ${fmtMoney(data.cashIn)}`,
      `- خارج الخزنة: ${fmtMoney(data.cashOut)}`,
      `- تحصيلات المندوبين: ${fmtMoney(data.driverCollections)}`,
      `- بقشيش المندوبين: ${fmtMoney(data.driverTips)}`,
      `- جاهز غير مدفوع: ${data.unpaidReady}`,
      `- إقفال الخزنة: ${data.cashSafes > 0 && data.cashClosings >= data.cashSafes ? "تم لكل الخزن" : `لم يكتمل (${data.cashClosings}/${data.cashSafes})`}`,
      data.lastClosingDiff !== null ? `- آخر فرق خزنة (${data.lastClosingAccount ?? "خزنة"}): ${fmtMoney(data.lastClosingDiff)}` : `- لا يوجد إقفال خزنة مسجل`,
      "",
      "ثالثًا: الجودة والتشغيل",
      `- مرتجعات غسيل: ${data.reclean}`,
      `- مشاكل جودة: ${data.qcIssues}`,
      `- مشاكل مارك/ليبل: ${data.labelIssues}`,
      `- فواتير تحتاج اعتماد: ${data.invoiceReview}`,
      `- إيصالات تحتاج مراجعة: ${data.proofReview}`,
      "",
      "المشاكل المفتوحة:",
      problems,
    ].join("\n");
  }

  async function copyEndOfDayReport() {
    if (!data) return;
    await navigator.clipboard?.writeText(endOfDayReportText());
    toast.success("تم نسخ تقرير نهاية اليوم");
  }

  async function saveEndOfDayReport() {
    if (!data) return;
    const body = endOfDayReportText();
    const { error } = await supabase.from("app_notifications").insert({
      audience: "owner",
      title: data.cashSafes > 0 && data.cashClosings >= data.cashSafes ? "تقرير نهاية اليوم" : "تقرير نهاية اليوم - الخزن لم تكتمل",
      body,
      href: data.cashSafes > 0 && data.cashClosings >= data.cashSafes ? "/today" : "/cash-closing",
      tone: !(data.cashSafes > 0 && data.cashClosings >= data.cashSafes) || critical ? "warning" : "success",
    });
    if (error) toast.error(error.message);
    else toast.success("تم حفظ تقرير نهاية اليوم في جرس التنبيهات");
  }


  async function copyReport(report: any) {
    await navigator.clipboard?.writeText(`${report.title}\n${report.body ?? ""}`);
    toast.success("تم نسخ التقرير");
  }

  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">مركز اليوم للمالك ومدير التشغيل وخدمة العملاء فقط.</CardContent></Card>;
  if (loading || !data) return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div>;

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><CalendarCheck className="w-7 h-7 text-teal-600" />{t("nav./today")}</h1>
        <p className="text-sm text-muted-foreground">{t("today.description")}</p>
      </div>
      <div className="flex flex-wrap gap-2"><Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.allBranches")}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={load}>{t("common.refresh")}</Button><Button variant="outline" onClick={saveDailyReport}><Bell className="w-4 h-4 ms-1" />{t("system.saveTodayReport")}</Button><Button variant="outline" onClick={copyEndOfDayReport}>{t("today.copyEndOfDay")}</Button><Button onClick={saveEndOfDayReport}>{t("today.endOfDayReport")}</Button></div>
    </div>

    <div className="grid md:grid-cols-6 gap-3">
      <Kpi label={t("today.kpi.ordersToday")} value={data.ordersToday} />
      <Kpi label={t("today.kpi.deliveredToday")} value={data.deliveredToday} />
      <Kpi label={t("today.kpi.revenueToday")} value={fmtMoney(data.revenueToday, t("common.egp"))} />
      <Kpi label={t("today.kpi.driverCollections")} value={fmtMoney(data.driverCollections, t("common.egp"))} />
      <Kpi label={t("today.kpi.criticalIssues")} value={critical} warn={critical > 0} />
      <Kpi label={t("today.kpi.cashClosing")} value={`${data.cashClosings}/${data.cashSafes}`} warn={!(data.cashSafes > 0 && data.cashClosings >= data.cashSafes)} />
    </div>

    {!(data.cashSafes > 0 && data.cashClosings >= data.cashSafes) && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-800 flex flex-wrap items-center justify-between gap-3"><div><b>{t("today.warn.cashClosingNotCompleted")}</b><div className="text-xs mt-1">{t("today.warn.cashClosingDetail").replace("{closed}", String(data.cashClosings)).replace("{total}", String(data.cashSafes))}</div></div><Button asChild size="sm"><Link to={"/$tenant/cash-closing" as any}>{t("today.warn.cashClosingBtn")}</Link></Button></CardContent></Card>}
    {data.lastClosingDiff !== null && data.lastClosingDiff !== 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-800"><b>آخر إقفال خزنة فيه فرق:</b> {data.lastClosingAccount ?? "خزنة"} — {fmtMoney(data.lastClosingDiff, t("common.egp"))}. راجع سبب الفرق.</CardContent></Card>}

    {Object.keys(data.delayByStage).length > 0 && <Card className="border-amber-200 bg-amber-50/50"><CardHeader><CardTitle className="text-base">من أين يأتي التأخير؟</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{Object.entries(data.delayByStage).map(([stage, count]) => <Badge key={stage} variant="secondary" className="text-sm">{stageAr(stage)}: {count}</Badge>)}</CardContent></Card>}

    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />{t("today.needsAction")}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {details.length === 0 && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 font-bold text-center">{t("today.noCritical")}</div>}
        {details.map((d, i) => { const Icon = d.icon; const row = <div className={`rounded-xl border p-3 text-sm ${d.tone === "red" ? "bg-red-50 border-red-200 text-red-800" : d.tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}><div className="flex items-center justify-between gap-2"><span className="font-black flex items-center gap-2"><Icon className="w-4 h-4" />{d.title}</span><Badge variant="secondary">{d.type}</Badge></div><div className="text-xs mt-1 opacity-80">{d.sub}</div>{d.quick === "assignDrivers" && <Button size="sm" className="mt-2" disabled={assigning} onClick={(e) => { e.preventDefault(); runAssignDrivers(); }}>{assigning ? <Loader2 className="w-3 h-3 animate-spin ms-1" /> : null}توزيع الآن</Button>}</div>; return <Link key={i} to={d.href as any}>{row}</Link>; })}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="text-base">{t("today.latestReports")}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {latestReports.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">{t("today.noReports")}</div>}
        {latestReports.map((r) => <div key={r.id} className="rounded-xl border p-3 bg-white text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">{r.title}</div><Badge variant={r.tone === "warning" || r.tone === "danger" ? "destructive" : "secondary"}>{new Date(r.created_at).toLocaleDateString("ar-EG")}</Badge></div>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground font-sans max-h-32 overflow-auto">{r.body}</pre>
          <div className="flex gap-2 mt-2"><Button size="sm" variant="outline" onClick={() => copyReport(r)}>نسخ</Button>{r.href && <Button asChild size="sm" variant="ghost"><Link to={r.href as any}>فتح</Link></Button>}</div>
        </div>)}
      </CardContent>
    </Card>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      <ActionCard title={t("today.card.systemHealth")} detail={t("today.card.systemHealthDetail")} to={"/$tenant/system-health" as any} icon={<ShieldCheck />} count={critical} />
      <ActionCard title={t("today.card.orders")} detail={t("today.card.ordersDetail")} to={"/$tenant/orders" as any} icon={<ClipboardList />} count={data.activeOrders} />
      <ActionCard title={t("today.card.map")} detail={t("today.card.mapDetail")} to={"/$tenant/live-map" as any} icon={<Map />} count={data.openPickups + data.readyNoDriver} />
      <ActionCard title={t("today.card.safe")} detail={t("today.card.safeDetail")} to={"/$tenant/cash-closing" as any} icon={<Wallet />} count={data.cashSafes > 0 && data.cashClosings >= data.cashSafes ? 0 : 1} />
      <ActionCard title={t("today.card.reports")} detail={t("today.card.reportsDetail")} to={"/$tenant/reports" as any} icon={<BarChart3 />} />
      <ActionCard title={t("today.card.receivables")} detail={t("today.card.receivablesDetail")} to={"/$tenant/receivables" as any} icon={<Wallet />} count={data.unpaidReady} />
    </div>
  </div>;
}


function stageAr(s: string) {
  return ({ received: "استقبال", cleaning: "غسيل", ironing: "كي", packing: "تغليف", ready: "جاهز", out_for_delivery: "توصيل" } as Record<string, string>)[s] ?? s;
}

function Kpi({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) {
  return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>;
}

function ActionCard({ title, detail, to, icon, count }: { title: string; detail: string; to: string; icon: React.ReactNode; count?: number }) {
  return <Link to={to as any}><Card className="hover:shadow-md transition"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-2"><div className="text-teal-600 [&_svg]:w-5 [&_svg]:h-5">{icon}</div><div><div className="font-black">{title}</div><div className="text-xs text-muted-foreground mt-1">{detail}</div></div></div>{typeof count === "number" && count > 0 && <Badge variant="destructive">{count}</Badge>}</div></CardContent></Card></Link>;
}
