import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_admin/admin/platform-fees")({
  head: () => ({ meta: [{ title: "رسوم تشغيل المنصة" }] }),
  component: PlatformFeesPage,
});

type Tenant = { id: string; name: string };
type Fee = {
  id: string; tenant_id: string; plan_name: string;
  monthly_fee: number; per_order_fee: number; billing_day: number; status: string;
};

function PlatformFeesPage() {
  const { t, dir } = useI18n();
  const { isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [tRes, fRes] = await Promise.all([
      supabase.from("tenants").select("id, name").order("name"),
      supabase.from("platform_fees").select("*"),
    ]);
    setTenants((tRes.data ?? []) as any);
    setFees((fRes.data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (!isSuperAdmin) return <Card className="p-8 text-center">{t("platformFees.adminOnly", "مدير المنصة فقط.")}</Card>;

  return (
    <div className="space-y-4" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold">{t("platformFees.title", "رسوم تشغيل المنصة")}</h1>
        <p className="text-sm text-muted-foreground">{t("platformFees.subtitle", "إدارة اشتراك كل مغسلة")}</p>
      </div>
      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {tenants.map((ten) => {
            const fee = fees.find((x) => x.tenant_id === ten.id);
            return <FeeCard key={ten.id} tenant={ten} fee={fee} onChange={load} t={t} />;
          })}
        </div>
      )}
    </div>
  );
}

function FeeCard({ tenant, fee, onChange, t }: { tenant: Tenant; fee?: Fee; onChange: () => void; t: any }) {
  const [f, setF] = useState({
    plan_name: fee?.plan_name ?? "standard",
    monthly_fee: String(fee?.monthly_fee ?? 0),
    per_order_fee: String(fee?.per_order_fee ?? 0),
    billing_day: String(fee?.billing_day ?? 1),
    status: fee?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      tenant_id: tenant.id, plan_name: f.plan_name,
      monthly_fee: Number(f.monthly_fee), per_order_fee: Number(f.per_order_fee),
      billing_day: Number(f.billing_day), status: f.status,
    };
    const { error } = fee
      ? await supabase.from("platform_fees").update(payload).eq("id", fee.id)
      : await supabase.from("platform_fees").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success(t("platformFees.toastSaved", "تم الحفظ")); onChange(); }
  }

  const curr = t("common.egp");

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="font-bold">{tenant.name}</div>
          {fee && <div className="text-xs text-emerald-600">{t("platformFees.activeFee", "مفعّل")}: {fmtMoney(fee.monthly_fee, curr)} / {t("common.month", "شهر")}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs">{t("platformFees.planLabel", "الباقة")}</label>
            <Select value={f.plan_name} onValueChange={(v) => setF({ ...f, plan_name: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs">{t("platformFees.statusLabel", "الحالة")}</label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("platformFees.status.active", "نشط")}</SelectItem>
                <SelectItem value="suspended">{t("platformFees.status.suspended", "موقوف")}</SelectItem>
                <SelectItem value="trial">{t("platformFees.status.trial", "تجريبي")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs">{t("platformFees.monthlyFeeLabel", "رسوم شهرية")}</label><Input type="number" value={f.monthly_fee} onChange={(e) => setF({ ...f, monthly_fee: e.target.value })} /></div>
          <div><label className="text-xs">{t("platformFees.perOrderFeeLabel", "عمولة/طلب")}</label><Input type="number" value={f.per_order_fee} onChange={(e) => setF({ ...f, per_order_fee: e.target.value })} /></div>
          <div><label className="text-xs">{t("platformFees.billingDayLabel", "يوم الفاتورة")}</label><Input type="number" min={1} max={28} value={f.billing_day} onChange={(e) => setF({ ...f, billing_day: e.target.value })} /></div>
        </div>
        <Button onClick={save} disabled={saving} size="sm" className="w-full">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 ms-1" /> {t("platformFees.save", "حفظ")}</>}
        </Button>
      </CardContent>
    </Card>
  );
}
