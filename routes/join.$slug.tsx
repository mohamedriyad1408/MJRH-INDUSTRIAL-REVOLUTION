import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseLatLng } from "@/lib/geo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, UserPlus, MapPin, Building2 } from "lucide-react";
import { useI18n, interpolate } from "@/lib/i18n";

export const Route = createFileRoute("/join/$slug")({
  head: () => ({ meta: [{ title: "Customer Registration - MJRH" }] }),
  component: JoinCustomerPage,
});

function phoneDigits(s?: string | null) { return String(s || "").replace(/\D/g, ""); }

function JoinCustomerPage() {
  const { t, dir } = useI18n();
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ fullName: "", phone: "", email: "", password: "", address: "", locationUrl: "", lat: null as number | null, lng: null as number | null, notes: "" });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("tenants").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
    if (error) toast.error(error.message);
    setTenant(data ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); }, [slug]);

  function extractLocation() {
    if (!f.locationUrl) return;
    const parsed = parseLatLng(f.locationUrl);
    if (!parsed) return toast.error(t("join.errLink", "الصق رابط Google Maps أو إحداثيات lat,lng"));
    setF({ ...f, lat: parsed.lat, lng: parsed.lng });
    toast.success(t("join.toastLocOk", "تم استخراج الموقع"));
  }

  function detectGps() {
    if (!navigator.geolocation) return toast.error(t("join.errGps", "المتصفح لا يدعم GPS"));
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude; const lng = pos.coords.longitude;
      setF((old) => ({ ...old, lat, lng, locationUrl: `https://maps.google.com/?q=${lat},${lng}` }));
      toast.success(t("join.toastGpsOk", "تم تحديد الموقع الحالي"));
    }, () => toast.error(t("join.toastGpsErr", "تعذر تحديد الموقع — اسمح باستخدام الموقع")), { enableHighAccuracy: true, timeout: 15000 });
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (phoneDigits(f.phone).length < 11) return toast.error(t("join.errPhoneLen", "رقم الهاتف يجب أن يكون 11 رقم على الأقل"));
    if (!f.lat || !f.lng) return toast.error(t("join.errLocReq", "حدد موقعك على الخريطة أولاً"));
    if (f.password.length < 6) return toast.error(t("join.errPwLen", "كلمة المرور 6 أحرف على الأقل"));

    setSaving(true);
    try {
      const { data: uRes, error: uErr } = await supabase.auth.signUp({
        email: f.email, password: f.password, options: { data: { full_name: f.fullName } },
      });
      if (uErr) throw uErr;
      const userId = uRes.user?.id;

      await supabase.from("user_roles").insert({ user_id: userId, role: "customer", tenant_id: tenant.id }).then(() => null);
      await supabase.from("customers").upsert({
        tenant_id: tenant.id, profile_id: userId, full_name: f.fullName, phone: f.phone, email: f.email, address: f.address || null, location_url: f.locationUrl || null, lat: f.lat, lng: f.lng, notes: f.notes || null,
      }, { onConflict: "tenant_id,phone" }).then(() => null);

      await supabase.rpc("record_operation_event", { _process_key: "customer_joined", _process_name: "تسجيل عميل جديد", _source_type: "customer", _source_id: null, _branch_id: null, _cash_account_id: null, _report_bucket: "operations/customers", _requires_notification: true, _data: { tenant_id: tenant.id, phone: f.phone, full_name: f.fullName }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null);

      toast.success(t("join.toastSuccess", "تم تسجيل حسابك كعميل. يمكنك الدخول من بوابة العميل بعد تأكيد البريد إن طُلب."));
      setTimeout(() => { nav({ to: "/customer-portal", search: { tenant: tenant.slug } }); }, 1500);
    } catch (err: any) { toast.error(err.message ?? "تعذر إنشاء الحساب"); } finally { setSaving(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  if (!tenant) return <div className="min-h-screen flex items-center justify-center p-4" dir={dir}><Card><CardContent className="p-8 text-center">{t("join.errTenant", "رابط مغسلة غير صالح أو غير مفعل.")}</CardContent></Card></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 py-12 px-4 flex items-center justify-center" dir={dir}>
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center text-white space-y-2">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl"><Building2 className="w-8 h-8 text-teal-300" /></div>
          <h1 className="text-2xl font-black">{interpolate(t("join.title", "انضم كعميل في {tenant}"), { tenant: tenant.name })}</h1>
          <p className="text-sm text-teal-100 mt-1">{t("join.subtitle", "سجل حسابك لطلب الخدمة ومتابعة طلباتك من البيت")}</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardContent className="p-6">
            <form onSubmit={register} className="space-y-4">
              <div><Label>{t("join.labelName", "الاسم الكامل")}</Label><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required /></div>
              <div><Label>{t("join.labelPhone", "رقم الهاتف")}</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="01xxxxxxxxx" required /></div>
              <div><Label>{t("join.labelEmail", "البريد الإلكتروني")}</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
              <div><Label>{t("join.labelPw", "كلمة المرور")}</Label><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6} /></div>
              <div><Label>{t("join.labelAddress", "العنوان / الكمبوند")}</Label><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>

              <div className="space-y-2 border p-4 rounded-2xl bg-slate-50 border-slate-200">
                <Label className="flex items-center gap-1"><MapPin className="w-4 h-4 text-teal-700" /> {t("join.labelLoc", "موقعك على الخريطة *")}</Label>
                <Input placeholder={t("join.locPlaceholder", "رابط Google Maps أو lat,lng")} value={f.locationUrl} onChange={(e) => setF({ ...f, locationUrl: e.target.value })} />
                <div className="flex flex-wrap gap-2 text-xs">
                  {f.lat && f.lng && <div className="text-emerald-700 font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> {f.lat.toFixed(4)},{f.lng.toFixed(4)}</div>}
                  <Button type="button" variant="outline" onClick={extractLocation} size="sm">{t("join.btnExtract", "استخراج من الرابط")}</Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("join.locHint", "لا يمكن إنشاء حساب عميل بدون موقع، حتى تظهر طلباتك للمناديب بدقة.")}</p>
              </div>

              <div><Label>{t("join.labelNotes", "ملاحظات")}</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={t("join.notesPlaceholder", "مثال: بوابة الكمبوند، رقم العمارة...")} /></div>
              <Button type="submit" disabled={saving} className="w-full h-11 text-base font-bold bg-teal-600 hover:bg-teal-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <UserPlus className="w-4 h-4 ms-1" />} {t("join.btnRegister", "تسجيل كعميل")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
