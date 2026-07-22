import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate, ORDER_STATUS_AR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Zap, ArrowLeft, UserPlus } from "lucide-react";
import { AssignEmployeeDialog } from "@/components/assign-employee-dialog";
import { autoAssignIroningPieces } from "@/lib/ironing-assignment";
import { validateOrderMove } from "@/lib/station-workflow";
import { interpolate, useI18n } from "@/lib/i18n";

type OrderStatus = "received" | "cleaning" | "ironing" | "packing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
type Station = "reception" | "cleaning" | "ironing" | "packing" | "delivery";
type Order = {
  id: string; order_number: number; status: OrderStatus; is_urgent: boolean;
  created_at: string; total: number; notes: string | null;
  customers?: { full_name: string; phone: string } | null;
};

export function StationPage({
  title, station, incoming, current, nextStatus,
}: {
  title: string;
  station: Station;
  incoming: OrderStatus | null;
  current: OrderStatus;
  nextStatus: OrderStatus;
}) {
  const { user, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const canMove = hasRole("ops_manager", "owner", "cs_manager");
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const statuses = incoming ? [incoming, current] : [current];
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, is_urgent, created_at, total, notes, customers(full_name, phone)")
      .in("status", statuses)
      .order("is_urgent", { ascending: false })
      .order("created_at");
    setRows((data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, [station]);

  async function move(id: string, to: OrderStatus, from: OrderStatus) {
    const check = await validateOrderMove(id, to);
    if (!check.ok) return toast.error(check.message);
    const { error } = await supabase.from("orders").update({ status: to }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("order_status_history").insert({
      order_id: id, from_status: from, to_status: to, changed_by: user?.id, notes: `محطة: ${title}`,
    });
    if (to === "ironing") {
      try {
        const r = await autoAssignIroningPieces(id);
        toast.success(r.assigned ? `تم التحديث وتوزيع ${r.assigned} قطعة كي` : "تم التحديث");
      } catch (e) {
        toast.success("تم التحديث");
        toast.error(e instanceof Error ? e.message : "تعذر توزيع الكي تلقائياً");
      }
    } else {
      toast.success("تم التحديث");
    }
    load();
  }

  const queue = incoming ? rows.filter((r: any) => r.status === incoming) : [];
  const active = rows.filter((r: any) => r.status === current);

  return (
    <div className="space-y-4" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {incoming && <>{t("stations.common.incoming")}: {queue.length} • </>}{t("stations.common.active")}: {active.length}
        </p>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className={`grid gap-4 ${incoming ? "md:grid-cols-2" : ""}`}>
          {incoming && (
            <Column title={`${t("stations.common.incoming")} (${t(`track.step.${incoming}`, ORDER_STATUS_AR[incoming])})`} list={queue} action={(o: any) => canMove && (
              <Button size="sm" onClick={() => move(o.id, current, incoming)}>{t("stations.common.startProcessing")}</Button>
            )} />
          )}
          <Column title={`${t("stations.common.active")} (${t(`track.step.${current}`, ORDER_STATUS_AR[current])})`} list={active} action={(o: any) => canMove && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setAssignFor(o.id)}>
                <UserPlus className="w-3 h-3 ms-1" />{t("stations.common.assign")}
              </Button>
              <Button size="sm" onClick={() => move(o.id, nextStatus, current)}>
                {interpolate(t("stations.common.moveTo"), { target: t(`track.step.${nextStatus}`, ORDER_STATUS_AR[nextStatus]) })} <ArrowLeft className="w-3 h-3 ms-1" />
              </Button>
            </div>
          )} />
        </div>
      )}

      {assignFor && (
        <AssignEmployeeDialog
          open={!!assignFor}
          onOpenChange={(v: any) => !v && setAssignFor(null)}
          orderId={assignFor}
          station={station}
          onAssigned={load}
        />
      )}
    </div>
  );
}

function Column({ title, list, action }: { title: string; list: Order[]; action: (o: Order) => React.ReactNode }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="font-bold text-sm mb-2">{title}</div>
        {list.length === 0 && <div className="text-xs text-muted-foreground text-center p-4">{t("stations.common.noOrders")}</div>}
        {list.map((o: any) => (
          <div key={o.id} className="rounded-lg border p-3 space-y-1">
            <div className="flex justify-between items-center">
              <div className="font-bold">
                #{o.order_number}{" "}
                {o.is_urgent && <Badge className="bg-amber-500"><Zap className="w-3 h-3 ms-1" />{t("stations.common.urgent")}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</div>
            </div>
            <div className="text-sm">{o.customers?.full_name ?? "—"}</div>
            {o.notes && <div className="text-xs text-muted-foreground">{o.notes}</div>}
            <div className="flex justify-end pt-1">{action(o)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
