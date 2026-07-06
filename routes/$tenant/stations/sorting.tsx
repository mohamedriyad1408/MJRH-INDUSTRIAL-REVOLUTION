import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tags, RefreshCw, Shirt, ArrowRight, CheckCircle2, ClipboardCheck, Eye, Camera, ExternalLink, ShieldAlert, Zap, Receipt, Sparkles } from "lucide-react";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";
import { IntakeInvoiceEditorModal } from "@/components/intake-invoice-editor";
import { OmnipresentOrderBanner } from "@/components/omnipresent-order-banner";
import { SorterReturnDialog } from "@/components/sorter-return-dialog";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { fmtDate, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/$tenant/stations/sorting")({
 head: () => ({ meta: [{ title: "الفرز والتصنيف" }] }),
 component: SortingStationPage,
});

function SortingStationPage() {
 const { tenantId, user } = useAuth();
 const { t, dir } = useI18n();
 const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);
 const [units, setUnits] = useState<any[]>([]);
 const [orders, setOrders] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [busy, setBusy] = useState<string | null>(null);
 const [editingOrder, setEditingOrder] = useState<any>(null);

 async function load() {
 if (!tenantId) return;
 setLoading(true);
 const [uRes, oRes] = await Promise.all([
 supabase
 .from("service_units")
 .select("id,label_code,name,service_type,current_stage,label_status,order_id,orders(id,order_number,status,customers(full_name,phone,vip_preferences,notes))")
 .eq("tenant_id", tenantId)
 .in("current_stage", ["received", "sorting"])
 .order("unit_number")
 .limit(30),
 supabase
 .from("orders")
 .select("id,order_number,status,total,created_at,notes,order_type,is_urgent,invoice_finalized_at,customers(full_name,phone,vip_preferences,notes,address)")
 .eq("tenant_id", tenantId)
 .in("status", ["received", "sorting"])
 .order("created_at", { ascending: false })
 .limit(20),
 ]);
 setUnits(uRes.data ?? []);
 setOrders(oRes.data ?? []);
 setLoading(false);
 }

 useEffect(() => { load(); }, [tenantId]);

 async function confirmInvoice(order: any) {
 setBusy(order.id);
 const { error } = await supabase.from("orders").update({
 invoice_finalized_at: new Date().toISOString(),
 status: "sorting",
 }).eq("id", order.id);
 setBusy(null);
 if (error) {
 toast.error(error.message);
 } else {
      toast.success(`تم تأكيد واعتماد فاتورة طلب #${order.order_number} وإطلاق التشغيل`);
 if (activeActor) {
 await supabase.from("order_status_history").insert({
 order_id: order.id, from_status: order.status, to_status: "sorting",
 changed_by: user?.id, notes: `👤 تأكيد واعتماد الفاتورة والفرز — نفذه: ${activeActor.full_name}`,
 });
 }
 load();
 }
 }

 async function markSorted(u: any) {
 setBusy(u.id);
 const nextStage = "cleaning";
 const { error } = await supabase.from("service_units").update({
 current_stage: nextStage,
 label_status: "labeled",
 }).eq("id", u.id);

 if (error) {
 toast.error(error.message);
 } else {
 toast.success(`تم فرز ولصق باركود ${u.label_code} وتحويلها لمحطة الغسيل`);
 if (activeActor) {
 await supabase.from("order_status_history").insert({
 order_id: u.orders?.id || u.order_id, from_status: "sorting", to_status: nextStage,
 changed_by: user?.id, notes: `👤 الفرز والتصنيف: ${u.label_code} (${u.name}) — نفذه: ${activeActor.full_name}`,
 });
 }
        const { data: rem } = await supabase.from("service_units").select("id").eq("order_id", u.orders?.id || u.order_id).in("current_stage", ["received", "sorting"]).limit(1);
        if (!rem?.length) {
          await supabase.from("orders").update({ status: nextStage }).eq("id", u.orders?.id || u.order_id).neq("status", "cancelled");
        }
        load();
      }
      setBusy(null);
    }

    async function fastTrackSortAll(order: any, orderUnits: any[]) {
      setBusy(order.id);
      try {
        if (!order.invoice_finalized_at) {
          await supabase.from("orders").update({
            invoice_finalized_at: new Date().toISOString(),
            status: "sorting",
          }).eq("id", order.id);
        }

        const allIds = orderUnits.filter((u: any) => u.current_stage === "sorting").map((u: any) => u.id);

        if (allIds.length > 0) {
          await supabase.from("service_units").update({ current_stage: "cleaning", label_status: "labeled" }).in("id", allIds);
        }

        await supabase.from("orders").update({ status: "cleaning" }).eq("id", order.id).neq("status", "cancelled");

        const actorName = activeActor?.full_name || "فني الفرز";
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          from_status: order.status,
          to_status: "cleaning",
          changed_by: user?.id,
          notes: `الفرز الشامل السريع (1-Click Fast Track): تم اعتماد الفاتورة وتوجيه ${orderUnits.length} قطعة للتشغيل — نفذه: ${actorName}`
        });

        toast.success(`تم اعتماد الفاتورة وفرز وتوجيه ${orderUnits.length} قطعة بنقرة واحدة بنجاح`);
        load();
      } catch (e: any) {
        toast.error("خطأ في الفرز الشامل: " + (e?.message || ""));
      } finally {
        setBusy(null);
      }
    }

    return (<div className="space-y-5" dir={dir}>
      <StationActorWidget stationId="sorting" stationLabel="الفرز والتصنيف وإصدار المارك" onActorChange={setActiveActor} />

 <div className="rounded-3xl bg-gradient-to-br from-violet-800 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-black flex items-center gap-2"><Tags className="w-7 h-7 text-violet-300" /> محطة الفرز والتصنيف وإصدار المارك</h1>
 <p className="text-sm text-white/70 mt-1">مراجعة وتأكيد الفاتورة المبدئية، الفرز الفني للأقمشة والتصوير، إصدار الباركود وتوجيه الملابس للغسيل أو الكي.</p>
 </div>
 <Button variant="secondary" onClick={load}><RefreshCw className="w-4 h-4 ms-1" /> تحديث الفرز</Button>
 </div>
 <div className="grid grid-cols-3 gap-3 mt-4">
 <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">طلبات بانتظار تأكيد الفاتورة</div><div className="text-xl font-black">{orders.filter(x => !x.invoice_finalized_at).length} طلب</div></div>
 <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">قطع بانتظار الفرز والمارك</div><div className="text-xl font-black text-amber-300">{units.length} قطعة</div></div>
 <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">توجيه الغسيل أو الكي</div><div className="text-sm font-black text-emerald-300 mt-1">🟢 جاهز لإطلاق التشغيل</div></div>
 </div>
 </div>

 {loading ? (<div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>) : (<div className="space-y-6">
 {/* Section 1: Master Invoice Audit & Confirmation Desk */}
 <Card className="rounded-3xl shadow-sm border-2 border-violet-500/20 bg-gradient-to-br from-violet-50/40 to-white overflow-hidden">
 <CardHeader className="bg-violet-900 text-white p-4">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <ClipboardCheck className="w-5 h-5 text-violet-300" />
 <span>📋 مكتب فرز ومراجعة وتأكيد الفواتير المبدئية (Invoice Audit Desk)</span>
 </CardTitle>
 <p className="text-xs text-violet-100 mt-0.5">
 تأكيد الفاتورة المبدئية للطلبات الواردة من الخارج (البوابة الملكية والمندوبين) أو الداخل (الاستقبال)، مع فحص الملابس وتوثيق التصوير.
 </p>
 </CardHeader>
 <CardContent className="p-4 space-y-3">
 {orders.length === 0 ? <p className="text-center text-xs text-slate-400 py-6 font-bold">لا توجد طلبات معلقة بانتظار تأكيد الفاتورة</p> : orders.map((o) => {
 const isConfirmed = !!o.invoice_finalized_at;
 return (<div key={o.id} className="p-4 rounded-2xl border bg-white space-y-3 shadow-2xs">
 <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
 <div>
 <div className="font-black text-base text-slate-900 flex items-center gap-2">
 <span>طلب #{o.order_number} — {o.customers?.full_name ?? "عميل"}</span>
 {o.is_urgent && <Badge className="bg-amber-500 text-white text-[10px] font-black"><Zap className="w-3 h-3 ms-1" /> مستعجل</Badge>}
 <Badge variant="outline" className="font-mono text-xs font-black">{o.order_type === "walk_in" ? "داخلي (الاستقبال)" : "خارجي (بوابة VIP/مندوب)"}</Badge>
 </div>
 <div className="text-xs text-slate-500 font-mono mt-0.5">تاريخ الطلب: {fmtDate(o.created_at)} · القيمة التقديرية: {fmtMoney(o.total)}</div>
 </div>
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 onClick={() => setEditingOrder(o)}
 className="bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl px-3 shadow-xs"
 >
 <Receipt className="w-4 h-4 ms-1" />
 <span>تعديل الأصناف</span>
 </Button>
 {isConfirmed ? (<Badge className="bg-emerald-600 text-white font-black text-xs py-1.5 px-3">فاتورة مؤكدة ومفرزنة</Badge>) : (<>
 <Button
 onClick={() => confirmInvoice(o)}
 disabled={busy === o.id}
 className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-4 shadow-sm"
 >
 {busy === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ms-1" />}
 <span>تأكيد واعتماد الفاتورة</span>
 </Button>
 <Button
 size="sm"
 onClick={() => fastTrackSortAll(o, units.filter((u) => u.order_id === o.id))}
 disabled={busy === o.id}
 className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black rounded-xl px-3 text-xs shadow-md"
 >
 {busy === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 ms-1 text-teal-200" />}
 <span>اعتماد وفرز شامل سريع (1-Click Fast Track)</span>
 </Button>
 </>)}
 <Button asChild size="sm" variant="outline" className="rounded-xl font-bold"><Link to={"/$tenant/orders/$id" as any} params={{ id: o.id } as any}><Eye className="w-4 h-4 ms-1" /> فرز وتصوير القطع</Link></Button>
 <SorterReturnDialog orderId={o.id} orderNumber={o.order_number} tenantId={tenantId} onDone={load} />
 </div>
 </div>
 <OmnipresentOrderBanner order={o} customer={o.customers} />
 </div>);
 })}
 </CardContent>
 </Card>

 {/* Section 2: Barcode Tagging & Routing Grid */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="bg-slate-50/80 pb-3"><CardTitle className="text-base font-black flex items-center gap-2"><Shirt className="w-5 h-5 text-violet-600" /> قطع الملابس الواردة للفرز الفني ولصق المارك (Barcode Tagging)</CardTitle></CardHeader>
 <CardContent className="p-4 space-y-3">
 {units.length === 0 ? <p className="text-center text-xs text-slate-400 py-8 font-bold">لا توجد قطع معلقة بانتظار الفرز حالياً</p> : units.map((u) => (<div key={u.id} className="p-3.5 rounded-2xl border bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
 <div>
 <div className="font-black text-base text-slate-900 flex items-center gap-2">
 <span className="font-mono text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-lg border border-violet-200">{u.label_code}</span>
 <span>{u.name}</span>
 </div>
 <div className="text-xs text-slate-500 font-bold mt-1">طلب #{u.orders?.order_number ?? "?"} — {u.orders?.customers?.full_name ?? "عميل"}</div>
 </div>
 <div className="flex items-center gap-3">
 <Badge className={u.service_type === "ironing" ? "bg-purple-600 text-white" : "bg-blue-600 text-white"}>
 {u.service_type === "both" ? " تنظيف وكي" : u.service_type === "ironing" ? " كي فقط" : " تنظيف فقط"}
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
 </div>))}
 </CardContent>
 </Card>
 </div>)}

 <IntakeInvoiceEditorModal
 open={!!editingOrder}
 onOpenChange={(v) => !v && setEditingOrder(null)}
 orderId={editingOrder?.id || null}
 customerName={editingOrder?.customers?.full_name}
 phone={editingOrder?.customers?.phone}
 activeActor={activeActor}
 onSaved={load}
 />
 </div>);
}
