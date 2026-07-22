import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Image as ImageIcon, Loader2, Package, PackageCheck, ShieldCheck, Shirt, Tags } from "lucide-react";
import { validateOrderMove } from "@/lib/station-workflow";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/stations/packing")({
  head: () => ({ meta: [{ title: "Packing - MJRH" }] }),
  component: PackingStation,
});

type Unit = {
  id: string;
  label_code: string;
  name: string;
  photo_url?: string | null;
  service_type: string;
  current_stage: string;
  needs_reclean: boolean;
  label_status?: string | null;
  ironing_completed_at?: string | null;
  order_id: string;
  orders?: { id: string; order_number: number; status: string; branch_id?: string | null; customers?: { full_name: string; phone: string } | null } | null;
};

type Group = { orderId: string; order: NonNullable<Unit["orders"]>; units: Unit[] };

function PackingStation() {
  const { user, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const canMove = hasRole("owner", "ops_manager", "employee");
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_units")
      .select("id,label_code,name,photo_url,service_type,current_stage,needs_reclean,label_status,ironing_completed_at,order_id,orders(id,order_number,status,branch_id,customers(full_name,phone))")
      .in("orders.status", ["ironing", "packing", "ready", "delivered"])
      .neq("status", "cancelled")
      .order("updated_at", { ascending: true });
    if (error) toast.error(error.message);
    setUnits((data ?? []).filter((x: any) => x.orders && (x.orders.status !== "delivered" || x.status === "customer_return")) as Unit[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const groups: Group[] = useMemo(() => {
    const m = new Map<string, Unit[]>();
    units.forEach((u) => m.set(u.order_id, [...(m.get(u.order_id) ?? []), u]));
    return Array.from(m.entries()).map(([orderId, rows]) => ({ orderId, order: rows[0].orders!, units: rows }));
  }, [units]);

  function checks(g: Group) {
    const active = g.units.filter((u) => u.current_stage !== "cancelled");
    const reclean = active.filter((u) => u.needs_reclean).length;
    const label = active.filter((u) => u.label_status && u.label_status !== "labeled").length;
    const notAssembled = active.filter((u) => ["both", "cleaning"].includes(u.service_type) && ["cleaning", "cleaning_done", "drying_assembly"].includes(String(u.current_stage))).length;
    const notIroned = active.filter((u) => ["both", "ironing"].includes(u.service_type) && !u.ironing_completed_at && !["ironing_done", "packing", "packing_done", "qc_passed"].includes(u.current_stage)).length;
    const notPacked = active.filter((u) => !["packing_done", "qc_passed", "ready"].includes(u.current_stage)).length;
    return { active: active.length, reclean, label, notAssembled, notIroned, notPacked, okToPack: !reclean && !label && !notAssembled && !notIroned, okToReady: !reclean && !label && !notAssembled && !notIroned && !notPacked };
  }

  async function record(g: Group, key: string, name: string, output: any = {}) {
    await supabase.rpc("record_operation_event", {
      _process_key: key,
      _process_name: name,
      _source_type: "order",
      _source_id: g.orderId,
      _branch_id: g.order.branch_id ?? null,
      _cash_account_id: null,
      _report_bucket: "operations/packing",
      _requires_notification: false,
      _data: { order_number: g.order.order_number, pieces: g.units.length },
      _output: { cash_impact: false, journal_required: false, appears_in_report: true, ...output },
    }).then(() => null);
  }

  async function startPacking(g: Group) {
    setBusy(g.orderId);
    const { error } = await supabase.from("orders").update({ status: "packing" }).eq("id", g.orderId);
    if (!error) await record(g, "packing_started", t("بدء التغليف"));
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success(t("stations.packing.toastStarted")); load(); }
  }

  async function packAll(g: Group) {
    const c = checks(g);
    if (!c.okToPack) return toast.error(t("stations.packing.errNotReady"));
    setBusy(g.orderId);
    const ids = g.units.filter((u) => !["qc_passed", "ready"].includes(u.current_stage)).map((u) => u.id);
    const { error } = await supabase.from("service_units").update({ current_stage: "packing_done", staff_notes: t("stations.packing.staffNote") }).in("id", ids);
    if (!error) await record(g, "packing_completed", t("إنهاء تغليف الطلب"), { packed_units: ids.length });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success(t("stations.packing.toastPacked")); load(); }
  }

  async function markReady(g: Group) {
    const c = checks(g);
    if (!c.okToReady) return toast.error(t("stations.packing.errNotFitReady"));
    const v = await validateOrderMove(g.orderId, "ready");
    if (!v.ok) return toast.error(v.message || t("stations.packing.errQcFirst"));
    setBusy(g.orderId);
    const { error } = await supabase.from("orders").update({ status: "ready" }).eq("id", g.orderId);
    if (!error) await record(g, "order_ready_after_packing", t("اعتماد الطلب جاهز بعد التغليف والجودة"));
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success(t("stations.packing.toastReady")); load(); }
  }

  const stats = useMemo(() => ({
    orders: groups.length,
    pieces: units.length,
    label: units.filter((u) => u.label_status && u.label_status !== "labeled").length,
    reclean: units.filter((u) => u.needs_reclean).length,
    packingDone: units.filter((u) => u.current_stage === "packing_done" || u.current_stage === "qc_passed").length,
  }), [groups.length, units]);

  return <div className="space-y-5" dir={dir}>
    <div className="rounded-3xl bg-gradient-to-br from-amber-600 via-slate-900 to-teal-800 text-white p-5 shadow-xl overflow-hidden relative">
      <div className="absolute -top-20 -left-16 w-48 h-48 bg-amber-300/20 rounded-full blur-3xl" />
      <div className="relative flex flex-wrap justify-between items-center gap-3"><div><h1 className="text-2xl font-black flex items-center gap-2"><Package className="w-7 h-7 text-amber-200" /> {t("stations.packing.title")}</h1><p className="text-sm text-white/75 mt-1">{t("stations.packing.subtitle")}</p></div><Button variant="secondary" onClick={load}>{t("common.refresh")}</Button></div>
      <div className="grid grid-cols-5 gap-2 mt-4 text-center"><Mini label={t("stations.common.orders")} value={stats.orders} /><Mini label={t("stations.common.pieces")} value={stats.pieces} /><Mini label={t("stations.packing.packed")} value={stats.packingDone} /><Mini label={t("stations.common.markIssue")} value={stats.label} warn /><Mini label={t("stations.packing.returns")} value={stats.reclean} warn /></div>
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="space-y-3">
      {!groups.length && <Card><CardContent className="p-10 text-center text-muted-foreground">{t("stations.packing.noOrders")}</CardContent></Card>}
      {groups.map((g) => { const c = checks(g); return <Card key={g.orderId} className="overflow-hidden bg-white/85 backdrop-blur">
        <CardHeader className="bg-muted/40 pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base flex items-center gap-2"><PackageCheck className="w-4 h-4 text-teal-600" /> {t("orders.orderNo", "طلب #{order}").replace("{order}", String(g.order.order_number))}<Badge variant="outline">{g.units.length} {t("stations.common.pieces")}</Badge>{!c.okToPack && <Badge variant="destructive">{t("stations.packing.notFit")}</Badge>}{c.okToReady && <Badge className="bg-emerald-600">{t("stations.packing.readyApproval")}</Badge>}</CardTitle><Button asChild size="sm" variant="outline"><Link to="/orders/$id" params={{ id: g.orderId }}>{t("stations.common.openOrder")} <ArrowLeft className="w-3 h-3 me-1" /></Link></Button></div><div className="text-xs text-muted-foreground">{g.order.customers?.full_name ?? "—"} · {g.order.customers?.phone ?? ""}</div></CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <Check label={t("stations.packing.noReturns")} ok={!c.reclean} bad={c.reclean} />
            <Check label={t("stations.packing.markOk")} ok={!c.label} bad={c.label} />
            <Check label={t("stations.packing.assembled")} ok={!c.notAssembled} bad={c.notAssembled} />
            <Check label={t("stations.packing.ironed")} ok={!c.notIroned} bad={c.notIroned} />
            <Check label={t("stations.packing.packedCheck")} ok={!c.notPacked} bad={c.notPacked} />
          </div>
          <div className="grid md:grid-cols-2 gap-2">{g.units.map((u) => <UnitMini key={u.id} u={u} />)}</div>
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy === g.orderId || !c.okToPack} onClick={() => packAll(g)}><CheckCircle2 className="w-4 h-4 ms-1" />{t("stations.packing.packAll")}</Button><Button disabled={busy === g.orderId || !c.okToReady} className="bg-emerald-600 hover:bg-emerald-500" onClick={() => markReady(g)}><ShieldCheck className="w-4 h-4 ms-1" />{t("stations.packing.markReady")}</Button>{g.order.status === "ironing" && <Button disabled={busy === g.orderId} variant="secondary" onClick={() => startPacking(g)}>{t("stations.packing.startPacking")}</Button>}</div>
        </CardContent>
      </Card>; })}
    </div>}
  </div>;
}

