import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/format";
import { distanceKm, formatDistance, type LatLng } from "@/lib/geo";
import { Loader2, MapPin, Phone, CheckCircle2, Zap, ArrowLeft, Navigation } from "lucide-react";

export type Pickup = {
  id: string; branch_id?: string | null; customer_name: string; phone: string;
  address: string; location_url: string | null; lat?: number | null; lng?: number | null; estimated_pieces?: number | null;
  status: string; scheduled_at: string | null;
  created_at: string; notes: string | null; converted_order_id?: string | null; customer_id?: string | null;
};
export type Delivery = {
  id: string; order_number: number; status: string; branch_id?: string | null;
  is_urgent: boolean; created_at: string; total: number; payment_status: string; payment_method?: string | null;
  delivery_address: string | null; delivery_lat?: number | null; delivery_lng?: number | null; assigned_driver_employee_id?: string | null;
  customers?: { full_name: string; phone: string } | null;
  task_assignments?: { employee_id: string }[];
};

export const PICKUP_STATUS_AR: Record<string, string> = {
  pending: "بانتظار سائق",
  assigned: "مُكلَّف",
  picked_up: "تم الاستلام",
  converted: "تحوَّل لطلب",
  cancelled: "ملغي",
};

export function pickupStatusLabel(s: string, t: any) {
  return ({ pending: t("pickupStatus.pending", "بانتظار سائق"), assigned: t("pickupStatus.assigned", "مُكلَّف"), picked_up: t("pickupStatus.picked_up", "تم الاستلام"), converted: t("pickupStatus.converted", "تحوَّل لطلب"), cancelled: t("pickupStatus.cancelled", "ملغي") } as Record<string,string>)[s] ?? s;
}

export function DriverNextAction({ pendingPickups, myPickups, deliveries, myLoc, t }: { pendingPickups: Pickup[]; myPickups: Pickup[]; deliveries: Delivery[]; myLoc: LatLng | null; t: any }) {
  const dueDelivery = deliveries.find((d) => d.status === "out_for_delivery" && d.payment_status !== "paid") || deliveries.find((d) => d.status === "out_for_delivery") || deliveries.find((d) => d.status === "ready");
  let title = t("driver.action.startPickup");
  let detail = t("driver.action.noTasks");
  let tone = "bg-blue-50 border-blue-200 text-blue-800";
  if (!myLoc) { title = t("driver.action.updateLocation"); detail = t("driver.action.updateLocationDetail"); tone = "bg-amber-50 border-amber-200 text-amber-800"; }
  else if (myPickups.length) { title = t("driver.action.assignedPickup"); detail = `${myPickups[0].customer_name} — go and confirm the pickup after receiving pieces.`; }
  else if (dueDelivery) { title = dueDelivery.payment_status === "paid" ? t("driver.action.readyDelivery") : t("driver.action.codDelivery"); detail = `Order #${dueDelivery.order_number} — ${dueDelivery.payment_status === "paid" ? "Handover with client code" : `Collect ${Number(dueDelivery.total ?? 0).toLocaleString("en-US")} ${t("common.egp")} on delivery`}`; tone = dueDelivery.payment_status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"; }
  else if (pendingPickups.length) { title = t("driver.action.unassignedPickups"); detail = `Closest: ${pendingPickups[0].customer_name}. If near, take order.`; }
  return <Card className={`border ${tone}`}><CardContent className="p-3 text-sm"><div className="font-black">{title}</div><div className="text-xs mt-1 opacity-80">{detail}</div></CardContent></Card>;
}

export function PickupsList({
  pending, assigned, acting, empId, onAssign, onConfirm, myLoc, t,
}: {
  pending: Pickup[]; assigned: Pickup[];
  acting: string | null; empId: string | null;
  onAssign: (p: Pickup) => void;
  onConfirm: (p: Pickup) => void;
  myLoc: LatLng | null;
  t: any;
}) {
  const all = [...assigned, ...pending];
  if (!all.length)
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          {t("cs.noOrdersInProgress")}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-3">
      {assigned.length > 0 && (
        <p className="text-xs font-bold text-primary uppercase tracking-wider">
          {t("pickupStatus.assigned")}
        </p>
      )}
      {assigned.map((p) => (
        <PickupCard
          key={p.id} p={p} acting={acting} isAssigned
          onAssign={onAssign} onConfirm={onConfirm} myLoc={myLoc} t={t}
        />
      ))}
      {pending.length > 0 && (
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-4">
          {t("pickupStatus.pending")}
        </p>
      )}
      {pending.map((p) => (
        <PickupCard
          key={p.id} p={p} acting={acting} isAssigned={false}
          onAssign={onAssign} onConfirm={onConfirm} myLoc={myLoc} t={t}
        />
      ))}
    </div>
  );
}

