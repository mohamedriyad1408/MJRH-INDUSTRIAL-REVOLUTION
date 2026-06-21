import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, SERVICE_TYPE_AR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_app/services")({
  head: () => ({ meta: [{ title: "كتالوج الخدمات" }] }),
  component: ServicesPage,
});

type Service = { id: string; name: string; service_type: "cleaning" | "ironing" | "both"; unit_price: number; is_active: boolean };

function ServicesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "cs_manager");
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("service_items").select("*").order("name");
    setList((data ?? []) as Service[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function newItem() {
    setEditing({ id: "", name: "", service_type: "both", unit_price: 0, is_active: true });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    const payload = { name: editing.name, service_type: editing.service_type, unit_price: editing.unit_price, is_active: editing.is_active };
    const { error } = editing.id
      ? await supabase.from("service_items").update(payload).eq("id", editing.id)
      : await supabase.from("service_items").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    setOpen(false); load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه الخدمة؟")) return;
    const { error } = await supabase.from("service_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">كتالوج الخدمات</h1>
          <p className="text-sm text-muted-foreground">{list.length} خدمة</p>
        </div>
        {canEdit && <Button onClick={newItem}><Plus className="w-4 h-4 ms-1" /> خدمة جديدة</Button>}
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-start p-3">الاسم</th>
                  <th className="text-start p-3">النوع</th>
                  <th className="text-start p-3">السعر</th>
                  <th className="text-start p-3">الحالة</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد خدمات</td></tr>}
                {list.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3"><Badge variant="secondary">{SERVICE_TYPE_AR[s.service_type]}</Badge></td>
                    <td className="p-3">{fmtMoney(s.unit_price)}</td>
                    <td className="p-3">{s.is_active ? <Badge className="bg-emerald-600">نشطة</Badge> : <Badge variant="outline">موقوفة</Badge>}</td>
                    <td className="p-3 text-end">
                      {canEdit && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل خدمة" : "خدمة جديدة"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>الاسم</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>النوع</Label>
                <Select value={editing.service_type} onValueChange={(v: any) => setEditing({ ...editing, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">تصليح</SelectItem>
                    <SelectItem value="ironing">كي</SelectItem>
                    <SelectItem value="both">تنظيف وكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>السعر</Label><Input type="number" value={editing.unit_price} onChange={(e) => setEditing({ ...editing, unit_price: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>نشطة</Label>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
