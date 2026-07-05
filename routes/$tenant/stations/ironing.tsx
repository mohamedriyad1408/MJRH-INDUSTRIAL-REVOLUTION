import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Shirt, CheckCircle2, RotateCcw, Scale, User, Image as ImageIcon, PackageCheck } from "lucide-react";
import { StationBoard } from "@/components/station-board";
import { autoAssignIroningPieces } from "@/lib/ironing-assignment";
import { useI18n } from "@/lib/i18n";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";

export const Route = createFileRoute("/$tenant/stations/ironing")({
 head: () => ({ meta: [{ title: "الكي" }] }),
 component: IroningRoute,
});

type Unit = {
 id: string;
 label_code: string;
 name: string;
 photo_url?: string | null;
 line_value?: number | null;
 ironing_base_value?: number | null;
 is_shirt_like?: boolean | null;
 needs_reclean?: boolean | null;
 reclean_reason?: string | null;
 ironing_completed_at?: string | null;
 assigned_ironing_employee_id?: string | null;
 orders?: { id: string; order_number: number; status: string; customers?: { full_name: string; phone: string } | null } | null;
 employees?: { full_name: string } | null;
};

type Employee = { id: string; full_name: string };

function IroningRoute() {
 const { hasRole } = useAuth();
 const { dir } = useI18n();
 const isManager = hasRole("owner", "ops_manager");
 const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);

 return (<div className="space-y-5" dir={dir}>
 <StationActorWidget stationId="ironing" stationLabel="الكي بالبخار والمكابس " onActorChange={setActiveActor} />
 {isManager ? <IroningManagerPage activeActor={activeActor} /> : <IroningWorkerPage activeActor={activeActor} />}
 </div>);
}

