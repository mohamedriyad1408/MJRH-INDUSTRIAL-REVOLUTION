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

  const title = mode === "signin" ? "ادخل بياناتك للمتابعة" : mode === "signup" ? "أنشئ حساب جديد" : "استرجاع كلمة المرور";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-background px-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Shirt className="w-7 h-7" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">نظام إدارة المغسلة</h1>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            {mode === "signin" ? "دخول" : mode === "signup" ? "إنشاء حساب" : "إرسال الرابط"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm space-y-2">
          {mode === "signin" && (
            <>
              <button onClick={() => setMode("forgot")} className="block w-full text-primary hover:underline">
                نسيت كلمة المرور؟
              </button>
              <button onClick={() => setMode("signup")} className="block w-full text-primary hover:underline">
                ليس عندك حساب؟ سجّل الآن
              </button>
            </>
          )}
          {mode !== "signin" && (
            <button onClick={() => setMode("signin")} className="text-primary hover:underline">
              العودة لتسجيل الدخول
            </button>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          أول حساب يتسجّل في النظام يأخذ صلاحية مدير المنصة تلقائياً. باقي الحسابات تُفعَّل من الإدارة.
        </p>
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:underline">العودة للرئيسية</Link>
        </div>
      </Card>
    </div>
  );
}
