import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate, ORDER_STATUS_AR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Zap, ArrowLeft, UserPlus, PlayCircle, CheckCircle2, Trophy } from "lucide-react";
import { AssignEmployeeDialog } from "@/components/assign-employee-dialog";
import { autoAssignIroningPieces } from "@/lib/ironing-assignment";
import { validateOrderMove } from "@/lib/station-workflow";
import { interpolate, useI18n } from "@/lib/i18n";

type OrderStatus = "received" | "cleaning" | "ironing" | "packing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

type Order = {
  id: string; order_number: number; status: OrderStatus; is_urgent: boolean; branch_id?: string | null;
  created_at: string; total: number; notes: string | null;
  customers?: { full_name: string; phone: string } | null;
};

export function StationBoard({
  title, station, incoming, current, nextStatus, nextLabel,
}: {
  title: string;
  station: "cleaning" | "ironing" | "packing";
  incoming: OrderStatus;     // status to pull from
  current: OrderStatus;       // status while at this station
  nextStatus: OrderStatus;    // status when forwarded
  nextLabel?: string;         // human label when operational station differs from broad order status
}) {
  const { user, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const canMove = hasRole("ops_manager", "owner");
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignFor, setAssignFor] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, is_urgent, branch_id, created_at, total, notes, customers(full_name, phone)")
      .in("status", [incoming, current])
      .order("is_urgent", { ascending: false })
      .order("created_at");
    setRows((data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, [incoming, current]);

  async function move(id: string, to: OrderStatus, from: OrderStatus) {
    const check = await validateOrderMove(id, to);
    if (!check.ok) return toast.error(check.message);
    const { error } = await supabase.from("orders").update({ status: to }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("order_status_history").insert({
      order_id: id, from_status: from, to_status: to, changed_by: user?.id,
      notes: `محطة: ${title}`,
    });
    const movedOrder = rows.find((r) => r.id === id);
    await supabase.rpc("record_operation_event", { _process_key: "station_move", _process_name: `تحريك طلب في ${title}`, _source_type: "order", _source_id: id, _branch_id: movedOrder?.branch_id ?? undefined, _cash_account_id: undefined, _report_bucket: "operations/stations", _requires_notification: false, _data: { from_status: from, to_status: to, station, order_number: movedOrder?.order_number }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null);
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

  const queue = rows.filter((r) => r.status === incoming);
  const active = rows.filter((r) => r.status === current);
  const nextTask = active[0] ?? queue[0] ?? null;

  return (
    <div className="space-y-4" dir={dir}>
      <div className="rounded-3xl bg-gradient-to-br from-violet-700 via-slate-900 to-teal-800 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-16 -left-14 h-36 w-36 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-black flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-300" />{title}</h1><p className="text-sm text-white/70">{t("station.common.queue")}: {queue.length} • {t("station.common.active")}: {active.length}</p></div>
          <Badge className="bg-white/15 text-white border-white/20 text-sm px-3 py-1">{t("station.common.stepByStep")}</Badge>
        </div>
      </div>

      {!loading && nextTask && <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-md">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-teal-700 font-bold mb-1">{t("station.common.nextTask")}</div>
            <div className="font-black text-lg">{t("order.orderNo", "طلب #{order}").replace("{order}", String(nextTask.order_number))} — {nextTask.customers?.full_name ?? t("station.common.customer")}</div>
            <div className="text-xs text-muted-foreground">{nextTask.status === incoming ? t("station.common.startNow") : interpolate(t("station.common.readyToMove"), { target: nextLabel ?? t(`track.step.${nextStatus}`, ORDER_STATUS_AR[nextStatus]) })}</div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/orders/$id" params={{ id: nextTask.id }}>{t("station.common.openOrder")}</Link></Button>
            {canMove && (nextTask.status === incoming ? <Button className="bg-teal-600 hover:bg-teal-500" onClick={() => move(nextTask.id, current, incoming)}><PlayCircle className="w-4 h-4 ms-1" />{t("station.common.start")}</Button> : <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => move(nextTask.id, nextStatus, current)}><CheckCircle2 className="w-4 h-4 ms-1" />{t("station.common.finishMove")}</Button>)}
          </div>
        </CardContent>
      </Card>}

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-4">
          <Column title={`${t("station.common.incoming")} (${t(`track.step.${incoming}`, ORDER_STATUS_AR[incoming])})`} list={queue} action={(o) => canMove && (
            <Button size="sm" onClick={() => move(o.id, current, incoming)}>{t("station.common.startProcessing")}</Button>
          )} />
          <Column title={`${t("station.common.active")} (${t(`track.step.${current}`, ORDER_STATUS_AR[current])})`} list={active} action={(o) => canMove && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setAssignFor(o.id)}>
                <UserPlus className="w-3 h-3 ms-1" />{t("station.common.assign")}
              </Button>
              <Button size="sm" variant="default" onClick={() => move(o.id, nextStatus, current)}>
                {interpolate(t("station.common.moveTo"), { target: nextLabel ?? t(`track.step.${nextStatus}`, ORDER_STATUS_AR[nextStatus]) })} <ArrowLeft className="w-3 h-3 ms-1" />
              </Button>
            </div>
          )} />
        </div>
      )}

      {assignFor && (
        <AssignEmployeeDialog
          open={!!assignFor}
          onOpenChange={(v) => !v && setAssignFor(null)}
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
    <Card className="bg-white/85 backdrop-blur">
      <CardContent className="p-4 space-y-2">
        <div className="font-bold text-sm mb-2">{title}</div>
        {list.length === 0 && <div className="text-xs text-muted-foreground text-center p-4">{t("station.common.noOrders")}</div>}
        {list.map((o) => (
          <div key={o.id} className="rounded-2xl border p-3 space-y-2 bg-white/90 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="font-bold">
                #{o.order_number}{" "}
                {o.is_urgent && <Badge className="bg-amber-500"><Zap className="w-3 h-3 ms-1" />{t("station.common.urgent")}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</div>
            </div>
            <div className="text-sm">{o.customers?.full_name ?? "—"}</div>
            {o.notes && <div className="text-xs text-muted-foreground">{o.notes}</div>}
            <div className="flex justify-end pt-1 [&_button]:rounded-xl [&_button]:font-bold">{action(o)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
