import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Building2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_app/branches")({
  head: () => ({ meta: [{ title: "نقاط التشغيل" }] }),
  component: BranchesPage,
});

type Branch = { id: string; name: string; address: string | null; phone: string | null; is_active: boolean };

function BranchesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner");
  const [list, setList] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Branch> | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("branches").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Branch[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.name) return toast.error("الاسم مطلوب");
    const payload = { name: editing.name, address: editing.address || null, phone: editing.phone || null, is_active: editing.is_active ?? true };
    const { error } = editing.id
      ? await supabase.from("branches").update(payload).eq("id", editing.id)
      : await supabase.from("branches").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ"); setOpen(false); load();
  }

  if (!canEdit) return <Card className="p-8 text-center">صلاحية مالك المغسلة فقط.</Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> نقاط التشغيل</h1>
        <Button onClick={() => { setEditing({ name: "", is_active: true }); setOpen(true); }}>
          <Plus className="w-4 h-4 ms-1" /> نقطة جديدة
        </Button>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="font-bold">{b.name}</div>
                  <Badge variant={b.is_active ? "default" : "outline"}>{b.is_active ? "نشطة" : "موقوفة"}</Badge>
                </div>
                {b.address && <div className="text-xs text-muted-foreground">{b.address}</div>}
                {b.phone && <div className="text-xs">{b.phone}</div>}
                <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}>
                  <Pencil className="w-3 h-3 ms-1" /> تعديل
                </Button>
              </CardContent>
            </Card>
          ))}
          {!list.length && <Card className="p-8 text-center text-muted-foreground col-span-full">لا توجد نقاط تشغيل</Card>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل" : "نقطة جديدة"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>الاسم *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>العنوان</Label><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div><Label>التليفون</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
