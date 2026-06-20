import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@/hooks/use-server-fn";
import { supabase } from "@/integrations/supabase/client";

import { adminApi } from "@/lib/admin-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, Building2 } from "lucide-react";

export const Route = createFileRoute("/_app/admin/tenants/")({
  head: () => ({ meta: [{ title: "إدارة المغاسل" }] }),
  component: TenantsPage,
});

type Tenant = { id: string; name: string; slug: string; is_active: boolean; owner_user_id: string | null; created_at: string };

function TenantsPage() {
  const { isSuperAdmin } = useAuth();
  const [list, setList] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Tenant[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (!isSuperAdmin) return <Card className="p-8 text-center">صلاحية مدير المنصة فقط.</Card>;

  async function toggle(t: Tenant) {
    const { error } = await supabase.from("tenants").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("تم"); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> المغاسل</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" /> مغسلة جديدة</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إنشاء مغسلة جديدة</DialogTitle></DialogHeader>
            <NewTenantForm onDone={() => { setOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "مفعلة" : "موقوفة"}</Badge>
                <Button variant="outline" size="sm" onClick={() => toggle(t)}>{t.is_active ? "إيقاف" : "تفعيل"}</Button>
              </div>
            </Card>
          ))}
          {!list.length && <Card className="p-8 text-center text-muted-foreground col-span-2">لا توجد مغاسل بعد. ابدأ بإضافة واحدة.</Card>}
        </div>
      )}

      <Card className="p-4 text-xs text-muted-foreground">
        إدارة المستخدمين عبر <Link to="/admin/users" className="text-primary underline">صفحة المستخدمين</Link>.
      </Card>
    </div>
  );
}

function NewTenantForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(adminApi.createTenant);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fn({ data: { name, slug, ownerEmail: email, ownerPassword: password, ownerFullName: fullName } });
      toast.success("تم إنشاء المغسلة والمالك");
      onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>اسم المغسلة</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div>
        <Label>الكود (slug — حروف إنجليزية صغيرة وأرقام)</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required pattern="[a-z0-9\-]+" />
      </div>
      <div className="border-t pt-3 space-y-3">
        <div className="text-sm font-medium">حساب المالك</div>
        <div><Label>الاسم الكامل</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
        <div><Label>البريد الإلكتروني</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label>كلمة المرور</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin ms-1" />} إنشاء
      </Button>
    </form>
  );
}
