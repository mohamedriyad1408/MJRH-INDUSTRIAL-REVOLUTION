import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { distanceKm, formatDistance, type LatLng } from "@/lib/geo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, MapPin, Phone, Truck, CheckCircle2,
  PackageOpen, Zap, ArrowLeft, Navigation,
} from "lucide-react";

export const Route = createFileRoute("/_app/driver")({
  head: () => ({ meta: [{ title: "لوحة السائق" }] }),
  component: DriverPage,
});

/* ─── types ─── */
type Pickup = {
  id: string; customer_name: string; phone: string;
  address: string; location_url: string | null; lat?: number | null; lng?: number | null; estimated_pieces?: number | null;
  status: string; scheduled_at: string | null;
  created_at: string; notes: string | null;
};
type Delivery = {
  id: string; order_number: number; status: string;
  is_urgent: boolean; created_at: string;
  delivery_address: string | null; delivery_lat?: number | null; delivery_lng?: number | null; assigned_driver_employee_id?: string | null;
  customers?: { full_name: string; phone: string } | null;
  task_assignments?: { employee_id: string }[];
};

const PICKUP_STATUS_AR: Record<string, string> = {
  pending: "بانتظار سائق",
  assigned: "مُكلَّف",
  picked_up: "تم الاستلام",
  converted: "تحوَّل لطلب",
  cancelled: "ملغي",
};

