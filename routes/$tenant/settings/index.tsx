import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Building2, Palette, Workflow, Shield, Store, Settings2, Layers, Package, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { CURRENCIES, type CurrencyCode } from "@/lib/format";

export const Route = createFileRoute("/$tenant/settings/")({
  head: () => ({ meta: [{ title: "الإعدادات — مركز التحكم المؤسسي" }] }),
  component: SettingsPage,
});

type AppSettings = { business_name: string; currency: string; urgent_service_fee: number; default_delivery_fee: number; tax_percent: number };
type Tenant = { id: string; name: string; slug: string; business_type: string; workflow_engine_version: string; enterprise_id: string | null; logo_url: string | null; industry_profile?: any; custom_config?: any; branding_config?: any };

function SettingsPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const canEdit = hasRole("owner");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({ logo_url: "", primary_color: "#0d9488", hide_mjrh_branding: false });
  const [customConfig, setCustomConfig] = useState("{}");
  const [workflowVersion, setWorkflowVersion] = useState("v1");

  async function load() {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: sData }, { data: tData }] = await Promise.all([
      supabase.from("app_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenants").select("id,name,slug,business_type,workflow_engine_version,enterprise_id,logo_url,industry_profile,custom_config,branding_config").eq("id", tenantId).maybeSingle(),
    ]);

    if (sData) setSettings(sData as AppSettings);
    else {
      const def: AppSettings = { business_name: "مغسلة", currency: "EGP", urgent_service_fee: 0, default_delivery_fee: 0, tax_percent: 0 };
      await supabase.from("app_settings").insert({ tenant_id: tenantId, ...def });
      setSettings(def);
    }

    if (tData) {
      setTenant(tData as Tenant);
      setWorkflowVersion(tData.workflow_engine_version || "v1");
      if (tData.branding_config) {
        setBranding({
          logo_url: tData.branding_config.logo_url || tData.logo_url || "",
          primary_color: tData.branding_config.primary_color || "#0d9488",
          hide_mjrh_branding: !!tData.branding_config.hide_mjrh_branding,
        });
      } else {
        setBranding({ logo_url: tData.logo_url || "", primary_color: "#0d9488", hide_mjrh_branding: false });
      }
      setCustomConfig(JSON.stringify(tData.custom_config || {}, null, 2));
    }

    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  async function save() {
    if (!settings || !tenantId || !tenant) return;
    setSaving(true);
    try {
      const { error: sErr } = await supabase.from("app_settings").update(settings).eq("tenant_id", tenantId);
      if (sErr) throw sErr;

      let parsedCustom: any = {};
      try { parsedCustom = JSON.parse(customConfig); } catch { throw new Error("Custom Config JSON غير صالح"); }

      const { error: tErr } = await supabase.from("tenants").update({
        name: settings.business_name,
        business_type: tenant.business_type,
        workflow_engine_version: workflowVersion,
        logo_url: branding.logo_url || null,
        custom_config: parsedCustom,
        branding_config: branding,
      }).eq("id", tenantId);
      if (tErr) throw tErr;

      toast.success(t("settings.toastSaved", "تم الحفظ — الإعدادات المؤسسية"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!settings || !tenant) return <Card className="p-8 text-center text-muted-foreground">{t("settings.cannotLoad", "لا يمكن تحميل الإعدادات.")}</Card>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir={dir}>
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black flex items-center gap-2"><Settings2 className="w-6 h-6" /> {t("settings.pageTitle", "إعدادات المغسلة")} — مركز التحكم المؤسسي</h1>
        <p className="text-sm text-muted-foreground mt-1">هنا تقدر تضيف كل شيء: العملة، الرسوم، الهوية البصرية White-label، محرك سير العمل v1/v2، وإعدادات مخصصة JSON — كلها بدون كود</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> {t("settings.infoTitle", "معلومات المشروع")}</CardTitle><CardDescription className="text-xs">الاسم، النوع، والهوية</CardDescription></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div><Label>{t("settings.bizName", "اسم المشروع")}</Label><Input value={settings.business_name} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} className="mt-1" /></div>
              <div><Label>Slug (رابط المشروع)</Label><Input value={tenant.slug} disabled className="mt-1 font-mono text-xs" /></div>
              <div>
                <Label>نوع النشاط</Label>
                <Select value={tenant.business_type} disabled={!canEdit} onValueChange={(v) => setTenant({ ...tenant, business_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laundry">مغسلة ملابس 🧺</SelectItem>
                    <SelectItem value="carpet">سجاد 🧹</SelectItem>
                    <SelectItem value="repair">ورشة 🔧</SelectItem>
                    <SelectItem value="carwash">غسيل سيارات 🚗</SelectItem>
                    <SelectItem value="cleaning">تنظيف 🏠</SelectItem>
                    <SelectItem value="restaurant">مطعم 🍽️</SelectItem>
                    <SelectItem value="other">أخرى 📦</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>محرك سير العمل — Feature Flag (مهم)</Label>
                <Select value={workflowVersion} disabled={!canEdit} onValueChange={setWorkflowVersion}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="v1">v1 Legacy — مغسلة هاردكود (آمن للإنتاج الحالي)</SelectItem>
                    <SelectItem value="v2">v2 Generic — محرك مؤسسي عام DB-driven</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-[11px] text-muted-foreground mt-1">v1 = GARMENT_PROFILES + if ironing، v2 = workflow_definitions/stages_v2/transitions + work_orders + snapshot</div>
              </div>
              <div className="md:col-span-2">
                <Label>{t("settings.currencyLabel", "العملة")}</Label>
                {canEdit ? (
                  <Select value={settings.currency} onValueChange={(v) => setSettings({ ...settings, currency: v as CurrencyCode })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(CURRENCIES).map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} {c.labelAr} ({c.code}) — {c.labelEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : <Input value={settings.currency} disabled className="mt-1" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> هوية بصرية White-label (للفنادق)</CardTitle><CardDescription className="text-xs">بوابة الضيف تقرأ منه — يخفي شعار MJRH لو فعلت</CardDescription></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div><Label>Logo URL</Label><Input value={branding.logo_url} disabled={!canEdit} onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })} placeholder="https://..." className="mt-1" /></div>
              <div><Label>Primary Color</Label><Input type="color" value={branding.primary_color} disabled={!canEdit} onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })} className="mt-1 h-9" /></div>
              <div className="md:col-span-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={branding.hide_mjrh_branding} disabled={!canEdit} onChange={(e) => setBranding({ ...branding, hide_mjrh_branding: e.target.checked })} /> إخفاء شعار MJRH في بوابة الضيف (White-label للفندق)</label></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("settings.feesTitle", "الرسوم")}</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div><Label>{t("settings.urgentFee", "رسوم الاستعجال")}</Label><Input type="number" value={settings.urgent_service_fee} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, urgent_service_fee: Number(e.target.value) })} className="mt-1" /></div>
              <div><Label>{t("settings.deliveryFee", "مصاريف التوصيل الافتراضية")}</Label><Input type="number" value={settings.default_delivery_fee} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, default_delivery_fee: Number(e.target.value) })} className="mt-1" /></div>
              <div><Label>{t("settings.taxPercent", "ضريبة %")}</Label><Input type="number" value={settings.tax_percent} disabled={!canEdit} onChange={(e) => setSettings({ ...settings, tax_percent: Number(e.target.value) })} className="mt-1" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Custom Config JSON — إعدادات مخصصة بدون كود</CardTitle><CardDescription className="text-xs">أي إعداد خاص بالمشروع (مثلاً room_types, minibar_items) — يُقرأ في work_orders.custom_fields</CardDescription></CardHeader>
            <CardContent>
              <Textarea value={customConfig} disabled={!canEdit} onChange={(e) => setCustomConfig(e.target.value)} rows={8} className="font-mono text-xs" placeholder='{"room_types": ["single","double","suite"]}' />
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ms-1" /> {t("settings.save", "حفظ كل الإعدادات المؤسسية")}</>}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">روابط سريعة — إضافة شيء جديد</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" size="sm" className="justify-start"><Link to="/$tenant/settings/workflow" params={{ tenant: tenant.slug } as any}><Workflow className="w-4 h-4 me-2" /> مراحل العمل (Workflow Builder)</Link></Button>
              <Button asChild variant="outline" size="sm" className="justify-start"><Link to="/$tenant/settings/workflow/$stageId/fields" params={{ tenant: tenant.slug, stageId: "new" } as any}><Layers className="w-4 h-4 me-2" /> حقول مخصصة لكل مرحلة (Input Builder)</Link></Button>
              <Button asChild variant="outline" size="sm" className="justify-start"><Link to="/$tenant/marketplace" params={{ tenant: tenant.slug } as any}><Store className="w-4 h-4 me-2" /> سوق القوالب</Link></Button>
              <Button asChild variant="outline" size="sm" className="justify-start"><Link to="/$tenant/settings/roles" params={{ tenant: tenant.slug } as any}><Shield className="w-4 h-4 me-2" /> الأدوار والصلاحيات</Link></Button>
              <Button asChild variant="outline" size="sm" className="justify-start"><Link to="/$tenant/subscriptions" params={{ tenant: tenant.slug } as any}><Package className="w-4 h-4 me-2" /> اشتراكات العملاء</Link></Button>
              <Button asChild variant="outline" size="sm" className="justify-start"><Link to="/$tenant/staff/fairness" params={{ tenant: tenant.slug } as any}><Sparkles className="w-4 h-4 me-2" /> التوازن التشغيلي (WLI)</Link></Button>
              <Button asChild variant="outline" size="sm" className="justify-start"><Link to="/$tenant/onboarding" params={{ tenant: tenant.slug } as any}><Settings2 className="w-4 h-4 me-2" /> معالج التفعيل 5 خطوات</Link></Button>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3 text-xs leading-5">
              <b>ليه الصفحة دي كانت فاضية قبل كده؟</b><br />
              لأن `settings.tsx` كان ملف واحد بدون Outlet — أي صفحة فرعية مثل `/settings/workflow` كانت ترجع لنفس صفحة الإعدادات البسيطة. تم إصلاحه بـ Layout مع Outlet و `settings/index.tsx` للمعلومات العامة + `settings/workflow/index.tsx` لمراحل العمل.<br /><br />
              الآن كل صفحة في القائمة الجانبية تفتح محتواها الحقيقي، والإعدادات نفسها بقت مركز تحكم مؤسسي (Branding, Workflow Engine v1/v2, Custom Config) — تقدر تضيف أي شيء بدون كود.
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-xs">
              <div>Enterprise ID: <span className="font-mono">{tenant.enterprise_id || "— لا يوجد (مشروع مستقل)"}</span></div>
              <div className="mt-1">Workflow Engine: <Badge variant={workflowVersion === "v2" ? "default" : "outline"}>{workflowVersion}</Badge> {workflowVersion === "v2" ? "— محرك عام DB-driven" : "— مغسلة legacy"}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
