import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney } from "@/lib/format";
import { Loader2, Calendar, CheckCircle2, History, Clock, TrendingUp, Wallet, Activity, Navigation, XCircle, Users, Truck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { RoleDailyBrief } from "@/components/role-daily-brief";
import { useI18n } from "@/lib/i18n";
import { AIAdvisor } from "@/components/AIAdvisor";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - MJRH" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, hasRole, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const nav = useNavigate();
  
  useEffect(() => {
    const isManager = hasRole("owner", "ops_manager", "cs_manager");
    if (hasRole("courier") && !isManager) { nav({ to: "/driver" }); return; }
    if (hasRole("employee") && !isManager && user) {
      supabase.from("employees").select("id,station,job_role,profile_id,email").or(`profile_id.eq.${user.id},email.eq.${user.email}`).maybeSingle().then(async ({ data }: any) => {
        if (data?.id && !data.profile_id) await supabase.from("employees").update({ profile_id: user.id }).eq("id", data.id);
        if (data?.job_role === "driver") nav({ to: "/driver" });
        else if (data?.station) nav({ to: `/stations/${data.station}` as any });
      });
    }
  }, [hasRole, nav, user]);

  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-brand-blue" /></div>;

  const stationLabels: Record<string, { label: string; color: string }> = {
    received:         { label: t("dashboard.station.received"), color: "#1E3A8A" },
    cleaning:         { label: t("dashboard.station.cleaning"), color: "#3b82f6" },
    ironing:          { label: t("dashboard.station.ironing"), color: "#8b5cf6" },
    packing:          { label: t("dashboard.station.packing"), color: "#f59e0b" },
    ready:            { label: t("dashboard.station.ready"), color: "#10b981" },
    out_for_delivery: { label: t("dashboard.station.delivery"), color: "#f97316" },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir={dir}>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-gray-500 font-medium mt-1">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t("common.date")}</span>
            <span className="text-sm font-black text-gray-700">
               {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <Link to="/live-map" className="flex items-center gap-2 text-sm text-brand-blue font-black border-2 border-blue-100 bg-white px-4 py-2 rounded-2xl hover:bg-blue-50 transition-all shadow-sm">
            <Navigation className="w-4 h-4" /> {t("dashboard.liveMap")}
          </Link>
        </div>
      </div>

      <RoleDailyBrief role="owner" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t("today.kpi.ordersToday")} 
          value={stats?.todayCount ?? 0} 
          icon={<Calendar className="w-6 h-6" />} 
          color="blue"
          link="/orders"
        />
        <StatCard 
          title={t("dashboard.revToday")} 
          value={fmtMoney(stats?.revToday ?? 0, t("common.egp"))} 
          icon={<Wallet className="w-6 h-6" />} 
          color="green"
          sub={`${t("dashboard.cashToday")}: ${fmtMoney(stats?.cashToday ?? 0)}`}
        />
        <StatCard 
          title={t("dashboard.netProfit")} 
          value={fmtMoney(stats?.netProfit ?? 0, t("common.egp"))} 
          icon={<TrendingUp className="w-6 h-6" />} 
          color={(stats?.netProfit ?? 0) >= 0 ? "teal" : "red"}
        />
        <StatCard 
          title={t("dashboard.team")} 
          value={stats?.employeeCount ?? 0} 
          icon={<Users className="w-6 h-6" />} 
          color="purple"
          sub={`${t("dashboard.pickups")}: ${stats?.activePickups ?? 0}`}
        />
      </div>

      {/* AI Advisor Section */}
      <div className="grid gap-6">
        <AIAdvisor />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Station Distribution */}
        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-blue" />
              {t("dashboard.stationDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {Object.entries(stationLabels).map(([key, meta]) => {
              const count = stats?.stations?.[key] ?? 0;
              const maxCount = Math.max(...Object.values(stats?.stations ?? {}).map(Number), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-600">{meta.label}</span>
                    <span className="font-black text-gray-900">{count}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              {t("dashboard.recentEvents")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto">
              {(stats?.recentEvents ?? []).length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium">{t("dashboard.noEvents")}</div>
              ) : (
                stats?.recentEvents.map((e: any) => (
                  <div key={e.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-slate-800">{e.event_type}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {e.order_id ? `Order #${e.order_id.slice(0, 8)}` : 'System'}
                      </div>
                    </div>
                    <div className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      {new Date(e.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { to: "/orders/new", label: t("orders.new"), icon: "➕", color: "bg-teal-50 text-teal-700" },
          { to: "/accounting", label: t("nav./accounting"), icon: "📖", color: "bg-blue-50 text-blue-700" },
          { to: "/inventory", label: t("nav./inventory", "المخزون"), icon: "📦", color: "bg-amber-50 text-amber-700" },
          { to: "/staff/attendance", label: t("nav./staff/attendance"), icon: "⏰", color: "bg-indigo-50 text-indigo-700" },
        ].map((l: any) => (
          <Link key={l.to} to={l.to} className={`flex items-center gap-3 p-4 rounded-2xl border border-transparent hover:border-slate-200 hover:shadow-md transition-all group ${l.color}`}>
            <span className="text-2xl group-hover:scale-110 transition-transform">{l.icon}</span>
            <span className="font-black text-sm">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, sub, link }: { title: string; value: any; icon: React.ReactNode; color: string; sub?: string; link?: string }) {
  const styles: Record<string, string> = {
    blue:   "bg-blue-50 border-blue-100 text-blue-700",
    green:  "bg-emerald-50 border-emerald-100 text-emerald-700",
    teal:   "bg-teal-50 border-teal-100 text-teal-700",
    red:    "bg-red-50 border-red-100 text-red-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
  };

  const content = (
    <Card className={`rounded-3xl border shadow-none hover:shadow-md transition-all duration-300 ${styles[color] || styles.blue}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
            <h3 className="text-2xl font-black">{value}</h3>
          </div>
          <div className="p-2 bg-white/50 rounded-xl">
            {icon}
          </div>
        </div>
        {sub && <p className="mt-3 text-[11px] font-bold opacity-80 border-t border-current/10 pt-2">{sub}</p>}
      </CardContent>
    </Card>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}
