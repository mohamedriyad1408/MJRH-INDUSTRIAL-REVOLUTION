import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { useI18n } from "@/lib/i18n";
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
  const { dir } = useI18n();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    plan_name: "باقة 20 قطعة شهرية",
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
    if (!form.customer_id) return toast.error("اختر العميل");
    if (form.item_quota <= 0) return toast.error("الكمية يجب أن تكون أكبر من صفر");
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
      toast.success("تم إنشاء الاشتراك");
      setForm({ ...form, customer_id: "" });
      load();
    }
  }

  async function renewAll() {
    const { data, error } = await supabase.rpc("renew_monthly_subscriptions");
    if (error) toast.error(error.message);
    else {
      toast.success(`تم تجديد ${data ?? 0} اشتراك`);
      load();
    }
  }

  if (!canManage) return <Card className="p-8 text-center">صلاحية المالك وخدمة العملاء فقط.</Card>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir={dir}>
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Package className="w-6 h-6 text-teal-600" /> اشتراكات العملاء — Recurring Packages</h1>
          <p className="text-sm text-muted-foreground mt-1">باقة شهرية ثابتة (مثال 20 قطعة/شهر بسعر مقطوع) — بدون بوابة دفع خارجية، يستخدم نفس نظام إثبات الدفع — Zero Cost</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4" /></Button>
          <Button onClick={renewAll} variant="outline"><Calendar className="w-4 h-4 me-2" /> تجديد شهري</Button>
        </div>
      </div>

      <Card className="border-teal-200 bg-teal-50/30">
        <CardHeader>
          <CardTitle className="text-base">إنشاء اشتراك جديد</CardTitle>
          <CardDescription className="text-xs">عند إنشاء طلب جديد لعميل عنده اشتراك فعال، يتم خصم الكمية من الرصيد المتبقي تلقائياً بدل حساب سعر كل قطعة</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs">العميل</Label>
            <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="اختر عميل" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">اسم الباقة</Label>
            <Input className="mt-1" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">الكمية الشهرية</Label>
            <Input className="mt-1" type="number" value={form.item_quota} onChange={(e) => setForm({ ...form, item_quota: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">السعر</Label>
            <Input className="mt-1" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div className="flex items-end">
            <Button onClick={createSub} className="w-full"><Plus className="w-4 h-4 me-2" /> إنشاء</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5" /> الاشتراكات النشطة ({subs.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : subs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">لا توجد اشتراكات بعد</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="p-2 text-start">العميل</th>
                  <th className="p-2 text-start">الباقة</th>
                  <th className="p-2 text-center">الكمية</th>
                  <th className="p-2 text-center">المتبقي</th>
                  <th className="p-2 text-center">السعر</th>
                  <th className="p-2 text-center">التجديد</th>
                  <th className="p-2 text-center">الحالة</th>
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
          <b>كيف يعمل؟</b> عند إنشاء طلب جديد، النظام يفحص لو العميل عنده اشتراك فعال وremaining_quota كافي — لو نعم يخصم تلقائياً ويعرض "الرصيد المتبقي" في بوابة العميل. التجديد الشهري يتم عبر <code>renew_monthly_subscriptions()</code> ويمكن جدولته بـ pg_cron (0 2 1 * *). لا حاجة لبوابة دفع خارجية — نفس نظام رفع إثبات الدفع الموجود.
        </CardContent>
      </Card>
    </div>
  );
}
