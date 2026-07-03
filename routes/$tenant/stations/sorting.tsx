import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tags, RefreshCw, Shirt, ArrowRight, CheckCircle2 } from "lucide-react";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/$tenant/stations/sorting")({
  head: () => ({ meta: [{ title: "4. الفرز والتصنيف Sorting" }] }),
  component: SortingStationPage,
});

function SortingStationPage() {
  const { tenantId, user } = useAuth();
  const { t, dir } = useI18n();
  const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("service_units")
      .select("id,label_code,name,service_type,current_stage,label_status,order_id,orders(id,order_number,status,customers(full_name))")
      .eq("tenant_id", tenantId)
      .in("current_stage", ["received", "sorting"])
      .order("unit_number")
      .limit(30);
    setUnits(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tenantId]);

  async function markSorted(u: any) {
    setBusy(u.id);
    const nextStage = ["ironing"].includes(u.service_type) ? "ironing" : "cleaning";
    const { error } = await supabase.from("service_units").update({
      current_stage: nextStage,
      label_status: "labeled",
    }).eq("id", u.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`تم فرز ولصق باركود ${u.label_code} وتحويلها لمحطة ${nextStage === "ironing" ? "الكي" : "الغسيل"}`);
      if (activeActor) {
        await supabase.from("order_status_history").insert({
          order_id: u.orders?.id || u.order_id, from_status: "sorting", to_status: nextStage,
          changed_by: user?.id, notes: `👤 الفرز والتصنيف: ${u.label_code} (${u.name}) — نفذه: ${activeActor.full_name}`,
        });
      }
      load();
    }
    setBusy(null);
  }

  return (
    <div className="space-y-5" dir={dir}>
      <StationActorWidget stationId="sorting" stationLabel="الفرز والتصنيف وإصدار المارك 🏷️" onActorChange={setActiveActor} />

      <div className="rounded-3xl bg-gradient-to-br from-violet-800 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Tags className="w-7 h-7 text-violet-300" /> 4. محطة الفرز والتصنيف وإصدار المارك (Sorting & Tagging)</h1>
            <p className="text-sm text-white/70 mt-1">المحطة التشغيلية الرابعة: الفرز الفني للأقمشة، إصدار ولصق ملصقات الباركود (Mark/Label)، وتوجيه الملابس لمحطات الغسيل أو الكي.</p>
          </div>
          <Button variant="secondary" onClick={load}><RefreshCw className="w-4 h-4 ms-1" /> تحديث الفرز</Button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">قطع بانتظار الفرز والمارك</div><div className="text-xl font-black">{units.length} قطعة</div></div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">توجيه الغسيل والتنظيف</div><div className="text-xl font-black text-blue-300">{units.filter(x => ["cleaning", "both"].includes(x.service_type)).length} قطعة</div></div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">توجيه الكي فقط</div><div className="text-xl font-black text-purple-300">{units.filter(x => x.service_type === "ironing").length} قطعة</div></div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : (
        <Card className="rounded-3xl shadow-sm border">
          <CardHeader className="bg-slate-50/80 pb-3"><CardTitle className="text-base font-black flex items-center gap-2"><Shirt className="w-5 h-5 text-violet-600" /> قطع الملابس الواردة للفرز ولصق المارك</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-3">
            {units.length === 0 ? <p className="text-center text-xs text-slate-400 py-8 font-bold">لا توجد قطع معلقة بانتظار الفرز حالياً</p> : units.map((u) => (
              <div key={u.id} className="p-3.5 rounded-2xl border bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="font-black text-base text-slate-900 flex items-center gap-2">
                    <span className="font-mono text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-lg border border-violet-200">{u.label_code}</span>
                    <span>{u.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-bold mt-1">طلب #{u.orders?.order_number ?? "?"} — {u.orders?.customers?.full_name ?? "عميل"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={u.service_type === "ironing" ? "bg-purple-600 text-white" : "bg-blue-600 text-white"}>
                    {u.service_type === "both" ? "✨ تنظيف وكي" : u.service_type === "ironing" ? "👔 كي فقط" : "🫧 تنظيف فقط"}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => markSorted(u)}
                    disabled={busy === u.id}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl px-4 shadow-xs"
                  >
                    {busy === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ms-1" />}
                    <span>إتمام الفرز ولصق المارك &larr;</span>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