/* ─── main component ─── */
function DriverPage() {
  const { user, hasRole } = useAuth();
  const allowed = hasRole("courier", "owner", "ops_manager");

  const [tab, setTab] = useState<"pickups" | "deliveries">("pickups");
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmCode, setConfirmCode] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [myLoc, setMyLoc] = useState<LatLng | null>(null);

  /* ── employee id for this user ── */
  const [empId, setEmpId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("employees")
      .select("id,current_lat,current_lng,profile_id,email")
      .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()
      .then(async ({ data }: any) => {
        setEmpId(data?.id ?? null);
        if (data?.id && !data.profile_id) await (supabase as any).from("employees").update({ profile_id: user.id }).eq("id", data.id);
        if ((data as any)?.current_lat && (data as any)?.current_lng) setMyLoc({ lat: Number((data as any).current_lat), lng: Number((data as any).current_lng) });
      });
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, dRes] = await Promise.all([
      supabase
        .from("pickup_requests")
        .select("*")
        .in("status", ["pending", "assigned"])
        .order("created_at"),
      (supabase as any)
        .from("orders")
        .select(
          "id, order_number, status, is_urgent, created_at, delivery_address, delivery_lat, delivery_lng, assigned_driver_employee_id, customers(full_name, phone), task_assignments(employee_id)"
        )
        .in("status", ["ready", "out_for_delivery"])
        .order("is_urgent", { ascending: false })
        .order("created_at"),
    ]);
    setPickups((pRes.data ?? []) as Pickup[]);
    setDeliveries((dRes.data ?? []) as Delivery[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateMyLocation() {
    if (!empId) return toast.error("لم يتم ربط حسابك بموظف");
    if (!navigator.geolocation) return toast.error("المتصفح لا يدعم GPS");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMyLoc(loc);
      await (supabase as any).from("employees").update({
        current_lat: loc.lat, current_lng: loc.lng,
        location_accuracy: pos.coords.accuracy,
        location_updated_at: new Date().toISOString(),
      }).eq("id", empId);
      await (supabase as any).from("driver_location_log").insert({
        employee_id: empId, lat: loc.lat, lng: loc.lng, accuracy: pos.coords.accuracy,
      });
      toast.success("تم تحديث موقعك");
    }, () => toast.error("تعذر تحديد الموقع"), { enableHighAccuracy: true, timeout: 15000 });
  }

  useEffect(() => {
    if (empId && !myLoc) {
      updateMyLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId]);

  /* ─── PICKUP: assign self ─── */
  async function assignSelf(p: Pickup) {
    if (!empId) return toast.error("لم يتم ربط حسابك بموظف — تواصل مع المدير");
    setActing(p.id);
    const { error } = await supabase
      .from("pickup_requests")
      .update({ driver_employee_id: empId, status: "assigned" })
      .eq("id", p.id);
    setActing(null);
    if (error) return toast.error(error.message);
    toast.success("تم الإسناد لك");
    load();
  }

  /* ─── PICKUP: confirm + auto-create order ─── */
  async function confirmPickup(p: Pickup) {
    setActing(p.id);
    // 1. upsert customer
    let customerId: string | null = null;
    const { data: ex } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", p.phone)
      .maybeSingle();
    if (ex) {
      customerId = ex.id;
    } else {
      const { data: ins, error: ce } = await supabase
        .from("customers")
        .insert({ full_name: p.customer_name, phone: p.phone, address: p.address })
        .select("id")
        .single();
      if (ce) { setActing(null); return toast.error(ce.message); }
      customerId = ins.id;
    }
    // 2. create order
    const { data: ord, error: oe } = await (supabase as any)
      .from("orders")
      .insert({
        customer_id: customerId,
        order_type: "delivery",
        status: "received",
        pickup_address: p.address, pickup_lat: (p as any).lat ?? null, pickup_lng: (p as any).lng ?? null,
        notes: p.notes,
        created_by: user?.id,
      })
      .select("id, order_number")
      .single();
    if (oe) { setActing(null); return toast.error(oe.message); }
    // 3. update pickup
    await supabase
      .from("pickup_requests")
      .update({
        status: "converted",
        picked_up_at: new Date().toISOString(),
        converted_order_id: ord.id,
        customer_id: customerId,
      })
      .eq("id", p.id);
    // 4. status history
    await supabase.from("order_status_history").insert({
      order_id: ord.id,
      from_status: null,
      to_status: "received",
      changed_by: user?.id,
      notes: `تحويل من طلب استلام #${p.id.slice(0, 6)}`,
    });
    setActing(null);
    toast.success(`✅ تم الاستلام! طلب #${ord.order_number} أُنشئ تلقائياً`);
    load();
  }

  /* ─── DELIVERY: start out_for_delivery ─── */
  async function startDelivery(d: Delivery) {
    setActing(d.id);
    const { error } = await (supabase as any)
      .from("orders")
      .update({ status: "out_for_delivery", assigned_driver_employee_id: empId ?? d.assigned_driver_employee_id ?? null })
      .eq("id", d.id);
    if (!error) {
      await supabase.from("order_status_history").insert({
        order_id: d.id, from_status: "ready",
        to_status: "out_for_delivery", changed_by: user?.id,
        notes: "السائق خرج للتسليم",
      });
    }
    setActing(null);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث — خرجت للتسليم");
    load();
  }

  /* ─── DELIVERY: confirm delivered with phone code ─── */
  async function confirmDelivery(d: Delivery) {
    const code = confirmCode[d.id] ?? "";
    const phone = d.customers?.phone ?? "";
    if (!phone) return toast.error("لا يوجد رقم هاتف للعميل");
    // validate: last 4 digits of phone
    const last4 = phone.replace(/\D/g, "").slice(-4);
    if (code.trim() !== last4) {
      return toast.error(`كود التأكيد خطأ — آخر 4 أرقام من هاتف العميل (${last4})`);
    }
    setActing(d.id);
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered", payment_status: "paid" })
      .eq("id", d.id);
    if (!error) {
      await supabase.from("order_status_history").insert({
        order_id: d.id, from_status: d.status as any,
        to_status: "delivered", changed_by: user?.id,
        notes: "تأكيد التسليم بكود العميل",
      });
    }
    setActing(null);
    if (error) return toast.error(error.message);
    toast.success("🎉 تم التسليم بنجاح!");
    setConfirmCode((prev) => { const n = { ...prev }; delete n[d.id]; return n; });
    load();
  }

  if (!allowed)
    return (
      <Card className="p-8 text-center text-muted-foreground">
        هذه الصفحة للسائقين فقط.
      </Card>
    );

  const myDeliveries = empId
    ? deliveries.filter((d) =>
        (!d.assigned_driver_employee_id && !d.task_assignments?.length) ||
        d.assigned_driver_employee_id === empId ||
        d.task_assignments?.some((a) => a.employee_id === empId)
      )
    : deliveries;

  const pendingPickups = pickups.filter((p) => p.status === "pending");
  const myPickups = pickups.filter((p) => p.status === "assigned");

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> لوحة السائق
          </h1>
          <p className="text-sm text-muted-foreground">
            استلامات بانتظارك: {pendingPickups.length + myPickups.length} •
            توصيلات: {myDeliveries.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={updateMyLocation}>موقعي</Button>
          <Button variant="outline" size="sm" onClick={load}>تحديث</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-muted p-1 rounded-xl">
        <button
          onClick={() => setTab("pickups")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
            tab === "pickups"
              ? "bg-white shadow text-primary"
              : "text-muted-foreground"
          }`}
        >
          <PackageOpen className="w-4 h-4 inline ms-1" />
          استلام ({pendingPickups.length + myPickups.length})
        </button>
        <button
          onClick={() => setTab("deliveries")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
            tab === "deliveries"
              ? "bg-white shadow text-primary"
              : "text-muted-foreground"
          }`}
        >
          <Truck className="w-4 h-4 inline ms-1" />
          توصيل ({myDeliveries.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : tab === "pickups" ? (
        <PickupsList
          pending={pendingPickups}
          assigned={myPickups}
          acting={acting}
          empId={empId}
          onAssign={assignSelf}
          onConfirm={confirmPickup}
          myLoc={myLoc}
        />
      ) : (
        <DeliveriesList
          list={myDeliveries}
          acting={acting}
          confirmCode={confirmCode}
          setConfirmCode={setConfirmCode}
          onStart={startDelivery}
          onConfirm={confirmDelivery}
          myLoc={myLoc}
        />
      )}
    </div>
  );
}

