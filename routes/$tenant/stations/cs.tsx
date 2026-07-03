import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Headphones, MessageSquare, ExternalLink, RefreshCw, Users, Clock } from "lucide-react";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/$tenant/stations/cs")({
  head: () => ({ meta: [{ title: "1. خدمة العملاء والدعم CS" }] }),
  component: CsStationPage,
});

function CsStationPage() {
  const { tenantId } = useAuth();
  const { t, dir } = useI18n();
  const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const [oRes, pRes] = await Promise.all([
      supabase.from("orders").select("id,order_number,status,total,created_at,notes,customers(full_name,phone)").eq("tenant_id", tenantId).not("status", "in", "(delivered,cancelled)").order("created_at", { ascending: false }).limit(15),
      supabase.from("pickup_requests").select("*").eq("tenant_id", tenantId).in("status", ["pending", "assigned"]).order("created_at", { ascending: false }).limit(10),
    ]);
    setOrders(oRes.data ?? []);
    setPickups(pRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [tenantId]);

  return (
    <div className="space-y-5" dir={dir}>
      <StationActorWidget stationId="cs" stationLabel="خدمة العملاء والدعم والمتابعة 🎧" onActorChange={setActiveActor} />

      <div className="rounded-3xl bg-gradient-to-br from-indigo-800 via-slate-900 to-teal-900 text-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Headphones className="w-7 h-7 text-indigo-300" /> 1. محطة خدمة العملاء والدعم (CS Concierge)</h1>
            <p className="text-sm text-white/70 mt-1">المحطة التشغيلية الأولى: الرد على استفسارات العملاء، متابعة طلبات الاستلام، وتنسيق الإشعارات والدعم الفني.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20"><Link to={"/$tenant/customer-care" as any}><MessageSquare className="w-4 h-4 ms-1" /> واتساب والدعم الشامل</Link></Button>
            <Button variant="secondary" onClick={load}><RefreshCw className="w-4 h-4 ms-1" /> تحديث</Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">الطلبات الجارية للمتابعة</div><div className="text-xl font-black">{orders.length} طلب</div></div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">استلامات بانتظار المندوب</div><div className="text-xl font-black text-amber-300">{pickups.length} استلام</div></div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">حالة خط الدعم</div><div className="text-sm font-black text-emerald-300 mt-1">🟢 متصل ونشط</div></div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          <Card className="rounded-3xl shadow-sm border">
            <CardHeader className="bg-slate-50/80 pb-3"><CardTitle className="text-base font-black flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-600" /> طلبات الاستلام النشطة (Active Pickups)</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3">
              {pickups.length === 0 ? <p className="text-center text-xs text-slate-400 py-6 font-bold">لا توجد طلبات استلام معلقة حالياً</p> : pickups.map((p) => (
                <div key={p.id} className="p-3 rounded-2xl border bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{p.customer_name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{p.phone} — {p.address}</div>
                  </div>
                  <Badge className={p.status === "pending" ? "bg-amber-500 text-white" : "bg-blue-600 text-white"}>{p.status === "pending" ? "بانتظار مندوب" : "مندوب في الطريق"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm border">
            <CardHeader className="bg-slate-50/80 pb-3"><CardTitle className="text-base font-black flex items-center gap-2"><Users className="w-5 h-5 text-teal-600" /> أحدث الطلبات ومسار العملاء</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-3">
              {orders.length === 0 ? <p className="text-center text-xs text-slate-400 py-6 font-bold">لا توجد طلبات معلقة</p> : orders.map((o) => (
                <div key={o.id} className="p-3 rounded-2xl border bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-sm text-slate-900">طلب #{o.order_number} — {o.customers?.full_name ?? "عميل"}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{fmtDate(o.created_at)} · {fmtMoney(o.total)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-black text-[10px]">{o.status}</Badge>
                    <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl"><Link to={"/$tenant/orders/$id" as any} params={{ id: o.id } as any}><ExternalLink className="w-4 h-4" /></Link></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
