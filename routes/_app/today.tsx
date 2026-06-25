import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarCheck, ClipboardList, Map, Wallet, BarChart3, ShieldCheck, Bell, Loader2, Truck, AlertTriangle, RotateCcw, CreditCard } from "lucide-react";
import { autoAssignDrivers } from "@/lib/driver-assignment";

export const Route = createFileRoute("/_app/today")({
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
  unpaidReady: number;
  invoiceReview: number;
  proofReview: number;
  cashClosings: number;
};

function TodayCenter() {
  const { hasRole } = useAuth();
  const canView = hasRole("owner", "ops_manager", "cs_manager");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Summary | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);

  async function load() {
    if (!canView) return;
    setLoading(true);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();
    const todayStr = start.toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const [orders, cash, pickups, readyNoDriver, reclean, qc, unpaid, invoices, proofs, closings,
      lateDetail, pickupDetail, noDriverDetail, recleanDetail, qcDetail, unpaidDetail, invoiceDetail, proofDetail] = await Promise.all([
      (supabase as any).from("orders").select("id,total,status,promised_delivery_at,created_at").gte("created_at", startIso),
      (supabase as any).from("cash_transactions").select("amount,direction,happened_at").gte("happened_at", startIso).neq("status", "void").then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("pickup_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "assigned"]),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "ready").is("assigned_driver_employee_id", null),
      (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("needs_reclean", true),
      (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("current_stage", "qc_failed"),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid"),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("payment_verification_status", ["pending_review", "underpaid"]),
      (supabase as any).from("daily_cash_closings").select("id", { count: "exact", head: true }).eq("closing_date", todayStr),
      (supabase as any).from("orders").select("id,order_number,promised_delivery_at,customers(full_name)").lt("promised_delivery_at", now).not("status", "in", "(delivered,cancelled)").limit(4),
      (supabase as any).from("pickup_requests").select("id,customer_name,status").in("status", ["pending", "assigned"]).limit(4),
      (supabase as any).from("orders").select("id,order_number,customers(full_name)").eq("status", "ready").is("assigned_driver_employee_id", null).limit(4),
      (supabase as any).from("service_units").select("id,label_code,name,order_id,reclean_reason,orders(order_number)").eq("needs_reclean", true).limit(4),
      (supabase as any).from("service_units").select("id,label_code,name,order_id,orders(order_number)").eq("current_stage", "qc_failed").limit(4),
      (supabase as any).from("orders").select("id,order_number,total,customers(full_name)").in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid").limit(4),
      (supabase as any).from("orders").select("id,order_number,status,customers(full_name)").in("status", ["packing", "ready"]).is("invoice_finalized_at", null).limit(4),
      (supabase as any).from("orders").select("id,order_number,payment_verification_status,customers(full_name)").in("payment_verification_status", ["pending_review", "underpaid"]).limit(4),
    ]);
    const os = orders.data ?? [];
    const cs = cash.data ?? [];

    const issueDetails = [
      ...(lateDetail.data ?? []).map((o: any) => ({ type: "متأخر", title: `طلب #${o.order_number}`, sub: o.customers?.full_name ?? "عميل", href: `/orders/${o.id}`, tone: "red", icon: AlertTriangle })),
      ...(pickupDetail.data ?? []).map((p: any) => ({ type: "استلام", title: p.customer_name, sub: p.status === "pending" ? "بانتظار مندوب" : "مندوب في الطريق", href: "/live-map", tone: "blue", icon: Truck })),
      ...(noDriverDetail.data ?? []).map((o: any) => ({ type: "مندوب", title: `طلب #${o.order_number}`, sub: "جاهز بلا مندوب", href: "/live-map", tone: "amber", icon: Truck, quick: "assignDrivers" })),
      ...(recleanDetail.data ?? []).map((u: any) => ({ type: "مرتجع", title: `${u.label_code} — ${u.name}`, sub: `طلب #${u.orders?.order_number ?? "?"}`, href: `/orders/${u.order_id}`, tone: "red", icon: RotateCcw })),
      ...(qcDetail.data ?? []).map((u: any) => ({ type: "جودة", title: `${u.label_code} — ${u.name}`, sub: `طلب #${u.orders?.order_number ?? "?"}`, href: `/orders/${u.order_id}`, tone: "red", icon: ShieldCheck })),
      ...(unpaidDetail.data ?? []).map((o: any) => ({ type: "دفع", title: `طلب #${o.order_number}`, sub: `${Number(o.total ?? 0).toLocaleString("en-US")} جنيه`, href: `/orders/${o.id}`, tone: "amber", icon: CreditCard })),
      ...(invoiceDetail.data ?? []).map((o: any) => ({ type: "فاتورة", title: `طلب #${o.order_number}`, sub: "تحتاج اعتماد", href: `/orders/${o.id}`, tone: "amber", icon: CreditCard })),
      ...(proofDetail.data ?? []).map((o: any) => ({ type: "إيصال", title: `طلب #${o.order_number}`, sub: o.payment_verification_status === "underpaid" ? "أقل من المطلوب" : "قيد المراجعة", href: `/orders/${o.id}`, tone: "red", icon: CreditCard })),
    ];
    setDetails(issueDetails.slice(0, 12));
    setData({
      ordersToday: os.length,
      revenueToday: os.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0),
      cashIn: cs.filter((x: any) => x.direction === "in").reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
      cashOut: cs.filter((x: any) => x.direction === "out").reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
      activeOrders: os.filter((o: any) => !["delivered", "cancelled"].includes(o.status)).length,
      lateOrders: os.filter((o: any) => o.promised_delivery_at && o.promised_delivery_at < now && !["delivered", "cancelled"].includes(o.status)).length,
      openPickups: pickups.count ?? 0,
      readyNoDriver: readyNoDriver.count ?? 0,
      reclean: reclean.count ?? 0,
      qcIssues: qc.count ?? 0,
      unpaidReady: unpaid.count ?? 0,
      invoiceReview: invoices.count ?? 0,
      proofReview: proofs.count ?? 0,
      cashClosings: closings.count ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, [canView]);

  const critical = useMemo(() => {
    if (!data) return 0;
    return data.lateOrders + data.reclean + data.qcIssues + data.unpaidReady + data.readyNoDriver + data.proofReview;
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
    const body = [
      "مركز اليوم",
      `طلبات اليوم: ${data.ordersToday}`,
      `إيراد اليوم: ${fmtMoney(data.revenueToday)}`,
      `داخل الخزنة: ${fmtMoney(data.cashIn)}`,
      `خارج الخزنة: ${fmtMoney(data.cashOut)}`,
      `طلبات متأخرة: ${data.lateOrders}`,
      `استلامات مفتوحة: ${data.openPickups}`,
      `مرتجعات غسيل: ${data.reclean}`,
      `مشاكل جودة: ${data.qcIssues}`,
      `جاهز غير مدفوع: ${data.unpaidReady}`,
      `إقفالات خزنة اليوم: ${data.cashClosings}`,
    ].join("\n");
    const { error } = await (supabase as any).from("app_notifications").insert({
      audience: "owner",
      title: "تقرير مركز اليوم",
      body,
      href: "/today",
      tone: critical ? "warning" : "success",
    });
    if (error) toast.error(error.message); else toast.success("تم حفظ تقرير مركز اليوم في التنبيهات");
  }

  if (!canView) return <Card><CardContent className="p-10 text-center text-muted-foreground">مركز اليوم للمالك ومدير التشغيل وخدمة العملاء فقط.</CardContent></Card>;
  if (loading || !data) return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><CalendarCheck className="w-7 h-7 text-teal-600" />مركز اليوم</h1>
        <p className="text-sm text-muted-foreground">افتح هذه الصفحة أول اليوم وآخر اليوم: تعرض أهم ما يحتاج متابعة الآن.</p>
      </div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}>تحديث</Button><Button onClick={saveDailyReport}><Bell className="w-4 h-4 ms-1" />حفظ تقرير اليوم</Button></div>
    </div>

    <div className="grid md:grid-cols-4 gap-3">
      <Kpi label="طلبات اليوم" value={data.ordersToday} />
      <Kpi label="إيراد اليوم" value={fmtMoney(data.revenueToday)} />
      <Kpi label="مشاكل تحتاج تدخل" value={critical} warn={critical > 0} />
      <Kpi label="إقفال الخزنة" value={data.cashClosings ? "تم" : "لم يتم"} warn={!data.cashClosings} />
    </div>

    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />تفاصيل تحتاج إجراء الآن</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {details.length === 0 && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 font-bold text-center">لا توجد عناصر عاجلة الآن ✅</div>}
        {details.map((d, i) => { const Icon = d.icon; const row = <div className={`rounded-xl border p-3 text-sm ${d.tone === "red" ? "bg-red-50 border-red-200 text-red-800" : d.tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}><div className="flex items-center justify-between gap-2"><span className="font-black flex items-center gap-2"><Icon className="w-4 h-4" />{d.title}</span><Badge variant="secondary">{d.type}</Badge></div><div className="text-xs mt-1 opacity-80">{d.sub}</div>{d.quick === "assignDrivers" && <Button size="sm" className="mt-2" disabled={assigning} onClick={(e) => { e.preventDefault(); runAssignDrivers(); }}>{assigning ? <Loader2 className="w-3 h-3 animate-spin ms-1" /> : null}توزيع الآن</Button>}</div>; return <Link key={i} to={d.href as any}>{row}</Link>; })}
      </CardContent>
    </Card>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      <ActionCard title="فحص النظام" detail="راجع الأساسيات والمشاكل المفتوحة" to="/system-health" icon={<ShieldCheck />} count={critical} />
      <ActionCard title="الطلبات" detail="طلبات بلا قطع، فواتير، إيصالات، مشاكل" to="/orders" icon={<ClipboardList />} count={data.activeOrders} />
      <ActionCard title="الخريطة" detail="استلامات، تسليمات، مناديب ومواقع" to="/live-map" icon={<Map />} count={data.openPickups + data.readyNoDriver} />
      <ActionCard title="الخزنة" detail="راجع الداخل والخارج واقفل اليوم" to="/cash-closing" icon={<Wallet />} count={data.cashClosings ? 0 : 1} />
      <ActionCard title="التقارير" detail="تحليل أعمق حسب الدور" to="/reports" icon={<BarChart3 />} />
      <ActionCard title="ذمم العملاء" detail="جاهز غير مدفوع والتحصيل" to="/receivables" icon={<Wallet />} count={data.unpaidReady} />
    </div>
  </div>;
}

function Kpi({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) {
  return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>;
}

function ActionCard({ title, detail, to, icon, count }: { title: string; detail: string; to: string; icon: React.ReactNode; count?: number }) {
  return <Link to={to as any}><Card className="hover:shadow-md transition"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-2"><div className="text-teal-600 [&_svg]:w-5 [&_svg]:h-5">{icon}</div><div><div className="font-black">{title}</div><div className="text-xs text-muted-foreground mt-1">{detail}</div></div></div>{typeof count === "number" && count > 0 && <Badge variant="destructive">{count}</Badge>}</div></CardContent></Card></Link>;
}
