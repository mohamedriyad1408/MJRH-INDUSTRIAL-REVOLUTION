import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Clock, CreditCard, MapPinOff, Truck, RotateCcw, AlertTriangle, RefreshCw } from "lucide-react";
import { dueInfo } from "@/lib/geo";

type AlertTone = "red" | "amber" | "blue";
type Alert = { id: string; tone: AlertTone; title: string; detail: string; icon: React.ReactNode; href?: string };

const toneClass: Record<AlertTone, string> = {
  red: "border-red-200 bg-red-50 text-red-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
};

export function NotificationCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const now = new Date().toISOString();
    const next: Alert[] = [];

    const [lateRes, unpaidRes, unassignedDeliveryRes, noLocationOrdersRes, recleanRes, pickupNoLocationRes] = await Promise.all([
      supabase.from("orders").select("id,order_number,promised_delivery_at,status").not("status", "in", '("delivered","cancelled")').lt("promised_delivery_at", now).limit(5),
      supabase.from("orders").select("id,order_number,total,payment_status,status").eq("payment_status", "unpaid").not("status", "eq", "cancelled").limit(5),
      (supabase as any).from("orders").select("id,order_number,status").eq("status", "ready").is("assigned_driver_employee_id", null).limit(5),
      (supabase as any).from("orders").select("id,order_number,order_type,delivery_address,delivery_lat,delivery_lng,status").eq("order_type", "delivery").in("status", ["received", "cleaning", "ironing", "packing", "ready"]).is("delivery_lat", null).limit(5),
      (supabase as any).from("service_units").select("id,label_code,name,order_id,orders(order_number)").eq("needs_reclean", true).limit(5),
      (supabase as any).from("pickup_requests").select("id,customer_name,status,scheduled_at,lat,lng").in("status", ["pending", "assigned"]).is("lat", null).limit(5),
    ]);

    (lateRes.data ?? []).forEach((o: any) => {
      const d = dueInfo(o.promised_delivery_at);
      next.push({ id: `late-${o.id}`, tone: "red", title: `طلب #${o.order_number} متأخر`, detail: d.label, icon: <Clock className="w-4 h-4" />, href: `/orders/${o.id}` });
    });

    (unpaidRes.data ?? []).forEach((o: any) => {
      next.push({ id: `unpaid-${o.id}`, tone: "amber", title: `طلب #${o.order_number} غير مدفوع`, detail: `${Number(o.total ?? 0).toLocaleString()} ج`, icon: <CreditCard className="w-4 h-4" />, href: `/orders/${o.id}` });
    });

    (unassignedDeliveryRes.data ?? []).forEach((o: any) => {
      next.push({ id: `unassigned-${o.id}`, tone: "blue", title: `طلب #${o.order_number} جاهز بلا مندوب`, detail: "اضغط توزيع المناديب من الخريطة", icon: <Truck className="w-4 h-4" />, href: "/live-map" });
    });

    (noLocationOrdersRes.data ?? []).forEach((o: any) => {
      next.push({ id: `noloc-order-${o.id}`, tone: "amber", title: `طلب #${o.order_number} بلا موقع`, detail: "لن يظهر بدقة على الخريطة", icon: <MapPinOff className="w-4 h-4" />, href: `/orders/${o.id}` });
    });

    (pickupNoLocationRes.data ?? []).forEach((p: any) => {
      next.push({ id: `noloc-pickup-${p.id}`, tone: "amber", title: `طلب استلام بلا موقع`, detail: p.customer_name, icon: <MapPinOff className="w-4 h-4" />, href: "/orders/new" });
    });

    (recleanRes.data ?? []).forEach((u: any) => {
      next.push({ id: `reclean-${u.id}`, tone: "red", title: `${u.label_code} مرتجع تنظيف`, detail: `طلب #${u.orders?.order_number ?? "?"} — ${u.name}`, icon: <RotateCcw className="w-4 h-4" />, href: u.order_id ? `/orders/${u.order_id}` : undefined });
    });

    setAlerts(next.slice(0, 20));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const count = alerts.length;
  const urgent = useMemo(() => alerts.filter((a) => a.tone === "red").length, [alerts]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-9 w-9 shrink-0">
          <Bell className="w-4 h-4" />
          {count > 0 && <span className={`absolute -top-1 -left-1 h-5 min-w-5 rounded-full text-[10px] flex items-center justify-center px-1 text-white ${urgent ? "bg-red-600" : "bg-amber-500"}`}>{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" dir="rtl">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-black flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> دائرة الإشعارات</div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}><RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2 space-y-2">
          {!alerts.length && <div className="p-6 text-center text-sm text-muted-foreground">لا توجد تنبيهات حالياً ✅</div>}
          {alerts.map((a) => {
            const body = <div className={`rounded-xl border p-2.5 text-xs ${toneClass[a.tone]}`}>
              <div className="flex items-center gap-2 font-bold">{a.icon}<span>{a.title}</span></div>
              <div className="mt-1 opacity-80 pe-6">{a.detail}</div>
            </div>;
            return a.href ? <Link key={a.id} to={a.href as any}>{body}</Link> : <div key={a.id}>{body}</div>;
          })}
        </div>
        {count > 0 && <div className="p-2 border-t text-xs text-muted-foreground flex justify-between"><span>أحمر: خطر</span><Badge variant="secondary">{count} تنبيه</Badge></div>}
      </PopoverContent>
    </Popover>
  );
}
