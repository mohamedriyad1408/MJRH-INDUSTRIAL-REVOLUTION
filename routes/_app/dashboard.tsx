import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney } from "@/lib/format";
import { Loader2, Calendar, Zap, CheckCircle2, AlertTriangle, Activity, Wallet, TrendingUp, Users, Navigation, Truck } from "lucide-react";
import { Link as RouterLink } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "لوحة المالك - MJRH" }] }),
  component: Dashboard,
});

const STATION_LABELS: Record<string, { label: string; color: string }> = {
  received:         { label: "استلام", color: "#0d9488" },
  cleaning:         { label: "تنظيف", color: "#3b82f6" },
  ironing:          { label: "كي", color: "#8b5cf6" },
  packing:          { label: "تغليف", color: "#f59e0b" },
  ready:            { label: "جاهز", color: "#10b981" },
  out_for_delivery: { label: "توصيل", color: "#f97316" },
};

function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  const maxStation = Math.max(...Object.values(stats?.stations ?? {}).map(Number), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة المالك</h1>
          <p className="text-sm text-muted-foreground">نظرة شاملة على MJRH</p>
        </div>
        <Link to="/live-map" className="flex items-center gap-2 text-sm text-teal-600 font-bold border border-teal-200 bg-teal-50 px-3 py-2 rounded-lg hover:bg-teal-100 transition">
          <Navigation className="w-4 h-4" /> الخريطة الحية
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="طلبات اليوم" value={stats?.todayCount ?? 0} icon={Calendar} link="/orders" />
        <KpiCard label="مستعجلة" value={stats?.urgent ?? 0} icon={Zap} tone="text-amber-600" link="/orders" />
        <KpiCard label="متأخرة ⚠" value={stats?.late ?? 0} icon={AlertTriangle} tone="text-destructive" link="/orders" />
        <KpiCard label="نشطة" value={stats?.active ?? 0} icon={Activity} link="/orders" />
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />إيراد اليوم</div>
          <div className="text-xl font-black mt-1 text-teal-600">{fmtMoney(stats?.revToday ?? 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">نقدي: {fmtMoney(stats?.cashToday ?? 0)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" />إيراد الشهر</div>
          <div className="text-xl font-black mt-1 text-blue-600">{fmtMoney(stats?.revMonth ?? 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">مصروفات: {fmtMoney(stats?.totalExpenses ?? 0)}</div>
        </CardContent></Card>
        <Card className={`${(stats?.netProfit ?? 0) >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">صافي الربح (الشهر)</div>
            <div className={`text-xl font-black mt-1 ${(stats?.netProfit ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {fmtMoney(stats?.netProfit ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />فريق العمل</div>
          <div className="text-xl font-black mt-1">{stats?.employeeCount ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Truck className="w-3 h-3" /> Pickups: {stats?.activePickups ?? 0}
          </div>
        </CardContent></Card>
      </div>

      {/* ✅ Phase 4: Station breakdown — BI */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" /> توزيع الطلبات على المحطات الآن
        </CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(STATION_LABELS).map(([key, meta]) => {
            const count = stats?.stations?.[key] ?? 0;
            const pct = Math.round((count / maxStation) * 100);
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-20 text-xs text-muted-foreground text-start shrink-0">{meta.label}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: meta.color }} />
                </div>
                <div className="w-8 text-xs font-bold text-end">{count}</div>
              </div>
            );
          })}
          {Object.values(stats?.stations ?? {}).every((v) => v === 0) && (
            <p className="text-sm text-center text-muted-foreground py-4">لا توجد طلبات نشطة الآن ✅</p>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: "/budgets", label: "الميزانيات", icon: "💰" },
          { to: "/finance", label: "الحسابات", icon: "📊" },
          { to: "/staff", label: "الموظفون", icon: "👥" },
          { to: "/customers", label: "العملاء", icon: "👤" },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-2 border rounded-xl p-3 bg-white hover:shadow-md transition text-sm font-bold">
            <span className="text-xl">{l.icon}</span>{l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone, link }: { label: string; value: number; icon: any; tone?: string; link: string }) {
  return (
    <Link to={link} className="block">
      <Card className="hover:shadow-md transition">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="w-4 h-4" /></div>
          <div className={`text-2xl font-black mt-1 ${tone ?? ""}`}>{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
