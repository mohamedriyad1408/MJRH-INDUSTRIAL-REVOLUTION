import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Package, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/stations/$stage")({
  head: () => ({ meta: [{ title: "محطة تشغيل — MJRH" }] }),
  component: GenericStagePage,
});

type WorkflowStage = {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  stage_order: number;
  icon: string;
  color: string;
  is_initial: boolean;
  is_final: boolean;
};

type UnitRow = {
  id: string;
  label_code: string;
  name: string;
  service_type: string;
  current_stage: string;
  order_id: string;
  orders?: { id: string; order_number: number; status: string; customers?: { full_name: string } | null } | null;
};

function GenericStagePage() {
  const { tenant, stage } = Route.useParams() as { tenant: string; stage: string };
  const { tenantId, hasRole } = useAuth();
  const { t, dir, language } = useI18n();
  const [stageInfo, setStageInfo] = useState<WorkflowStage | null>(null);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStages, setAllStages] = useState<WorkflowStage[]>([]);

  const isManager = hasRole("owner", "ops_manager");

  async function load() {
    if (!tenantId || !stage) return;
    setLoading(true);

    // Load stage info + all stages
    const [stageRes, stagesRes] = await Promise.all([
      supabase.from("workflow_stages").select("*").eq("tenant_id", tenantId).eq("slug", stage).eq("is_active", true).maybeSingle(),
      supabase.rpc("get_workflow_stages", { _tenant_id: tenantId }),
    ]);

    if (stageRes.data) setStageInfo(stageRes.data as WorkflowStage);
    else {
      // Fallback: try to find in all stages
      const list = (stagesRes.data ?? []) as WorkflowStage[];
      const found = list.find((s) => s.slug === stage);
      if (found) setStageInfo(found);
    }
    setAllStages((stagesRes.data ?? []) as WorkflowStage[]);

    // Load units for this stage (generic: any service_units where current_stage = stage)
    const { data, error } = await supabase
      .from("service_units")
      .select("id,label_code,name,service_type,current_stage,order_id,orders(id,order_number,status,customers(full_name))")
      .eq("tenant_id", tenantId)
      .eq("current_stage", stage)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) toast.error(error.message);
    else setUnits((data ?? []) as UnitRow[]);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, stage]);

  const nextStage = useMemo(() => {
    if (!stageInfo || !allStages.length) return null;
    const sorted = [...allStages].sort((a, b) => a.stage_order - b.stage_order);
    const idx = sorted.findIndex((s) => s.slug === stageInfo.slug);
    if (idx >= 0 && idx < sorted.length - 1) return sorted[idx + 1];
    return null;
  }, [stageInfo, allStages]);

  async function moveToNext(unit: UnitRow) {
    if (!nextStage) return toast.error("لا توجد مرحلة تالية");
    const { error } = await supabase.from("service_units").update({ current_stage: nextStage.slug }).eq("id", unit.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`تم نقل ${unit.label_code} إلى ${nextStage.name}`);
      // Check if order can move too
      const { data: remaining } = await supabase
        .from("service_units")
        .select("id")
        .eq("order_id", unit.order_id)
        .eq("current_stage", stage)
        .limit(1);
      if (!remaining?.length) {
        // All units moved from this stage, optionally move order status
        const newStatus = nextStage.slug === "delivery" || nextStage.is_final ? "ready" : nextStage.slug;
        await supabase.from("orders").update({ status: newStatus }).eq("id", unit.order_id);
      }
      load();
    }
  }

  const displayName = language === "en" && stageInfo?.name_en ? stageInfo.name_en : stageInfo?.name || stage;

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
  }

  if (!stageInfo) {
    return (
      <div className="space-y-4" dir={dir}>
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-3">
            <div className="text-4xl">🔍</div>
            <h2 className="text-xl font-black">المرحلة غير موجودة: {stage}</h2>
            <p className="text-muted-foreground">تأكد من أن المراحل معرّفة في إعدادات Workflow</p>
            <Button asChild><Link to="/$tenant/settings/workflow" params={{ tenant } as any}>إعداد المراحل ←</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={dir}>
      {/* Header */}
      <div className="rounded-3xl p-5 text-white shadow-xl flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: stageInfo.color }}>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <span className="text-3xl">{stageInfo.icon}</span> {displayName}
          </h1>
          <p className="text-sm text-white/80 mt-1">
            {isManager ? "عرض المدير — كل البنود في هذه المرحلة" : "قائمة مهامك في هذه المرحلة"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-white text-slate-900">#{stageInfo.stage_order}</Badge>
          {stageInfo.is_initial && <Badge className="bg-teal-100 text-teal-900">بداية</Badge>}
          {stageInfo.is_final && <Badge className="bg-emerald-100 text-emerald-900">نهاية</Badge>}
          <Button variant="secondary" size="sm" onClick={load}>{t("common.refresh", "تحديث")}</Button>
        </div>
      </div>

      {/* Workflow preview */}
      {allStages.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              {[...allStages].sort((a,b)=>a.stage_order-b.stage_order).map((s, i) => (
                <div key={s.slug} className="flex items-center gap-2">
                  <div className={`rounded-xl px-3 py-1.5 text-sm font-bold flex items-center gap-1.5 ${s.slug === stage ? "ring-2 ring-offset-2 ring-slate-900" : ""} text-white`} style={{ backgroundColor: s.color }}>
                    <span>{s.icon}</span> {language === "en" && s.name_en ? s.name_en : s.name}
                  </div>
                  {i < allStages.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Units */}
      {units.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد بنود في مرحلة {displayName} حالياً — أحسنت!</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {units.map((u) => (
            <Card key={u.id} className="overflow-hidden hover:shadow-md transition">
              <CardHeader className="bg-muted/40 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" /> {u.label_code} — {u.name}
                    <Badge variant="outline">{u.service_type}</Badge>
                  </CardTitle>
                  {u.orders?.id && <Button asChild size="sm" variant="outline"><Link to="/$tenant/orders/$id" params={{ tenant, id: u.orders.id } as any}>فتح العملية <ArrowLeft className="w-3 h-3 me-1" /></Link></Button>}
                </div>
                <div className="text-xs text-muted-foreground">عملية #{u.orders?.order_number ?? "?"} · {u.orders?.customers?.full_name ?? "—"}</div>
              </CardHeader>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" /> المرحلة الحالية: <Badge>{u.current_stage}</Badge>
                </div>
                <div className="flex gap-2">
                  {nextStage && (
                    <Button size="sm" onClick={() => moveToNext(u)} className="font-bold" style={{ backgroundColor: nextStage.color }}>
                      <CheckCircle2 className="w-4 h-4 me-1" /> نقل إلى {language === "en" && nextStage.name_en ? nextStage.name_en : nextStage.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-slate-50 border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground">
          هذه صفحة ديناميكية — أي مرحلة تضيفها في <Link to="/$tenant/settings/workflow" params={{ tenant } as any} className="text-teal-700 font-bold underline">إعدادات المراحل</Link> هتظهر هنا تلقائياً مع إمكانية نقل البنود للمرحلة التالية.
        </CardContent>
      </Card>
    </div>
  );
}
