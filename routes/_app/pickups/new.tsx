import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { parseLatLng } from "@/lib/geo";
import { autoAssignDrivers } from "@/lib/driver-assignment";
import { Loader2, ArrowRight, LocateFixed } from "lucide-react";

export const Route = createFileRoute("/_app/pickups/new")({
  head: () => ({ meta: [{ title: "طلب استلام جديد" }] }),
  component: NewPickup,
});

function NewPickup() {
  const { user, hasRole } = useAuth();
  const nav = useNavigate();
  const canCreate = hasRole("cs_manager", "ops_manager", "owner");
  const [f, setF] = useState({ name: "", phone: "", address: "", locationUrl: "", lat: "", lng: "", scheduledAt: "", notes: "", estimatedPieces: "1" });
  const [saving, setSaving] = useState(false);

  if (!canCreate) return <Card className="p-8 text-center text-muted-foreground">صلاحية خدمة العملاء/المدير فقط.</Card>;

  function autoMapsLink() {
    const coords = parseLatLng(f.locationUrl || f.address);
    if (coords) {
      setF({ ...f, lat: String(coords.lat), lng: String(coords.lng), locationUrl: f.locationUrl || `https://www.google.com/maps?q=${coords.lat},${coords.lng}` });
      toast.success("تم استخراج الإحداثيات من الرابط");
      return;
    }
    if (!f.address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.address)}`;
    setF({ ...f, locationUrl: url });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return toast.error("المتصفح لا يدعم تحديد الموقع");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(7);
        const lng = pos.coords.longitude.toFixed(7);
        setF((x) => ({ ...x, lat, lng, locationUrl: `https://www.google.com/maps?q=${lat},${lng}` }));
        toast.success("تم تحديد الموقع بدقة GPS");
      },
      () => toast.error("تعذر تحديد الموقع — تأكد من السماح للموقع"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit() {
    if (!f.name || !f.phone || !f.address) { toast.error("الاسم والهاتف والعنوان مطلوبون"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("pickup_requests").insert({
      customer_name: f.name, phone: f.phone, address: f.address,
      location_url: f.locationUrl || null,
      lat: f.lat ? Number(f.lat) : null, lng: f.lng ? Number(f.lng) : null,
      estimated_pieces: Math.max(1, Number(f.estimatedPieces || 1)),
      scheduled_at: f.scheduledAt || null,
      notes: f.notes || null, created_by: user?.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    try {
      const r = await autoAssignDrivers();
      toast.success(r.assigned ? `تم إنشاء الطلب وتوزيعه تلقائياً (${r.assigned})` : "تم إنشاء طلب الاستلام");
    } catch {
      toast.success("تم إنشاء طلب الاستلام");
    }
    nav({ to: "/pickups" });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/pickups"><ArrowRight className="w-4 h-4" /></Link></Button>
        <h1 className="text-2xl font-bold">طلب استلام جديد</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">بيانات العميل</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>الاسم *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>الهاتف *</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>العنوان *</Label><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>موقع العميل الدقيق</Label>
            <div className="flex gap-2">
              <Input placeholder="رابط Google Maps أو lat,lng" value={f.locationUrl} onChange={(e) => setF({ ...f, locationUrl: e.target.value })} />
              <Button type="button" variant="outline" onClick={autoMapsLink}>استخراج</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Latitude" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
              <Input placeholder="Longitude" value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
            </div>
            <Button type="button" variant="secondary" onClick={useCurrentLocation} className="w-full">
              <LocateFixed className="w-4 h-4 ms-1" /> استخدم GPS الحالي للعميل/المندوب
            </Button>
            <p className="text-xs text-muted-foreground">للدقة: افتح Google Maps عند باب العميل، Share Location، ثم الصق الرابط واضغط استخراج.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>موعد الاستلام</Label><Input type="datetime-local" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /></div>
            <div><Label>عدد قطع تقديري</Label><Input type="number" min={1} value={f.estimatedPieces} onChange={(e) => setF({ ...f, estimatedPieces: e.target.value })} /></div>
          </div>
          <div><Label>ملاحظات</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline"><Link to="/pickups">إلغاء</Link></Button>
        <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}</Button>
      </div>
    </div>
  );
}
