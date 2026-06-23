import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Shirt, UserPlus } from "lucide-react";

export const Route = createFileRoute("/join/$slug")({
  head: () => ({ meta: [{ title: "تسجيل عميل جديد" }] }),
  component: JoinTenantCustomer,
});

type Tenant = { id: string; name: string; slug: string };

function phoneDigits(v: string) { return (v || "").replace(/\D/g, ""); }

function JoinTenantCustomer() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ fullName: "", phone: "", email: "", password: "", address: "", notes: "" });

  useEffect(() => {
    (supabase as any).from("tenants").select("id,name,slug").eq("slug", slug).eq("is_active", true).maybeSingle()
      .then(({ data }: any) => setTenant(data ?? null))
      .finally(() => setLoadingTenant(false));
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    if (phoneDigits(f.phone).length < 11) return toast.error("رقم الهاتف يجب أن يكون 11 رقم على الأقل");
    if (f.password.length < 6) return toast.error("كلمة المرور 6 أحرف على الأقل");
    setSaving(true);
    const { error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/customer-portal` : undefined,
        data: {
          role: "customer",
          tenant_id: tenant.id,
          full_name: f.fullName,
          phone: f.phone,
          address: f.address,
          notes: f.notes,
        },
      },
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل حسابك كعميل. يمكنك الدخول من بوابة العميل بعد تأكيد البريد إن طُلب.");
    nav({ to: "/customer-portal" });
  }

  if (loadingTenant) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!tenant) return <div className="min-h-screen flex items-center justify-center p-4" dir="rtl"><Card><CardContent className="p-8 text-center">رابط مغسلة غير صالح أو غير مفعل.</CardContent></Card></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-100 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
        <div className="bg-gradient-to-br from-teal-700 to-slate-900 text-white p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/15 mx-auto flex items-center justify-center mb-3"><Shirt className="w-9 h-9" /></div>
          <h1 className="text-2xl font-black">انضم كعميل في {tenant.name}</h1>
          <p className="text-sm text-teal-100 mt-1">سجل حسابك لطلب الخدمة ومتابعة طلباتك من البيت</p>
        </div>
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div><Label>الاسم الكامل</Label><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required /></div>
            <div><Label>رقم الهاتف</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="01xxxxxxxxx" required /></div>
            <div><Label>البريد الإلكتروني</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
            <div><Label>كلمة المرور</Label><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6} /></div>
            <div><Label>العنوان / الكمبوند</Label><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            <div><Label>ملاحظات</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="مثال: بوابة الكمبوند، رقم العمارة..." /></div>
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <UserPlus className="w-4 h-4 ms-1" />} تسجيل كعميل
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
