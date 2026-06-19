import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

import { adminApi } from "@/lib/admin-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Crown, Trash2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_app/admin/users/")({
  head: () => ({ meta: [{ title: "كل المستخدمين" }] }),
  component: UsersPage,
});

type U = { id: string; email?: string; created_at: string; roles: { role: string; tenant_id: string | null; tenant_name: string | null }[] };

function UsersPage() {
  const { isSuperAdmin, user } = useAuth();
  const fetchFn = useServerFn(adminApi.listAllUsers);
  const delFn = useServerFn(adminApi.deleteUser);
  const resetFn = useServerFn(adminApi.resetUserPassword);
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwUser, setPwUser] = useState<U | null>(null);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const r = await fetchFn(); setUsers(r.users as U[]); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (isSuperAdmin) load(); /* eslint-disable-next-line */ }, [isSuperAdmin]);

  if (!isSuperAdmin) return <Card className="p-8 text-center">صلاحية مدير المنصة فقط.</Card>;

  async function remove(uid: string) {
    if (!confirm("حذف الحساب نهائياً؟")) return;
    try { await delFn({ data: { userId: uid } }); toast.success("تم الحذف"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
  }

  async function doReset() {
    if (!pwUser || pw.length < 6) return;
    setSaving(true);
    try {
      await resetFn({ data: { userId: pwUser.id, newPassword: pw } });
      toast.success("تم تغيير كلمة المرور");
      setPwUser(null); setPw("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6" /> كل المستخدمين</h1>
      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{u.email}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {u.roles.length ? u.roles.map((r, i) => (
                    <Badge key={i} variant="outline">{r.role}{r.tenant_name ? ` · ${r.tenant_name}` : ""}</Badge>
                  )) : <Badge variant="secondary">بدون دور</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" title="إعادة تعيين كلمة المرور" onClick={() => { setPwUser(u); setPw(""); }}>
                  <KeyRound className="w-4 h-4" />
                </Button>
                {u.id !== user?.id && (
                  <Button variant="ghost" size="icon" onClick={() => remove(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!pwUser} onOpenChange={(v) => { if (!v) { setPwUser(null); setPw(""); } }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إعادة تعيين كلمة المرور — {pwUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>كلمة المرور الجديدة</Label>
            <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} placeholder="6 أحرف على الأقل" />
          </div>
          <DialogFooter>
            <Button onClick={doReset} disabled={saving || pw.length < 6}>
              {saving && <Loader2 className="w-4 h-4 animate-spin ms-1" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
