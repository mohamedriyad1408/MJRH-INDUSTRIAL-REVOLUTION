import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { validateOrderMove } from "@/lib/station-workflow";
import { CheckCircle2, ShieldCheck, AlertTriangle, RotateCcw, Package, ArrowLeft, Loader2, Trophy, Tags } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";
import { OmnipresentOrderBanner } from "@/components/omnipresent-order-banner";
import { SorterReturnDialog } from "@/components/sorter-return-dialog";

export const Route = createFileRoute("/$tenant/stations/qc")({
 head: () => ({ meta: [{ title: "محطة الجودة QC" }] }),
 component: QcStation,
});

type Unit = {
 id: string;
 label_code: string;
 name: string;
 current_stage: string;
 needs_reclean: boolean;
 label_status?: string | null;
 order_id: string;
 orders?: { id: string; order_number: number; status: string; branch_id?: string | null; customers?: { full_name: string; phone: string } | null } | null;
};

function QcStation() {
 const { hasRole, user } = useAuth();
 const { t, dir } = useI18n();
 const canUse = hasRole("owner", "ops_manager", "employee");
 const [units, setUnits] = useState<Unit[]>([]);
 const [loading, setLoading] = useState(true);
 const [notes, setNotes] = useState<Record<string, string>>({});
 const [result, setResult] = useState<Record<string, string>>({});
 const [busy, setBusy] = useState<string | null>(null);
 const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);

 async function load() {
 setLoading(true);
 const { data, error } = await supabase
 .from("service_units")
 .select("id,label_code,name,current_stage,needs_reclean,label_status,order_id,orders(id,order_number,status,notes,branch_id,customers(full_name,phone,vip_preferences,notes,address))")
 .in("current_stage", ["cleaning_done", "ironing_done", "packing", "packing_done", "ready", "qc_failed"])
 .order("updated_at", { ascending: false })
 .limit(120);
 if (error) toast.error(error.message);
 setUnits((data ?? []).filter((u: any) => u.orders) as Unit[]);
 setLoading(false);
 }

 useEffect(() => { if (canUse) load(); }, [canUse]);

 const groups = useMemo(() => {
 const map = new Map<string, Unit[]>();
 units.forEach((u) => map.set(u.order_id, [...(map.get(u.order_id) ?? []), u]));
 return Array.from(map.entries()).map(([orderId, rows]) => ({ orderId, order: rows[0].orders, units: rows }));
 }, [units]);

 function groupChecks(units: Unit[]) {
 const label = units.filter((u) => u.label_status && u.label_status !== "labeled").length;
 const reclean = units.filter((u) => u.needs_reclean).length;
 const qcFailed = units.filter((u) => u.current_stage === "qc_failed").length;
 const notPacked = units.filter((u) => !["packing_done", "qc_passed", "ready"].includes(u.current_stage)).length;
 const passed = units.filter((u) => u.current_stage === "qc_passed").length;
 const safe = units.filter((u) => !u.needs_reclean && !(u.label_status && u.label_status !== "labeled") && ["packing_done", "ready", "qc_failed"].includes(u.current_stage));
 return { label, reclean, qcFailed, notPacked, passed, safe, allPassed: units.length > 0 && passed === units.length };
 }

 async function approveSafeGroup(g: { orderId: string; order: Unit["orders"]; units: Unit[] }) {
 const c = groupChecks(g.units);
 if (!c.safe.length) return toast.error("لا توجد قطع سليمة قابلة للاعتماد الآن");
 setBusy(g.orderId);
 let ok = 0;
 for (const u of c.safe) {
 if (u.current_stage === "qc_passed") continue;
 const r = await supabase.rpc("pass_qc_unit", { _unit_id: u.id, _notes: "اعتماد جماعي من محطة الجودة" });
 if (!r.error) ok++;
 }
 await supabase.rpc("record_operation_event", { _process_key: "qc_bulk_passed", _process_name: "اعتماد جماعي لقطع سليمة", _source_type: "order", _source_id: g.orderId, _branch_id: g.order?.branch_id ?? null, _cash_account_id: null, _report_bucket: "quality/reports", _requires_notification: false, _data: { order_number: g.order?.order_number, passed: ok }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null);
 setBusy(null);
 toast.success(`تم اعتماد ${ok} قطعة سليمة`);
 load();
 }

 async function markReady(g: { orderId: string; order: Unit["orders"]; units: Unit[] }) {
 const c = groupChecks(g.units);
 if (!c.allPassed) return toast.error("لا يمكن جعل الطلب جاهز قبل اعتماد كل القطع من الجودة");
 const v = await validateOrderMove(g.orderId, "ready");
 if (!v.ok) return toast.error(v.message);
 setBusy(g.orderId);
 const { error } = await supabase.from("orders").update({ status: "ready" }).eq("id", g.orderId);
 if (!error) await supabase.rpc("record_operation_event", { _process_key: "qc_order_ready", _process_name: "اعتماد الطلب جاهز من الجودة", _source_type: "order", _source_id: g.orderId, _branch_id: g.order?.branch_id ?? null, _cash_account_id: null, _report_bucket: "quality/reports", _requires_notification: false, _data: { order_number: g.order?.order_number, pieces: g.units.length }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null);
 setBusy(null);
 if (error) toast.error(error.message); else { toast.success("تم اعتماد الطلب جاهز للتسليم"); load(); }
 }

 async function qc(unit: Unit, res: "passed" | "reclean" | "repair" | "lost" | "damaged") {
 const note = (notes[unit.id] ?? "").trim();
 if (res === "passed" && unit.label_status && unit.label_status !== "labeled") return toast.error("لا يمكن اعتماد قطعة بها مشكلة مارك/ليبل. افتح التجفيف والتجميع أولًا.");
 if (res !== "passed" && note.length < 3) return toast.error("اكتب سبب واضح قبل رفض القطعة");

 let error: any = null;
 if (res === "passed") {
 const r = await supabase.rpc("pass_qc_unit", { _unit_id: unit.id, _notes: note || null });
 error = r.error;
 } else if (res === "reclean") {
 const r = await supabase.rpc("register_reclean_return", { _unit_id: unit.id, _reason: note, _photo_url: null });
 error = r.error;
 } else {
 const r = await supabase.rpc("register_qc_issue", { _unit_id: unit.id, _result: res, _reason: note });
 error = r.error;
 }

 if (error) toast.error(error.message);
 else {
 toast.success(res === "passed" ? "تم اعتماد القطعة" : res === "reclean" ? "تم رجوع القطعة للغسيل" : "تم تسجيل مشكلة الجودة وإشعار الإدارة");
 setNotes((m) => ({ ...m, [unit.id]: "" }));
 load();
 }
 }

 if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("station.qc.accessDenied")}</CardContent></Card>;

 return (<div className="space-y-5" dir={dir}>
 <StationActorWidget stationId="qc" stationLabel="فحص الجودة والمطابقة (QC) " onActorChange={setActiveActor} />

 <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck className="w-7 h-7" /> {t("station.qc.title")}</h1>
 <p className="text-sm text-white/70">{t("station.qc.subtitle")}</p>
 </div>
 <Button variant="secondary" onClick={load}>{t("common.refresh")}</Button>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
 <Mini label={t("station.common.orders")} value={groups.length} />
 <Mini label={t("station.common.pieces")} value={units.length} />
 <Mini label={t("station.qc.approved")} value={units.filter((u) => u.current_stage === "qc_passed").length} />
 <Mini label={t("station.common.markIssue")} value={units.filter((u) => u.label_status && u.label_status !== "labeled").length} warn />
 <Mini label={t("station.qc.qualityIssues")} value={units.filter((u) => u.needs_reclean || u.current_stage === "qc_failed").length} warn />
 </div>
 </div>

 {!loading && groups[0] && <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-md"><CardContent className="p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs text-emerald-700 font-bold mb-1">{t("station.qc.nextTask")}</div><div className="font-black text-lg">{t("order.orderNo", "طلب #{order}").replace("{order}", String(groups[0].order?.order_number ?? "?"))} — {groups[0].order?.customers?.full_name ?? t("station.common.customer")}</div><div className="text-xs text-muted-foreground">{t("station.qc.nextHint")}</div></div><Button asChild variant="outline"><Link to={"/$tenant/orders/$id" as any} params={{ id: groups[0].orderId } as any}>{t("station.common.openOrder")}</Link></Button></CardContent></Card>}

 {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : (<div className="space-y-3">
 {!groups.length && <Card><CardContent className="p-10 text-center text-muted-foreground">{t("station.qc.noPieces")}</CardContent></Card>}
 {groups.map((g) => (<Card key={g.orderId} className="overflow-hidden bg-white/85 backdrop-blur">
 <CardHeader className="bg-muted/40 pb-3">
 {(() => { const c = groupChecks(g.units); return <><div className="flex flex-wrap items-center justify-between gap-2">
 <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-teal-600" /> {t("order.orderNo", "طلب #{order}").replace("{order}", String(g.order?.order_number ?? "?"))}<Badge variant="outline">{g.units.length} {t("station.common.pieces")}</Badge>{c.allPassed && <Badge className="bg-emerald-600">{t("station.qc.allPassed")}</Badge>}{(c.label || c.reclean || c.qcFailed) ? <Badge variant="destructive">{t("station.qc.needsAction")}</Badge> : null}</CardTitle>
 {g.order?.id && <div className="flex items-center gap-2"><Button asChild size="sm" variant="outline"><Link to={"/$tenant/orders/$id" as any} params={{ id: g.order.id } as any}>{t("station.common.openOrder")} <ArrowLeft className="w-3 h-3 me-1" /></Link></Button><SorterReturnDialog orderId={g.orderId} orderNumber={g.order?.order_number || "?"} tenantId={null} onDone={load} /></div>}
 </div>
 <div className="text-xs text-muted-foreground">{g.order?.customers?.full_name ?? "—"} · {g.order?.customers?.phone ?? ""}</div>
 <OmnipresentOrderBanner order={g.order as any} customer={(g.order as any)?.customers} className="mt-2" />
 <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs"><Check label={t("station.packing.markOk")} ok={!c.label} bad={c.label} /><Check label={t("station.packing.noReturns")} ok={!c.reclean} bad={c.reclean} /><Check label={t("station.packing.packedCheck")} ok={!c.notPacked} bad={c.notPacked} /><Check label={t("station.qc.qcApproved")} ok={c.allPassed} bad={g.units.length - c.passed} /><Check label={t("station.qc.issues")} ok={!c.qcFailed} bad={c.qcFailed} /></div>
 <div className="flex flex-wrap justify-end gap-2 mt-3"><Button size="sm" variant="outline" disabled={busy === g.orderId} onClick={() => approveSafeGroup(g)}><CheckCircle2 className="w-4 h-4 ms-1" />{t("station.qc.approveSafe")}</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" disabled={busy === g.orderId || !c.allPassed} onClick={() => markReady(g)}><Trophy className="w-4 h-4 ms-1" />{t("station.qc.markReady")}</Button></div></>; })()}
 </CardHeader>
 <CardContent className="p-3 grid md:grid-cols-2 gap-3">
 {g.units.map((u) => (<div key={u.id} className={`rounded-2xl border p-3 space-y-3 ${u.label_status && u.label_status !== "labeled" ? "bg-amber-50 border-amber-200" : u.current_stage === "qc_passed" ? "bg-emerald-50 border-emerald-200" : "bg-card"}`}>
 <div className="flex items-start justify-between gap-2">
 <div><div className="font-black">{u.label_code} — {u.name}</div><div className="text-xs text-muted-foreground">{t("station.common.stage")}: {t("stage." + u.current_stage, u.current_stage)}</div>{u.label_status && u.label_status !== "labeled" && <div className="text-xs text-amber-700 mt-1">{t("station.common.labelIssue")}: {u.label_status === "missing_label" ? t("station.assembly.noMark") : t("station.assembly.unclearMark")}</div>}</div>
 {(u.needs_reclean || u.current_stage === "qc_failed" || (u.label_status && u.label_status !== "labeled")) && <Badge variant="destructive">{t("station.qc.issues")}</Badge>}
 </div>
 <Textarea rows={2} placeholder={t("station.qc.notePlaceholder")} value={notes[u.id] ?? ""} onChange={(e) => setNotes((m) => ({ ...m, [u.id]: e.target.value }))} />
 <div className="grid md:grid-cols-[1fr_auto_auto] gap-2">
 <Select value={result[u.id] ?? "reclean"} onValueChange={(v) => setResult((m) => ({ ...m, [u.id]: v }))}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="reclean">{t("station.qc.resultReclean")}</SelectItem>
 <SelectItem value="repair">{t("station.qc.resultRepair")}</SelectItem>
 <SelectItem value="damaged">{t("station.qc.resultDamaged")}</SelectItem>
 <SelectItem value="lost">{t("station.qc.resultLost")}</SelectItem>
 </SelectContent>
 </Select>
 <Button variant="outline" onClick={() => qc(u, (result[u.id] ?? "reclean") as any)}><AlertTriangle className="w-4 h-4 ms-1" /> {t("station.qc.recordIssue")}</Button>
 <Button onClick={() => qc(u, "passed")} className="bg-emerald-600 hover:bg-emerald-500"><CheckCircle2 className="w-4 h-4 ms-1" /> {t("station.qc.approve")}</Button>
 </div>
 {u.needs_reclean && <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">{t("station.qc.recleanHint")}</div>}
 {u.label_status && u.label_status !== "labeled" && <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-xs text-red-800 flex flex-wrap items-center justify-between gap-2"><span>{t("station.qc.labelBlock")}</span><Button asChild size="sm" variant="outline"><Link to={"/$tenant/stations/drying-assembly" as any}><Tags className="w-3 h-3 ms-1" />{t("station.qc.openAssembly")}</Link></Button></div>}
 </div>))}
 </CardContent>
 </Card>))}
 </div>)}
 </div>);
}

function Check({ label, ok, bad }: { label: string; ok: boolean; bad: number }) { return <div className={`rounded-2xl border p-2 text-center font-bold ${ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>{label}<div className="font-mono">{ok ? "سليم" : bad}</div></div>; }

function Mini({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
 return <div className={`rounded-2xl p-3 border border-white/10 ${warn ? "bg-amber-400/15" : "bg-white/10"}`}><div className="text-xs text-white/70">{label}</div><div className="text-2xl font-black">{value}</div></div>;
}