function UnitMini({ u }: { u: Unit }) {
  const { t } = useI18n();
  const issue = u.needs_reclean || (u.label_status && u.label_status !== "labeled") || ["cleaning", "cleaning_done", "drying_assembly"].includes(u.current_stage);
  return <div className={`rounded-2xl border p-2 grid grid-cols-[48px_1fr] gap-2 ${issue ? "bg-red-50 border-red-200" : "bg-white"}`}><div className="w-12 h-12 rounded-xl bg-muted border overflow-hidden flex items-center justify-center">{u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}</div><div className="min-w-0"><div className="font-black text-sm truncate">{u.label_code}</div><div className="text-xs text-muted-foreground truncate">{u.name}</div><div className="flex flex-wrap gap-1 mt-1">{u.label_status && u.label_status !== "labeled" && <Badge variant="destructive" className="text-[10px]"><Tags className="w-3 h-3 ms-1" />{t("stations.common.mark")}</Badge>}{u.needs_reclean && <Badge className="bg-amber-500 text-[10px]">{t("stations.common.reclean")}</Badge>}{u.current_stage === "packing_done" && <Badge className="bg-emerald-600 text-[10px]">{t("stations.packing.packed")}</Badge>}{u.current_stage === "qc_passed" && <Badge className="bg-teal-600 text-[10px]">QC</Badge>}<Badge variant="outline" className="text-[10px]">{stageAr(u.current_stage, t)}</Badge></div></div></div>;
}
function Check({ label, ok, bad }: { label: string; ok: boolean; bad: number }) { return <div className={`rounded-2xl border p-2 text-center font-bold ${ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>{label}<div>{ok ? "✅" : bad}</div></div>; }
function Mini({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) { return <div className={`rounded-2xl p-3 border border-white/10 ${warn && Number(value) > 0 ? "bg-red-400/25" : "bg-white/10"}`}><div className="text-xl font-black">{value}</div><div className="text-[11px] text-white/70">{label}</div></div>; }
function stageAr(s: string, t: any) { return ({ cleaning: t("stage.cleaning"), cleaning_done: t("stage.cleaning_done"), drying_assembly: t("stage.drying_assembly"), ironing: t("stage.ironing"), ironing_done: t("stage.ironing_done"), packing: t("stage.packing"), packing_done: t("stage.packing_done"), qc_passed: t("stage.qc_passed"), ready: t("stage.ready") } as Record<string,string>)[s] ?? s; }