/* ─── Pickups sub-component ─── */
function PickupsList({
  pending, assigned, acting, empId, onAssign, onConfirm, myLoc,
}: {
  pending: Pickup[]; assigned: Pickup[];
  acting: string | null; empId: string | null;
  onAssign: (p: Pickup) => void;
  onConfirm: (p: Pickup) => void;
  myLoc: LatLng | null;
}) {
  const all = [...assigned, ...pending];
  if (!all.length)
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          لا توجد طلبات استلام الآن ✅
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-3">
      {assigned.length > 0 && (
        <p className="text-xs font-bold text-primary uppercase tracking-wider">
          مُكلَّف بها أنت
        </p>
      )}
      {assigned.map((p) => (
        <PickupCard
          key={p.id} p={p} acting={acting} isAssigned
          onAssign={onAssign} onConfirm={onConfirm} myLoc={myLoc}
        />
      ))}
      {pending.length > 0 && (
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-4">
          بانتظار سائق
        </p>
      )}
      {pending.map((p) => (
        <PickupCard
          key={p.id} p={p} acting={acting} isAssigned={false}
          onAssign={onAssign} onConfirm={onConfirm} myLoc={myLoc}
        />
      ))}
    </div>
  );
}

function PickupCard({
  p, acting, isAssigned, onAssign, onConfirm, myLoc,
}: {
  p: Pickup; acting: string | null; isAssigned: boolean;
  onAssign: (p: Pickup) => void;
  onConfirm: (p: Pickup) => void;
  myLoc: LatLng | null;
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
            {PICKUP_STATUS_AR[p.status]}
          </Badge>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <span>{p.address}</span>
        </div>
        <div className="text-xs text-muted-foreground">المسافة التقريبية: {formatDistance(distanceKm(myLoc, p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : null))} · قطع تقديرية: {p.estimated_pieces ?? 1}</div>
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
              <Navigation className="w-4 h-4" /> خريطة
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
                "خذ الطلب"
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
                  <CheckCircle2 className="w-4 h-4 ms-1" /> تأكيد الاستلام وإنشاء الطلب
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Deliveries sub-component ─── */
function DeliveriesList({
  list, acting, confirmCode, setConfirmCode, onStart, onConfirm, myLoc,
}: {
  list: Delivery[]; acting: string | null;
  confirmCode: Record<string, string>;
  setConfirmCode: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onStart: (d: Delivery) => void;
  onConfirm: (d: Delivery) => void;
  myLoc: LatLng | null;
}) {
  if (!list.length)
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          لا توجد طلبات توصيل الآن ✅
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
                  طلب #{d.order_number}
                  {d.is_urgent && (
                    <Badge className="bg-amber-500 text-white">
                      <Zap className="w-3 h-3 ms-1" /> عاجل
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {d.customers?.full_name}
                </div>
              </div>
              <Badge variant={d.status === "out_for_delivery" ? "default" : "secondary"}>
                {d.status === "ready" ? "جاهز للتسليم" : "خرج للتسليم"}
              </Badge>
            </div>

            {d.delivery_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{d.delivery_address}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">المسافة التقريبية: {formatDistance(distanceKm(myLoc, d.delivery_lat && d.delivery_lng ? { lat: Number(d.delivery_lat), lng: Number(d.delivery_lng) } : null))}</div>

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
                  disabled={acting === d.id}
                  onClick={() => onStart(d)}
                  className="flex-1"
                >
                  {acting === d.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <ArrowLeft className="w-4 h-4 ms-1" /> خرجت للتسليم
                    </>
                  )}
                </Button>
              )}

              {d.status === "out_for_delivery" && (
                <div className="flex gap-2 w-full">
                  <Input
                    placeholder="آخر 4 أرقام هاتف العميل"
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
                        <CheckCircle2 className="w-4 h-4 ms-1" /> تسليم
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {d.status === "out_for_delivery" && (
              <p className="text-xs text-muted-foreground text-center">
                أدخل آخر 4 أرقام من هاتف العميل لتأكيد التسليم
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
