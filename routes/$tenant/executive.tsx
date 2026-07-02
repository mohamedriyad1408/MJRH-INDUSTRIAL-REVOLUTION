import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchExecutiveMetrics } from "@/lib/ai-advisor";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiAdvisorWidget } from "@/components/ai-advisor-widget";
import { fmtMoney } from "@/lib/format";
import { Loader2, TrendingUp, Wallet, Activity, Users, AlertTriangle, CheckCircle2, ShieldCheck, Wrench, Calendar, Building2, BarChart3, Zap } from "lucide-react";

export const Route = createFileRoute("/$tenant/executive")({
  head: () => ({ meta: [{ title: "لوحة المديرين التنفيذيين - MJRH Executive" }] }),
  component: ExecutiveDashboardPage,
});

function ExecutiveDashboardPage() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["executive-metrics", tenantId, selectedBranchId],
    queryFn: () => fetchExecutiveMetrics(tenantId ?? "", selectedBranchId),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-sm text-muted-foreground font-semibold">{t("executive.loading", "جاري تحميل البيانات المالية والتشغيلية المتقدمة...")}</p>
      </div>
    );
  }

  const stationLabels: Record<string, { labelKey: string; color: string }> = {
    received:         { labelKey: "dashboard.station.received", color: "#0d9488" },
    cleaning:         { labelKey: "dashboard.station.cleaning", color: "#3b82f6" },
    drying_assembly:  { labelKey: "dashboard.station.drying", color: "#0284c7" },
    ironing:          { labelKey: "dashboard.station.ironing", color: "#8b5cf6" },
    packing:          { labelKey: "dashboard.station.packing", color: "#f59e0b" },
    qc:               { labelKey: "dashboard.station.qc", color: "#ef4444" },
    ready:            { labelKey: "dashboard.station.ready", color: "#10b981" },
    out_for_delivery: { labelKey: "dashboard.station.delivery", color: "#f97316" },
  };

  const maxStation = Math.max(...Object.values(metrics?.stationCounts ?? {}).map(Number), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir={dir}>
      {/* Header & Branch Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            {t("executive.title", "لوحة المديرين التنفيذيين")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("executive.subtitle", "تحليلات الأرباح المتقدمة، ومراقبة اتفاقيات مستوى الخدمة (SLA)، وتقييم أداء الفروع والصيانة التنبؤية.")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-52 h-10 bg-white border-slate-200 font-bold text-xs shadow-sm">
              <Building2 className="w-4 h-4 me-2 text-slate-500" />
              <SelectValue placeholder={t("common.allBranches", "كل الفروع")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold text-xs">{t("common.allBranches", "كل الفروع")}</SelectItem>
              {(metrics?.branches ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id} className="font-bold text-xs">{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} className="h-10 px-4 text-xs font-bold border-slate-200 shadow-sm hover:bg-slate-50">
            {isRefetching ? <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> : t("common.refresh", "تحديث")}
          </Button>
        </div>
      </div>

      {/* Pillar 1: AI Laundry Advisor Widget */}
      <AiAdvisorWidget selectedBranchId={selectedBranchId} />

      {/* Pillar 2: Profit Analytics KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{t("executive.kpi.grossRevenue", "إجمالي الإيرادات")}</span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black mt-2 text-teal-700">
              {fmtMoney(metrics?.totalRevenue ?? 0, t("common.egp", "ج.م"))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{t("executive.kpi.activeOrders", "الطلبات النشطة")}:</span>
              <span className="font-bold text-slate-700">{metrics?.activeOrdersCount ?? 0}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{t("executive.kpi.opex", "نفقات التشغيل (OPEX)")}</span>
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black mt-2 text-slate-800">
              {fmtMoney(metrics?.totalExpenses ?? 0, t("common.egp", "ج.م"))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{t("executive.kpi.urgentOrders", "طلبات عاجلة")}:</span>
              <span className="font-bold text-amber-600">{metrics?.urgentOrdersCount ?? 0}</span>
            </p>
          </CardContent>
        </Card>

        <Card className={`border shadow-sm hover:shadow-md transition ${(metrics?.netProfit ?? 0) >= 0 ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{t("executive.kpi.netProfit", "صافي الربح")}</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className={`text-2xl font-black mt-2 ${(metrics?.netProfit ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {fmtMoney(metrics?.netProfit ?? 0, t("common.egp", "ج.م"))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{t("executive.kpi.margin", "هامش الربح")}:</span>
              <span className={`font-bold ${(metrics?.profitMargin ?? 0) >= 15 ? "text-emerald-700" : "text-amber-700"}`}>
                {Math.round(metrics?.profitMargin ?? 0)}%
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-white hover:shadow-md transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{t("executive.kpi.workforce", "القوة العاملة الفعالة")}</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black mt-2 text-blue-700">
              {metrics?.activeEmployeesCount ?? 0} {t("executive.kpi.empUnit", "موظف")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>{t("executive.kpi.efficiency", "متوسط إيراد الموظف")}:</span>
              <span className="font-bold text-slate-700">
                {fmtMoney((metrics?.activeEmployeesCount ?? 0) > 0 ? (metrics?.totalRevenue ?? 0) / (metrics?.activeEmployeesCount ?? 1) : 0, t("common.egp", "ج.م"))}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pillar 3 & 4: SLA Monitoring & Operational Maintenance / Scheduling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLA Monitoring & Fulfillment */}
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                {t("executive.sla.title", "مراقبة اتفاقية مستوى الخدمة (SLA Monitoring)")}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-extrabold ${(metrics?.slaComplianceRate ?? 100) >= 95 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {Math.round(metrics?.slaComplianceRate ?? 100)}% {t("executive.sla.rate", "التزام")}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {t("executive.sla.subtitle", "تتبع تدفق الطلبات عبر المحطات ومراقبة معدلات التأخير التشغيلية")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(metrics?.slaBreachCount ?? 0) > 0 ? (
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-bold">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  {t("executive.sla.breachAlert", "يوجد طلبات تجاوزت الموعد المحدد للتسليم!")}
                </span>
                <span className="bg-red-200 text-red-900 px-2 py-0.5 rounded-lg text-sm font-black">
                  {metrics?.slaBreachCount ?? 0}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {t("executive.sla.noBreach", "جميع الطلبات تسير ضمن الوقت المعياري المحدد.")}
                </span>
                <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-lg text-sm font-black">100%</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-slate-700">{t("executive.sla.stationBreakdown", "توزيع الاختناقات عبر المحطات")}</h4>
              {Object.entries(stationLabels).map(([key, meta]) => {
                const count = metrics?.stationCounts?.[key] ?? 0;
                const pct = Math.round((count / maxStation) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-semibold text-muted-foreground text-start shrink-0">
                      {t(meta.labelKey, key)}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                    <div className="w-10 text-xs font-black text-end text-slate-700">{count}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Predictive Maintenance & Smart Scheduling */}
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                {t("executive.maintenance.title", "الصيانة التنبؤية ومراقبة الأصول (Predictive Maintenance)")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("executive.maintenance.subtitle", "تشخيص أداء المعدات وتحديد جداول الصيانة الاستباقية لمنع الأعطال")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(metrics?.equipmentAlertCount ?? 0) > 0 ? (
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{t("executive.maintenance.alertTitle", "أصول تتطلب صيانة فورية")}</div>
                      <div className="text-[11px] text-amber-800 font-normal mt-0.5">{t("executive.maintenance.alertSub", "معدات اقترب موعد صيانتها الدورية أو مسجلة كمعطلة.")}</div>
                    </div>
                  </div>
                  <span className="font-black text-lg bg-amber-200 px-3 py-1 rounded-lg text-amber-900">
                    {metrics?.equipmentAlertCount ?? 0}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold">{t("executive.maintenance.okTitle", "جميع الأصول تعمل بكفاءة")}</div>
                    <div className="text-[11px] text-muted-foreground font-normal mt-0.5">{t("executive.maintenance.okSub", "لا توجد معدات تحتاج إلى صيانة في الوقت الحالي.")}</div>
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">{t("executive.inventory.lowStock", "أصناف مخزون وصلت لحد الطلب:")}</span>
                <span className={`font-black px-2 py-0.5 rounded-md ${(metrics?.lowStockItemsCount ?? 0) > 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {metrics?.lowStockItemsCount ?? 0} {t("executive.inventory.unit", "صنف")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {t("executive.scheduling.title", "الجدولة الذكية للعمالة (Smart Scheduling)")}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("executive.scheduling.subtitle", "تحليل التوافق بين عبء العمل اليومي وعدد الموظفين الحاضرين")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <div className="text-xs text-muted-foreground font-semibold">{t("executive.scheduling.activeOrders", "حجم العمل النشط")}</div>
                  <div className="text-xl font-black text-slate-800 mt-1">{metrics?.activeOrdersCount ?? 0}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <div className="text-xs text-muted-foreground font-semibold">{t("executive.scheduling.staffPresent", "القوة البشرية")}</div>
                  <div className="text-xl font-black text-blue-700 mt-1">{metrics?.activeEmployeesCount ?? 0}</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-4 bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-600 shrink-0" />
                {t("executive.scheduling.advice", "التوزيع المؤتمت يعمل بكفاءة. النظام يمنح أولوية للمحطات ذات الطلبات العاجلة تلقائياً.")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pillar 5: Branch Benchmarking */}
      <Card className="border-slate-200/80 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            {t("executive.benchmark.title", "مقارنة وتقييم أداء الفروع (Branch Benchmarking)")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("executive.benchmark.subtitle", "تقييم تحليلي لأداء كل فرع من حيث الإيرادات، التكاليف، معدل الالتزام (SLA) وكفاءة الموظفين")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {(metrics?.branches ?? []).length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-semibold">
              {t("executive.benchmark.noBranches", "لا توجد فروع نشطة مسجلة في هذا الحساب.")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-600">
                <tr>
                  <th className="text-start p-3.5 sticky right-0 bg-slate-50 z-10">{t("executive.benchmark.colBranch", "الفرع")}</th>
                  <th className="text-center p-3.5 border-s border-slate-100">{t("executive.benchmark.colRevenue", "الإيرادات")}</th>
                  <th className="text-center p-3.5 border-s border-slate-100">{t("executive.benchmark.colExpenses", "النفقات")}</th>
                  <th className="text-center p-3.5 border-s border-slate-100">{t("executive.benchmark.colProfit", "صافي الربح")}</th>
                  <th className="text-center p-3.5 border-s border-slate-100">{t("executive.benchmark.colOrders", "الطلبات")}</th>
                  <th className="text-center p-3.5 border-s border-slate-100">{t("executive.benchmark.colSla", "التزام SLA")}</th>
                  <th className="text-center p-3.5 border-s border-slate-100">{t("executive.benchmark.colStaff", "الموظفون")}</th>
                  <th className="text-center p-3.5 border-s border-slate-100">{t("executive.benchmark.colEff", "نقاط الكفاءة")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(metrics?.branches ?? []).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3.5 font-bold text-slate-900 sticky right-0 bg-white z-10">{b.name}</td>
                    <td className="p-3.5 text-center font-bold text-teal-700 border-s border-slate-100">{fmtMoney(b.revenue, t("common.egp", "ج.م"))}</td>
                    <td className="p-3.5 text-center font-semibold text-slate-600 border-s border-slate-100">{fmtMoney(b.expenses, t("common.egp", "ج.م"))}</td>
                    <td className={`p-3.5 text-center font-black border-s border-slate-100 ${b.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {fmtMoney(b.profit, t("common.egp", "ج.م"))}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800 border-s border-slate-100">{b.orderCount}</td>
                    <td className="p-3.5 text-center border-s border-slate-100">
                      <span className={`px-2 py-1 rounded-full text-xs font-black ${b.slaCompliance >= 95 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {Math.round(b.slaCompliance)}%
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-700 border-s border-slate-100">{b.employeeCount}</td>
                    <td className="p-3.5 text-center font-black text-blue-700 border-s border-slate-100">{fmtMoney(b.efficiencyScore, t("common.egp", "ج.م"))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
