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
import { interpolate, useI18n } from "@/lib/i18n";

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
  const { dir, t } = useI18n();
  const isManager = hasRole("owner", "ops_manager");

  if (isManager) {
    return (
      <div className="space-y-5" dir={dir}>
        <CleaningWorkerView manager />
        <StationBoard title="تحريك الطلبات من الغسيل إلى التجفيف والتجميع" station="cleaning" incoming="received" current="cleaning" nextStatus="ironing" nextLabel={t("station.assembly.title")} />
      </div>
    );
  }

  return <CleaningWorkerView />;
}

function CleaningWorkerView({ manager = false }: { manager?: boolean }) {
  const { t, dir } = useI18n();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("service_units")
      .select("id,label_code,name,service_type,photo_url,needs_reclean,reclean_reason,reclean_return_to_employee_id,current_stage,order_id,orders(id,order_number,status,customers(full_name,phone))")
      .or("service_type.eq.both,service_type.eq.cleaning,needs_reclean.eq.true")
      .in("orders.status", ["cleaning", "ironing", "packing", "ready", "delivered"])
      .order("unit_number");
    setUnits((data ?? []).filter((x: any) => x.orders && (x.orders.status !== "delivered" || x.status === "customer_return" || x.needs_reclean || ["customer_return_cleaning", "recleaning"].includes(x.current_stage))) as Unit[]);
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
    <div className="space-y-5" dir={dir}>
      <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Sparkles className="w-6 h-6" /> {manager ? t("station.cleaning.titleManager") : t("station.cleaning.titleWorker")}</h1>
            <p className="text-sm text-white/70">{t("station.cleaning.subtitle")}</p>
          </div>
          <Button variant="secondary" onClick={load}>{t("common.refresh")}</Button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <MiniStat label={t("station.common.orders")} value={groups.length} />
          <MiniStat label={t("station.cleaning.cleanPieces")} value={units.length} />
          <MiniStat label={t("station.packing.returns")} value={recleanCount} tone={recleanCount ? "warn" : "ok"} />
        </div>
      </div>

      {loading ? <div className="p-8 text-center text-muted-foreground">{t("common.loading")}...</div> : (
        <div className="space-y-3">
          {!groups.length && <Card><CardContent className="p-10 text-center text-muted-foreground">{t("station.cleaning.noOrders")}</CardContent></Card>}
          {groups.map((g) => (
            <Card key={g.orderId} className="overflow-hidden">
              <CardHeader className="bg-muted/40 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" /> {t("order.orderNo", "طلب #{order}").replace("{order}", String(g.order?.order_number ?? "?"))}
                    <Badge variant="outline">{g.units.length} {t("station.common.pieces")}</Badge>
                    {g.units.some((u) => u.needs_reclean) && <Badge className="bg-amber-500">{t("station.common.reclean")}</Badge>}
                  </CardTitle>
                  {g.order?.id && <Button asChild size="sm" variant="outline"><Link to="/orders/$id" params={{ id: g.order.id }}>{t("station.common.openOrder")} <ArrowLeft className="w-3 h-3 me-1" /></Link></Button>}
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
                        {u.service_type === "both" && <Badge className="bg-blue-600"><Shirt className="w-3 h-3 ms-1" /> {t("station.common.cleanIron")}</Badge>}
                        {u.needs_reclean && <Badge className="bg-amber-500"><RotateCcw className="w-3 h-3 ms-1" /> {t("station.common.recleanCleaning")}</Badge>}
                      </div>
                      {u.reclean_reason && <div className="text-xs text-amber-700 mt-1">{interpolate(t("station.cleaning.recleanReturnHint"), { reason: u.reclean_reason })}</div>}
                      <div className="text-xs text-muted-foreground mt-1">{t("station.common.stage")}: {u.current_stage}</div>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex gap-2 justify-end">
                      {u.needs_reclean ? (
                        <Button size="sm" onClick={() => resolveReclean(u)}><CheckCircle2 className="w-3 h-3 ms-1" /> {t("station.cleaning.cleanedAgain")}</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => markCleaned(u)}><CheckCircle2 className="w-3 h-3 ms-1" /> {t("station.cleaning.cleaned")}</Button>
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
