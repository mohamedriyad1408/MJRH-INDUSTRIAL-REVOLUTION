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
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";
import { OmnipresentOrderBanner } from "@/components/omnipresent-order-banner";
import { SorterReturnDialog } from "@/components/sorter-return-dialog";

export const Route = createFileRoute("/$tenant/stations/cleaning")({
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
 return (<div className="space-y-5" dir={dir}>
 <CleaningWorkerView manager />
 <StationBoard title={t("station.cleaning.boardTitle", "تحريك الطلبات من الغسيل إلى التجفيف والتجميع")} station="cleaning" incoming="received" current="cleaning" nextStatus="ironing" nextLabel={t("station.assembly.title")} />
 </div>);
 }

 return <CleaningWorkerView />;
}

function CleaningWorkerView({ manager = false }: { manager?: boolean }) {
 const { t, dir } = useI18n();
 const { user, tenantId } = useAuth();
 const [units, setUnits] = useState<Unit[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);

 async function load() {
 setLoading(true);
 const { data } = await supabase
 .from("service_units")
      .select("id,label_code,name,service_type,photo_url,needs_reclean,reclean_reason,reclean_return_to_employee_id,current_stage,order_id,orders(id,order_number,status,notes,customers(full_name,phone,vip_preferences,notes,address))")
      .in("service_type", ["cleaning", "ironing", "both"])
      .in("orders.status", ["cleaning", "ironing", "packing", "ready", "delivered"])
 .order("unit_number");
 setUnits((data ?? []).filter((x: any) => x.orders && (x.orders.status !== "delivered" || x.status === "customer_return" || x.needs_reclean || ["customer_return_cleaning", "recleaning", "quarantine"].includes(x.current_stage))) as Unit[]);
 setLoading(false);
 }

 useEffect(() => { load(); }, []);

 async function resolveReclean(unit: Unit) {
 const { error } = await supabase.rpc("resolve_reclean_return", { _unit_id: unit.id });
 if (error) toast.error(error.message); else {
 const actorName = activeActor?.full_name || (manager ? "المدير المفوض" : "فني الغسيل");
 toast.success("تم تنظيف المرتجع/المعالجة ورجوعه لدورة التشغيل");
 await supabase.from("order_status_history").insert({
 order_id: unit.order_id, from_status: "cleaning", to_status: "ironing",
 changed_by: user?.id, notes: `👤 معالجة المرتجع/البقع: ${unit.label_code} — نفذه: ${actorName}`,
 });
 load();
 }
 }

 async function markCleaned(unit: Unit) {
 const { error } = await supabase.from("service_units").update({ current_stage: "cleaning_done" }).eq("id", unit.id);
 if (error) toast.error(error.message); else {
 const actorName = activeActor?.full_name || (manager ? "المدير المفوض" : "فني الغسيل");
 toast.success(`تم تنظيف ${unit.label_code}`);
 await supabase.from("order_status_history").insert({
 order_id: unit.order_id, from_status: "cleaning", to_status: "cleaning_done",
 changed_by: user?.id, notes: `👤 إتمام التنظيف: ${unit.label_code} — نفذه: ${actorName}`,
 });
 const { data: rem } = await supabase.from("service_units").select("id").eq("order_id", unit.order_id).in("current_stage", ["received", "sorting", "cleaning"]).neq("current_stage", "quarantine").eq("needs_reclean", false).limit(1);
 if (!rem?.length) {
 await supabase.from("orders").update({ status: "ironing" }).eq("id", unit.order_id).neq("status", "cancelled");
 }
 load();
 }
 }

 async function bulkMarkCleaned(orderId: string, orderUnits: Unit[]) {
 const targetIds = orderUnits.filter((u) => !u.needs_reclean && u.current_stage !== "quarantine").map((u) => u.id);
 if (!targetIds.length) return toast.info("لا توجد قطع سليمة جاهزة للإتمام في هذا الطلب");
 const { error } = await supabase.from("service_units").update({ current_stage: "cleaning_done" }).in("id", targetIds);
 if (error) toast.error(error.message); else {
 const actorName = activeActor?.full_name || (manager ? "المدير المفوض" : "فني الغسيل");
 toast.success(` تم إتمام تنظيف ${targetIds.length} قطعة دفعة واحدة بنجاح`);
 await supabase.from("order_status_history").insert({
 order_id: orderId, from_status: "cleaning", to_status: "cleaning_done",
 changed_by: user?.id, notes: `👤 إتمام تنظيف جماعي (Bulk Clean) لعدد (${targetIds.length}) قطعة دفعة واحدة — نفذه: ${actorName}`,
 });
 const { data: rem } = await supabase.from("service_units").select("id").eq("order_id", orderId).in("current_stage", ["received", "sorting", "cleaning"]).neq("current_stage", "quarantine").eq("needs_reclean", false).limit(1);
 if (!rem?.length) {
 await supabase.from("orders").update({ status: "ironing" }).eq("id", orderId).neq("status", "cancelled");
 }
 load();
 }
 }

 async function quarantinePiece(u: Unit) {
 const reason = prompt("يرجى تحديد سبب عزل وتحييد القطعة للمعالجة الخاصة (مثال: بقع زيتية مستعصية، بهتان ألوان، معاملة كيميائية خاصة):", "بقع مستعصية تتطلب معالجة كيميائية مخصصة");
 if (reason === null) return;
 if (reason.trim().length < 3) return toast.error("يرجى كتابة سبب واضح لعزل القطعة");
 
 const { error } = await supabase.from("service_units").update({
 needs_reclean: true,
 reclean_reason: ` عزل لمعالجة خاصة: ${reason.trim()}`,
 current_stage: "quarantine",
 }).eq("id", u.id);
 
 if (error) toast.error(error.message); else {
 const actorName = activeActor?.full_name || (manager ? "المدير المفوض" : "فني الغسيل");
 toast.success(` تم عزل القطعة ${u.label_code} للمعالجة وإصدار إشعار فوري للإدارة والعميل`);
 
 await supabase.from("order_status_history").insert({
 order_id: u.order_id, from_status: "cleaning", to_status: "cleaning",
 changed_by: user?.id, notes: ` إشعار عزل وجودة (Quarantine): تم تحييد القطعة [${u.label_code} - ${u.name}] لمعالجة بقع مستعصية وإزالة اتساخات خاصة دون تعطيل باقي الطلب — نفذه: ${actorName}`,
 });

 const orderNotes = (u.orders as any)?.notes || "";
 if (!orderNotes.includes(" [إشعار جودة]")) {
 await supabase.from("orders").update({
 notes: (orderNotes ? orderNotes + "\n" : "") + ` [إشعار جودة وعزل]: يوجد قطعة (${u.label_code}) تخضع لمعالجة بقع مستعصية، وسيتم استكمال باقي الطلب كالمعتاد.`
 }).eq("id", u.order_id);
 }

 await supabase.from("notifications").insert({
 tenant_id: tenantId || "dry-tech",
 title: ` تحييد قطعة لمعالجة بقع مستعصية — طلب #${(u.orders as any)?.order_number || "?"}`,
 message: `قام ${actorName} بعزل القطعة (${u.label_code} - ${u.name}) بغرض معالجة بقع مستعصية/تجهيز خاص: "${reason.trim()}". تم فصلها عن باقي الطلب لعدم تعطيله.`,
 audience: ["owner", "ops_manager", "cs_rep", "supervisor"],
 tone: "amber"
 }).then(() => null);

 load();
 }
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

 return (<div className="space-y-5" dir={dir}>
 <StationActorWidget stationId="cleaning" stationLabel="التنظيف والغسيل والمعالجة " onActorChange={setActiveActor} />

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

 {loading ? <div className="p-8 text-center text-muted-foreground">{t("common.loading")}...</div> : (<div className="space-y-3">
 {!groups.length && <Card><CardContent className="p-10 text-center text-muted-foreground">{t("station.cleaning.noOrders")}</CardContent></Card>}
 {groups.map((g) => (<Card key={g.orderId} className="overflow-hidden">
 <CardHeader className="bg-muted/40 pb-3">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <CardTitle className="text-base flex items-center gap-2">
 <Package className="w-4 h-4 text-teal-600" /> {t("order.orderNo", "طلب #{order}").replace("{order}", String(g.order?.order_number ?? "?"))}
 <Badge variant="outline">{g.units.length} {t("station.common.pieces")}</Badge>
 {g.units.some((u) => u.needs_reclean) && <Badge className="bg-amber-500">{t("station.common.reclean")}</Badge>}
 </CardTitle>
 <div className="flex flex-wrap items-center gap-2">
 <Button size="sm" onClick={() => bulkMarkCleaned(g.orderId, g.units)} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black shadow-md text-xs">
 <Sparkles className="w-3.5 h-3.5 ms-1 text-teal-200" />
 {manager ? ` إتمام تنظيف سليم (${g.units.filter(u => !u.needs_reclean && u.current_stage !== "quarantine").length}) نيابة عن الفني` : ` إتمام تنظيف كافة القطع السليمة (${g.units.filter(u => !u.needs_reclean && u.current_stage !== "quarantine").length} قطعة)`}
 </Button>
 {g.order?.id && <Button asChild size="sm" variant="outline" className="text-xs"><Link to={"/$tenant/orders/$id" as any} params={{ id: g.order.id } as any}>{t("station.common.openOrder")} <ArrowLeft className="w-3 h-3 me-1" /></Link></Button>}
 {g.order?.id && <SorterReturnDialog orderId={g.orderId} orderNumber={g.order?.order_number || "?"} tenantId={tenantId} onDone={load} />}
 </div>
 </div>
 <div className="text-xs text-muted-foreground">{g.order?.customers?.full_name ?? "—"} · {g.order?.customers?.phone ?? ""}</div>
 <OmnipresentOrderBanner order={g.order} customer={g.order?.customers} className="mt-2" />
 </CardHeader>
 <CardContent className="p-3 space-y-2">
 {g.units.map((u) => (<div key={u.id} className="grid grid-cols-[58px_1fr] md:grid-cols-[58px_1fr_auto] gap-3 items-center rounded-xl border p-2 bg-card">
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
 <div className="col-span-2 md:col-span-1 flex flex-wrap gap-2 justify-end">
 {u.needs_reclean ? (<Button size="sm" onClick={() => resolveReclean(u)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"><CheckCircle2 className="w-3.5 h-3.5 ms-1" /> {t("station.cleaning.cleanedAgain")} (إرجاع للتشغيل)</Button>) : (<>
 <Button size="sm" variant="outline" onClick={() => markCleaned(u)} className="text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5 ms-1 text-emerald-600" /> {manager ? "✔ تم التنظيف" : t("station.cleaning.cleaned")}</Button>
 <Button size="sm" variant="destructive" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs" onClick={() => quarantinePiece(u)}>
 <RotateCcw className="w-3.5 h-3.5 ms-1" /> {manager ? " عزل بقع/معالجة" : " عزل وتحييد للمعالجة"}
 </Button>
 </>)}
 </div>
 </div>))}
 </CardContent>
 </Card>))}
 </div>)}
 </div>);
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" }) {
 return <div className={`rounded-2xl p-3 border border-white/10 ${tone === "warn" ? "bg-amber-400/20" : tone === "ok" ? "bg-emerald-400/20" : "bg-white/10"}`}>
 <div className="text-2xl font-black">{value}</div><div className="text-xs text-white/70">{label}</div>
 </div>;
}
