import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, Users, Sparkles, Shirt, Package, Wallet } from "lucide-react";
import { resolveAppUrl } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/manager")({
  component: ManagerHubPage,
});

function ManagerHubPage() {
  const { hasRole } = useAuth();
  const { t, dir } = useI18n();
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
      ordersTodayRevenue: (ordersToday ?? []).reduce((a: number, r: any) => a + Number(r.total ?? 0), 0),
      urgentToday: (ordersToday ?? []).filter((r: any) => r.is_urgent).length,
      cleaning: byStatus(stationCounts, "cleaning"),
      ironing: byStatus(stationCounts, "ironing"),
      packing: byStatus(stationCounts, "packing"),
      received: byStatus(stationCounts, "received"),
      pendingLeaves: (pendingLeaves ?? []).length,
      pendingAdvances: (pendingAdvances ?? []).length,
      pendingAdvancesTotal: (pendingAdvances ?? []).reduce((a: number, r: any) => a + Number(r.amount ?? 0), 0),
      activeStaff: activeEmployees ?? [],
    });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading || !stats) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold">{t("manager.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {isOps ? t("manager.opsSub") : isCs ? t("manager.csSub") : t("manager.generalSub")}
        </p>
      </div>

      {/* CS-focused row */}
      {(isCs || isOwner) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">{t("cs.todayHub")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<ClipboardList className="w-4 h-4" />} label={t("today.kpi.ordersToday")} value={String(stats.ordersTodayCount)} link="/orders" />
            <Stat label={t("dashboard.revToday")} value={fmtMoney(stats.ordersTodayRevenue, t("common.egp"))} />
            <Stat label={t("dashboard.kpi.urgent")} value={String(stats.urgentToday)} tone={stats.urgentToday ? "warn" : undefined} />
            <Stat label={t("ops.notStarted")} value={String(stats.received)} link="/orders" />
          </div>
        </div>
      )}

      {/* Ops-focused row */}
      {(isOps || isOwner) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">{t("navGroup.محطات العمل")}</h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<Sparkles className="w-4 h-4" />} label={t("stage.cleaning")} value={String(stats.cleaning)} link="/stations/cleaning" />
            <Stat icon={<Shirt className="w-4 h-4" />} label={t("stage.ironing")} value={String(stats.ironing)} link="/stations/ironing" />
            <Stat icon={<Package className="w-4 h-4" />} label={t("stage.packing")} value={String(stats.packing)} link="/stations/packing" />
          </div>
        </div>
      )}

      {/* Requests row */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">{t("manager.pendingRequests")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center justify-between">
              <span>{t("manager.leaveRequests")}</span>
              {stats.pendingLeaves > 0 && <Badge variant="destructive">{stats.pendingLeaves}</Badge>}
            </CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                {stats.pendingLeaves === 0 ? t("manager.noPending") : `${stats.pendingLeaves} ${t("manager.leavesPendingText")}`}
              </div>
              <Button asChild variant="outline" size="sm"><Link to={"/$tenant/staff/leaves" as any}>{t("manager.viewRequests")}</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center justify-between">
              <span>{t("finance.advancesTab")}</span>
              {stats.pendingAdvances > 0 && <Badge variant="destructive">{stats.pendingAdvances}</Badge>}
            </CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                {stats.pendingAdvances === 0
                  ? t("manager.noPending")
                  : `${stats.pendingAdvances} ${t("manager.advancesPendingText")} ${fmtMoney(stats.pendingAdvancesTotal, t("common.egp"))}`}
              </div>
              <Button asChild variant="outline" size="sm"><Link to={"/$tenant/finance" as any}>{t("manager.viewRequests")}</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active team */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" /> {t("ops.activeTeam")} ({stats.activeStaff.length})
        </CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr><th className="text-start p-3">{t("login.fullName")}</th><th className="text-start p-3">{t("common.role")}</th><th className="text-start p-3">{t("stage.received")}</th></tr>
            </thead>
            <tbody>
              {stats.activeStaff.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">{t("ops.noStaff")}</td></tr>}
              {stats.activeStaff.map((e: any) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3 font-medium">
                    <Link to={"/$tenant/staff/$id" as any} params={{ id: e.id } as any} className="hover:underline">{e.full_name}</Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{e.job_title}</td>
                  <td className="p-3 text-xs">{e.station ? t("stage." + e.station, e.station) : "—"}</td>
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
  return link ? <Link to={resolveAppUrl(link) as any}>{content}</Link> : content;
}
