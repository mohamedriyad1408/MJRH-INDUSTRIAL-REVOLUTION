import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { useI18n, interpolate } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package, Plus, RefreshCw, Calendar, Users } from "lucide-react";

export const Route = createFileRoute("/$tenant/subscriptions")({
  head: () => ({ meta: [{ title: "اشتراكات العملاء — Recurring Packages" }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { tenantId, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    plan_name: t("subscriptions.defaultPlanName", "باقة 20 قطعة شهرية"),
    item_quota: 20,
    price: 500,
    start_date: new Date().toISOString().slice(0, 10),
  });

  const canManage = hasRole("owner", "cs_manager", "ops_manager", "super_admin");

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const [sRes, cRes] = await Promise.all([
      supabase.from("v_subscription_balances").select("*").eq("tenant_id", tenantId).order("renewal_date", { ascending: true }).limit(100),
      supabase.from("customers").select("id, full_name, phone").eq("tenant_id", tenantId).order("full_name").limit(200),
    ]);
    if (sRes.error) console.warn(sRes.error);
    setSubs(sRes.data ?? []);
    setCustomers(cRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tenantId]);

  async function createSub() {
    if (!form.customer_id) return toast.error(t("subscriptions.errorChooseCustomer"));
    if (form.item_quota <= 0) return toast.error(t("subscriptions.errorInvalidQuota"));
    const { error } = await supabase.from("customer_subscriptions").insert({
      tenant_id: tenantId,
      customer_id: form.customer_id,
      plan_name: form.plan_name,
      item_quota: form.item_quota,
      remaining_quota: form.item_quota,
      price: form.price,
      start_date: form.start_date,
      renewal_date: new Date(new Date(form.start_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "active",
    });
    if (error) toast.error(error.message);
    else {
      toast.success(t("subscriptions.toastCreated"));
      setForm({ ...form, customer_id: "" });
      load();
    }
  }

  async function renewAll() {
    const { data, error } = await supabase.rpc("renew_monthly_subscriptions");
    if (error) toast.error(error.message);
    else {
      toast.success(interpolate(t("subscriptions.toastRenewed"), { count: data ?? 0 }));
      load();
    }
  }

  if (!canManage) return <Card className="p-8 text-center">{t("subscriptions.accessDenied")}</Card>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir={dir}>
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Package className="w-6 h-6 text-teal-600" /> {t("subscriptions.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subscriptions.pageSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4" /></Button>
          <Button onClick={renewAll} variant="outline"><Calendar className="w-4 h-4 me-2" /> {t("subscriptions.monthlyRenew")}</Button>
        </div>
      </div>

      <Card className="border-teal-200 bg-teal-50/30">
        <CardHeader>
          <CardTitle className="text-base">{t("subscriptions.newSubTitle")}</CardTitle>
          <CardDescription className="text-xs">{t("subscriptions.newSubSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs">{t("subscriptions.customer")}</Label>
            <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={t("subscriptions.chooseCustomer")} /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t("subscriptions.planName")}</Label>
            <Input className="mt-1" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">{t("subscriptions.monthlyQuota")}</Label>
            <Input className="mt-1" type="number" value={form.item_quota} onChange={(e) => setForm({ ...form, item_quota: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">{t("subscriptions.price")}</Label>
            <Input className="mt-1" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div className="flex items-end">
            <Button onClick={createSub} className="w-full"><Plus className="w-4 h-4 me-2" /> {t("subscriptions.createBtn")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5" /> {interpolate(t("subscriptions.activeSubsTitle"), { count: subs.length })}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : subs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t("subscriptions.noSubs")}</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="p-2 text-start">{t("subscriptions.colCustomer")}</th>
                  <th className="p-2 text-start">{t("subscriptions.colPlan")}</th>
                  <th className="p-2 text-center">{t("subscriptions.colQuota")}</th>
                  <th className="p-2 text-center">{t("subscriptions.colRemaining")}</th>
                  <th className="p-2 text-center">{t("subscriptions.colPrice")}</th>
                  <th className="p-2 text-center">{t("subscriptions.colRenewal")}</th>
                  <th className="p-2 text-center">{t("subscriptions.colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-2 font-bold">{s.customer_name} — {s.customer_phone}</td>
                    <td className="p-2">{s.plan_name}</td>
                    <td className="p-2 text-center">{s.item_quota}</td>
                    <td className="p-2 text-center">
                      <Badge variant={s.remaining_quota < 5 ? "destructive" : "secondary"}>{s.remaining_quota}</Badge>
                    </td>
                    <td className="p-2 text-center">{s.price}</td>
                    <td className="p-2 text-center font-mono">{s.renewal_date}</td>
                    <td className="p-2 text-center"><Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 text-xs leading-6">
          <b>{t("subscriptions.howItWorksTitle")}</b> {t("subscriptions.howItWorksBody")}
        </CardContent>
      </Card>
    </div>
  );
}
