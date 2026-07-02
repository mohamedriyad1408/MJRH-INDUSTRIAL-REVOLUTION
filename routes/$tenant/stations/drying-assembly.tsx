import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Camera, CheckCircle2, Image as ImageIcon, Loader2, PackageCheck, Search, Shirt, Tags, Wind } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";

type Row = {
  id: string; tenant_id: string; branch_id?: string | null; order_id: string; label_code: string; name: string; garment_type: string; service_type: string;
  photo_url?: string | null; current_stage: string; label_status: string; needs_reclean: boolean; reclean_reason?: string | null; assembly_notes?: string | null;
  order_number: number; order_status: string; customer_name?: string | null; customer_phone?: string | null;
};

export const Route = createFileRoute("/$tenant/stations/drying-assembly")({
  head: () => ({ meta: [{ title: "التجفيف والتجميع" }] }),
  component: DryingAssemblyStation,
});

function DryingAssemblyStation() {
  const { user, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const canUse = hasRole("owner", "ops_manager", "employee");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, any[]>>({});
  const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("drying_assembly_queue")
      .select("*")
      .order("updated_at", { ascending: true })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => { if (canUse) load(); }, [canUse]);

  const grouped = useMemo(() => {
    const m = new Map<string, Row[]>();
    rows.forEach((r) => m.set(r.order_id, [...(m.get(r.order_id) ?? []), r]));
    return Array.from(m.entries()).map(([orderId, units]) => ({ orderId, order: units[0], units }));
  }, [rows]);

  const stats = useMemo(() => ({
    orders: grouped.length,
    pieces: rows.length,
    active: rows.filter((r) => r.current_stage === "drying_assembly").length,
    missing: rows.filter((r) => r.label_status !== "labeled" || !r.label_code).length,
    ready: rows.filter((r) => r.current_stage === "cleaning_done").length,
  }), [rows, grouped.length]);

  async function recordEvent(row: Row, key: string, name: string, output: any = {}) {
    await supabase.rpc("record_operation_event", {
      _process_key: key,
      _process_name: name,
      _source_type: "service_unit",
      _source_id: row.id,
      _branch_id: row.branch_id ?? null,
      _cash_account_id: null,
      _report_bucket: key === "label_issue_reported" ? "quality/reports" : "operations/stations",
      _requires_notification: key === "label_issue_reported",
      _data: { tenant_id: row.tenant_id, order_id: row.order_id, order_number: row.order_number, label_code: row.label_code, notes: notes[row.id] || null },
      _output: { cash_impact: false, journal_required: false, appears_in_report: true, ...output },
    }).then(() => null);
  }


  async function captureAndSearch(row: Row, file: File | null) {
    setBusy(row.id);
    try {
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `orders/${row.order_id}/assembly-search/${row.id}-${Date.now()}.${ext}`;
        const up = await supabase.storage.from("unit-media").upload(path, file, { upsert: true, contentType: file.type });
        if (!up.error) {
          const { data } = supabase.storage.from("unit-media").getPublicUrl(path);
          await supabase.from("service_units").update({ photo_url: data.publicUrl, assembly_notes: notes[row.id] || row.assembly_notes || null }).eq("id", row.id).then(() => null);
        }
      }
      const since = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const { data: all } = await supabase
        .from("service_units")
        .select("id,label_code,name,photo_url,current_stage,label_status,unit_number,order_id,orders!inner(id,order_number,created_at,branch_id,notes,customers(full_name,phone))")
        .gte("orders.created_at", since)
        .not("photo_url", "is", null)
        .limit(120);
      const ranked = (all ?? []).filter((x: any) => x.id !== row.id).sort((a: any, b: any) => {
        const sameOrderA = a.order_id === row.order_id ? 0 : 5;
        const sameOrderB = b.order_id === row.order_id ? 0 : 5;
        const sameNameA = String(a.name ?? "") === row.name ? 0 : 2;
        const sameNameB = String(b.name ?? "") === row.name ? 0 : 2;
        const sameBranchA = a.orders?.branch_id === row.branch_id ? 0 : 1;
        const sameBranchB = b.orders?.branch_id === row.branch_id ? 0 : 1;
        return (sameOrderA + sameNameA + sameBranchA) - (sameOrderB + sameNameB + sameBranchB);
      }).slice(0, 30);
      setMatches((m) => ({ ...m, [row.id]: ranked }));
      await recordEvent(row, "assembly_photo_search", "تصوير وبحث عن قطعة في صور آخر 15 يوم", { photo_search: true, search_window_days: 15, matches: ranked.length });
      toast.success(ranked.length ? `تم البحث في صور آخر 15 يوم ووجدنا ${ranked.length} نتيجة محتملة` : "تم التصوير، ولا توجد صور مطابقة ضمن آخر 15 يوم");
      load();
    } finally {
      setBusy(null);
    }
  }

  async function startAssembly(row: Row) {
    setBusy(row.id);
    const { error } = await supabase.from("service_units").update({ current_stage: "drying_assembly", assembly_checked_by: user?.id, assembly_notes: notes[row.id] || null }).eq("id", row.id);
    if (!error) await recordEvent(row, "drying_assembly_started", "بدء التجفيف والتجميع");
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("تم بدء التجفيف والتجميع"); load(); }
  }

  async function reportLabel(row: Row, status: "missing_label" | "unclear_label") {
    const note = (notes[row.id] ?? "").trim();
    if (note.length < 3) return toast.error("اكتب ملاحظة واضحة عن مشكلة المارك/الليبل");
    setBusy(row.id);
    const { error } = await supabase.from("service_units").update({ label_status: status, current_stage: "drying_assembly", assembly_checked_by: user?.id, assembly_notes: note, staff_notes: note }).eq("id", row.id);
    if (!error) {
      await recordEvent(row, "label_issue_reported", "تسجيل مشكلة مارك/ليبل", { needs_resolution: true });
      await supabase.from("app_notifications").insert({ tenant_id: row.tenant_id, branch_id: row.branch_id ?? null, audience: "ops", title: "مشكلة مارك/ليبل في التجميع", body: `طلب #${row.order_number} — ${row.name}: ${note}`, href: `/orders/${row.order_id}`, tone: "warning" }).then(() => null);
    }
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("تم تسجيل مشكلة المارك وإشعار التشغيل"); load(); }
  }

  async function completeAssembly(row: Row) {
    setBusy(row.id);
    const { error } = await supabase.from("service_units").update({ current_stage: "ironing", label_status: "labeled", assembly_checked_at: new Date().toISOString(), assembly_checked_by: user?.id, assembly_notes: notes[row.id] || row.assembly_notes || null }).eq("id", row.id);
    if (!error) {
      await recordEvent(row, "drying_assembly_completed", "إنهاء التجفيف والتجميع");
      if (activeActor) {
        await supabase.from("order_status_history").insert({
          order_id: row.order_id, from_status: "drying_assembly", to_status: "ironing",
          changed_by: user?.id, notes: `👤 التجميع: ${row.label_code} — نفذه: ${activeActor.full_name}`,
        });
      }
      const { data: remaining } = await supabase.from("service_units").select("id").eq("order_id", row.order_id).in("current_stage", ["cleaning", "cleaning_done", "drying_assembly"]).limit(1);
      if (!remaining?.length) await supabase.from("orders").update({ status: "ironing" }).eq("id", row.order_id).neq("status", "cancelled");
    }
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("تم التجميع والقطعة جاهزة للكي"); load(); }
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("station.assembly.accessDenied")}</CardContent></Card>;

  return <div className="space-y-5" dir={dir}>
    <StationActorWidget stationId="drying-assembly" stationLabel="التجفيف والتجميع والفرز 🧺" onActorChange={setActiveActor} />

    <div className="rounded-3xl bg-gradient-to-br from-cyan-700 via-slate-900 to-violet-800 text-white p-5 shadow-xl overflow-hidden relative">
      <div className="absolute -top-20 -left-16 w-48 h-48 rounded-full bg-teal-300/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black flex items-center gap-2"><Wind className="w-7 h-7 text-cyan-200" /> {t("station.assembly.title")}</h1><p className="text-sm text-white/75 mt-1">{t("station.assembly.subtitle")}</p></div>
        <Button variant="secondary" onClick={load}>{t("common.refresh")}</Button>
      </div>
      <div className="grid grid-cols-5 gap-2 mt-4 text-center">
        <Mini label={t("station.common.orders")} value={stats.orders} /> <Mini label={t("station.common.pieces")} value={stats.pieces} /> <Mini label={t("station.assembly.active")} value={stats.active} /> <Mini label={t("station.assembly.ready")} value={stats.ready} /> <Mini label={t("station.common.markIssue")} value={stats.missing} warn />
      </div>
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="space-y-3">
      {!grouped.length && <Card><CardContent className="p-10 text-center text-muted-foreground">{t("station.assembly.noPieces")}</CardContent></Card>}
      {grouped.map((g) => <Card key={g.orderId} className="overflow-hidden bg-white/85 backdrop-blur">
        <CardHeader className="bg-muted/40 pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base flex items-center gap-2"><PackageCheck className="w-4 h-4 text-teal-600" /> {t("order.orderNo", "طلب #{order}").replace("{order}", String(g.order.order_number))}<Badge variant="outline">{g.units.length} {t("station.common.pieces")}</Badge>{g.units.some((u) => u.label_status !== "labeled") && <Badge variant="destructive">{t("station.common.markIssue")}</Badge>}</CardTitle><Button asChild size="sm" variant="outline"><Link to={"/$tenant/orders/$id" as any} params={{ id: g.orderId } as any}>{t("station.common.openOrder")} <ArrowLeft className="w-3 h-3 me-1" /></Link></Button></div><div className="text-xs text-muted-foreground">{g.order.customer_name ?? "—"} · {g.order.customer_phone ?? ""}</div>
{((g.order as any)?.notes || "").includes("[👑 تفضيلات VIP المميزة]") && (
  <div className="mt-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-400 p-2.5 text-xs text-amber-950 font-bold shadow-2xs whitespace-pre-wrap">
    <div className="font-black text-amber-900 flex items-center gap-1 mb-0.5">👑 تعليمات وتفضيلات العميل (VIP Concierge):</div>
    {(g.order as any).notes}
  </div>
)}</CardHeader>
        <CardContent className="p-3 grid md:grid-cols-2 gap-3">
          {g.units.map((u) => <div key={u.id} className={`rounded-2xl border p-3 space-y-3 ${u.label_status !== "labeled" ? "bg-amber-50 border-amber-200" : "bg-white"}`}>
            <div className="grid grid-cols-[58px_1fr] gap-3 items-center"><div className="w-14 h-14 rounded-xl bg-muted border overflow-hidden flex items-center justify-center">{u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}</div><div><div className="flex flex-wrap gap-2 items-center"><span className="font-black">{u.label_code || t("station.common.noCode")}</span><Badge variant="outline">{u.name}</Badge>{u.service_type === "both" && <Badge className="bg-violet-600"><Shirt className="w-3 h-3 ms-1" /> {t("station.assembly.afterAssemblyIroning")}</Badge>}</div><div className="text-xs text-muted-foreground mt-1">{t("station.common.stage")}: {stageAr(u.current_stage, t)} · {t("station.common.mark")}: {labelAr(u.label_status, t)}</div>{u.reclean_reason && <div className="text-xs text-amber-700 mt-1">{t("station.common.reclean")}: {u.reclean_reason}</div>}</div></div>
            <Textarea rows={2} placeholder={t("station.assembly.notePlaceholder")} value={notes[u.id] ?? u.assembly_notes ?? ""} onChange={(e) => setNotes((m) => ({ ...m, [u.id]: e.target.value }))} />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => startAssembly(u)} disabled={busy === u.id}><Search className="w-3 h-3 ms-1" /> {t("station.assembly.startReview")}</Button>
              <label className="inline-flex"><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => captureAndSearch(u, e.target.files?.[0] ?? null)} /><Button size="sm" type="button" variant="outline" className="border-cyan-300 text-cyan-700" asChild><span><Camera className="w-3 h-3 ms-1" /> {t("station.assembly.photoSearch")}</span></Button></label>
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-700" onClick={() => reportLabel(u, "unclear_label")} disabled={busy === u.id}><Tags className="w-3 h-3 ms-1" /> {t("station.assembly.unclearMark")}</Button>
              <Button size="sm" variant="destructive" onClick={() => reportLabel(u, "missing_label")} disabled={busy === u.id}>{t("station.assembly.noMark")}</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" onClick={() => completeAssembly(u)} disabled={busy === u.id || u.label_status === "missing_label"}>{busy === u.id ? <Loader2 className="w-3 h-3 animate-spin ms-1" /> : <CheckCircle2 className="w-3 h-3 ms-1" />} {t("station.assembly.readyForIroning")}</Button>
            </div>
            {matches[u.id]?.length ? <div className="rounded-2xl border bg-cyan-50 p-2"><div className="text-xs font-black text-cyan-900 mb-2">{t("station.assembly.searchResults")}</div><div className="grid grid-cols-3 gap-2">{matches[u.id].map((m: any) => <div key={m.id} className="rounded-xl bg-white border p-1 text-center"><img src={m.photo_url} className="h-16 w-full object-cover rounded-lg bg-muted" /><div className="text-[10px] font-bold mt-1 truncate">{m.label_code}</div><div className="text-[10px] text-muted-foreground truncate">{m.name}</div><div className="text-[10px] text-cyan-700 truncate">{t("order.orderNo", "طلب #{order}").replace("{order}", String(m.orders?.order_number ?? "?"))}</div></div>)}</div></div> : null}
          </div>)}
        </CardContent>
      </Card>)}
    </div>}
  </div>;
}

function stageAr(s: string, t: any) { return ({ cleaning: t("stage.cleaning"), cleaning_done: t("stage.cleaning_done"), drying_assembly: t("stage.drying_assembly"), qc_failed: t("stage.qc_failed"), ironing: t("stage.ironing") } as Record<string,string>)[s] ?? s; }
function labelAr(s: string, t: any) { return ({ labeled: t("labelStatus.labeled"), missing_label: t("labelStatus.missing_label"), unclear_label: t("labelStatus.unclear_label") } as Record<string,string>)[s] ?? s; }
function Mini({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) { return <div className={`rounded-2xl p-3 border border-white/10 ${warn && Number(value) > 0 ? "bg-amber-400/20" : "bg-white/10"}`}><div className="text-xl font-black">{value}</div><div className="text-[11px] text-white/70">{label}</div></div>; }
