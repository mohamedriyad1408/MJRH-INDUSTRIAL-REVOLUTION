import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Clock, CreditCard, MapPinOff, Truck, RotateCcw, AlertTriangle, RefreshCw, Shirt, Sparkles } from "lucide-react";
import { dueInfo } from "@/lib/geo";
import { autoAssignDrivers } from "@/lib/driver-assignment";
import { toast } from "sonner";
import { interpolate, useI18n } from "@/lib/i18n";
import { resolveAppUrl } from "@/lib/utils";

type AlertTone = "red" | "amber" | "blue";
type AlertAudience = "owner" | "ops" | "cs" | "ironing" | "cleaning" | "packing" | "driver";
type AlertCategory = "report" | "finance" | "quality" | "ops" | "system";
type Alert = { id: string; tone: AlertTone; audience: AlertAudience[]; title: string; detail: string; icon: React.ReactNode; href?: string; appNotificationId?: string; kind?: "report" | "problem" | "computed"; category?: AlertCategory; quickAction?: "assignDrivers" | "openDriverLocation" | "repairFinance" };

const toneClass: Record<AlertTone, string> = {
  red: "border-red-200 bg-red-50 text-red-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
};

export function NotificationCenter() {
  const { user, hasRole, tenantId } = useAuth();
  const { t, dir, language } = useI18n();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [station, setStation] = useState<string | null>(null);
  const [jobRole, setJobRole] = useState<string | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AlertCategory>("all");

  useEffect(() => {
    if (!user) return;
    supabase.from("employees").select("id,station,job_role,profile_id,email")
      .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()
      .then(({ data }: any) => {
        setEmpId(data?.id ?? null);
        setStation(data?.station ?? null);
        setJobRole(data?.job_role ?? null);
      });
  }, [user]);

  function audiencesForMe(): AlertAudience[] {
    if (hasRole("owner")) return ["owner", "ops", "cs", "ironing", "cleaning", "packing", "driver"];
    if (hasRole("ops_manager")) return ["ops", "ironing", "cleaning", "packing", "driver"];
    if (hasRole("cs_manager")) return ["cs"];
    if (hasRole("courier") || jobRole === "driver") return ["driver"];
    if (station === "ironing") return ["ironing"];
    if (station === "cleaning") return ["cleaning"];
    if (station === "packing") return ["packing"];
    if (station === "reception") return ["cs"];
    return [];
  }

  async function load() {
    setLoading(true);
    if (tenantId && (hasRole("owner") || hasRole("ops_manager"))) {
      await supabase.rpc("generate_smart_operational_alerts", { _tenant_id: tenantId }).then(() => null);
    }
    const now = new Date().toISOString();
    const next: Alert[] = [];
    const myAudiences = audiencesForMe();

    const [lateRes, unpaidRes, unassignedDeliveryRes, noLocationOrdersRes, recleanRes, pickupNoLocationRes, pickupPendingRes, appNotifsRes] = await Promise.all([
      supabase.from("orders").select("id,order_number,promised_delivery_at,status").not("status", "in", '("delivered","cancelled")').lt("promised_delivery_at", now).limit(5),
      supabase.from("orders").select("id,order_number,total,payment_status,status").eq("payment_status", "unpaid").not("status", "eq", "cancelled").limit(5),
      supabase.from("orders").select("id,order_number,status").eq("status", "ready").is("assigned_driver_employee_id", null).limit(5),
      supabase.from("orders").select("id,order_number,order_type,delivery_address,delivery_lat,delivery_lng,status").eq("order_type", "delivery").in("status", ["received", "cleaning", "ironing", "packing", "ready"]).is("delivery_lat", null).limit(5),
      supabase.from("service_units").select("id,label_code,name,order_id,assigned_ironing_employee_id,service_type,reclean_reason,reclean_photo_url,orders!inner(order_number,status)").eq("needs_reclean", true).not("orders.status", "in", "(delivered,cancelled)").limit(5),
      supabase.from("pickup_requests").select("id,customer_name,status,scheduled_at,lat,lng").in("status", ["pending", "assigned"]).is("lat", null).limit(5),
      supabase.from("pickup_requests").select("id,customer_name,status").eq("status", "pending").limit(5),
      (supabase.from("app_notifications").select("id,audience,title,body,href,tone,created_at").in("audience", myAudiences).is("read_at", null).order("created_at", { ascending: false }).limit(10) as unknown as Promise<any>).then((r: any) => r).catch(() => ({ data: [] })),
    ]);

    (lateRes.data ?? []).forEach((o: any) => {
      const d = dueInfo(o.promised_delivery_at);
      next.push({ kind: "computed", category: "ops", id: `late-${o.id}`, audience: ["owner", "ops", "cs"], tone: "red", title: interpolate(t("notif.orderLate"), { order: o.order_number }), detail: d.label, icon: <Clock className="w-4 h-4" />, href: `/orders/${o.id}` });
    });

    (unpaidRes.data ?? []).forEach((o: any) => {
      next.push({ kind: "computed", category: "finance", id: `unpaid-${o.id}`, audience: ["owner", "cs"], tone: "amber", title: interpolate(t("notif.orderUnpaid"), { order: o.order_number }), detail: `${Number(o.total ?? 0).toLocaleString()} ${t("common.egp")}`, icon: <CreditCard className="w-4 h-4" />, href: `/orders/${o.id}` });
    });

    (unassignedDeliveryRes.data ?? []).forEach((o: any) => {
      next.push({ kind: "computed", category: "ops", id: `unassigned-${o.id}`, audience: ["owner", "ops", "driver"], tone: "blue", title: interpolate(t("notif.readyNoDriver"), { order: o.order_number }), detail: t("notif.assignDriversHint"), icon: <Truck className="w-4 h-4" />, href: "/live-map", quickAction: "assignDrivers" });
    });

    (noLocationOrdersRes.data ?? []).forEach((o: any) => {
      next.push({ kind: "computed", category: "ops", id: `noloc-order-${o.id}`, audience: ["owner", "ops", "cs"], tone: "amber", title: interpolate(t("notif.orderNoLocation"), { order: o.order_number }), detail: t("notif.noLocationHint"), icon: <MapPinOff className="w-4 h-4" />, href: `/orders/${o.id}` });
    });

    (pickupNoLocationRes.data ?? []).forEach((p: any) => {
      next.push({ kind: "computed", category: "ops", id: `noloc-pickup-${p.id}`, audience: ["owner", "ops", "cs"], tone: "amber", title: t("notif.pickupNoLocation"), detail: p.customer_name, icon: <MapPinOff className="w-4 h-4" />, href: "/orders/new" });
    });

    (pickupPendingRes.data ?? []).forEach((p: any) => {
      next.push({ kind: "computed", category: "ops", id: `pickup-pending-${p.id}`, audience: ["owner", "ops", "driver"], tone: "blue", title: t("notif.pickupPending"), detail: p.customer_name, icon: <Truck className="w-4 h-4" />, href: "/live-map", quickAction: "assignDrivers" });
    });

    (recleanRes.data ?? []).forEach((u: any) => {
      const aud: AlertAudience[] = ["owner", "ops", "cleaning"];
      if (!u.assigned_ironing_employee_id || u.assigned_ironing_employee_id === empId) aud.push("ironing");
      next.push({ kind: "computed", category: "quality", id: `reclean-${u.id}`, audience: aud, tone: "red", title: `${u.label_code} ${t("order.reclean")}`, detail: `${t("order.orderNo", "طلب #{order}").replace("{order}", String(u.orders?.order_number ?? "?"))} — ${u.name} — ${u.reclean_reason ?? t("order.reclean")}`, icon: <RotateCcw className="w-4 h-4" />, href: u.order_id ? `/orders/${u.order_id}` : undefined });
    });

    (appNotifsRes.data ?? []).forEach((n: any) => {
      const title = String(n.title ?? "");
      const body = String(n.body ?? "");
      const text = `${title} ${body}`;
      const tone: AlertTone = n.tone === "danger" ? "red" : n.tone === "warning" ? "amber" : "blue";
      const isFinance = /مالية|خزنة|دفع|فاتورة|قيد|تحصيل|مصروف|راتب/.test(text);
      const isQuality = /جودة|مرتجع|مارك|ليبل/.test(text);
      const isReport = title.includes("تقرير");
      next.push({
        id: `app-${n.id}`,
        appNotificationId: n.id,
        kind: isReport ? "report" : "problem",
        category: isReport ? "report" : (isQuality ? "quality" : (isFinance ? "finance" : "system")),
        audience: [n.audience] as AlertAudience[],
        tone,
        title: n.title,
        detail: n.body ?? t("notif.systemAlert"),
        icon: tone === "red" ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />,
        href: n.href ?? (isFinance ? "/system-health" : undefined),
        quickAction: isFinance && (hasRole("owner") || hasRole("ops_manager") || hasRole("cs_manager")) ? "repairFinance" : undefined,
      });
    });

    // Station-specific operational alerts
    if (myAudiences.includes("ironing")) {
      const { data } = await supabase.from("service_units").select("id,label_code,name,order_id,orders(order_number)").eq("assigned_ironing_employee_id", empId || "").is("ironing_completed_at", null).limit(10);
      (data ?? []).slice(0, 5).forEach((u: any) => next.push({ kind: "computed", category: "ops", id: `my-iron-${u.id}`, audience: ["ironing"], tone: "blue", title: interpolate(t("notif.waitingIroning"), { label: u.label_code }), detail: `${t("order.orderNo", "طلب #{order}").replace("{order}", String(u.orders?.order_number ?? "?"))} — ${u.name} — ${u.reclean_reason ?? t("order.reclean")}`, icon: <Shirt className="w-4 h-4" />, href: "/stations/ironing" }));
    }

    if (myAudiences.includes("cleaning")) {
      const { data } = await supabase.from("orders").select("id,order_number,status").eq("status", "cleaning").limit(5);
      (data ?? []).forEach((o: any) => next.push({ kind: "computed", category: "ops", id: `clean-${o.id}`, audience: ["cleaning"], tone: "blue", title: interpolate(t("notif.cleaningOrder"), { order: o.order_number }), detail: t("notif.reviewPieces"), icon: <Sparkles className="w-4 h-4" />, href: "/stations/cleaning" }));
    }

    const filtered = next.filter((a) => a.audience.some((x) => myAudiences.includes(x)));
    setAlerts(filtered.slice(0, 20));
    setLoading(false);
  }


  async function markRead(alert: Alert) {
    if (!alert.appNotificationId) return;
    const { error } = await supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", alert.appNotificationId);
    if (!error) setAlerts((rows) => rows.filter((x) => x.id !== alert.id));
  }

  async function markAllSystemRead() {
    const ids = (filter === "all" ? alerts : visibleAlerts).map((a) => a.appNotificationId).filter(Boolean) as string[];
    if (!ids.length) return;
    const { error } = await supabase
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    if (!error) setAlerts((rows) => rows.filter((x) => !ids.includes(x.appNotificationId ?? "")));
  }

  async function runQuickAction(alert: Alert) {
    if (alert.quickAction === "assignDrivers") {
      try {
        const r = await autoAssignDrivers();
        if (r.assigned) toast.success(interpolate(t("notif.assignDriversDone"), { assigned: r.assigned, drivers: r.drivers }));
        else toast.info(t("notif.noAssignableTasks"));
        load();
      } catch (e: any) {
        toast.error(e?.message ?? t("notif.assignDriversFailed"));
      }
    }
    if (alert.quickAction === "repairFinance") {
      if (!tenantId) return toast.error(t("notif.noTenant"));
      try {
        const { data, error } = await supabase.rpc("repair_financial_operation_audit", { _tenant_id: tenantId, _max_items: 200 });
        if (error) throw error;
        toast.success(interpolate(t("notif.financeRepairDone"), { fixed: (data as any)?.fixed ?? 0, remaining: (data as any)?.remaining ?? 0 }));
        load();
      } catch (e: any) {
        toast.error(e?.message ?? t("notif.financeRepairFailed"));
      }
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [station, jobRole, empId, tenantId, language]);

  const visibleAlerts = useMemo(() => filter === "all" ? alerts : alerts.filter((a) => a.category === filter), [alerts, filter]);
  const count = alerts.length;
  const urgent = useMemo(() => alerts.filter((a) => a.tone === "red").length, [alerts]);
  const filterCounts = useMemo(() => ({
    all: alerts.length,
    report: alerts.filter((a) => a.category === "report").length,
    finance: alerts.filter((a) => a.category === "finance").length,
    quality: alerts.filter((a) => a.category === "quality").length,
    ops: alerts.filter((a) => a.category === "ops").length,
    system: alerts.filter((a) => a.category === "system").length,
  }), [alerts]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9 shrink-0">
          <Bell className="w-4 h-4" />
          {count > 0 && <span className={`absolute -top-1 -end-1 h-5 min-w-5 rounded-full text-[10px] flex items-center justify-center px-1 text-white ${urgent ? "bg-red-600" : "bg-amber-500"}`}>{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={8} collisionPadding={16} avoidCollisions={true} className="w-[calc(100vw-32px)] sm:w-96 md:w-[420px] p-0 shadow-2xl rounded-3xl border-2 border-slate-200/80 z-50 max-h-[85vh] overflow-hidden flex flex-col bg-white" dir={dir}>
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-black flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> {t("notif.title")}</div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}><RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
        <div className="p-2 border-b flex flex-wrap gap-1 text-[11px]">
          {[
            ["all", t("notif.filter.all"), filterCounts.all],
            ["report", t("notif.filter.report"), filterCounts.report],
            ["finance", t("notif.filter.finance"), filterCounts.finance],
            ["quality", t("notif.filter.quality"), filterCounts.quality],
            ["ops", t("notif.filter.ops"), filterCounts.ops],
            ["system", t("notif.filter.system"), filterCounts.system],
          ].map(([k, label, n]: any) => <button key={k} onClick={() => setFilter(k)} className={`px-2 py-1 rounded-full border ${filter === k ? "bg-teal-600 text-white border-teal-600" : "bg-white"}`}>{label} {n ? `(${n})` : ""}</button>)}
        </div>
        <div className="max-h-96 overflow-y-auto p-2 space-y-2">
          {!visibleAlerts.length && <div className="p-6 text-center text-sm text-muted-foreground">{t("notif.none")}</div>}
          {visibleAlerts.map((a) => {
            const card = <div className={`rounded-xl border p-2.5 text-xs ${toneClass[a.tone]}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold">{a.icon}<span>{a.title}</span></div>
                {a.kind === "report" && <Badge variant="secondary">{t("notif.report")}</Badge>}
              </div>
              <div className="mt-1 opacity-80 whitespace-pre-line pe-1">{a.detail}</div>
              {(a.href || a.appNotificationId) && <div className="flex gap-2 mt-2">
                {a.href && <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to={resolveAppUrl(a.href) as any}>{t("notif.open")}</Link></Button>}
                {a.quickAction && <Button size="sm" variant="default" className="h-7 text-[11px]" onClick={() => runQuickAction(a)}>{a.quickAction === "repairFinance" ? t("common.repair") : t("common.execute")}</Button>}
                {a.appNotificationId && <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => markRead(a)}>{t("common.processed")}</Button>}
              </div>}
            </div>;
            return <div key={a.id}>{card}</div>;
          })}
        </div>
        {count > 0 && <div className="p-2 border-t text-xs text-muted-foreground flex items-center justify-between gap-2"><span>{t("notif.roleOnly")}</span><div className="flex items-center gap-2"><Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={markAllSystemRead}>{t("common.hideDisplayed")}</Button><Badge variant="secondary">{count}</Badge></div></div>}
      </PopoverContent>
    </Popover>
  );
}
