import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, ArrowRight, Building2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/tenants/$id")({
  head: () => ({ meta: [{ title: "تفاصيل المغسلة" }] }),
  component: TenantDetailPage,
});

const FEATURES = [
  { key: "delivery", label: "خدمة التوصيل" },
  { key: "advance_requests", label: "طلبات السلف" },
  { key: "branches", label: "نقاط التشغيل المتعددة" },
  { key: "expenses", label: "الحسابات والمصروفات" },
  { key: "schedule", label: "جداول الحضور" },
];

type Tenant = { id: string; name: string; slug: string; brand_color: string | null; secondary_color: string | null; logo_url: string | null; subscription_fee: number; is_active: boolean; business_phone: string | null; business_address: string | null; tax_number: string | null };

function TenantDetailPage() {
  const { id } = useParams({ from: "/_admin/admin/tenants/$id" });
  const { isSuperAdmin } = useAuth();
  const [t, setT] = useState<Tenant | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("tenants").select("*").eq("id", id).single();
    setT(data as Tenant);
    const { data: f } = await supabase.from("tenant_features").select("feature_key, enabled").eq("tenant_id", id);
    const map: Record<string, boolean> = {};
    FEATURES.forEach((x) => { map[x.key] = true; });
    (f ?? []).forEach((r: any) => { map[r.feature_key] = r.enabled; });
    setFeatures(map);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function saveTenant() {
    if (!t) return;
    setSaving(true);
    const { error } = await supabase.from("tenants").update({
      name: t.name, brand_color: t.brand_color, secondary_color: t.secondary_color, logo_url: t.logo_url,
      subscription_fee: t.subscription_fee, is_active: t.is_active,
      business_phone: t.business_phone, business_address: t.business_address, tax_number: t.tax_number,
    }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
  }

  async function toggleFeature(key: string, enabled: boolean) {
    setFeatures({ ...features, [key]: enabled });
    await supabase.from("tenant_features").upsert({ tenant_id: id, feature_key: key, enabled }, { onConflict: "tenant_id,feature_key" });
  }

  if (!isSuperAdmin) return <Card className="p-8 text-center">صلاحية مدير المنصة فقط.</Card>;
  if (loading || !t) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to={"/admin/tenants" as any}><ArrowRight className="w-4 h-4" /></Link></Button>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> {t.name}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">البيانات والهوية البصرية</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>اسم المغسلة</Label><Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>اللون الأساسي</Label>
              <div className="flex gap-2">
                <Input type="color" value={t.brand_color ?? "#3b82f6"} onChange={(e) => setT({ ...t, brand_color: e.target.value })} className="w-16 h-10 p-1" />
                <Input value={t.brand_color ?? ""} onChange={(e) => setT({ ...t, brand_color: e.target.value })} placeholder="#3b82f6" />
              </div>
            </div>
            <div>
              <Label>اللون الثانوي</Label>
              <div className="flex gap-2">
                <Input type="color" value={t.secondary_color ?? "#22d3ee"} onChange={(e) => setT({ ...t, secondary_color: e.target.value })} className="w-16 h-10 p-1" />
                <Input value={t.secondary_color ?? ""} onChange={(e) => setT({ ...t, secondary_color: e.target.value })} placeholder="#22d3ee" />
              </div>
            </div>
            <div className="col-span-2"><Label>رابط الشعار</Label><Input value={t.logo_url ?? ""} onChange={(e) => setT({ ...t, logo_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>هاتف المغسلة</Label><Input value={t.business_phone ?? ""} onChange={(e) => setT({ ...t, business_phone: e.target.value })} /></div>
            <div><Label>الرقم الضريبي</Label><Input value={t.tax_number ?? ""} onChange={(e) => setT({ ...t, tax_number: e.target.value })} /></div>
            <div className="col-span-2"><Label>العنوان</Label><Input value={t.business_address ?? ""} onChange={(e) => setT({ ...t, business_address: e.target.value })} /></div>
          </div>
          <div><Label>رسوم الاشتراك الشهرية</Label><Input type="number" value={t.subscription_fee} onChange={(e) => setT({ ...t, subscription_fee: Number(e.target.value) })} /></div>
          <div className="flex items-center justify-between p-3 rounded border">
            <Label>المغسلة نشطة</Label>
            <Switch checked={t.is_active} onCheckedChange={(v) => setT({ ...t, is_active: v })} />
          </div>
          <Button onClick={saveTenant} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin ms-1" />}حفظ</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">المميزات المفعّلة</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {FEATURES.map((f) => (
            <div key={f.key} className="flex items-center justify-between p-3 rounded border">
              <Label>{f.label}</Label>
              <Switch checked={features[f.key] ?? true} onCheckedChange={(v) => toggleFeature(f.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
