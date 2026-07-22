import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@/hooks/use-server-fn";
import { adminApi } from "@/lib/admin-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Trash2, KeyRound, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/admin/users/")({
  head: () => ({ meta: [{ title: "Users Admin - MJRH" }] }),
  component: AdminUsersPage,
});

type UserRow = { id: string; email: string; created_at: string; roles: { role: string; tenant_id: string; tenant_name: string | null }[] };

function AdminUsersPage() {
  const { t, dir } = useI18n();
  const { isSuperAdmin } = useAuth();
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwUser, setPwUser] = useState<UserRow | null>(null);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  const listFn = useServerFn(adminApi.listAllUsers);
  const delFn = useServerFn(adminApi.deleteUser);
  const resetFn = useServerFn(adminApi.resetUserPassword);

  async function load() {
    setLoading(true);
    try { const res = await listFn(); setList((res?.users ?? []) as any); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (!isSuperAdmin) return <Card className="p-8 text-center">صلاحية مدير المنصة فقط.</Card>;

  async function deleteUser(uid: string) {
    if (!confirm("حذف الحساب نهائياً؟")) return;
    try { await delFn(uid); toast.success("تم الحذف"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
  }

  async function savePw() {
    if (!pwUser || pw.length < 6) return;
    setSaving(true);
    try {
      await resetFn(pwUser.id, pw);
      toast.success("تم تغيير كلمة المرور");
      setPwUser(null); setPw("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={dir}>
      <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
         <Crown className="w-8 h-8 text-brand-blue" />
         إدارة مستخدمي المنظومة
      </h1>

      {loading ? <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-blue" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((u) => (
            <Card key={u.id} className="rounded-3xl border-slate-100 hover:shadow-md transition-all group">
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <div className="font-black text-slate-900 truncate max-w-[180px]" title={u.email}>{u.email}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0,8)}...</div>
                   </div>
                   <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-full" onClick={() => { setPwUser(u); setPw(""); }}>
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full" onClick={() => deleteUser(u.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                   </div>
                </div>
                
                <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-50">
                  {u.roles?.length ? u.roles.map((r, i) => (
                    <Badge key={i} variant="outline" className="bg-slate-50 border-slate-200 text-[10px] font-black uppercase">
                       {r.role}{r.tenant_name ? ` · ${r.tenant_name}` : ""}
                    </Badge>
                  )) : <Badge variant="secondary" className="text-[10px]">بدون دور</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!pwUser} onOpenChange={(v) => !v && setPwUser(null)}>
        <DialogContent className="max-w-md rounded-3xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black">إعادة تعيين كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600">
               المستخدم: {pwUser?.email}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">كلمة المرور الجديدة</Label>
              <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} placeholder="6 أحرف على الأقل" className="rounded-xl font-mono font-black" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePw} disabled={saving || pw.length < 6} className="w-full h-11 rounded-2xl bg-brand-blue font-black">
              {saving ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <KeyRound className="w-4 h-4 ms-2" />}
              حفظ كلمة المرور الجديدة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
