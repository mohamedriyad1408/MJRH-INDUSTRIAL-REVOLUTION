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

  if (!isSuperAdmin) return <Card className="p-8 text-center">{t("adminUsers.adminOnly", "صلاحية مدير المنصة فقط.")}</Card>;

  async function deleteUser(uid: string) {
    if (!confirm(t("adminUsers.confirmDelete", "حذف الحساب نهائياً؟"))) return;
    try { await delFn(uid); toast.success(t("adminUsers.toastDeleted", "تم الحذف")); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
  }

  async function savePw() {
    if (!pwUser || pw.length < 6) return;
    setSaving(true);
    try {
      await resetFn(pwUser.id, pw);
      toast.success(t("adminUsers.toastPwChanged", "تم تغيير كلمة المرور"));
      setPwUser(null); setPw("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4 max-w-5xl" dir={dir}>
      <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6" /> {t("adminUsers.title", "كل المستخدمين")}</h1>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((u) => (
            <Card key={u.id} className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-bold">{u.email}</div>
                <div className="text-xs text-muted-foreground">ID: {u.id}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {u.roles?.length ? u.roles.map((r, i) => (
                    <Badge key={i} variant="outline">{r.role}{r.tenant_name ? ` · ${r.tenant_name}` : ""}</Badge>
                  )) : <Badge variant="secondary">{t("adminUsers.noRole", "بدون دور")}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" title={t("adminUsers.resetTitle", "إعادة تعيين كلمة المرور")} onClick={() => { setPwUser(u); setPw(""); }}>
                  <KeyRound className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!pwUser} onOpenChange={(v) => !v && setPwUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("adminUsers.resetDialogTitle", "إعادة تعيين كلمة المرور —")} {pwUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>{t("adminUsers.newPwLabel", "كلمة المرور الجديدة")}</Label>
            <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} placeholder={t("adminUsers.pwPlaceholder", "6 أحرف على الأقل")} />
          </div>
          <DialogFooter>
            <Button onClick={savePw} disabled={saving || pw.length < 6}>
              {saving && <Loader2 className="w-4 h-4 animate-spin ms-1" />} {t("adminUsers.save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
