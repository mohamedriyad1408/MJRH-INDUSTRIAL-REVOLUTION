import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle, ShieldCheck, Activity, CheckCircle2, Clock, Loader2,
  RefreshCw, Search, Sparkles, AlertCircle, Laptop, Wrench, ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/$tenant/issues")({
  head: () => ({ meta: [{ title: "مراقبة مشاكل المشروع — Telemetry" }] }),
  component: TenantIssuesPage,
});

type ProjectIssue = {
  id: string;
  type: "software_error" | "operational_bottleneck" | "quality_reclean";
  title: string;
  description: string;
  severity: "error" | "warning";
  createdAt: string;
  detail: string;
  actionUrl?: string;
};

function TenantIssuesPage() {
  const { tenantId, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = hasRole("owner", "ops_manager", "cs_manager", "super_admin");

  async function loadProjectIssues() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 86400000).toISOString();

      const [errRes, recleanRes, staleRes] = await Promise.all([
        supabase
          .from("client_error_logs")
          .select("*")
          .eq("tenant_id", tenantId)
          .is("resolved_at", null)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("service_units")
          .select("id, name, label_code, reclean_reason, current_stage, created_at, order_id, orders!inner(order_number)")
          .eq("orders.tenant_id", tenantId)
          .not("reclean_reason", "is", null)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("orders")
          .select("id, order_number, status, created_at, total, customers(full_name, phone)")
          .eq("tenant_id", tenantId)
          .eq("status", "received")
          .lte("created_at", twentyFourHoursAgo)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const items: ProjectIssue[] = [];

      if (errRes.data) {
        errRes.data.forEach((err: any) => {
          items.push({
            id: `err-${err.id}`,
            type: "software_error",
            title: `[خطأ بالواجهة] ${err.message?.slice(0, 70) || "خطأ غير محدد"}`,
            description: "تم إرسال هذا الخطأ آلياً لإدارة المنصة وسجل الصيانة للتطوير والتحديث.",
            severity: "error",
            createdAt: err.created_at,
            detail: err.path ? `حدث في المسار: ${err.path}` : "خطأ تشغيلي",
          });
        });
      }

      if (recleanRes.data) {
        recleanRes.data.forEach((u: any) => {
          items.push({
            id: `reclean-${u.id}`,
            type: "quality_reclean",
            title: `[إعادة غسيل وتراجع جودة] قطعة ${u.name} في طلب #${u.orders?.order_number}`,
            description: `السبب المسجل: (${u.reclean_reason}). القطعة في المحطة: ${u.current_stage}`,
            severity: "warning",
            createdAt: u.created_at,
            detail: `كود الليبل: ${u.label_code || "—"}`,
            actionUrl: `/orders/${u.order_id}`,
          });
        });
      }

      if (staleRes.data) {
        staleRes.data.forEach((o: any) => {
          items.push({
            id: `stale-${o.id}`,
            type: "operational_bottleneck",
            title: `[مختنق تشغيلي] طلب #${o.order_number} عالق في مرحلة الاستلام لأكثر من 24 ساعة`,
            description: `العميل: ${o.customers?.full_name || "بدون اسم"} • المبلغ: ${fmtMoney(o.total || 0)}`,
            severity: "error",
            createdAt: o.created_at,
            detail: "يجب توجيه محطة الغسيل أو الاستقبال للبدء الفوري بمعالجة الطلب.",
            actionUrl: `/orders/${o.id}`,
          });
        });
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setIssues(items);
    } catch (err: any) {
      toast.error("فشل تحميل سجل تعثرات المشروع");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjectIssues();
  }, [tenantId]);

  if (!isManager) {
    return <Card className="p-12 text-center font-bold">صلاحية هذه الصفحة لمديري التشغيل والمالك فقط.</Card>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{t("issues.badge", "رقابة التشغيل والتطوير المستمر — Project Telemetry")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
            <span>{t("issues.title", "مرصد المشاكل والتعثرات التشغيلية")}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {t("issues.sub", "مراقبة الأعطال والمختنقات داخل مشروعك (طلبات معلقة، تراجع جودة، أو أخطاء تقنية) للارتقاء بالأداء ومتابعة التحديثات.")}
          </p>
        </div>

        <Button variant="outline" onClick={loadProjectIssues} disabled={loading} className="font-bold h-11 px-5">
          <RefreshCw className={`w-4 h-4 ms-1.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
          <span>تحديث المرصد</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto" />
          <div className="font-extrabold text-slate-700">جاري فحص تعثرات ومختنقات المشروع...</div>
        </div>
      ) : issues.length === 0 ? (
        <Card className="p-16 text-center border-dashed rounded-3xl text-slate-400 font-bold space-y-3 bg-white">
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
          <p className="text-lg text-slate-800 font-black">ممتاز! مشروعك يعمل بانسيابية تامة دون أي مختنقات أو أعطال مرصودة</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((inc) => (
            <Card key={inc.id} className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={inc.severity === "error" ? "bg-red-600 text-white" : "bg-amber-500 text-white"}>
                      {inc.type === "software_error" ? "تقني" : inc.type === "quality_reclean" ? "جودة" : "تشغيلي"}
                    </Badge>
                    <span className="text-xs text-slate-500 font-mono font-bold">{fmtDate(inc.createdAt)}</span>
                  </div>
                  <h3 className="font-black text-base text-slate-900">{inc.title}</h3>
                  <p className="text-xs text-slate-600 font-semibold">{inc.description}</p>
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border inline-block">
                    {inc.detail}
                  </div>
                </div>

                {inc.actionUrl && (
                  <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shrink-0">
                    <Link to={inc.actionUrl as any}>
                      <span>معالجة الطلب</span>
                      <ArrowLeft className="w-3.5 h-3.5 me-1.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
