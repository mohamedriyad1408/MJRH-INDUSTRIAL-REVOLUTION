import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@/hooks/use-server-fn";
import { supabase } from "@/integrations/supabase/client";

import { adminApi } from "@/lib/admin-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseLatLng } from "@/lib/geo";
import { Plus, Loader2, Building2, LocateFixed } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/admin/tenants/")({
  head: () => ({ meta: [{ title: "إدارة المغاسل" }] }),
  component: TenantsPage,
});

type Tenant = { id: string; name: string; slug: string; business_type?: string | null; is_active: boolean; owner_user_id: string | null; created_at: string };

function TenantsPage() {
  const { t, dir } = useI18n();
  const { isSuperAdmin } = useAuth();
  const [list, setList] = useState<Tenant[]>([]);
  const [health, setHealth] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data }, { data: healthRows }] = await Promise.all([
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("tenant_bootstrap_health").select("*").then((r: any) => r).catch(() => ({ data: [] })),
    ]);
    setList((data ?? []) as Tenant[]);
    setHealth(Object.fromEntries(((healthRows ?? []) as any[]).map((h) => [h.tenant_id, h])));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (!isSuperAdmin) return <Card className="p-8 text-center">صلاحية مدير المنصة فقط.</Card>;

  async function toggle(t: Tenant) {
    const { error } = await supabase.from("tenants").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("تم"); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> المغاسل</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" /> مغسلة جديدة</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إنشاء مغسلة جديدة</DialogTitle></DialogHeader>
            <NewTenantForm onDone={() => { setOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.slug} · {businessTypeAr(t.business_type ?? "laundry", t)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={health[t.id]?.is_ready ? "default" : "destructive"}>{health[t.id]?.is_ready ? "جاهز" : "ناقص إعداد"}</Badge><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "مفعلة" : "موقوفة"}</Badge>
                <Button variant="outline" size="sm" onClick={() => toggle(t)}>{t.is_active ? "إيقاف" : "تفعيل"}</Button>
              </div>
            </Card>
          ))}
          {!list.length && <Card className="p-8 text-center text-muted-foreground col-span-2">لا توجد مغاسل بعد. ابدأ بإضافة واحدة.</Card>}
        </div>
      )}

      <Card className="p-4 text-xs text-muted-foreground">
        إدارة المستخدمين عبر <Link to="/admin/users" className="text-primary underline">صفحة المستخدمين</Link>.
      </Card>
    </div>
  );
}

function NewTenantForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(adminApi.createTenant);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessType, setBusinessType] = useState("laundry");
  const [locationUrl, setLocationUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("8");
  const [loading, setLoading] = useState(false);

  function extractLocation() {
    const parsed = parseLatLng(locationUrl);
    if (!parsed) return toast.error("الصق رابط Google Maps أو lat,lng");
    setLat(String(parsed.lat)); setLng(String(parsed.lng));
  }
  function useGps() {
    if (!navigator.geolocation) return toast.error("المتصفح لا يدعم GPS");
    navigator.geolocation.getCurrentPosition((p) => { setLat(p.coords.latitude.toFixed(7)); setLng(p.coords.longitude.toFixed(7)); setLocationUrl(`https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`); }, () => toast.error("تعذر تحديد الموقع"), { enableHighAccuracy: true, timeout: 15000 });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fn({ name, slug, businessType, logoUrl: logoUrl || null, publicUrl: publicUrl || null, ownerEmail: email, ownerPassword: password, ownerFullName: fullName, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, locationUrl: locationUrl || null, operatingRadiusKm: Number(radius || 8) });
      toast.success("تم إنشاء المغسلة والمالك");
      onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>اسم المغسلة / المشروع</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>نوع النشاط</Label><Select value={businessType} onValueChange={setBusinessType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="laundry">مغسلة / Laundry</SelectItem><SelectItem value="retail">تجاري / Retail</SelectItem><SelectItem value="manufacturing">صناعي / Manufacturing</SelectItem><SelectItem value="services">خدمات / Services</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground mt-1">النواة واحدة: فروع، خزن، مخزون، عمليات APDO. المغسلة تحصل أيضًا على كتالوج خدمات افتراضي.</p></div>
      <div>
        <Label>الكود (slug — حروف إنجليزية صغيرة وأرقام)</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required pattern="[a-z0-9\-]+" />
      </div>
      <div className="border rounded-lg p-3 space-y-2">
        <Label>هوية المشروع</Label>
        <Input placeholder="رابط لوجو المغسلة / المشروع" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        <Input placeholder="URL العام للمغسلة / المشروع مثل https://brand.com أو /mybrand" value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} />
        {logoUrl && <img src={logoUrl} alt="logo" className="h-14 w-14 rounded-2xl object-cover border" />}
      </div>
      <div className="border rounded-lg p-3 space-y-2">
        <Label>موقع المغسلة ونطاق التشغيل</Label>
        <Input placeholder="رابط Google Maps أو lat,lng" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
          <Input type="number" placeholder="نطاق كم" value={radius} onChange={(e) => setRadius(e.target.value)} />
        </div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={extractLocation}>استخراج</Button><Button type="button" variant="secondary" onClick={useGps}><LocateFixed className="w-4 h-4 ms-1" /> GPS</Button></div>
        <p className="text-xs text-muted-foreground">سيتم إظهار الكمبوندات والمناطق الواقعة داخل نطاق التشغيل فقط.</p>
      </div>
      <div className="border-t pt-3 space-y-3">
        <div className="text-sm font-medium">حساب المالك</div>
        <div><Label>الاسم الكامل</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
        <div><Label>البريد الإلكتروني</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label>كلمة المرور</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin ms-1" />} إنشاء
      </Button>
    </form>
  );
}

function businessTypeAr(s: string, t: any) { return ({ laundry: t("biz.laundry", "مغسلة"), retail: t("biz.retail", "تجاري"), manufacturing: t("biz.manufacturing", "صناعي"), services: t("biz.services", "خدمات"), generic: t("biz.generic", "عام") } as Record<string,string>)[s] ?? s; }
