import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtMoney } from "@/lib/format";
import { Loader2, Calendar, Zap, CheckCircle2, AlertTriangle, Activity, Wallet, TrendingUp, Users, Navigation, Truck, XCircle, History, Clock } from "lucide-react";
import { Link as RouterLink } from "@tanstack/react-router";
import { RoleDailyBrief } from "@/components/role-daily-brief";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: t("لوحة المالك - MJRH") }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, hasRole } = useAuth();
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

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  const maxStation = Math.max(...Object.values(stats?.stations ?? {}).map(Number), 1);

  const stationLabels: Record<string, { label: string; color: string }> = {
    received:         { label: t("dashboard.station.received"), color: "#0d9488" },
    cleaning:         { label: t("dashboard.station.cleaning"), color: "#3b82f6" },
    ironing:          { label: t("dashboard.station.ironing"), color: "#8b5cf6" },
    packing:          { label: t("dashboard.station.packing"), color: "#f59e0b" },
    ready:            { label: t("dashboard.station.ready"), color: "#10b981" },
    out_for_delivery: { label: t("dashboard.station.delivery"), color: "#f97316" },
  };

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <Link to="/live-map" className="flex items-center gap-2 text-sm text-teal-600 font-bold border border-teal-200 bg-teal-50 px-3 py-2 rounded-lg hover:bg-teal-100 transition">
          <Navigation className="w-4 h-4" /> {t("dashboard.liveMap")}
        </Link>
      </div>

      <RoleDailyBrief role="owner" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label={t("today.kpi.ordersToday")} value={stats?.todayCount ?? 0} icon={Calendar} link="/orders" />
        <KpiCard label={t("common.qcPassed", "QC ناجح")} value={stats?.qcStats?.passed ?? 0} icon={CheckCircle2} tone="text-emerald-600" link="/orders" />
        <KpiCard label={t("common.qcFailed", "QC فاشل")} value={stats?.qcStats?.failed ?? 0} icon={XCircle} tone="text-destructive" link="/orders" />
        <KpiCard label={t("common.qcPending", "QC معلق")} value={stats?.qcStats?.pending ?? 0} icon={Clock} tone="text-amber-600" link="/orders" />
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4 text-indigo-600" /> {t("dashboard.recentEvents", "الأحداث الأخيرة")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(stats?.recentEvents ?? []).length === 0 && <p className="text-sm text-center text-muted-foreground py-4">{t("dashboard.noEvents", "لا توجد أحداث مسجلة")}</p>}
          {(stats?.recentEvents ?? []).map((e: any) => (
            <div key={e.id} className="flex justify-between items-center p-2 border-b last:border-0 text-sm">
              <span className="font-bold">{e.event_type}</span>
              <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Revenue Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />{t("dashboard.revToday")}</div>
          <div className="text-xl font-black mt-1 text-teal-600">{fmtMoney(stats?.revToday ?? 0, t("common.egp"))}</div>
          <div className="text-xs text-muted-foreground mt-1">{t("dashboard.cashToday")}: {fmtMoney(stats?.cashToday ?? 0, t("common.egp"))}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" />{t("dashboard.revMonth")}</div>
          <div className="text-xl font-black mt-1 text-blue-600">{fmtMoney(stats?.revMonth ?? 0, t("common.egp"))}</div>
          <div className="text-xs text-muted-foreground mt-1">{t("accounting.expenses")}: {fmtMoney(stats?.totalExpenses ?? 0, t("common.egp"))}</div>
        </CardContent></Card>
        <Card className={`${(stats?.netProfit ?? 0) >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{t("dashboard.netProfit")}</div>
            <div className={`text-xl font-black mt-1 ${(stats?.netProfit ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {fmtMoney(stats?.netProfit ?? 0, t("common.egp"))}
            </div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{t("dashboard.team")}</div>
          <div className="text-xl font-black mt-1">{stats?.employeeCount ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Truck className="w-3 h-3" /> {t("dashboard.pickups", "Pickups:")} {stats?.activePickups ?? 0}
          </div>
        </CardContent></Card>
      </div>

      {/* ✅ Phase 4: Station breakdown — BI */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" /> {t("dashboard.stationDistribution")}
        </CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(stationLabels).map(([key, meta]) => {
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
            <p className="text-sm text-center text-muted-foreground py-4">{t("today.noCritical")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> {t("dashboard.attentionNeeded")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(stats?.attention ?? []).length === 0 && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 font-bold text-center">{t("dashboard.noIssues")}</div>}
          {(stats?.attention ?? []).map((a: any) => (
            <Link key={a.key} to={a.href} className={`flex items-center justify-between rounded-xl border p-3 text-sm hover:shadow-sm transition ${a.tone === "red" ? "bg-red-50 border-red-200 text-red-800" : a.tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
              <span className="font-bold">{a.label}</span>
              <span className="font-black text-lg">{a.count}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: "/budgets", label: t("nav./budgets"), icon: "💰" },
          { to: "/finance", label: t("nav./finance"), icon: "📊" },
          { to: "/staff", label: t("nav./staff"), icon: "👥" },
          { to: "/customers", label: t("nav./customers"), icon: "👤" },
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
