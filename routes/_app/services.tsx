import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, Tags } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/services")({
  head: () => ({ meta: [{ title: "كتالوج الخدمات" }] }),
  component: ServicesPage,
});

type Item = { id?: string; name: string; service_type: string; unit_price: number; is_active: boolean };

function ServicesPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const canEdit = hasRole("owner", "ops_manager");
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("service_items").select("*").order("name");
    if (error) toast.error(error.message);
    setList((data ?? []) as Item[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function newItem() { setEditing({ name: "", service_type: "cleaning", unit_price: 10, is_active: true }); setOpen(true); }

  async function save() {
    if (!editing?.name || !tenantId) return;
    setSaving(true);
    const payload = { tenant_id: tenantId, name: editing.name, service_type: editing.service_type as any, unit_price: Number(editing.unit_price), is_active: editing.is_active };
    const { error } = editing.id ? await supabase.from("service_items").update(payload).eq("id", editing.id) : await supabase.from("service_items").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success(t("services.toastSaved", "تم الحفظ")); setOpen(false); load(); }
  }

  async function deleteItem(id: string) {
    if (!confirm(t("services.confirmDelete", "حذف هذه الخدمة؟"))) return;
    const { error } = await supabase.from("service_items").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("services.toastDeleted", "تم الحذف")); load(); }
  }

  const curr = t("common.egp");

  function typeLabel(s: string) {
    return ({ cleaning: t("services.typeCleaning", "تنظيف"), ironing: t("services.typeIroning", "كي"), both: t("services.typeBoth", "تنظيف وكي") } as Record<string,string>)[s] ?? s;
  }

  return (
    <div className="space-y-4 max-w-4xl" dir={dir}>
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("services.pageTitle", "كتالوج الخدمات")}</h1>
          <p className="text-sm text-muted-foreground">{list.length} {t("services.subtitle", "خدمة")}</p>
        </div>
        {canEdit && <Button onClick={newItem}><Plus className="w-4 h-4 ms-1" /> {t("services.btnNew", "خدمة جديدة")}</Button>}
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3">{t("services.colName", "الاسم")}</th>
                  <th className="text-start p-3">{t("services.colType", "النوع")}</th>
                  <th className="text-start p-3">{t("services.colPrice", "السعر")}</th>
                  <th className="text-start p-3">{t("services.colStatus", "الحالة")}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("services.empty", "لا توجد خدمات")}</td></tr>}
                {list.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-bold">{s.name}</td>
                    <td className="p-3"><Badge variant="secondary">{typeLabel(s.service_type)}</Badge></td>
                    <td className="p-3">{fmtMoney(s.unit_price, curr)}</td>
                    <td className="p-3">{s.is_active ? <Badge className="bg-emerald-600">{t("services.active", "نشطة")}</Badge> : <Badge variant="outline">{t("services.inactive", "موقوفة")}</Badge>}</td>
                    <td className="p-3 text-end">
                      {canEdit && <div className="flex gap-1 justify-end"><Button size="sm" variant="outline" onClick={() => { setEditing(s); setOpen(true); }}>{t("common.edit", "تعديل")}</Button><Button size="sm" variant="outline" onClick={() => s.id && deleteItem(s.id)}><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? t("services.titleEdit", "تعديل خدمة") : t("services.titleNew", "خدمة جديدة")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div><Label>{t("services.labelName", "الاسم")}</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>{t("services.labelType", "النوع")}</Label>
                <Select value={editing.service_type} onValueChange={(v) => setEditing({ ...editing, service_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">{t("services.typeCleaning", "تنظيف")}</SelectItem>
                    <SelectItem value="ironing">{t("services.typeIroning", "كي")}</SelectItem>
                    <SelectItem value="both">{t("services.typeBoth", "تنظيف وكي")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("services.labelPrice", "السعر")}</Label><Input type="number" value={editing.unit_price} onChange={(e) => setEditing({ ...editing, unit_price: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>{t("services.labelActive", "نشطة")}</Label>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("services.btnSave", "حفظ")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
