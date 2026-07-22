import { useI18n } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "إعادة تعيين كلمة المرور" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    // Supabase recovery link sets a session via hash; onAuthStateChange will fire PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event: any) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }: any) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث كلمة المرور");
    nav({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-background px-4" dir="rtl">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="mt-3 text-xl font-bold">تعيين كلمة مرور جديدة</h1>
        </div>
        {!ready ? (
          <p className="text-sm text-center text-muted-foreground">افتح هذه الصفحة من الرابط المُرسل إلى بريدك.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>كلمة المرور الجديدة</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin ms-1" />} حفظ
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
