import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Building2, Plus, Loader2, Pencil } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/branches")({
  head: () => ({ meta: [{ title: "نقاط التشغيل" }] }),
  component: BranchesPage,
});

type B = { id?: string; name: string; address?: string | null; phone?: string | null; is_active: boolean };

function BranchesPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const canEdit = hasRole("owner");
  const [list, setList] = useState<B[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<B | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("branches").select("*").order("name");
    if (error) toast.error(error.message);
    setList((data ?? []) as B[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.name) return toast.error(t("branches.errName", "الاسم مطلوب"));
    setSaving(true);
    const payload = { tenant_id: tenantId, name: editing.name, address: editing.address || null, phone: editing.phone || null, is_active: editing.is_active };
    const { error } = editing.id ? await supabase.from("branches").update(payload).eq("id", editing.id) : await supabase.from("branches").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success(t("branches.toastSaved", "تم الحفظ")); setOpen(false); load(); }
  }

  if (!canEdit) return <Card className="p-8 text-center">{t("branches.ownerOnly", "صلاحية مالك المغسلة فقط.")}</Card>;

  return (
    <div className="space-y-4 max-w-4xl" dir={dir}>
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> {t("branches.pageTitle", "نقاط التشغيل")}</h1>
        <Button onClick={() => { setEditing({ name: "", address: "", phone: "", is_active: true }); setOpen(true); }}>
          <Plus className="w-4 h-4 ms-1" /> {t("branches.btnNew", "نقطة جديدة")}
        </Button>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold text-lg">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.address ?? "—"} · {b.phone ?? "—"}</div>
                  </div>
                  <Badge variant={b.is_active ? "default" : "outline"}>{b.is_active ? t("branches.active", "نشطة") : t("branches.inactive", "موقوفة")}</Badge>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(b); setOpen(true); }}>
                    <Pencil className="w-3 h-3 ms-1" /> {t("branches.edit", "تعديل")}
                  </Button>
                  <Button size="sm" asChild>
                    <Link to={`/branches/${b.id}` as any}>{t("branches.btnDashboard", "شاشة الفرع")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!list.length && <Card className="p-8 text-center text-muted-foreground col-span-full">{t("branches.empty", "لا توجد نقاط تشغيل")}</Card>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? t("branches.titleEdit", "تعديل") : t("branches.titleNew", "نقطة جديدة")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div><Label>{t("branches.labelName", "الاسم *")}</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>{t("branches.labelAddress", "العنوان")}</Label><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div><Label>{t("branches.labelPhone", "التليفون")}</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>{t("branches.active", "نشطة")}</Label>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("branches.btnSave", "حفظ")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
