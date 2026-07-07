import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateAiAdvisorInsights, type AiAdvisorInsight, type AiInsightCategory } from "@/lib/ai-advisor";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, interpolate } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { resolveAppUrl } from "@/lib/utils";
import { Sparkles, AlertTriangle, CheckCircle2, Info, RefreshCw, ArrowRight, ArrowLeft, Lightbulb, TrendingUp, Cpu } from "lucide-react";

export function AiAdvisorWidget({ selectedBranchId }: { selectedBranchId?: string }) {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [activeCategory, setActiveCategory] = useState<AiInsightCategory | "all">("all");

  const { data: insights = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["ai-advisor-insights", tenantId, selectedBranchId],
    queryFn: () => generateAiAdvisorInsights(tenantId ?? "", selectedBranchId),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });

  const categories: { key: AiInsightCategory | "all"; labelKey: string; icon: string }[] = [
    { key: "all", labelKey: "ai.filter.all", icon: "" },
    { key: "bottleneck", labelKey: "ai.filter.bottleneck", icon: "" },
    { key: "sla", labelKey: "ai.filter.sla", icon: "" },
    { key: "inventory", labelKey: "ai.filter.inventory", icon: "" },
    { key: "maintenance", labelKey: "ai.filter.maintenance", icon: "" },
    { key: "workforce", labelKey: "ai.filter.workforce", icon: "" },
    { key: "finance", labelKey: "ai.filter.finance", icon: "" },
  ];

  const filteredInsights = activeCategory === "all" ? insights : insights.filter((x) => x.category === activeCategory);

  const severityConfigs = {
    critical: { bg: "bg-red-50 border-red-200 text-red-900", badge: "bg-red-500 text-white", icon: AlertTriangle, tone: "text-red-600" },
    warning: { bg: "bg-amber-50 border-amber-200 text-amber-900", badge: "bg-amber-500 text-white", icon: AlertTriangle, tone: "text-amber-600" },
    info: { bg: "bg-blue-50 border-blue-200 text-blue-900", badge: "bg-blue-500 text-white", icon: Info, tone: "text-blue-600" },
    success: { bg: "bg-emerald-50 border-emerald-200 text-emerald-900", badge: "bg-emerald-500 text-white", icon: CheckCircle2, tone: "text-emerald-600" },
  };

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/20 shadow-sm" dir={dir}>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                {t("ai.widget.title", "AI Laundry Advisor")}
                <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs font-semibold px-2 py-0.5">
                  <Cpu className="w-3 h-3 me-1 inline" /> {t("ai.widget.live", "مستشار رقمي مباشر")}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {t("ai.widget.subtitle", "توصيات استباقية وتشخيص مستمر لأداء التشغيل، المخزون، والربحية")}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isRefetching} className="text-xs flex items-center gap-1 border-teal-200 hover:bg-teal-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-teal-600" : "text-muted-foreground"}`} />
            {t("common.refresh", "تحديث")}
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 mt-2">
          {categories.map((c) => {
            const count = c.key === "all" ? insights.length : insights.filter((x) => x.category === c.key).length;
            const isActive = activeCategory === c.key;
            return (
              <Button
                key={c.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`text-xs px-2.5 py-1 rounded-full h-8 transition-all ${isActive ? "bg-teal-600 text-white shadow-sm hover:bg-teal-700" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                onClick={() => setActiveCategory(c.key)}
              >
                <span className="me-1">{c.icon}</span>
                {t(c.labelKey, c.key)}
                <span className={`ms-1.5 px-1.5 py-0.2 text-[10px] rounded-full ${isActive ? "bg-teal-500 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
            <p className="text-xs">{t("ai.widget.loading", "جاري تحليل ملايين البيانات التشغيلية...")}</p>
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold">{t("ai.widget.noIssues", "لا توجد تنبيهات تشغيلية في هذه القائمة")}</p>
            <p className="text-xs text-muted-foreground">{t("ai.widget.noIssuesSub", "عملياتك تسير بكفاءة عالية وفق معايير الجودة العالمية.")}</p>
          </div>
        ) : (
          filteredInsights.map((insight) => {
            const cfg = severityConfigs[insight.severity] ?? severityConfigs.info;
            const Icon = cfg.icon;
            return (
              <div key={insight.id} className={`rounded-xl border p-4 transition-all hover:shadow-md ${cfg.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1 shrink-0">
                      <Icon className={`w-5 h-5 ${cfg.tone}`} />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm tracking-tight">
                          {interpolate(t(insight.titleKey, insight.titleKey), insight.values)}
                        </h4>
                        <Badge className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-bold shadow-none ${cfg.badge}`}>
                          {t(`ai.severity.${insight.severity}`, insight.severity)}
                        </Badge>
                        {insight.metricImpact && (
                          <Badge variant="secondary" className="bg-white/80 text-slate-700 text-[10px] border border-slate-200 font-bold px-2 py-0.5 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-teal-600" /> {insight.metricImpact}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-normal opacity-90">
                        {interpolate(t(insight.descriptionKey, insight.descriptionKey), insight.values)}
                      </p>
                    </div>
                  </div>
                  {insight.actionHref && (
                    <Link to={resolveAppUrl(insight.actionHref) as any} className="shrink-0">
                      <Button variant="ghost" size="sm" className="text-xs bg-white/60 hover:bg-white hover:text-teal-700 font-bold border border-slate-200/60 shadow-sm h-8 px-3 rounded-lg flex items-center gap-1 transition">
                        {t(insight.actionLabelKey ?? "common.open", "اتخذ إجراء")}
                        {dir === "rtl" ? <ArrowLeft className="w-3.5 h-3.5 ms-1" /> : <ArrowRight className="w-3.5 h-3.5 ms-1" />}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
