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
  const { session } = useAuth();
  const { t, dir } = useI18n();

  useEffect(() => {
    if (session) nav({ to: "/dashboard" });
  }, [session, nav]);

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
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "signin" ? t("login.signinTitle") : mode === "signup" ? t("login.signupTitle") : t("login.forgotTitle");
  const tenantSlug = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tenant") : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-background px-4 py-8" dir={dir}>
      <Card className="w-full max-w-md p-8 shadow-xl relative"><div className="absolute top-3 left-3"><LanguageSwitcher compact /></div>
        <div className="flex flex-col items-center mb-6 text-center">
          {tenantSlug ? (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-700 via-cyan-500 to-teal-400 text-white flex items-center justify-center shadow-md mb-2">
              <Shirt className="w-7 h-7" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-white p-2.5 flex items-center justify-center shadow-lg border border-slate-200/80 mb-3 overflow-hidden">
              <img src="/mjrh-logo.png" alt="MJRH Logo" className="w-full h-full object-contain" />
            </div>
          )}
          {tenantSlug ? (
            <div className="mb-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
              <span>📁 دخول مشروع:</span>
              <span className="font-mono text-teal-900 font-black uppercase">{tenantSlug}</span>
            </div>
          ) : (
            <div className="mb-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-900 text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
              <span>🛡️ دخول إدارة وموظفو منصة MJRH</span>
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
            {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
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
            هل تعمل في أحد المشاريع؟ <Link to="/" className="text-teal-700 font-black hover:underline block mt-0.5">اختر مشروعك من قائمة المشاريع الرئيسية ⮐</Link>
          </div>
        )}
        <div className="mt-4 text-center">
          <Link to="/landing" className="text-xs text-muted-foreground hover:underline font-semibold">{t("login.backHome")}</Link>
        </div>
      </Card>
    </div>
  );
}
