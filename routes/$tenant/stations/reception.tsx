import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Zap, ArrowLeft, PackageOpen, Truck, Eye, Plus } from "lucide-react";
import { AssignEmployeeDialog } from "@/components/assign-employee-dialog";
import { autoAssignIroningPieces } from "@/lib/ironing-assignment";
import { interpolate, useI18n } from "@/lib/i18n";
import { StationActorWidget, ActiveActor } from "@/components/station-actor-widget";

export const Route = createFileRoute("/$tenant/stations/reception")({
  head: () => ({ meta: [{ title: "الاستقبال" }] }),
  component: ReceptionPage,
});

type Order = {
  id: string; order_number: number; status: string; is_urgent: boolean;
  order_type: string; created_at: string; total: number; notes: string | null;
  customers?: { full_name: string; phone: string } | null;
  source?: "order" | "pickup"; // virtual field for UI
};

type Pickup = {
  id: string; customer_name: string; phone: string; address: string;
  status: string; created_at: string; notes: string | null;
  converted_order_id: string | null;
};

function ReceptionPage() {
  const { user, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const canMove = hasRole("ops_manager", "owner", "cs_manager", "employee");

  const [orders, setOrders] = useState<Order[]>([]);
  const [incomingPickups, setIncomingPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [activeActor, setActiveActor] = useState<ActiveActor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordRes, pickRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, status, is_urgent, order_type, created_at, total, notes, customers(full_name, phone)")
        .in("status", ["received"])
        .order("is_urgent", { ascending: false })
        .order("created_at"),
      supabase
        .from("pickup_requests")
        .select("id, customer_name, phone, address, status, created_at, notes, converted_order_id")
        .in("status", ["pending", "assigned"])
        .order("created_at"),
    ]);
    setOrders((ordRes.data ?? []) as Order[]);
    setIncomingPickups((pickRes.data ?? []) as Pickup[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function moveToProcessing(id: string) {
    setActing(id);
    const { data: openPickup } = await supabase.from("pickup_requests").select("id,status").eq("converted_order_id", id).in("status", ["pending", "assigned"]).maybeSingle();
    if (openPickup) {
      setActing(null);
      toast.error("لا يمكن تحويل الطلب للتشغيل قبل أن يستلمه المندوب من العميل");
      return;
    }

    const { data: units, error: unitsErr } = await supabase
      .from("service_units")
      .select("id,service_type")
      .eq("order_id", id)
      .neq("status", "cancelled");
    if (unitsErr) { setActing(null); toast.error(unitsErr.message); return; }
    if (!units?.length) { setActing(null); toast.error("لا يمكن تشغيل طلب بلا قطع"); return; }

    const hasCleaning = units.some((u: any) => ["cleaning", "both"].includes(u.service_type));
    const hasIroning = units.some((u: any) => ["ironing", "both", "cleaning"].includes(u.service_type));
    const nextStatus = hasCleaning ? "cleaning" : hasIroning ? "ironing" : "packing";

    if (nextStatus === "ironing") {
      await supabase.from("service_units").update({ current_stage: "ironing" }).eq("order_id", id).in("service_type", ["ironing", "cleaning", "both"]);
    }

    const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", id);
    if (!error) {
      await supabase.from("order_status_history").insert({
        order_id: id, from_status: "received", to_status: nextStatus,
        changed_by: user?.id, notes: `نفذه الموظف: ${activeActor?.full_name ?? "الاستقبال"} (${activeActor?.job_title ?? "محطة الاستلام"})`,
      });
      if (nextStatus === "ironing") {
        try {
          const r = await autoAssignIroningPieces(id);
          toast.success(r.assigned ? `تم تحويل الطلب للكي وتوزيع ${r.assigned} قطعة` : (r.message || "تم تحويل الطلب للكي ولا يوجد فني حاضر للتوزيع"));
        } catch (e: any) {
          toast.success("تم تحويل الطلب للكي");
          toast.error(e?.message ?? "تعذر توزيع الكي تلقائيًا");
        }
      } else if (nextStatus === "cleaning") {
        toast.success("تم تحويل الطلب للتنظيف");
      } else {
        toast.success("تم تحويل الطلب للمرحلة التالية");
      }
    } else {
      toast.error(error.message);
    }
    setActing(null);
    load();
  }

  const walkIn = orders.filter((o) => o.order_type === "walk_in" || !o.order_type || o.notes?.includes("داخلي") || !o.notes?.includes("["));

  return (
    <div className="space-y-6" dir={dir}>
      <div className="rounded-3xl bg-gradient-to-br from-teal-800 via-slate-900 to-indigo-900 text-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><PackageOpen className="w-7 h-7 text-teal-300" /> محطة الاستقبال ومطابقة الفواتير</h1>
            <p className="text-sm text-white/70 mt-1">استقبال عملاء الباب الداخليين (Walk-In)، تسجيل بيانات العميل الجديد أو البحث عن القديم وإصدار الفواتير.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black"><Link to={"/$tenant/orders/new" as any}><Plus className="w-4 h-4 ms-1" /> تسجيل عميل داخلي وإنشاء فاتورة</Link></Button>
            <Button variant="secondary" onClick={load}>تحديث</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">فواتير عملاء الباب الداخلية</div><div className="text-xl font-black">{walkIn.length} فاتورة</div></div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center"><div className="text-xs text-white/70">توجيه الطلبات الخارجية (Pickup/VIP)</div><div className="text-sm font-black text-amber-300 mt-1">تتم مباشرة عبر محطة الفرز رقم 4</div></div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
      ) : (
        <div className="space-y-6" dir={dir}>
          <StationActorWidget stationId="reception" stationLabel="الاستقبال ومطابقة الفواتير" onActorChange={setActiveActor} />

          {/* Walk-in orders */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-teal-600" />
                <span className="font-black text-base text-slate-900">طلبات وفواتير عملاء الباب الداخلية ({walkIn.length})</span>
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-xl font-bold border-teal-300 text-teal-900 hover:bg-teal-50"><Link to={"/$tenant/orders/new" as any}>إنشاء فاتورة استلام داخلي</Link></Button>
            </div>
            {walkIn.length === 0 ? (
              <Card className="rounded-3xl border-dashed"><CardContent className="p-8 text-center text-sm text-slate-400 font-bold">لا توجد فواتير داخلية معلقة حالياً في الاستقبال</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {walkIn.map((o) => (
                  <OrderCard
                    key={o.id} o={o} acting={acting} canMove={canMove}
                    onMove={moveToProcessing}
                    onAssign={() => setAssignFor(o.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {assignFor && (
        <AssignEmployeeDialog
          open={!!assignFor}
          onOpenChange={(v) => !v && setAssignFor(null)}
          orderId={assignFor}
          station="reception"
          onAssigned={load}
        />
      )}
    </div>
  );
}

function OrderCard({
  o, acting, canMove, onMove, onAssign,
}: {
  o: Order; acting: string | null; canMove: boolean;
  onMove: (id: string) => void;
  onAssign: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-bold flex items-center gap-2">
            #{o.order_number}
            {o.is_urgent && <Badge className="bg-amber-500 text-white text-xs"><Zap className="w-3 h-3" /> {t("station.common.urgent")}</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">{o.customers?.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</div>
          {o.notes && <div className="mt-1 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">ملاحظات الطلب: {o.notes}</div>}
        </div>
        {canMove && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={onAssign}>{t("station.reception.assign")}</Button>
            <Button size="sm" disabled={acting === o.id} onClick={() => onMove(o.id)}>
              {acting === o.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <><ArrowLeft className="w-3 h-3 ms-1" />{t("station.reception.startProcessing")}</>}
            </Button>
          </div>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link to={"/$tenant/orders/$id" as any} params={{ id: o.id } as any}><Eye className="w-4 h-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
