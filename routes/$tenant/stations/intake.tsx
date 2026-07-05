import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox, Plus, RefreshCw, Truck, ArrowRight, Receipt } from "lucide-react";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";
import { IntakeInvoiceEditorModal } from "@/components/intake-invoice-editor";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/$tenant/stations/intake")({
 head: () => ({ meta: [{ title: "استلام الطلبات والندب" }] }),
 component: IntakeStationPage,
});

function IntakeStationPage() {
 const { tenantId } = useAuth();
 const { t, dir } = useI18n();
 const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);
 const [pickups, setPickups] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [editingPickup, setEditingPickup] = useState<any>(null);

 async function load() {
 if (!tenantId) return;
 setLoading(true);
 const { data } = await supabase.from("pickup_requests").select("*").eq("tenant_id", tenantId).in("status", ["pending", "assigned", "picked_up"]).order("created_at", { ascending: false }).limit(20);
 setPickups(data ?? []);
 setLoading(false);
 }

 useEffect(() => { load(); }, [tenantId]);

 return (<div className="space-y-5" dir={dir}>
 <StationActorWidget stationId="intake" stationLabel="استلام الطلبات والندب الداخلي " onActorChange={setActiveActor} />

 <div className="rounded-3xl bg-gradient-to-br from-amber-700 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-black flex items-center gap-2"><Inbox className="w-7 h-7 text-amber-300" /> محطة استلام الطلبات والندب الداخلي</h1>
 <p className="text-sm text-white/70 mt-1">استقبال الشحنات الواردة مع المناديب، استلام الملابس من العملاء، وإدخال الطلبات.</p>
 </div>
 <div className="flex gap-2">
 <Button asChild className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"><Link to={"/$tenant/orders/new" as any}><Plus className="w-4 h-4 ms-1" /> إنشاء فاتورة استلام جديدة</Link></Button>
 <Button variant="secondary" onClick={load}><RefreshCw className="w-4 h-4 ms-1" /> تحديث</Button>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-3 mt-4">
 <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">طلبات الاستلام النشطة</div><div className="text-xl font-black">{pickups.length} طلب</div></div>
 <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">في طريق العودة للمغسلة</div><div className="text-xl font-black text-amber-300">{pickups.filter(x => x.status === "picked_up").length} شحنة</div></div>
 <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">حالة خط الندب</div><div className="text-sm font-black text-emerald-300 mt-1">🟢 جاهز لاستلام الفواتير</div></div>
 </div>
 </div>

 {loading ? (<div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>) : (<Card className="rounded-3xl shadow-sm border">
 <CardHeader className="bg-slate-50/80 pb-3"><CardTitle className="text-base font-black flex items-center gap-2"><Truck className="w-5 h-5 text-amber-600" /> سجل الاستلامات وإدخال الشحنات للمغسلة</CardTitle></CardHeader>
 <CardContent className="p-4 space-y-3">
 {pickups.length === 0 ? <p className="text-center text-xs text-slate-400 py-8 font-bold">لا توجد شحنات استلام معلقة</p> : pickups.map((p) => (<div key={p.id} className="p-3.5 rounded-2xl border bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
 <div>
 <div className="font-black text-sm text-slate-900">{p.customer_name} — <span className="text-slate-500 font-mono text-xs">{p.phone}</span></div>
 <div className="text-xs text-slate-600 mt-0.5">{p.address}</div>
 <div className="text-[11px] text-slate-400 font-mono mt-1">تاريخ الطلب: {fmtDate(p.created_at)}</div>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <Badge className={p.status === "picked_up" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>{p.status === "picked_up" ? "تم الاستلام مع المندوب" : p.status === "assigned" ? "مندوب في الطريق" : "بانتظار تخصيص"}</Badge>
 <Button
 size="sm"
 onClick={() => setEditingPickup(p)}
 className="bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl px-4 shadow-sm"
 >
 <Receipt className="w-4 h-4 ms-1" />
 <span>📝 مراجعة وتعديل أصناف الفاتورة ({p.converted_order_id ? "مسجلة" : "جديدة"})</span>
 </Button>
 </div>
 </div>))}
 </CardContent>
 </Card>)}

 <IntakeInvoiceEditorModal
 open={!!editingPickup}
 onOpenChange={(v) => !v && setEditingPickup(null)}
 orderId={editingPickup?.converted_order_id || null}
 pickupId={editingPickup?.id}
 customerName={editingPickup?.customer_name}
 phone={editingPickup?.phone}
 activeActor={activeActor}
 onSaved={load}
 />
 </div>);
}
