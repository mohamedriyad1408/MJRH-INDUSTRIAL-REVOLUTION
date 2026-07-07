import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { distanceKm, formatDistance, type LatLng } from "@/lib/geo";
import { validateOrderMove } from "@/lib/station-workflow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  Loader2, MapPin, Phone, Truck, CheckCircle2,
  PackageOpen, Zap, ArrowLeft, Navigation,
} from "lucide-react";

export const Route = createFileRoute("/$tenant/driver")({
  head: () => ({ meta: [{ title: "لوحة السائق" }] }),
  component: DriverPage,
});

import { DriverNextAction, PickupsList, DeliveriesList, type Pickup, type Delivery } from "@/components/driver-components";

/* main component */
function DriverPage() {
  const { user, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const allowed = hasRole("courier", "owner", "ops_manager");

  const [tab, setTab] = useState<"pickups" | "deliveries">("pickups");
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryIssues, setDeliveryIssues] = useState<Record<string, { label: number; reclean: number; notQc: number; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [confirmCode, setConfirmCode] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [myLoc, setMyLoc] = useState<LatLng | null>(null);

  /* employee id for this user */
  const [empId, setEmpId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("employees")
      .select("id,current_lat,current_lng,profile_id,email")
      .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()
      .then(async ({ data }: any) => {
        setEmpId(data?.id ?? null);
        if (data?.id && !data.profile_id) await supabase.from("employees").update({ profile_id: user.id }).eq("id", data.id);
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
      supabase
        .from("orders")
        .select(
          "id, order_number, status, branch_id, is_urgent, created_at, total, payment_status, payment_method, delivery_address, delivery_lat, delivery_lng, assigned_driver_employee_id, customers(full_name, phone), task_assignments(employee_id)"
        )
        .in("status", ["ready", "out_for_delivery"])
        .order("is_urgent", { ascending: false })
        .order("created_at"),
    ]);
    setPickups((pRes.data ?? []) as Pickup[]);
    const deliveryRows = (dRes.data ?? []) as Delivery[];
    setDeliveries(deliveryRows);
    const ids = deliveryRows.map((d) => d.id);
    if (ids.length) {
      const { data: units } = await supabase.from("service_units").select("id,order_id,label_status,needs_reclean,current_stage,status").in("order_id", ids);
      const issueMap: Record<string, { label: number; reclean: number; notQc: number; total: number }> = {};
      ids.forEach((id) => { issueMap[id] = { label: 0, reclean: 0, notQc: 0, total: 0 }; });
      (units ?? []).forEach((u: any) => {
        if (u.status === "cancelled" || u.current_stage === "cancelled") return;
        const m = issueMap[u.order_id] ?? (issueMap[u.order_id] = { label: 0, reclean: 0, notQc: 0, total: 0 });
        m.total += 1;
        if (u.label_status && u.label_status !== "labeled") m.label += 1;
        if (u.needs_reclean) m.reclean += 1;
        if (!["qc_passed", "ready"].includes(String(u.current_stage))) m.notQc += 1;
      });
      setDeliveryIssues(issueMap);
    } else setDeliveryIssues({});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateMyLocation() {
    if (!empId) return toast.error("لم يتم ربط حسابك بموظف");
    if (!navigator.geolocation) return toast.error("المتصفح لا يدعم GPS");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMyLoc(loc);
      await supabase.from("employees").update({
        current_lat: loc.lat, current_lng: loc.lng,
        location_accuracy: pos.coords.accuracy,
        location_updated_at: new Date().toISOString(),
      }).eq("id", empId);
      await supabase.from("driver_location_log").insert({
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

  /* PICKUP: assign self */
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

  /* PICKUP: confirm + auto-create order */
  async function confirmPickup(p: Pickup) {
    setActing(p.id);

    // لو طلب العميل اتعمل من بوابة العميل، طلب الاستلام يكون مربوط بطلب جاهز ولا ننشئ طلب مكرر.
    if (p.converted_order_id) {
      const { data: ord, error: oe } = await supabase
        .from("orders")
        .update({ status: "received", assigned_driver_employee_id: empId ?? null })
        .eq("id", p.converted_order_id)
        .select("id, order_number")
        .single();
      if (oe) { setActing(null); return toast.error(oe.message); }
      await supabase.from("pickup_requests").update({ status: "converted", picked_up_at: new Date().toISOString() }).eq("id", p.id);
      await supabase.from("order_status_history").insert({ order_id: ord.id, from_status: "received", to_status: "received", changed_by: user?.id, notes: `تم استلام الطلب من العميل بواسطة المندوب` });
      setActing(null);
      toast.success(`تم استلام طلب #${ord.order_number} من العميل`);
      load();
      return;
    }

    // طلب استلام يدوي بدون طلب سابق: ننشئ طلب جديد.
    let customerId: string | null = null;
    const { data: ex } = await supabase.from("customers").select("id").eq("phone", p.phone).maybeSingle();
    if (ex) customerId = ex.id;
    else {
      const { data: ins, error: ce } = await supabase.from("customers").insert({ full_name: p.customer_name, phone: p.phone, address: p.address }).select("id").single();
      if (ce) { setActing(null); return toast.error(ce.message); }
      customerId = ins.id;
    }
    const { data: ord, error: oe } = await supabase.from("orders").insert({ customer_id: customerId, branch_id: (p as any).branch_id ?? null, order_type: "delivery", status: "received", pickup_address: p.address, pickup_lat: (p as any).lat ?? null, pickup_lng: (p as any).lng ?? null, notes: p.notes, created_by: user?.id, assigned_driver_employee_id: empId ?? null }).select("id, order_number").single();
    if (oe) { setActing(null); return toast.error(oe.message); }
    await supabase.from("pickup_requests").update({ status: "converted", picked_up_at: new Date().toISOString(), converted_order_id: ord.id, customer_id: customerId }).eq("id", p.id);
    await supabase.from("order_status_history").insert({ order_id: ord.id, from_status: null, to_status: "received", changed_by: user?.id, notes: `تحويل من طلب استلام #${p.id.slice(0, 6)}` });
    setActing(null);
    toast.success(`تم الاستلام! طلب #${ord.order_number} أُنشئ تلقائياً`);
    load();
  }

  /* DELIVERY: start out_for_delivery */
  async function startDelivery(d: Delivery) {
    if (!empId) return toast.error("لم يتم ربط حسابك بموظف");
    const issue = deliveryIssues[d.id];
    if (issue && (issue.label || issue.reclean || issue.notQc)) {
      return toast.error(`لا يمكن الخروج للتسليم: مارك ${issue.label} / مرتجع ${issue.reclean} / غير معتمد QC ${issue.notQc}`);
    }
    setActing(d.id);
    const { error } = await supabase
      .from("orders")
      .update({ status: "out_for_delivery", assigned_driver_employee_id: empId ?? d.assigned_driver_employee_id ?? null })
      .eq("id", d.id);
    if (!error) {
      await supabase.from("order_status_history").insert({
        order_id: d.id, from_status: "ready",
        to_status: "out_for_delivery", changed_by: user?.id,
        notes: "السائق خرج للتسليم",
      });
      await supabase.rpc("record_operation_event", { _process_key: "delivery_started", _process_name: "خروج المندوب للتسليم", _source_type: "order", _source_id: d.id, _branch_id: d.branch_id ?? null, _cash_account_id: null, _report_bucket: "delivery/reports", _requires_notification: false, _data: { order_number: d.order_number, driver_employee_id: empId, total: Number(d.total ?? 0) }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null);
    }
    setActing(null);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث — خرجت للتسليم");
    load();
  }

  /* DELIVERY: confirm delivered with phone code */
  async function confirmDelivery(d: Delivery) {
    const code = confirmCode[d.id] ?? "";
    const phone = d.customers?.phone ?? "";
    if (!phone) return toast.error("لا يوجد رقم هاتف للعميل");
    // validate: last 4 digits of phone
    const last4 = phone.replace(/\D/g, "").slice(-4);
    if (code.trim() !== last4) {
      return toast.error(`كود التأكيد خطأ — آخر 4 أرقام من هاتف العميل (${last4})`);
    }
    let collected: number | null = null;
    if (d.payment_status !== "paid") {
      const val = prompt(`المطلوب من العميل ${Number(d.total ?? 0).toLocaleString("en-US")} جنيه. اكتب المبلغ المحصل من العميل`);
      if (val === null) return;
      collected = Number(val || 0);
      if (!collected || collected < Number(d.total ?? 0)) return toast.error("المبلغ المحصل أقل من المطلوب");
    }
    setActing(d.id);
    const { data: res, error } = await supabase.rpc("confirm_delivery_with_collection", { _order_id: d.id, _collected_amount: collected, _driver_employee_id: empId });
    if (!error) {
      await supabase.from("order_status_history").insert({
        order_id: d.id, from_status: d.status as any,
        to_status: "delivered", changed_by: user?.id,
        notes: collected ? `تأكيد التسليم وتحصيل ${collected} جنيه` : "تأكيد التسليم بكود العميل",
      });
    }
    setActing(null);
    if (error) return toast.error(error.message);
    await supabase.rpc("record_operation_event", { _process_key: "delivery_confirmed", _process_name: collected ? "تأكيد تسليم مع تحصيل" : "تأكيد تسليم", _source_type: "order", _source_id: d.id, _branch_id: (d as any).branch_id ?? null, _cash_account_id: null, _report_bucket: "delivery/reports", _requires_notification: false, _data: { order_number: d.order_number, driver_employee_id: empId, collected_amount: collected, total: Number(d.total ?? 0) }, _output: { cash_impact: !!collected, journal_required: !!collected, appears_in_report: true, overpayment: Number(res?.overpayment ?? 0) } }).then(() => null);
    const extra = Number(res?.overpayment ?? 0);
    toast.success(extra > 0 ? `تم التسليم وتسجيل ${extra} جنيه بقشيش للمندوب` : "تم التسليم بنجاح!");
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
    <div className="space-y-4 max-w-2xl" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> {t("nav./driver")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("stage.received")} : {pendingPickups.length + myPickups.length} ·
            {t("stage.delivery")} : {myDeliveries.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={updateMyLocation}>GPS</Button>
          <Button variant="outline" size="sm" onClick={load}>{t("common.refresh")}</Button>
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
          {t("stage.received")} ({pendingPickups.length + myPickups.length})
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
          {t("stage.delivery")} ({myDeliveries.length})
        </button>
      </div>

      {!loading && <DriverNextAction pendingPickups={pendingPickups} myPickups={myPickups} deliveries={myDeliveries} myLoc={myLoc} t={t} />}

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
          t={t}
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
          deliveryIssues={deliveryIssues}
          t={t}
        />
      )}
    </div>
  );
}


