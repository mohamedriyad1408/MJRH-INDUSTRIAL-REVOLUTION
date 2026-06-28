import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Zap, ArrowLeft, PackageOpen, Truck, Eye } from "lucide-react";
import { AssignEmployeeDialog } from "@/components/assign-employee-dialog";
import { autoAssignIroningPieces } from "@/lib/ironing-assignment";

export const Route = createFileRoute("/_app/stations/reception")({
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
  const canMove = hasRole("ops_manager", "owner", "cs_manager");

  const [orders, setOrders] = useState<Order[]>([]);
  const [incomingPickups, setIncomingPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

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
    const { data: openPickup } = await (supabase as any).from("pickup_requests").select("id,status").eq("converted_order_id", id).in("status", ["pending", "assigned"]).maybeSingle();
    if (openPickup) {
      setActing(null);
      toast.error("لا يمكن تحويل الطلب للتشغيل قبل أن يستلمه المندوب من العميل");
      return;
    }

    const { data: units, error: unitsErr } = await (supabase as any)
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
      await (supabase as any).from("service_units").update({ current_stage: "ironing" }).eq("order_id", id).in("service_type", ["ironing", "cleaning", "both"]);
    }

    const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", id);
    if (!error) {
      await supabase.from("order_status_history").insert({
        order_id: id, from_status: "received", to_status: nextStatus,
        changed_by: user?.id, notes: "محطة الاستلام",
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

  const walkIn = orders.filter((o) => o.order_type === "walk_in");
  const fromPickup = orders.filter((o) => o.order_type === "delivery");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الاستقبال — تسجيل وتشغيل الطلبات</h1>
        <p className="text-sm text-muted-foreground">
          طلبات في الاستقبال: {walkIn.length} • قادمة من توصيل: {fromPickup.length} • طلبات استلام نشطة: {incomingPickups.length}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <div className="space-y-6">

          {/* Active Pickup Requests — visible to reception */}
          {incomingPickups.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">طلبات الاستلام النشطة ({incomingPickups.length})</span>
                <Badge variant="outline" className="text-xs">تنتظر السائق</Badge>
                <Link to="/pickups" className="text-xs text-primary underline ms-auto">إدارة الكل</Link>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {incomingPickups.map((p) => (
                  <Card key={p.id} className="border-dashed border-amber-300 bg-amber-50/30">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">{p.customer_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {p.status === "pending" ? "⏳ بانتظار سائق" : "🚗 سائق في الطريق"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{p.address}</div>
                      {p.notes && <div className="text-xs text-muted-foreground italic">{p.notes}</div>}
                      <div className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Walk-in orders */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <PackageOpen className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">طلبات الاستقبال ({walkIn.length})</span>
            </div>
            {walkIn.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد طلبات في الاستقبال</CardContent></Card>
            ) : (
              <div className="space-y-2">
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

          {/* Pickup-origin orders (already converted) */}
          {fromPickup.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">وصلت من الاستلام الخارجي ({fromPickup.length})</span>
              </div>
              <div className="space-y-2">
                {fromPickup.map((o) => (
                  <OrderCard
                    key={o.id} o={o} acting={acting} canMove={canMove}
                    onMove={moveToProcessing}
                    onAssign={() => setAssignFor(o.id)}
                  />
                ))}
              </div>
            </div>
          )}

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
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-bold flex items-center gap-2">
            #{o.order_number}
            {o.is_urgent && <Badge className="bg-amber-500 text-white text-xs"><Zap className="w-3 h-3" /> عاجل</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">{o.customers?.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</div>
          {o.notes && <div className="mt-1 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">ملاحظات الطلب: {o.notes}</div>}
        </div>
        {canMove && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={onAssign}>تعيين</Button>
            <Button size="sm" disabled={acting === o.id} onClick={() => onMove(o.id)}>
              {acting === o.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <><ArrowLeft className="w-3 h-3 ms-1" />تشغيل</>}
            </Button>
          </div>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link to="/orders/$id" params={{ id: o.id }}><Eye className="w-4 h-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
