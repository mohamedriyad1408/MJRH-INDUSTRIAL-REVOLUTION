import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, AlertTriangle, Zap, Inbox, Banknote, Smartphone, UserCog, ShieldCheck, Truck, PackageOpen, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_app/ops")({
  head: () => ({ meta: [{ title: "لوحة التشغيل" }] }),
  component: OpsDashboard,
});

function OpsDashboard() {
  const { hasRole } = useAuth();
  const allowed = hasRole("ops_manager", "owner");
  const [stats, setStats] = useState({ today: 0, late: 0, tomorrow: 0, urgent: 0, notStarted: 0, cash: 0, instapay: 0 });
  const [activeTeam, setActiveTeam] = useState<{ id: string; full_name: string; job_role: string }[]>([]);
  const [pendingReq, setPendingReq] = useState(0);
  const [attention, setAttention] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const tomorrowStart = new Date(start); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(end); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

      const [todayQ, lateQ, tomorrowQ, urgentQ, notStartedQ, paidQ, reqQ, teamQ, unitsQ, readyNoDriverQ, pickupNoDriverQ, ordersQ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
        supabase.from("orders").select("id", { count: "exact", head: true }).lt("promised_delivery_at", new Date().toISOString()).not("status", "in", "(delivered,cancelled)"),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("promised_delivery_at", tomorrowStart.toISOString()).lte("promised_delivery_at", tomorrowEnd.toISOString()),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("is_urgent", true).not("status", "in", "(delivered,cancelled)"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "received"),
        supabase.from("orders").select("total, payment_method").eq("payment_status", "paid").gte("created_at", start.toISOString()),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("employees").select("id, full_name, job_role").eq("is_active", true).order("full_name").limit(20),
        (supabase as any).from("service_units").select("id,order_id,needs_reclean,current_stage,status"),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "ready").is("assigned_driver_employee_id", null),
        (supabase as any).from("pickup_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("orders").select("id,status" ).not("status", "in", "(delivered,cancelled)"),
      ]);

      const cash = (paidQ.data ?? []).filter((o: any) => o.payment_method === "cash").reduce((s: number, o: any) => s + Number(o.total), 0);
      const instapay = (paidQ.data ?? []).filter((o: any) => o.payment_method === "instapay").reduce((s: number, o: any) => s + Number(o.total), 0);

      setStats({
        today: todayQ.count ?? 0, late: lateQ.count ?? 0, tomorrow: tomorrowQ.count ?? 0,
        urgent: urgentQ.count ?? 0, notStarted: notStartedQ.count ?? 0, cash, instapay,
      });
      setPendingReq(reqQ.count ?? 0);
      setActiveTeam((teamQ.data ?? []) as any);
      const units = (unitsQ.data ?? []) as any[];
      const activeOrderIds = new Set((ordersQ.data ?? []).map((o: any) => o.id));
      const ordersWithPieces = new Set(units.filter((u) => activeOrderIds.has(u.order_id) && u.status !== "cancelled" && u.current_stage !== "cancelled").map((u) => u.order_id));
      const noPieces = [...activeOrderIds].filter((id) => !ordersWithPieces.has(id)).length;
      const reclean = units.filter((u) => u.needs_reclean).length;
      const qcFailed = units.filter((u) => u.current_stage === "qc_failed").length;
      setAttention([
        { label: "مرتجعات غسيل", count: reclean, href: "/stations/cleaning", tone: "red", icon: RotateCcw },
        { label: "مشاكل جودة", count: qcFailed, href: "/stations/qc", tone: "red", icon: ShieldCheck },
        { label: "طلبات بلا قطع", count: noPieces, href: "/orders", tone: "amber", icon: PackageOpen },
        { label: "جاهز بلا مندوب", count: readyNoDriverQ.count ?? 0, href: "/live-map", tone: "amber", icon: Truck },
        { label: "استلامات بلا مندوب", count: pickupNoDriverQ.count ?? 0, href: "/live-map", tone: "blue", icon: Truck },
      ].filter((x) => x.count > 0));

      setLoading(false);
    })();
  }, [allowed]);

  if (!allowed) return <Card className="p-8 text-center">صلاحية التشغيل أو المالك فقط.</Card>;
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const cards = [
    { label: "طلبات اليوم", value: stats.today, icon: Calendar, to: "/orders" as const },
    { label: "طلبات متأخرة", value: stats.late, icon: AlertTriangle, tone: "text-destructive" },
    { label: "طلبات غدًا", value: stats.tomorrow, icon: Calendar },
    { label: "طلبات مستعجلة", value: stats.urgent, icon: Zap, tone: "text-amber-600" },
    { label: "لم تبدأ", value: stats.notStarted, icon: Inbox },
    { label: "إيرادات نقدية", value: fmtMoney(stats.cash), icon: Banknote, tone: "text-emerald-600" },
    { label: "إيرادات InstaPay", value: fmtMoney(stats.instapay), icon: Smartphone, tone: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة مدير التشغيل</h1>
        <p className="text-sm text-muted-foreground">نظرة سريعة على الطلبات والإيرادات</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.label}</span><c.icon className="w-4 h-4" />
              </div>
              <div className={`text-xl font-bold mt-1 ${c.tone ?? ""}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> يحتاج تدخل تشغيل الآن</div>
          {attention.length === 0 && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 font-bold text-center">التشغيل مستقر الآن ✅</div>}
          {attention.map((a) => {
            const Icon = a.icon;
            return <Link key={a.label} to={a.href as any} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${a.tone === "red" ? "bg-red-50 border-red-200 text-red-800" : a.tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
              <span className="font-bold flex items-center gap-2"><Icon className="w-4 h-4" />{a.label}</span><span className="font-black">{a.count}</span>
            </Link>;
          })}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-bold flex items-center gap-2"><UserCog className="w-4 h-4" /> الفريق النشط</div>
              <Link to="/staff" className="text-xs text-primary underline">إدارة</Link>
            </div>
            {activeTeam.map((e) => (
              <div key={e.id} className="flex justify-between items-center p-2 rounded border">
                <span>{e.full_name}</span><Badge variant="outline">{jobAr(e.job_role)}</Badge>
              </div>
            ))}
            {!activeTeam.length && <div className="text-xs text-center text-muted-foreground p-4">لا يوجد موظفون</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-bold">طلبات الموظفين</div>
              <Link to="/staff/requests" className="text-xs text-primary underline">عرض الكل</Link>
            </div>
            <div className="text-3xl font-bold text-amber-600">{pendingReq}</div>
            <div className="text-xs text-muted-foreground">طلبات معلقة (إجازة / سلفة / وقت إضافي / صلاة / راحة)</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-bold">توزيع الأدوار على الفنيين</div>
          <p className="text-xs text-muted-foreground">يمكنك تعيين فني لكل طلب من داخل صفحة المحطة الخاصة به.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/stations/reception" className="text-xs px-3 py-1 rounded border hover:bg-muted">الاستلام</Link>
            <Link to="/stations/cleaning" className="text-xs px-3 py-1 rounded border hover:bg-muted">التنظيف</Link>
            <Link to="/stations/ironing" className="text-xs px-3 py-1 rounded border hover:bg-muted">الكي</Link>
            <Link to="/stations/packing" className="text-xs px-3 py-1 rounded border hover:bg-muted">التغليف</Link>
            <Link to="/stations/delivery" className="text-xs px-3 py-1 rounded border hover:bg-muted">التوصيل</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function jobAr(r: string) {
  return ({
    ops_manager: "مدير تشغيل", cs_manager: "خدمة عملاء",
    cleaning_tech: "فني تنظيف", ironing_tech: "فني كي", packing_tech: "فني تغليف",
    driver: "سائق", receptionist: "استقبال", other: "موظف",
  } as Record<string, string>)[r] ?? r;
}
