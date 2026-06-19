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
import { Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/pickups/new")({
  head: () => ({ meta: [{ title: "طلب استلام جديد" }] }),
  component: NewPickup,
});

function NewPickup() {
  const { user, hasRole } = useAuth();
  const nav = useNavigate();
  const canCreate = hasRole("cs_manager", "ops_manager", "owner");
  const [f, setF] = useState({ name: "", phone: "", address: "", locationUrl: "", scheduledAt: "", notes: "" });
  const [saving, setSaving] = useState(false);

  if (!canCreate) return <Card className="p-8 text-center text-muted-foreground">صلاحية خدمة العملاء/المدير فقط.</Card>;

  function autoMapsLink() {
    if (!f.address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.address)}`;
    setF({ ...f, locationUrl: url });
  }

  async function submit() {
    if (!f.name || !f.phone || !f.address) { toast.error("الاسم والهاتف والعنوان مطلوبون"); return; }
    setSaving(true);
    const { error } = await supabase.from("pickup_requests").insert({
      customer_name: f.name, phone: f.phone, address: f.address,
      location_url: f.locationUrl || null,
      scheduled_at: f.scheduledAt || null,
      notes: f.notes || null, created_by: user?.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء طلب الاستلام"); nav({ to: "/pickups" });
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
          <div className="flex gap-2">
            <Input placeholder="رابط الموقع (Google Maps)" value={f.locationUrl} onChange={(e) => setF({ ...f, locationUrl: e.target.value })} />
            <Button type="button" variant="outline" onClick={autoMapsLink}>توليد من العنوان</Button>
          </div>
          <div><Label>موعد الاستلام (اختياري)</Label><Input type="datetime-local" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /></div>
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
