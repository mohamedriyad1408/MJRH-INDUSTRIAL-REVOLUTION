import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { CURRENCIES, type CurrencyCode } from "@/lib/format";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "إنشاء مشروع جديد — MJRH" }] }),
  component: SignupPage,
});

const BUSINESS_TYPES = [
  { value: "laundry", label: "مغسلة ملابس", labelEn: "Laundry — Clothes & Linen", icon: "🧺" },
  { value: "carpet", label: "مغسلة سجاد ومفروشات", labelEn: "Carpet & Upholstery Cleaning", icon: "🧹" },
  { value: "repair", label: "ورشة تصليح", labelEn: "Repair Workshop", icon: "🔧" },
  { value: "carwash", label: "غسيل سيارات", labelEn: "Car Wash", icon: "🚗" },
  { value: "cleaning", label: "تنظيف منازل ومكاتب", labelEn: "Home & Office Cleaning", icon: "🏠" },
  { value: "restaurant", label: "مطعم توصيل", labelEn: "Restaurant Delivery", icon: "🍽️" },
  { value: "laundry_chain", label: "سلسلة مغاسل", labelEn: "Laundry Chain", icon: "🏭" },
  { value: "other", label: "نشاط آخر", labelEn: "Other", icon: "📦" },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function SignupPage() {
  const { dir, t, language } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Business info
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [businessType] = useState("configured_by_wizard");
  const [currency, setCurrency] = useState<CurrencyCode>("EGP");

  // Step 2: Owner info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3: Result
  const [result, setResult] = useState<{ tenantId: string; slug: string } | null>(null);

  function handleNameChange(v: string) {
    setBusinessName(v);
    if (!slug || slug === slugify(businessName)) {
      setSlug(slugify(v));
    }
  }

  async function handleSubmit() {
    if (!businessName.trim()) return toast.error("أدخل اسم المشروع");
    if (!slug.trim()) return toast.error("أدخل رابط المشروع");
    if (!fullName.trim()) return toast.error("أدخل اسمك الكامل");
    if (!email.trim()) return toast.error("أدخل البريد الإلكتروني");
    if (password.length < 6) return toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");

    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: { full_name: fullName.trim() },
        },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("تعذر إنشاء الحساب");

      // 2. Create tenant via RPC (handles everything: tenant, branch, employee, settings, seeds)
      const { data: tenantId, error: rpcError } = await supabase.rpc("self_service_create_tenant", {
        _user_id: userId,
        _name: businessName.trim(),
        _slug: slug.trim().toLowerCase(),
        _business_type: businessType,
        _currency: currency,
        _owner_full_name: fullName.trim(),
      });

      if (rpcError) {
        if (rpcError.message.includes("موجود") || rpcError.message.includes("duplicate")) {
          throw new Error("هذا الرابط مستخدم بالفعل، اختر رابطاً آخر");
        }
        throw rpcError;
      }

      setResult({ tenantId: tenantId as string, slug: slug.trim().toLowerCase() });
      setStep(3);
      toast.success("تم إنشاء مشروعك بنجاح! 🎉");
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء إنشاء المشروع");
    } finally {
      setLoading(false);
    }
  }

  const isRTL = dir === "rtl";
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-950 to-indigo-950 px-4 py-8" dir={dir}>
      <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-teal-600 to-cyan-600 p-6 text-white text-center">
          <div className="flex justify-end mb-2"><LanguageSwitcher compact /></div>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black">أنشئ مشروعك على MJRH</h1>
          <p className="text-sm text-teal-100 mt-1">أنشئ حسابك ومنظمتك، ثم سيبني معالج الإعداد نظام التشغيل بالكامل</p>
          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex items-center gap-1.5 ${step >= s ? "text-white" : "text-white/40"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step >= s ? "bg-white text-teal-700" : "bg-white/20"}`}>{s}</div>
                <span className="text-xs font-bold hidden sm:inline">{s === 1 ? "المشروع" : s === 2 ? "صاحب المشروع" : "جاهز"}</span>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-white" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>اسم المشروع / المغسلة *</Label>
                <Input value={businessName} onChange={(e) => handleNameChange(e.target.value)} placeholder="مثال: Dry Tech Fifth Settlement" className="mt-1" />
              </div>
              <div>
                <Label>رابط المشروع (Slug) *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground shrink-0">mjrh.vercel.app/</span>
                  <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="dry-tech" className="font-mono" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">سيكون هذا رابط مشروعك الداخلي</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border text-xs text-slate-700">
                لا نختار صناعة هنا. بعد إنشاء الحساب سيظهر معالج MJRH Core Platform الإجباري ليجمع الصناعة، نوع النشاط، الأقسام، workflows، الماليات، الصلاحيات وكل الإعدادات كـ configuration.
              </div>
              <div>
                <Label>العملة الأساسية</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(CURRENCIES).map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} {c.labelAr} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full h-12 text-base font-black" onClick={() => setStep(2)}>
                التالي — بيانات صاحب المشروع <Arrow className="w-4 h-4 ms-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Owner Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>الاسم الكامل *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="محمد رياض" className="mt-1" />
              </div>
              <div>
                <Label>البريد الإلكتروني *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" />
              </div>
              <div>
                <Label>كلمة المرور *</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" minLength={6} className="mt-1" />
              </div>
              <div>
                <Label>رقم الهاتف (اختياري)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20 1XX XXX XXXX" className="mt-1" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>
                  <Arrow className="w-4 h-4 me-2 rotate-180" /> رجوع
                </Button>
                <Button className="flex-1 h-12 text-base font-black" onClick={handleSubmit} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 ms-2" /> إنشاء المشروع</>}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && result && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-emerald-700">تم إنشاء الحساب والمنظمة بنجاح 🎉</h2>
              <div className="rounded-2xl bg-slate-50 border p-4 text-sm">
                <div className="font-black text-lg">{businessName}</div>
                <div className="text-muted-foreground mt-1">
                  الرابط: <span className="font-mono text-teal-700 font-bold">mjrh.vercel.app/{result.slug}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => nav({ to: "/login" as any })}>
                  تسجيل الدخول
                </Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => nav({ to: `/${result.slug}/onboarding` as any })}>
                  افتح معالج الإعداد ←
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">إذا كان البريد يحتاج تأكيد، افحص صندوق بريدك</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
