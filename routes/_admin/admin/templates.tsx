import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2, Star, Download, Store } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_admin/admin/templates")({
  head: () => ({ meta: [{ title: "قوالب سير العمل - إدارة المنصة" }] }),
  component: AdminTemplatesPage,
});

type Template = {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  stages: any[];
  is_active: boolean;
  is_featured: boolean;
  downloads: number;
  price: number;
};

function AdminTemplatesPage() {
  const { dir } = useI18n();
  const { isSuperAdmin } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("workflow_templates").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTemplates((data ?? []) as Template[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.name || !editing?.slug) return toast.error("الاسم والرابط مطلوبان");
    setSaving(true);
    const payload = {
      name: editing.name,
      name_en: editing.name_en || editing.name,
      slug: editing.slug,
      description: editing.description || "",
      icon: editing.icon || "📋",
      category: editing.category || "general",
      stages: editing.stages || [],
      is_active: editing.is_active ?? true,
      is_featured: editing.is_featured ?? false,
      price: editing.price || 0,
    };
    const { error } = editing.id
      ? await supabase.from("workflow_templates").update(payload).eq("id", editing.id)
      : await supabase.from("workflow_templates").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحفظ");
      setOpen(false);
      setEditing(null);
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("حذف القالب؟")) return;
    const { error } = await supabase.from("workflow_templates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); load(); }
  }

  if (!isSuperAdmin) return <Card><CardContent className="p-10 text-center">للمنصة فقط</CardContent></Card>;
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Store className="w-6 h-6 text-teal-600" /> قوالب سير العمل (Marketplace)</h1>
          <p className="text-sm text-muted-foreground">إدارة قوالب الأنشطة الجاهزة التي يختارها العملاء عند التسجيل</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ name: "", slug: "", icon: "📋", category: "general", stages: [], is_active: true, is_featured: false })}><Plus className="w-4 h-4 me-1" /> قالب جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
            <DialogHeader><DialogTitle>{editing?.id ? "تعديل قالب" : "قالب جديد"}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الاسم عربي *</Label><Input value={editing?.name || ""} onChange={e => setEditing({ ...editing!, name: e.target.value })} className="mt-1" /></div>
                <div><Label>الاسم إنجليزي</Label><Input value={editing?.name_en || ""} onChange={e => setEditing({ ...editing!, name_en: e.target.value })} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Slug *</Label><Input value={editing?.slug || ""} onChange={e => setEditing({ ...editing!, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="mt-1 font-mono" /></div>
                <div><Label>الفئة</Label><Input value={editing?.category || ""} onChange={e => setEditing({ ...editing!, category: e.target.value })} placeholder="laundry, carwash, repair..." className="mt-1" /></div>
              </div>
              <div><Label>الوصف</Label><Textarea value={editing?.description || ""} onChange={e => setEditing({ ...editing!, description: e.target.value })} className="mt-1" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>أيقونة</Label><Input value={editing?.icon || ""} onChange={e => setEditing({ ...editing!, icon: e.target.value })} className="mt-1" /></div>
                <div><Label>السعر</Label><Input type="number" value={editing?.price || 0} onChange={e => setEditing({ ...editing!, price: Number(e.target.value) })} className="mt-1" /></div>
                <div className="flex flex-col gap-2 mt-6">
                  <label className="flex items-center gap-2 text-sm"><Switch checked={editing?.is_featured || false} onCheckedChange={v => setEditing({ ...editing!, is_featured: v })} /> مميز</label>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={editing?.is_active ?? true} onCheckedChange={v => setEditing({ ...editing!, is_active: v })} /> نشط</label>
                </div>
              </div>
              <div><Label>Stages JSON</Label><Textarea value={JSON.stringify(editing?.stages || [], null, 2)} onChange={e => { try { setEditing({ ...editing!, stages: JSON.parse(e.target.value) }); } catch {} }} rows={10} className="mt-1 font-mono text-xs" /></div>
              <Button onClick={save} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tpl => (
          <Card key={tpl.id} className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="text-2xl">{tpl.icon}</span> {tpl.name}</span>
                {tpl.is_featured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
              </CardTitle>
              <div className="text-xs text-muted-foreground">{tpl.name_en} • {tpl.category}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{tpl.description}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{tpl.stages?.length || 0} مراحل</Badge>
                <Badge variant="secondary">{tpl.downloads} تحميل</Badge>
                <Badge>{tpl.price === 0 ? "مجاني" : `${tpl.price} $`}</Badge>
                {tpl.is_active ? <Badge className="bg-emerald-600">نشط</Badge> : <Badge variant="destructive">موقف</Badge>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(tpl); setOpen(true); }}><Edit className="w-3 h-3 me-1" /> تعديل</Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(tpl.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
