import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "الإعدادات" }] }),
  component: SettingsPage,
});

type S = { business_name: string; currency: string; urgent_service_fee: number; default_delivery_fee: number; tax_percent: number };

function SettingsPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const canEdit = hasRole("owner");
  const [s, setS] = useState<S | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (data) {
      setS(data as S);
    } else {
      // إنشاء صف افتراضي لهذه المغسلة
      const def: S = { business_name: "مغسلة", currency: "EGP", urgent_service_fee: 0, default_delivery_fee: 0, tax_percent: 0 };
      await supabase.from("app_settings").insert({ tenant_id: tenantId, ...def });
      setS(def);
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  async function save() {
    if (!s || !tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("app_settings").update(s).eq("tenant_id", tenantId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("settings.toastSaved", "تم الحفظ"));
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!s) return <Card className="p-8 text-center text-muted-foreground">{t("settings.cannotLoad", "لا يمكن تحميل الإعدادات.")}</Card>;

  return (
    <div className="space-y-4 max-w-2xl" dir={dir}>
      <h1 className="text-2xl font-bold">{t("settings.pageTitle", "إعدادات المغسلة")}</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">{t("settings.infoTitle", "معلومات المغسلة")}</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><Label>{t("settings.bizName", "اسم المغسلة")}</Label><Input value={s.business_name} disabled={!canEdit} onChange={(e) => setS({ ...s, business_name: e.target.value })} /></div>
          <div><Label>{t("settings.currencyLabel", "العملة")}</Label><Input value={s.currency} disabled={!canEdit} onChange={(e) => setS({ ...s, currency: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("settings.feesTitle", "الرسوم")}</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div><Label>{t("settings.urgentFee", "رسوم الاستعجال")}</Label><Input type="number" value={s.urgent_service_fee} disabled={!canEdit} onChange={(e) => setS({ ...s, urgent_service_fee: Number(e.target.value) })} /></div>
          <div><Label>{t("settings.deliveryFee", "مصاريف التوصيل الافتراضية")}</Label><Input type="number" value={s.default_delivery_fee} disabled={!canEdit} onChange={(e) => setS({ ...s, default_delivery_fee: Number(e.target.value) })} /></div>
          <div><Label>{t("settings.taxPercent", "ضريبة %")}</Label><Input type="number" value={s.tax_percent} disabled={!canEdit} onChange={(e) => setS({ ...s, tax_percent: Number(e.target.value) })} /></div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ms-1" /> {t("settings.save", "حفظ")}</>}
          </Button>
        </div>
      )}
    </div>
  );
}
