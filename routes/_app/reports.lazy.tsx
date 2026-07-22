import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getOrdersSummary, getQCReport, getInventoryReport } from "@/lib/reports-api";
import { useI18n, interpolate } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Brain, AlertTriangle, Gauge, ShieldAlert } from "lucide-react";

export const Route = createLazyFileRoute("/_app/reports")({
  component: ReportsPage,
});

type Insight = { title: string; body: string; tone: "good" | "warn" | "bad" | "info"; action: string };

function ReportsPage() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [ordersSummary, setOrdersSummary] = useState<any>(null);
  const [qcReport, setQcReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);

  const loadReports = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [orders, qc, inventory] = await Promise.all([
      getOrdersSummary(tenantId, dateRange.start, dateRange.end),
      getQCReport(tenantId, dateRange.start, dateRange.end),
      getInventoryReport(tenantId),

    ]);
    setOrdersSummary(orders);
    setQcReport(qc);
    setInventoryReport(inventory);
    setLoading(false);
  }, [tenantId, dateRange]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
      <p className="mt-2 text-muted-foreground font-medium">{t("reports.loading", "جاري تحليل البيانات والتقارير...")}</p>
    </div>
  );

  const insights: Insight[] = [];
  if (qcReport?.passRate < 90) {
    insights.push({ 
      tone: "bad", 
      title: t("reports.insight.qualityIssue", "مشكلة في الجودة"), 
      body: t("reports.insight.qualityIssueDetail", "نسبة نجاح الفحص أقل من 90%."), 
      action: t("reports.insight.qualityAction", "راجع الموظفين المسؤولين عن المحطات.") 
    });
  }
  if (inventoryReport?.lowStockItems > 0) {
    insights.push({ 
      tone: "warn", 
      title: t("reports.insight.stockWarning", "المخزون ينخفض"), 
      body: interpolate(t("reports.insight.stockDetail"), { count: inventoryReport.lowStockItems }), 
      action: t("reports.insight.stockAction", "اطلب المواد الناقصة الآن.") 
    });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir={dir}>
      <h1 className="text-2xl font-black flex items-center gap-2">
        <TrendingUp className="w-7 h-7 text-teal-600" /> {t("reports.title", "التقارير المتقدمة")}
      </h1>

      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t("common.from")}</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-full px-3 py-2 border rounded-xl text-sm font-bold"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t("common.to")}</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-full px-3 py-2 border rounded-xl text-sm font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label={t("reports.totalOrders", "إجمالي الطلبات")} value={ordersSummary?.totalOrders || 0} />
        <KpiCard label={t("reports.totalRevenue", "إجمالي الإيرادات")} value={`${ordersSummary?.totalRevenue?.toFixed(2) || 0} ${t("common.egp")}`} tone="teal" />
        <KpiCard label={t("reports.avgInvoice", "متوسط الفاتورة")} value={`${ordersSummary?.avgOrderValue?.toFixed(2) || 0} ${t("common.egp")}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label={t("reports.qcPassed", "QC ناجح")} value={qcReport?.passed || 0} tone="green" />
        <KpiCard label={t("reports.qcFailed", "QC فاشل")} value={qcReport?.failed || 0} tone="red" />
        <KpiCard label={t("reports.qcRate", "نسبة النجاح")} value={`${qcReport?.passRate?.toFixed(1) || 0}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-slate-100 bg-slate-50/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-5 h-5 text-teal-600" />{t("reports.systemTalk")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {insights.map((ins, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${ins.tone === "good" ? "bg-emerald-50 border-emerald-100" : ins.tone === "warn" ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
                <div className="font-black text-sm mb-1">{ins.title}</div>
                <div className="text-xs text-muted-foreground">{ins.body}</div>
                <div className="mt-2 text-xs font-bold text-teal-700">{t("reports.suggestedAction")} {ins.action}</div>
              </div>
            ))}
            {!insights.length && <div className="text-center text-sm text-slate-400 py-6">{t("reports.allStable", "التشغيل مستقر حالياً")}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gauge className="w-5 h-5 text-teal-600" />{t("reports.inventorySummary", "ملخص المخزون")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase">{t("reports.lowStockItems", "منخفض")}</div>
              <div className="text-2xl font-black text-amber-600">{inventoryReport?.lowStockItems || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase">{t("reports.totalValue", "القيمة الإجمالية")}</div>
              <div className="text-xl font-black text-teal-700">{inventoryReport?.totalValue?.toFixed(0) || 0} ج.م</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, tone = "slate" }: { label: string; value: any; tone?: "teal" | "green" | "red" | "slate" }) {
  const styles = {
    teal: "text-teal-700",
    green: "text-emerald-700",
    red: "text-red-700",
    slate: "text-slate-900",
  };
  return (
    <Card className="rounded-3xl border-slate-100 shadow-sm">
      <CardContent className="p-5">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-2xl font-black ${styles[tone]}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