function IroningManagerPage({ activeActor }: { activeActor?: ActiveActor | null }) {
 const { user } = useAuth();
 const { t, dir } = useI18n();
 const [units, setUnits] = useState<Unit[]>([]);
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [loading, setLoading] = useState(true);
 const [assigning, setAssigning] = useState(false);
 const [transferTo, setTransferTo] = useState<Record<string, string>>({});

 async function load() {
 setLoading(true);
 const [u, e] = await Promise.all([
 supabase
 .from("service_units")
 .select("id,label_code,name,photo_url,line_value,ironing_base_value,is_shirt_like,needs_reclean,reclean_reason,ironing_completed_at,assigned_ironing_employee_id,orders(id,order_number,status,notes,is_urgent,promised_delivery_at,customers(full_name,phone,vip_preferences,notes,address)),employees:assigned_ironing_employee_id(full_name)")
 .in("service_type", ["cleaning", "ironing", "both"])
 .in("current_stage", ["ironing", "ironing_done", "packing", "packing_done", "ready"])
 .in("orders.status", ["ironing", "packing", "ready", "delivered"])
 .order("ironing_assigned_at", { ascending: true }),
 supabase.from("employees").select("id,full_name").eq("is_active", true).or("station.eq.ironing,job_role.eq.ironing_tech").order("full_name"),
 ]);
 setUnits((u.data ?? []).filter((x: any) => x.orders) as Unit[]);
 setEmployees((e.data ?? []) as Employee[]);
 setLoading(false);
 }

 async function markDone(u: Unit) {
 const { error } = await supabase.from("service_units").update({
 current_stage: "ironing_done",
 ironing_completed_at: new Date().toISOString(),
 }).eq("id", u.id);
 if (error) toast.error(error.message); else {
 const actorName = activeActor?.full_name || (u as any).employees?.full_name || "المدير المفوض";
 toast.success(`تم تسجيل الكي للقطعة ${u.label_code} نيابة عن الفني: ${actorName}`);
 await supabase.from("order_status_history").insert({
 order_id: (u.orders as any)?.id || u.id, from_status: "ironing", to_status: "ironing_done",
 changed_by: user?.id, notes: `👤 إتمام الكي نيابة عن الفني (${actorName}): ${u.label_code}`,
 });
 const orderId = (u.orders as any)?.id || (u as any).order_id;
 if (orderId) {
 const { data: rem } = await supabase.from("service_units").select("id").eq("order_id", orderId).is("ironing_completed_at", null).neq("status", "cancelled").limit(1);
 if (!rem?.length) {
 await supabase.from("orders").update({ status: "packing" }).eq("id", orderId).neq("status", "cancelled");
 }
 }
 load();
 }
 }

 async function markReclean(u: Unit) {
 const reason = prompt("سبب رجوع القطعة للتنظيف؟ لن يتم الرجوع بدون سبب واضح", u.reclean_reason ?? "");
 if (reason === null) return;
 if (reason.trim().length < 3) return toast.error("سبب المرتجع مطلوب");
 const { error } = await supabase.rpc("register_reclean_return", { _unit_id: u.id, _reason: reason.trim(), _photo_url: null });
 if (error) toast.error(error.message); else {
 const actorName = activeActor?.full_name || (u as any).employees?.full_name || "المدير المفوض";
 toast.success(`تم تسجيل المرتجع نيابة عن الفني (${actorName}) وإرسال القطعة للغسيل`);
 load();
 }
 }

 useEffect(() => { load(); }, []);

 async function distributeAll() {
 setAssigning(true);
 try {
 const { data: orders } = await supabase
 .from("orders")
 .select("id")
 .in("status", ["cleaning", "ironing"]);
 let total = 0;
 let presentEmployees = 0;
 let lastMessage = "";
 for (const o of orders ?? []) {
 const r = await autoAssignIroningPieces(o.id);
 total += r.assigned;
 presentEmployees = Math.max(presentEmployees, r.employees);
 if (r.message) lastMessage = r.message;
 }
 if (total) toast.success(`تم توزيع ${total} قطعة على ${presentEmployees} فني كي حاضر`);
 else toast.info(lastMessage || "لا توجد قطع غير موزعة أو لا يوجد فني كي حاضر الآن");
 load();
 } catch (e) {
 toast.error(e instanceof Error ? e.message : "تعذر توزيع الكي");
 } finally {
 setAssigning(false);
 }
 }

 async function transferTasks(fromId: string) {
 const toId = transferTo[fromId];
 if (!toId || toId === fromId) return toast.error("اختر الفني البديل");
 const { error } = await supabase.from("service_units").update({
 assigned_ironing_employee_id: toId,
 ironing_assigned_at: new Date().toISOString(),
 }).eq("assigned_ironing_employee_id", fromId).is("ironing_completed_at", null).in("service_type", ["cleaning", "ironing", "both"]).in("current_stage", ["ironing", "ironing_done"]);
 if (error) toast.error(error.message); else { toast.success("تم نقل مهام الفني"); load(); }
 }

 const stats = useMemo(() => {
 return employees.map((emp) => {
 const mine = units.filter((u) => u.assigned_ironing_employee_id === emp.id);
 return {
 ...emp,
 pieces: mine.length,
 done: mine.filter((u) => u.ironing_completed_at).length,
 shirts: mine.filter((u) => u.is_shirt_like).length,
 value: mine.reduce((s, u) => s + Number(u.ironing_base_value ?? u.line_value ?? 0), 0),
 };
 });
 }, [employees, units]);

 const unassigned = units.filter((u) => !u.assigned_ironing_employee_id).length;
 const done = units.filter((u) => u.ironing_completed_at).length;

 return (<div className="space-y-5" dir={dir}>
 <div className="rounded-3xl bg-gradient-to-br from-violet-700 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-black flex items-center gap-2"><Shirt className="w-6 h-6" /> {t("station.ironing.managerTitle")}</h1>
 <p className="text-sm text-white/70">{t("station.ironing.managerSubtitle")}</p>
 </div>
 <Button onClick={distributeAll} disabled={assigning} className="bg-teal-400 hover:bg-teal-300 text-slate-950 font-black">
 {assigning ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Scale className="w-4 h-4 ms-1" />}
 {t("station.ironing.assignAll")}
 </Button>
 </div>
 <div className="grid grid-cols-3 gap-3 mt-4">
 <MiniStat label={t("station.ironing.pieces")} value={units.length} />
 <MiniStat label={t("station.ironing.unassigned")} value={unassigned} tone={unassigned ? "warn" : "ok"} />
 <MiniStat label={t("station.ironing.done")} value={`${done}/${units.length}`} tone="ok" />
 </div>
 </div>

 {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (<>
 <Card>
 <CardHeader><CardTitle className="text-base">{t("station.ironing.workload")}</CardTitle></CardHeader>
 <CardContent className="grid md:grid-cols-3 gap-3">
 {stats.map((s) => {
  const openPieces = s.pieces - s.done;
  const shiftStatus = openPieces > 40 ? "مشبع بطلب ضخم (Jumbo Lock)" : openPieces === 0 ? "أولوية استقبال قصوى" : "استقبال عادل متزن";
  const badgeCls = openPieces > 40 ? "bg-amber-600 text-white" : openPieces === 0 ? "bg-blue-600 text-white" : "bg-emerald-600 text-white";
  return (
    <div key={s.id} className="rounded-2xl border p-3 bg-card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-black"><User className="w-4 h-4 text-violet-600" /> {s.full_name}</div>
        <Badge className={`font-mono text-[10px] font-black ${badgeCls}`}>{shiftStatus}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-slate-100 p-2"><div className="font-black text-lg">{s.pieces}</div><div>{t("station.ironing.piecesShort")}</div></div>
        <div className="rounded-xl bg-blue-50 p-2"><div className="font-black text-lg">{s.shirts}</div><div>{t("station.ironing.shirts")}</div></div>
        <div className="rounded-xl bg-emerald-50 p-2"><div className="font-black text-lg">{s.done}</div><div>{t("station.common.done")}</div></div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <span>{t("station.ironing.assignedValue")}: <b className="text-slate-900 font-mono">{s.value.toLocaleString()}</b> {t("common.egp")}</span>
        <span>نشط الآن: <b className="text-violet-700 font-mono">{openPieces}</b> قطعة</span>
      </div>
 {s.pieces > s.done && (<div className="flex gap-2 mt-3">
 <select className="flex-1 h-9 rounded-md border bg-background px-2 text-xs" value={transferTo[s.id] ?? ""} onChange={(e) => setTransferTo((m) => ({ ...m, [s.id]: e.target.value }))}>
 <option value="">{t("station.ironing.transferPlaceholder")}</option>
 {employees.filter((e) => e.id !== s.id).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
 </select>
 <Button size="sm" variant="outline" onClick={() => transferTasks(s.id)}>{t("station.ironing.transfer")}</Button>
 </div>)}
 </div>); })}
 {!stats.length && <div className="text-sm text-muted-foreground">{t("station.ironing.noTechs")}</div>}
 </CardContent>
 </Card>

 <Card>
 <CardHeader><CardTitle className="text-base">{t("station.ironing.runningPieces")}</CardTitle></CardHeader>
 <CardContent className="space-y-2">
 {units.map((u) => <UnitRow key={u.id} u={u} manager onDone={markDone} onReclean={markReclean} />)}
 {!units.length && <div className="text-center text-sm text-muted-foreground p-8">{t("station.ironing.noPiecesNow")}</div>}
 </CardContent>
 </Card>
 </>)}

 <StationBoard title={t("station.ironing.boardTitle", "تحريك الطلبات إلى التغليف")} station="ironing" incoming="cleaning" current="ironing" nextStatus="packing" />
 </div>);
}

function IroningWorkerPage({ activeActor }: { activeActor?: ActiveActor | null }) {
 const { user } = useAuth();
 const { t, dir } = useI18n();
 const [empId, setEmpId] = useState<string | null>(null);
 const [units, setUnits] = useState<Unit[]>([]);
 const [loading, setLoading] = useState(true);
 const [todayValue, setTodayValue] = useState(0);
 const [todayDoneValue, setTodayDoneValue] = useState(0);
 const [ratePct, setRatePct] = useState(0);

 async function load(employeeId = empId) {
 if (!employeeId) return;
 setLoading(true);
 const { data } = await supabase
 .from("service_units")
 .select("id,label_code,name,photo_url,line_value,is_shirt_like,needs_reclean,reclean_reason,reclean_return_to_employee_id,ironing_completed_at,assigned_ironing_employee_id,orders(id,order_number,status,notes,is_urgent,promised_delivery_at,customers(full_name,phone,vip_preferences,notes,address))")
 .eq("assigned_ironing_employee_id", employeeId)
 .eq("needs_reclean", false)
 .in("service_type", ["cleaning", "ironing", "both"])
 .in("current_stage", ["ironing", "ironing_done"])
 .is("ironing_completed_at", null)
 .order("ironing_assigned_at", { ascending: true });
 setUnits((data ?? []).filter((x: any) => x.orders) as Unit[]);
 const today = new Date(); today.setHours(0,0,0,0);
 const [{ data: todayUnits }, { data: rate }] = await Promise.all([
 supabase.from("service_units").select("line_value,ironing_base_value,ironing_completed_at").eq("assigned_ironing_employee_id", employeeId).gte("ironing_assigned_at", today.toISOString()),
 supabase.from("ironing_rates").select("percentage").eq("employee_id", employeeId).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
 ]);
 const allValue = (todayUnits ?? []).reduce((sum: number, u: any) => sum + Number(u.ironing_base_value ?? u.line_value ?? 0), 0);
 const doneValue = (todayUnits ?? []).filter((u: any) => u.ironing_completed_at).reduce((sum: number, u: any) => sum + Number(u.ironing_base_value ?? u.line_value ?? 0), 0);
 setTodayValue(allValue);
 setTodayDoneValue(doneValue);
 setRatePct(Number(rate?.percentage ?? 0));
 setLoading(false);
 }

 useEffect(() => {
 if (!user) return;
 supabase.from("employees").select("id,profile_id,email").or(`profile_id.eq.${user.id},email.eq.${user.email}`).maybeSingle().then(async ({ data }: any) => {
 setEmpId(data?.id ?? null);
 if (data?.id && !data.profile_id) await supabase.from("employees").update({ profile_id: user.id }).eq("id", data.id);
 if (data?.id) load(data.id);
 else setLoading(false);
 });
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [user]);

 async function markDone(u: Unit) {
 const { error } = await supabase.from("service_units").update({
 current_stage: "ironing_done",
 ironing_completed_at: new Date().toISOString(),
 }).eq("id", u.id);
 if (error) toast.error(error.message); else {
 toast.success(`تم كي ${u.label_code}`);
 if (activeActor) {
 await supabase.from("order_status_history").insert({
 order_id: (u.orders as any)?.id || u.id, from_status: "ironing", to_status: "ironing_done",
 changed_by: user?.id, notes: `👤 إتمام الكي: ${u.label_code} — نفذه: ${activeActor.full_name}`,
 });
 }
 const orderId = (u.orders as any)?.id || (u as any).order_id;
 if (orderId) {
 const { data: rem } = await supabase.from("service_units").select("id").eq("order_id", orderId).is("ironing_completed_at", null).neq("status", "cancelled").limit(1);
 if (!rem?.length) {
 await supabase.from("orders").update({ status: "packing" }).eq("id", orderId).neq("status", "cancelled");
 }
 }
 load();
 }
 }

 async function markReclean(u: Unit) {
 const reason = prompt("سبب رجوع القطعة للتنظيف؟ لن يتم الرجوع بدون سبب واضح", u.reclean_reason ?? "");
 if (reason === null) return;
 if (reason.trim().length < 3) return toast.error("سبب المرتجع مطلوب");
 const { error } = await supabase.rpc("register_reclean_return", { _unit_id: u.id, _reason: reason.trim(), _photo_url: null });
 if (error) toast.error(error.message); else { toast.success("تم إرسال القطعة للغسيل، وسترجع لك بعد تنظيفها"); load(); }
 }

 if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin" /></div>;
 if (!empId) return <Card><CardContent className="p-8 text-center text-muted-foreground">{t("station.ironing.workerUnlinked")}</CardContent></Card>;

 return (<div className="space-y-5 max-w-3xl mx-auto" dir={dir}>
 <div className="rounded-3xl bg-gradient-to-br from-violet-700 to-slate-950 text-white p-5 shadow-xl">
 <h1 className="text-2xl font-black flex items-center gap-2"><Shirt className="w-6 h-6" /> {t("station.ironing.myWork")}</h1>
 <p className="text-sm text-white/70 mt-1">{t("station.ironing.myWorkSubtitle")}</p>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
 <MiniStat label={t("station.ironing.myPieces")} value={units.length} />
 <MiniStat label={t("station.ironing.myShirts")} value={units.filter((u) => u.is_shirt_like).length} />
 <MiniStat label={t("station.ironing.todayDonePay")} value={`${Math.round(todayDoneValue * ratePct / 100)} ج`} tone="ok" />
 <MiniStat label={t("station.ironing.ifFinishAll")} value={`${Math.round(todayValue * ratePct / 100)} ج`} />
 </div>
 </div>

 <div className="space-y-3">
 {units.map((u) => <UnitRow key={u.id} u={u} onDone={markDone} onReclean={markReclean} />)}
 {!units.length && (<Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-10 text-center text-emerald-700 font-bold">
 <PackageCheck className="w-10 h-10 mx-auto mb-2" /> {t("station.ironing.noAssigned")}
 </CardContent></Card>)}
 </div>
 </div>);
}

function UnitRow({ u, manager, onDone, onReclean }: { u: Unit; manager?: boolean; onDone?: (u: Unit) => void; onReclean?: (u: Unit) => void }) {
 const { t } = useI18n();
 return (<div className="rounded-2xl border bg-card p-3 grid grid-cols-[72px_1fr] md:grid-cols-[72px_1fr_auto] gap-3 items-center">
 <div className="w-[72px] h-[72px] rounded-xl border bg-muted overflow-hidden flex items-center justify-center">
 {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-7 h-7 text-muted-foreground" />}
 </div>
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <span className="font-black text-lg">{u.label_code}</span>
 <Badge variant="outline">{u.name}</Badge>
        {u.is_shirt_like && <Badge className="bg-blue-600">{t("station.ironing.shirtLike")}</Badge>}
        {(u.orders as any)?.is_urgent && <Badge className="bg-amber-600 text-white font-black animate-pulse">أولوية استعجال قصوى</Badge>}
        {(u.orders as any)?.promised_delivery_at && <Badge variant="outline" className="text-[10px] font-mono border-amber-400 text-amber-800">موعد التسليم: {new Date((u.orders as any).promised_delivery_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</Badge>}
        {u.needs_reclean && <Badge className="bg-amber-500"><RotateCcw className="w-3 h-3 ms-1" /> {t("station.common.recleanCleaning")}</Badge>}
        {u.ironing_completed_at && <Badge className="bg-emerald-600"><CheckCircle2 className="w-3 h-3 ms-1" /> {t("station.common.done")}</Badge>}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {t("order.orderNo", "طلب #{order}").replace("{order}", String(u.orders?.order_number ?? "?"))} · {u.orders?.customers?.full_name ?? "—"} · {t("station.ironing.ironingValue")} {Number(u.ironing_base_value ?? u.line_value ?? 0).toLocaleString()} {t("common.egp")}
      </div>
      {manager && <div className="text-xs text-muted-foreground mt-1">{t("station.ironing.tech")}: <b>{u.employees?.full_name ?? t("station.ironing.unassignedTech")}</b></div>}
      {u.reclean_reason && <div className="text-xs text-amber-700 mt-1">{t("station.common.reason")}: {u.reclean_reason}</div>}
    </div>
    <div className="col-span-2 md:col-span-1 flex flex-wrap md:flex-col gap-2 justify-end items-stretch">
      {!u.ironing_completed_at && onDone && (
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold" size="sm" onClick={() => onDone(u)}>
          <CheckCircle2 className="w-3.5 h-3.5 ms-1" /> {manager ? "إتمام الكي نيابة عن الفني" : t("station.ironing.done")}
        </Button>
      )}
      {!u.ironing_completed_at && onReclean && (
        <Button className="flex-1 text-xs" size="sm" variant="outline" onClick={() => onReclean(u)}>
          <RotateCcw className="w-3.5 h-3.5 ms-1" /> {manager ? "تسجيل مرتجع نيابة عن الفني" : t("station.common.recleanCleaning")}
        </Button>
      )}
 {manager && u.orders?.id && <Button asChild variant="secondary" size="sm" className="text-xs"><Link to={"/$tenant/orders/$id" as any} params={{ id: u.orders.id } as any}>{t("station.common.openOrder")}</Link></Button>}
 </div>
 </div>);
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" }) {
 return <div className={`rounded-2xl p-3 border border-white/10 ${tone === "warn" ? "bg-amber-400/20" : tone === "ok" ? "bg-emerald-400/20" : "bg-white/10"}`}>
 <div className="text-2xl font-black">{value}</div><div className="text-xs text-white/70">{label}</div>
 </div>;
}
