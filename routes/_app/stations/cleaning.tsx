import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StationBoard } from "@/components/station-board";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, CheckCircle2, Sparkles, Package, Shirt, Image as ImageIcon, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/stations/cleaning")({
  head: () => ({ meta: [{ title: "الغسيل والتنظيف" }] }),
  component: CleaningStation,
});

type Unit = {
  id: string;
  label_code: string;
  name: string;
  service_type: string;
  photo_url?: string | null;
  needs_reclean: boolean;
  reclean_reason?: string | null;
  reclean_return_to_employee_id?: string | null;
  current_stage: string;
  order_id: string;
  orders?: { id: string; order_number: number; status: string; customers?: { full_name: string; phone: string } | null } | null;
};

function CleaningStation() {
  const { hasRole } = useAuth();
  const isManager = hasRole("owner", "ops_manager");

  if (isManager) {
    return (
      <div className="space-y-5">
        <CleaningWorkerView manager />
        <StationBoard title="تحريك الطلبات من الغسيل إلى التجفيف والتجميع" station="cleaning" incoming="received" current="cleaning" nextStatus="ironing" nextLabel="التجفيف والتجميع" />
      </div>
    );
  }

  return <CleaningWorkerView />;
}

function CleaningWorkerView({ manager = false }: { manager?: boolean }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("service_units")
      .select("id,label_code,name,service_type,photo_url,needs_reclean,reclean_reason,reclean_return_to_employee_id,current_stage,order_id,orders(id,order_number,status,customers(full_name,phone))")
      .or("service_type.eq.both,service_type.eq.cleaning,needs_reclean.eq.true")
      .in("orders.status", ["cleaning", "ironing", "packing", "ready"])
      .order("unit_number");
    setUnits((data ?? []).filter((x: any) => x.orders) as Unit[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function resolveReclean(unit: Unit) {
    const { error } = await (supabase as any).rpc("resolve_reclean_return", { _unit_id: unit.id });
    if (error) toast.error(error.message); else { toast.success("تم تنظيف المرتجع ورجوعه لنفس فني الكي"); load(); }
  }

  async function markCleaned(unit: Unit) {
    const { error } = await (supabase as any).from("service_units").update({ current_stage: "cleaning_done" }).eq("id", unit.id);
    if (error) toast.error(error.message); else { toast.success(`تم تنظيف ${unit.label_code}`); load(); }
  }

  const groups = useMemo(() => {
    const map = new Map<string, Unit[]>();
    units.forEach((u) => {
      const key = u.order_id;
      map.set(key, [...(map.get(key) ?? []), u]);
    });
    return Array.from(map.entries()).map(([orderId, rows]) => ({ orderId, order: rows[0].orders, units: rows }));
  }, [units]);

  const recleanCount = units.filter((u) => u.needs_reclean).length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Sparkles className="w-6 h-6" /> {manager ? "متابعة الغسيل والتنظيف" : "شغل الغسيل والتنظيف"}</h1>
            <p className="text-sm text-white/70">الطلبات مقسمة وبداخل كل طلب القطع المطلوب تنظيفها أو المرتجعة للتنظيف</p>
          </div>
          <Button variant="secondary" onClick={load}>تحديث</Button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <MiniStat label="طلبات" value={groups.length} />
          <MiniStat label="قطع تنظيف" value={units.length} />
          <MiniStat label="مرتجعات" value={recleanCount} tone={recleanCount ? "warn" : "ok"} />
        </div>
      </div>

      {loading ? <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div> : (
        <div className="space-y-3">
          {!groups.length && <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد طلبات غسيل الآن ✅</CardContent></Card>}
          {groups.map((g) => (
            <Card key={g.orderId} className="overflow-hidden">
              <CardHeader className="bg-muted/40 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" /> طلب #{g.order?.order_number}
                    <Badge variant="outline">{g.units.length} قطعة</Badge>
                    {g.units.some((u) => u.needs_reclean) && <Badge className="bg-amber-500">مرتجع</Badge>}
                  </CardTitle>
                  {g.order?.id && <Button asChild size="sm" variant="outline"><Link to="/orders/$id" params={{ id: g.order.id }}>فتح الطلب <ArrowLeft className="w-3 h-3 me-1" /></Link></Button>}
                </div>
                <div className="text-xs text-muted-foreground">{g.order?.customers?.full_name ?? "—"} · {g.order?.customers?.phone ?? ""}</div>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {g.units.map((u) => (
                  <div key={u.id} className="grid grid-cols-[58px_1fr] md:grid-cols-[58px_1fr_auto] gap-3 items-center rounded-xl border p-2 bg-card">
                    <div className="w-14 h-14 rounded-lg bg-muted border overflow-hidden flex items-center justify-center">
                      {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black">{u.label_code}</span>
                        <Badge variant="outline">{u.name}</Badge>
                        {u.service_type === "both" && <Badge className="bg-blue-600"><Shirt className="w-3 h-3 ms-1" /> تنظيف + كي</Badge>}
                        {u.needs_reclean && <Badge className="bg-amber-500"><RotateCcw className="w-3 h-3 ms-1" /> مرتجع تنظيف</Badge>}
                      </div>
                      {u.reclean_reason && <div className="text-xs text-amber-700 mt-1">سبب المرتجع: {u.reclean_reason} · بعد التنظيف سترجع لنفس فني الكي</div>}
                      <div className="text-xs text-muted-foreground mt-1">المرحلة: {u.current_stage}</div>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex gap-2 justify-end">
                      {u.needs_reclean ? (
                        <Button size="sm" onClick={() => resolveReclean(u)}><CheckCircle2 className="w-3 h-3 ms-1" /> تم إعادة التنظيف</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markCleaned(u)}><CheckCircle2 className="w-3 h-3 ms-1" /> تم التنظيف</Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" }) {
  return <div className={`rounded-2xl p-3 border border-white/10 ${tone === "warn" ? "bg-amber-400/20" : tone === "ok" ? "bg-emerald-400/20" : "bg-white/10"}`}>
    <div className="text-2xl font-black">{value}</div><div className="text-xs text-white/70">{label}</div>
  </div>;
}
