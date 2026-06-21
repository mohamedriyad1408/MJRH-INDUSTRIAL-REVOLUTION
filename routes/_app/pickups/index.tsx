import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { autoAssignDrivers } from "@/lib/driver-assignment";
import { dueInfo } from "@/lib/geo";
import { Loader2, Plus, MapPin, Phone, Truck, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_app/pickups/")({
  head: () => ({ meta: [{ title: "طلبات الاستلام" }] }),
  component: PickupsPage,
});

type Pickup = {
  id: string; customer_name: string; phone: string; address: string;
  location_url: string | null; status: string;
  driver_employee_id: string | null;
  scheduled_at: string | null; created_at: string;
  notes: string | null; lat?: number | null; lng?: number | null; estimated_pieces?: number | null;
};
type Driver = { id: string; full_name: string };

const STATUS_AR: Record<string, string> = {
  pending: "بانتظار سائق", assigned: "مُكلَّف", picked_up: "تم الاستلام",
  converted: "محوَّل إلى طلب", cancelled: "ملغي",
};

function PickupsPage() {
  const { hasRole, user } = useAuth();
  const canManage = hasRole("cs_manager", "ops_manager", "owner");
  const [rows, setRows] = useState<Pickup[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [p, d] = await Promise.all([
      supabase.from("pickup_requests").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("employees").select("id, full_name").eq("is_active", true)
        .or("station.eq.delivery,station.eq.reception,job_role.eq.driver").order("full_name"),
    ]);
    setRows((p.data ?? []) as any);
    setDrivers((d.data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function autoAssign() {
    try {
      const r = await autoAssignDrivers();
      toast.success(r.assigned ? `تم توزيع ${r.assigned} مهمة` : "لا توجد مهام تحتاج توزيع");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر التوزيع"); }
  }

  async function assign(id: string, driverId: string) {
    const { error } = await supabase.from("pickup_requests")
      .update({ driver_employee_id: driverId, status: "assigned" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الإسناد"); load(); }
  }

  async function markPicked(p: Pickup) {
    // 1) Create order from this pickup
    let customerId: string | null = null;
    const ex = await supabase.from("customers").select("id").eq("phone", p.phone).maybeSingle();
    if (ex.data) customerId = ex.data.id;
    else {
      const ins = await supabase.from("customers").insert({
        full_name: p.customer_name, phone: p.phone, address: p.address,
      }).select("id").single();
      if (ins.error) return toast.error(ins.error.message);
      customerId = ins.data.id;
    }
    const o = await (supabase as any).from("orders").insert({
      customer_id: customerId, order_type: "delivery", status: "received",
      pickup_address: p.address, pickup_lat: (p as any).lat ?? null, pickup_lng: (p as any).lng ?? null, notes: p.notes, created_by: user?.id,
    }).select("id").single();
    if (o.error) return toast.error(o.error.message);
    await supabase.from("pickup_requests").update({
      status: "converted", picked_up_at: new Date().toISOString(),
      converted_order_id: o.data!.id, customer_id: customerId,
    }).eq("id", p.id);
    toast.success("تم تحويل طلب الاستلام إلى طلب");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">طلبات الاستلام</h1>
          <p className="text-sm text-muted-foreground">{rows.length} طلب</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={autoAssign}><Wand2 className="w-4 h-4 ms-1" /> توزيع تلقائي</Button>
            <Button asChild><Link to="/pickups/new"><Plus className="w-4 h-4 ms-1" /> طلب استلام جديد</Link></Button>
          </div>
        )}
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد طلبات استلام</CardContent></Card>}
          {rows.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold">{p.customer_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {p.phone}
                    </div>
                  </div>
                  <Badge variant={p.status === "pending" ? "destructive" : p.status === "converted" ? "default" : "secondary"}>
                    {STATUS_AR[p.status]}
                  </Badge>
                </div>
                <div className="text-sm flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-1 shrink-0" /> {p.address}
                </div>
                {p.location_url && (
                  <a href={p.location_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">رابط الموقع</a>
                )}
                {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                <div className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</div>
                {p.scheduled_at && <div className={dueInfo(p.scheduled_at).late ? "text-xs text-red-600 font-bold" : "text-xs text-muted-foreground"}>⏱ {dueInfo(p.scheduled_at).label}</div>}
                <div className="text-xs text-muted-foreground">قطع تقديرية: {p.estimated_pieces ?? 1} · {p.lat && p.lng ? "موقع دقيق ✅" : "موقع غير محدد ⚠"}</div>

                {canManage && p.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Select onValueChange={(v) => assign(p.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="إسناد لسائق" /></SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {canManage && p.status === "assigned" && (
                  <Button size="sm" onClick={() => markPicked(p)}><Truck className="w-3 h-3 ms-1" /> تأكيد الاستلام وتحويل إلى طلب</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
