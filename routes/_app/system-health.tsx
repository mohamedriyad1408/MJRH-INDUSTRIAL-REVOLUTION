import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldCheck, RefreshCw, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/system-health")({
  head: () => ({ meta: [{ title: "فحص النظام" }] }),
  component: SystemHealthPage,
});

type Check = {
  key: string;
  title: string;
  count: number;
  okWhenZero?: boolean;
  href?: string;
  fix?: string;
  severity: "ok" | "warn" | "danger";
};

function severityFor(count: number, okWhenZero = false): "ok" | "warn" | "danger" {
  if (okWhenZero) return count === 0 ? "ok" : count > 5 ? "danger" : "warn";
  return count > 0 ? "ok" : "danger";
}

function SystemHealthPage() {
  const { hasRole, tenantId } = useAuth();
  const canUse = hasRole("owner", "ops_manager") || hasRole("super_admin");
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [checks, setChecks] = useState<Check[]>([]);

  async function load() {
    if (!canUse) return;
    setLoading(true);
    try {
      const [
        cash, chart, settings, employees, services, customers, orders, units, pickups, readyNoDriver,
        reclean, qcFailed, unpaidReady, invoiceReview, paymentReview, driversNoLocation,
      ] = await Promise.all([
        (supabase as any).from("cash_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("chart_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("app_settings").select("tenant_id", { count: "exact", head: true }),
        (supabase as any).from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("service_items").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("customers").select("id", { count: "exact", head: true }),
        (supabase as any).from("orders").select("id,status", { count: "exact" }).not("status", "eq", "cancelled").limit(500),
        (supabase as any).from("service_units").select("id,order_id,status,current_stage").limit(2000),
        (supabase as any).from("pickup_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "assigned"]),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "ready").is("assigned_driver_employee_id", null),
        (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("needs_reclean", true),
        (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("current_stage", "qc_failed"),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid"),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("payment_verification_status", ["pending_review", "underpaid"]),
        (supabase as any).from("employees").select("id", { count: "exact", head: true }).eq("job_role", "driver").eq("is_active", true).is("current_lat", null),
      ]);

      const activeOrders = orders.data ?? [];
      const activeUnits = (units.data ?? []).filter((u: any) => u.status !== "cancelled" && u.current_stage !== "cancelled");
      const orderIdsWithPieces = new Set(activeUnits.map((u: any) => u.order_id));
      const noPieces = activeOrders.filter((o: any) => !orderIdsWithPieces.has(o.id)).length;

      const next: Check[] = [
        { key: "settings", title: "إعدادات المغسلة", count: settings.count ?? 0, severity: severityFor(settings.count ?? 0), href: "/settings", fix: "يتم إنشاؤها تلقائيًا عند فتح مغسلة جديدة" },
        { key: "cash", title: "الخزنة موجودة", count: cash.count ?? 0, severity: severityFor(cash.count ?? 0), href: "/accounting", fix: "اضغط إصلاح الأساسيات لإنشاء الخزنة الرئيسية" },
        { key: "chart", title: "شجرة الحسابات موجودة", count: chart.count ?? 0, severity: (chart.count ?? 0) >= 8 ? "ok" : "danger", href: "/ledger", fix: "اضغط إصلاح الأساسيات لإنشاء الحسابات" },
        { key: "employees", title: "موظفون نشطون", count: employees.count ?? 0, severity: severityFor(employees.count ?? 0), href: "/staff", fix: "أضف موظفين وحدد المحطة والراتب" },
        { key: "services", title: "خدمات مفعلة", count: services.count ?? 0, severity: severityFor(services.count ?? 0), href: "/services", fix: "أضف كتالوج الخدمات قبل إنشاء الطلبات" },
        { key: "customers", title: "عملاء مسجلون", count: customers.count ?? 0, severity: (customers.count ?? 0) > 0 ? "ok" : "warn", href: "/customers", fix: "أضف عميل أو استخدم بوابة العميل" },
        { key: "noPieces", title: "طلبات بلا قطع", count: noPieces, okWhenZero: true, severity: severityFor(noPieces, true), href: "/orders", fix: "افتح الطلب وسجل القطع" },
        { key: "pickups", title: "استلامات مفتوحة", count: pickups.count ?? 0, okWhenZero: true, severity: (pickups.count ?? 0) ? "warn" : "ok", href: "/live-map", fix: "وزعها على مندوبين من الخريطة" },
        { key: "readyNoDriver", title: "طلبات جاهزة بلا مندوب", count: readyNoDriver.count ?? 0, okWhenZero: true, severity: severityFor(readyNoDriver.count ?? 0, true), href: "/live-map", fix: "عين مندوب قبل خروج الطلب للتسليم" },
        { key: "reclean", title: "مرتجعات غسيل مفتوحة", count: reclean.count ?? 0, okWhenZero: true, severity: severityFor(reclean.count ?? 0, true), href: "/stations/cleaning", fix: "أنه المرتجع من محطة الغسيل" },
        { key: "qc", title: "مشاكل جودة مفتوحة", count: qcFailed.count ?? 0, okWhenZero: true, severity: severityFor(qcFailed.count ?? 0, true), href: "/stations/qc", fix: "راجع قرار الجودة وتواصل مع العميل عند الحاجة" },
        { key: "unpaid", title: "جاهز أو خارج وغير مدفوع", count: unpaidReady.count ?? 0, okWhenZero: true, severity: severityFor(unpaidReady.count ?? 0, true), href: "/receivables", fix: "حصّل أو راجع ذمم العملاء" },
        { key: "invoice", title: "فواتير تحتاج اعتماد", count: invoiceReview.count ?? 0, okWhenZero: true, severity: (invoiceReview.count ?? 0) ? "warn" : "ok", href: "/orders", fix: "راجع الطلب واضغط تأكيد وإشعار" },
        { key: "proof", title: "إيصالات دفع تحتاج مراجعة", count: paymentReview.count ?? 0, okWhenZero: true, severity: severityFor(paymentReview.count ?? 0, true), href: "/orders", fix: "راجع صورة الإيصال والمبلغ" },
        { key: "driverLocation", title: "مندوبون بلا موقع", count: driversNoLocation.count ?? 0, okWhenZero: true, severity: (driversNoLocation.count ?? 0) ? "warn" : "ok", href: "/driver", fix: "اطلب من المندوب الضغط على زر موقعي" },
      ];
      setChecks(next);
    } finally {
      setLoading(false);
    }
  }

  async function repairBasics() {
    setRepairing(true);
    const today = new Date().toISOString().slice(0, 10);
    const errs: string[] = [];
    const r1 = await (supabase as any).rpc("ensure_default_cash_account"); if (r1.error) errs.push(r1.error.message);
    const r2 = await (supabase as any).rpc("ensure_default_chart_accounts"); if (r2.error) errs.push(r2.error.message);
    const r3 = await (supabase as any).rpc("sync_monthly_payroll_payables", { _month: today }); if (r3.error) errs.push(r3.error.message);
    setRepairing(false);
    if (errs.length) toast.error(errs.join(" | ")); else toast.success("تم إصلاح الأساسيات: خزنة، حسابات، ورواتب الشهر");
    load();
  }

  useEffect(() => { load(); }, [canUse]);

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">فحص النظام للمالك ومدير التشغيل فقط.</CardContent></Card>;

  const danger = checks.filter((c) => c.severity === "danger").length;
  const warn = checks.filter((c) => c.severity === "warn").length;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck className="w-7 h-7 text-teal-600" /> فحص النظام</h1>
        <p className="text-sm text-muted-foreground">مراجعة سريعة لكل أساسيات المغسلة والرحلة التشغيلية. لو فيه مشكلة، اضغط عليها لتذهب لمكان الإصلاح.</p>
      </div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}>تحديث</Button><Button onClick={repairBasics} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Wrench className="w-4 h-4 ms-1" />}إصلاح الأساسيات</Button></div>
    </div>

    <div className="grid md:grid-cols-3 gap-3">
      <Kpi title="مشاكل حرجة" value={danger} tone={danger ? "danger" : "ok"} />
      <Kpi title="تنبيهات" value={warn} tone={warn ? "warn" : "ok"} />
      <Kpi title="بنود الفحص" value={checks.length} tone="ok" />
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="grid md:grid-cols-2 gap-3">
      {checks.map((c) => {
        const cls = c.severity === "danger" ? "border-red-200 bg-red-50" : c.severity === "warn" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";
        const body = <Card className={cls}><CardContent className="p-4"><div className="flex items-center justify-between gap-2"><div className="font-black">{c.title}</div><Badge variant={c.severity === "danger" ? "destructive" : "secondary"}>{c.count}</Badge></div><div className="text-xs text-muted-foreground mt-2">{c.fix}</div></CardContent></Card>;
        return c.href ? <Link key={c.key} to={c.href as any}>{body}</Link> : <div key={c.key}>{body}</div>;
      })}
    </div>}
  </div>;
}

function Kpi({ title, value, tone }: { title: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "border-red-200 bg-red-50 text-red-800" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return <Card className={cls}><CardContent className="p-4"><div className="text-xs opacity-80">{title}</div><div className="text-3xl font-black mt-1">{value}</div></CardContent></Card>;
}
