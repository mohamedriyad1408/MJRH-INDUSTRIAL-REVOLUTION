import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Shirt } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "تسجيل الدخول" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { session, isSuperAdmin } = useAuth();
  const { t, dir } = useI18n();
  const tenantSlug = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tenant") : null;

  useEffect(() => {
    if (session && tenantSlug) {
      nav({ to: `/${tenantSlug}/today` as any });
    }
  }, [session, nav, tenantSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. لو الإيميل محتاج تأكيد، افحص بريدك.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
        });
        if (error) throw error;
        toast.success("تم إرسال رابط استرجاع كلمة المرور إلى بريدك.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول");
        if (!tenantSlug) {
          const { data: userRoles } = await supabase.from("user_roles").select("role, tenant_id, tenants(slug)").eq("user_id", (await supabase.auth.getUser()).data.user?.id || "");
          const rows = userRoles || [];
          if (rows.some((r: any) => r.role === "super_admin")) {
            nav({ to: "/admin/tenants" as any });
          } else {
            const firstSlug = rows.find((r: any) => r.tenants?.slug)?.tenants?.slug || "dry-tech";
            nav({ to: `/${firstSlug}/today` as any });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "signin" ? t("login.signinTitle") : mode === "signup" ? t("login.signupTitle") : t("login.forgotTitle");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-background px-4 py-8" dir={dir}>
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl relative"><div className="absolute top-3 start-3"><LanguageSwitcher compact /></div>
        {!tenantSlug && session && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 text-xs space-y-2.5 shadow-2xs">
            <div className="font-black flex items-center gap-1.5 text-indigo-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>أنت مسجل الدخول حالياً بحساب:</span>
              <span className="font-mono">{session.user.email}</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-semibold">
              هذه الصفحة مخصصة لدخول إدارة منصة MJRH العامة. للوصول لمغسلتك، يمكنك الانتقال إليها من القائمة الرئيسية:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {isSuperAdmin && (
                <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-black">
                  <Link to={"/admin/tenants" as any}>لوحة إدارة المنصة (Super Admin) &larr;</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline" className="font-black bg-white border-slate-300">
                <Link to="/">قائمة المشاريع والمغاسل &larr;</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center mb-6 text-center">
          {tenantSlug ? (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-700 via-cyan-500 to-teal-400 text-white flex items-center justify-center shadow-md mb-2">
              <Shirt className="w-7 h-7" />
            </div>
          ) : (
            <div className="w-36 h-36 sm:w-44 sm:h-44 p-2 flex items-center justify-center mb-2 drop-shadow-xl hover:scale-105 transition-transform duration-300">
              <img src="/mjrh-logo.png" alt="MJRH Logo" className="w-full h-full object-contain" />
            </div>
          )}
          {tenantSlug ? (
            <div className="mb-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
              <span>دخول مشروع:</span>
              <span className="font-mono text-teal-900 font-black uppercase">{tenantSlug}</span>
            </div>
          ) : (
            <div className="mb-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-900 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
              <span>دخول إدارة وموظفو منصة MJRH</span>
            </div>
          )}
          <h1 className="mt-1 text-2xl font-black text-slate-900">{tenantSlug ? t("login.tenantHeading", "دخول الموظفين والمالك") : t("login.heading")}</h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold">{title}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">{t("login.fullName")}</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div>
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
            {mode === "signin" ? t("login.signIn") : mode === "signup" ? t("login.signUp") : t("login.sendLink")}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm space-y-2">
          {mode === "signin" && (
            <>
              <button onClick={() => setMode("forgot")} className="block w-full text-primary hover:underline">
                {t("login.forgotPassword")}
              </button>
              <button onClick={() => setMode("signup")} className="block w-full text-primary hover:underline">
                {t("login.noAccount")}
              </button>
            </>
          )}
          {mode !== "signin" && (
            <button onClick={() => setMode("signin")} className="text-primary hover:underline">
              {t("login.backToSignin")}
            </button>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center font-medium leading-relaxed">
          {t("login.firstAccountNote")}
        </p>
        {!tenantSlug && (
          <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-center text-slate-700 font-bold shadow-2xs">
            هل تعمل في أحد المشاريع؟ <Link to="/" className="text-teal-700 font-black hover:underline block mt-0.5">اختر مشروعك من قائمة المشاريع الرئيسية</Link>
          </div>
        )}
        <div className="mt-4 text-center">
          <Link to="/landing" className="text-xs text-muted-foreground hover:underline font-semibold">{t("login.backHome")}</Link>
        </div>
      </Card>
    </div>
  );
}