export function PickupCard({
  p, acting, isAssigned, onAssign, onConfirm, myLoc, t,
}: {
  p: Pickup; acting: string | null; isAssigned: boolean;
  onAssign: (p: Pickup) => void;
  onConfirm: (p: Pickup) => void;
  myLoc: LatLng | null;
  t: any;
}) {
  return (
    <Card className={isAssigned ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-base">{p.customer_name}</div>
            <div className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</div>
          </div>
          <Badge variant={isAssigned ? "default" : "secondary"}>
            {pickupStatusLabel(p.status, t)}
          </Badge>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <span>{p.address}</span>
        </div>
        <div className="text-xs text-muted-foreground">{t("driver.approxDistance", "المسافة التقريبية:")} {formatDistance(distanceKm(myLoc, p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : null))} · {t("driver.estPieces", "قطع تقديرية:")} {p.estimated_pieces ?? 1}</div>
        <div className="flex items-center gap-4">
          <a
            href={`tel:${p.phone}`}
            className="flex items-center gap-1 text-sm text-primary font-medium"
          >
            <Phone className="w-4 h-4" /> {p.phone}
          </a>
          {p.location_url && (
            <a
              href={p.location_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 font-medium"
            >
              <Navigation className="w-4 h-4" /> {t("common.map", "خريطة")}
            </a>
          )}
        </div>
        {p.notes && (
          <p className="text-xs text-muted-foreground bg-muted rounded p-2">{p.notes}</p>
        )}
        <div className="flex gap-2 pt-1">
          {!isAssigned && (
            <Button
              size="sm"
              variant="outline"
              disabled={acting === p.id}
              onClick={() => onAssign(p)}
              className="flex-1"
            >
              {acting === p.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                t("station.common.assign")
              )}
            </Button>
          )}
          {isAssigned && (
            <Button
              size="sm"
              disabled={acting === p.id}
              onClick={() => onConfirm(p)}
              className="flex-1"
            >
              {acting === p.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 ms-1" /> {t("driver.confirmPickup")}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DeliveriesList({
  list, acting, confirmCode, setConfirmCode, onStart, onConfirm, myLoc, deliveryIssues, t,
}: {
  list: Delivery[]; acting: string | null;
  confirmCode: Record<string, string>;
  setConfirmCode: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onStart: (d: Delivery) => void;
  onConfirm: (d: Delivery) => void;
  myLoc: LatLng | null;
  deliveryIssues: Record<string, { label: number; reclean: number; notQc: number; total: number }>;
  t: any;
}) {
  if (!list.length)
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          {t("cs.noOrdersInProgress")}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-3">
      {list.map((d) => (
        <Card
          key={d.id}
          className={d.is_urgent ? "border-amber-400 bg-amber-50/40" : ""}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-base flex items-center gap-2">
                  {t("order.orderNo", "Order #{order}").replace("{order}", String(d.order_number))}
                  {d.is_urgent && (
                    <Badge className="bg-amber-500 text-white">
                      <Zap className="w-3 h-3 ms-1" /> {t("station.common.urgent")}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {d.customers?.full_name}
                </div>
                <div className="text-xs text-muted-foreground">{t("orders.total")}: {Number(d.total ?? 0).toLocaleString("en-US")} {t("common.egp")} · {d.payment_status === "paid" ? t("order.paid") : t("driver.cod")}</div>
                {(() => { const i = deliveryIssues[d.id]; return i && (i.label || i.reclean || i.notQc) ? <div className="mt-2 flex flex-wrap gap-1"><Badge variant="destructive">{t("driver.dontLeave")}</Badge>{i.label > 0 && <Badge variant="destructive">{t("station.common.mark")} {i.label}</Badge>}{i.reclean > 0 && <Badge className="bg-amber-500">{t("station.common.reclean")} {i.reclean}</Badge>}{i.notQc > 0 && <Badge variant="outline">{t("driver.qcMissing")} {i.notQc}</Badge>}</div> : <div className="mt-2"><Badge className="bg-emerald-600">{t("driver.readyForDelivery")}</Badge></div>; })()}
              </div>
              <Badge variant={d.status === "out_for_delivery" ? "default" : "secondary"}>
                {d.status === "ready" ? t("stage.ready") : t("driver.outForDelivery")}
              </Badge>
            </div>

            {d.delivery_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{d.delivery_address}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">{t("driver.approxDistance")} {formatDistance(distanceKm(myLoc, d.delivery_lat && d.delivery_lng ? { lat: Number(d.delivery_lat), lng: Number(d.delivery_lng) } : null))}</div>

            {d.customers?.phone && (
              <a
                href={`tel:${d.customers.phone}`}
                className="flex items-center gap-1 text-sm text-primary font-medium"
              >
                <Phone className="w-4 h-4" /> {d.customers.phone}
              </a>
            )}

            <div className="flex gap-2 pt-1">
              {d.status === "ready" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting === d.id || !!(deliveryIssues[d.id]?.label || deliveryIssues[d.id]?.reclean || deliveryIssues[d.id]?.notQc)}
                  onClick={() => onStart(d)}
                  className="flex-1"
                >
                  {acting === d.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <ArrowLeft className="w-4 h-4 ms-1" /> {t("driver.outForDelivery")}
                    </>
                  )}
                </Button>
              )}

              {d.status === "out_for_delivery" && (
                <div className="flex gap-2 w-full">
                  <Input
                    placeholder={t("driver.confirmCodePlaceholder")}
                    value={confirmCode[d.id] ?? ""}
                    onChange={(e) =>
                      setConfirmCode((prev) => ({ ...prev, [d.id]: e.target.value }))
                    }
                    maxLength={4}
                    className="flex-1 text-center font-mono text-lg"
                  />
                  <Button
                    size="sm"
                    disabled={acting === d.id || (confirmCode[d.id] ?? "").length !== 4}
                    onClick={() => onConfirm(d)}
                  >
                    {acting === d.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 ms-1" /> {t("stage.ready")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {d.status === "out_for_delivery" && (
              <p className="text-xs text-muted-foreground text-center">
                {t("driver.confirmCodeHelp")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
