import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, Users, Sparkles, Shirt, Package, Wallet } from "lucide-react";

export const Route = createFileRoute("/_app/manager")({
  component: ManagerHubPage,
});

function ManagerHubPage() {
  const { hasRole } = useAuth();
  const isOps = hasRole("ops_manager");
  const isCs = hasRole("cs_manager");
  const isOwner = hasRole("owner");

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const [
      { data: ordersToday },
      { data: stationCounts },
      { data: pendingLeaves },
      { data: pendingAdvances },
      { data: activeEmployees },
    ] = await Promise.all([
      supabase.from("orders").select("id, status, total, is_urgent").gte("created_at", todayIso),
      supabase.from("orders").select("id, status").in("status", ["cleaning", "ironing", "packing", "received"]),
      supabase.from("leave_requests").select("id").eq("status", "pending"),
      supabase.from("advance_requests").select("id, amount").eq("status", "pending"),
      supabase.from("employees").select("id, full_name, job_title, role, station").eq("is_active", true),
    ]);

    const byStatus = (rows: any[] | null, s: string) => (rows ?? []).filter((r) => r.status === s).length;

    setStats({
      ordersTodayCount: (ordersToday ?? []).length,
      ordersTodayRevenue: (ordersToday ?? []).reduce((a, r) => a + Number(r.total ?? 0), 0),
      urgentToday: (ordersToday ?? []).filter((r) => r.is_urgent).length,
      cleaning: byStatus(stationCounts, "cleaning"),
      ironing: byStatus(stationCounts, "ironing"),
      packing: byStatus(stationCounts, "packing"),
      received: byStatus(stationCounts, "received"),
      pendingLeaves: (pendingLeaves ?? []).length,
      pendingAdvances: (pendingAdvances ?? []).length,
      pendingAdvancesTotal: (pendingAdvances ?? []).reduce((a, r) => a + Number(r.amount ?? 0), 0),
      activeStaff: activeEmployees ?? [],
    });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading || !stats) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة المدير</h1>
        <p className="text-sm text-muted-foreground">
          {isOps ? "إدارة محطات التشغيل والفنيين" : isCs ? "إدارة الطلبات والمندوبين" : "نظرة عامة للإدارة"}
        </p>
      </div>

      {/* CS-focused row */}
      {(isCs || isOwner) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">خدمة العملاء — اليوم</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<ClipboardList className="w-4 h-4" />} label="طلبات اليوم" value={String(stats.ordersTodayCount)} link="/orders" />
            <Stat label="إيرادات اليوم" value={fmtMoney(stats.ordersTodayRevenue)} />
            <Stat label="طلبات مستعجلة" value={String(stats.urgentToday)} tone={stats.urgentToday ? "warn" : undefined} />
            <Stat label="طلبات لم تبدأ" value={String(stats.received)} link="/orders" />
          </div>
        </div>
      )}

      {/* Ops-focused row */}
      {(isOps || isOwner) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">محطات التشغيل</h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<Sparkles className="w-4 h-4" />} label="في التنظيف" value={String(stats.cleaning)} link="/stations/cleaning" />
            <Stat icon={<Shirt className="w-4 h-4" />} label="في الكي" value={String(stats.ironing)} link="/stations/ironing" />
            <Stat icon={<Package className="w-4 h-4" />} label="في التغليف" value={String(stats.packing)} link="/stations/packing" />
          </div>
        </div>
      )}

      {/* Requests row */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">طلبات بانتظار قرار</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center justify-between">
              <span>طلبات الإجازة</span>
              {stats.pendingLeaves > 0 && <Badge variant="destructive">{stats.pendingLeaves}</Badge>}
            </CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                {stats.pendingLeaves === 0 ? "لا توجد طلبات معلقة" : `${stats.pendingLeaves} طلب بانتظار الموافقة`}
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/staff/leaves">عرض الطلبات</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center justify-between">
              <span>طلبات السلف</span>
              {stats.pendingAdvances > 0 && <Badge variant="destructive">{stats.pendingAdvances}</Badge>}
            </CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                {stats.pendingAdvances === 0
                  ? "لا توجد طلبات معلقة"
                  : `${stats.pendingAdvances} طلب بإجمالي ${fmtMoney(stats.pendingAdvancesTotal)}`}
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/finance">عرض الطلبات</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active team */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" /> الفريق النشط ({stats.activeStaff.length})
        </CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr><th className="text-start p-3">الاسم</th><th className="text-start p-3">الوظيفة</th><th className="text-start p-3">المحطة</th></tr>
            </thead>
            <tbody>
              {stats.activeStaff.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">لا يوجد موظفون نشطون</td></tr>}
              {stats.activeStaff.map((e: any) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 font-medium">
                    <Link to="/staff/$id" params={{ id: e.id }} className="hover:underline">{e.full_name}</Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{e.job_title}</td>
                  <td className="p-3 text-xs">{e.station ? ({ reception: "الاستلام", cleaning: "التنظيف", ironing: "الكي", packing: "التغليف", delivery: "التسليم" } as Record<string,string>)[e.station] ?? "—" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon, tone, link }: { label: string; value: string; icon?: React.ReactNode; tone?: "warn"; link?: string }) {
  const content = (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span>{icon}</div>
        <div className={`text-xl font-bold mt-1 ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
  return link ? <Link to={link as any}>{content}</Link> : content;
}
