import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Palette, Check, Settings2, Workflow, Download, Upload, FileJson } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/settings/workflow")({
  head: () => ({ meta: [{ title: "إعدادات مراحل العمل — MJRH" }] }),
  component: WorkflowSettingsPage,
});

type Stage = {
  id?: string;
  name: string;
  name_en: string;
  slug: string;
  stage_order: number;
  icon: string;
  color: string;
  is_initial: boolean;
  is_final: boolean;
  is_active: boolean;
};

type Template = {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  description: string;
  icon: string;
  stages: Stage[];
};

const ICON_OPTIONS = ["📦", "📥", "🏷️", "✨", "💧", "💨", "👔", "✅", "🚚", "🔧", "🔍", "🧹", "🚗", "🏠", "🍽️", "👨‍🍳", "📅", "👥", "👍", "📋", "⚙️", "🔬", "📐", "🧵", "🪡", "🧺"];
const COLOR_OPTIONS = ["#0d9488", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#f59e0b", "#f97316", "#ef4444", "#10b981", "#14b8a6", "#06b6d4", "#ec4899"];

function WorkflowSettingsPage() {
  const { tenantId, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showNewStage, setShowNewStage] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newStage, setNewStage] = useState<Partial<Stage>>({ name: "", name_en: "", slug: "", icon: "📦", color: "#0d9488" });

  const canEdit = hasRole("owner");
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [stagesRes, templatesRes] = await Promise.all([
      supabase.rpc("get_workflow_stages", { _tenant_id: tenantId }),
      supabase.from("workflow_templates").select("*").eq("is_active", true).order("name"),
    ]);
    setStages((stagesRes.data ?? []) as Stage[]);
    setTemplates((templatesRes.data ?? []) as Template[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  async function applyTemplate(templateSlug: string) {
    if (!tenantId) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("apply_workflow_template", { _tenant_id: tenantId, _template_slug: templateSlug });
    if (error) toast.error(error.message);
    else { toast.success(`تم تطبيق القالب (${data} مرحلة)`); setShowTemplates(false); load(); }
    setSaving(false);
  }

  async function addStage() {
    if (!tenantId || !newStage.name?.trim()) return toast.error("أدخل اسم المرحلة");
    const slug = newStage.slug?.trim() || newStage.name!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setSaving(true);
    const { error } = await supabase.from("workflow_stages").insert({
      tenant_id: tenantId,
      name: newStage.name!.trim(),
      name_en: newStage.name_en?.trim() || newStage.name!.trim(),
      slug,
      stage_order: stages.length + 1,
      icon: newStage.icon || "📦",
      color: newStage.color || "#0d9488",
      is_active: true,
    });
    if (error) toast.error(error.message);
    else { toast.success("تمت إضافة المرحلة"); setShowNewStage(false); setNewStage({ name: "", name_en: "", slug: "", icon: "📦", color: "#0d9488" }); load(); }
    setSaving(false);
  }

  async function removeStage(stageId: string) {
    const { error } = await supabase.from("workflow_stages").update({ is_active: false }).eq("id", stageId);
    if (error) toast.error(error.message);
    else { toast.success("تم حذف المرحلة"); load(); }
  }

  async function moveStage(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= stages.length) return;
    const updated = [...stages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((s, i) => { s.stage_order = i + 1; });
    setStages(updated);
    setSaving(true);
    for (const s of updated) {
      if (s.id) await supabase.from("workflow_stages").update({ stage_order: s.stage_order }).eq("id", s.id);
    }
    setSaving(false);
    toast.success("تم تحديث الترتيب");
  }

  async function exportWorkflow() {
    if (!tenantId) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("export_workflow_template", { _tenant_id: tenantId });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workflow-${tenantId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير Workflow كـ JSON");
    }
  }

  async function importWorkflow(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setSaving(true);
      const { data, error } = await supabase.rpc("import_workflow_template", { _tenant_id: tenantId, _payload: json });
      setSaving(false);
      if (error) throw error;
      toast.success(`تم استيراد ${data} مراحل`);
      load();
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message || "فشل الاستيراد");
    }
  }

  if (!canEdit) return <Card><CardContent className="p-10 text-center text-muted-foreground">إعدادات مراحل العمل للمالك فقط.</CardContent></Card>;
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Workflow className="w-7 h-7 text-teal-600" /> إعدادات مراحل العمل</h1>
          <p className="text-sm text-muted-foreground">عرّف محطات العمل حسب نشاطك. كل مشروع له workflow مختلف.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportWorkflow} disabled={saving}><Download className="w-4 h-4 me-1" /> تصدير JSON</Button>
          <label className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer">
            <Upload className="w-4 h-4 me-1" /> استيراد JSON
            <input type="file" accept=".json" className="hidden" onChange={importWorkflow} />
          </label>
          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings2 className="w-4 h-4 ms-1" /> استخدام قالب جاهز</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" dir={dir}>
              <DialogHeader><DialogTitle>اختر قالب نشاطك</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {templates.map((tpl) => (
                  <button key={tpl.id} onClick={() => applyTemplate(tpl.slug)} className="text-start rounded-2xl border p-4 hover:shadow-lg hover:border-teal-300 transition active:scale-[0.98]">
                    <div className="flex items-center gap-2 font-black text-lg"><span>{tpl.icon}</span> {tpl.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">{tpl.name_en}</div>
                    <div className="text-sm text-muted-foreground mt-2">{tpl.description}</div>
                    <Badge variant="secondary" className="mt-2">{(tpl.stages as unknown as Stage[]).length} مراحل</Badge>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewStage} onOpenChange={setShowNewStage}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 ms-1" /> إضافة مرحلة</Button>
            </DialogTrigger>
            <DialogContent dir={dir}>
              <DialogHeader><DialogTitle>إضافة مرحلة جديدة</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>اسم المرحلة *</Label><Input value={newStage.name || ""} onChange={(e) => setNewStage({ ...newStage, name: e.target.value })} placeholder="مثال: الكي" className="mt-1" /></div>
                <div><Label>الاسم بالإنجليزي</Label><Input value={newStage.name_en || ""} onChange={(e) => setNewStage({ ...newStage, name_en: e.target.value })} placeholder="Ironing" className="mt-1" /></div>
                <div><Label>الأيقونة</Label>
                  <div className="flex flex-wrap gap-2 mt-1">{ICON_OPTIONS.map((ic) => (
                    <button key={ic} onClick={() => setNewStage({ ...newStage, icon: ic })} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition ${newStage.icon === ic ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-400"}`}>{ic}</button>
                  ))}</div>
                </div>
                <div><Label>اللون</Label>
                  <div className="flex flex-wrap gap-2 mt-1">{COLOR_OPTIONS.map((c) => (
                    <button key={c} onClick={() => setNewStage({ ...newStage, color: c })} className={`w-8 h-8 rounded-full border-2 transition ${newStage.color === c ? "border-slate-900 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}</div>
                </div>
                <Button onClick={addStage} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة المرحلة"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stages List */}
      {stages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-4">
            <div className="text-4xl">🔧</div>
            <h2 className="text-xl font-black">لم يتم تعريف مراحل العمل بعد</h2>
            <p className="text-muted-foreground">اختر قالب جاهز أو أضف مراحل يدوياً</p>
            <Button onClick={() => setShowTemplates(true)}>ابدأ بقالب جاهز ←</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, i) => (
            <Card key={stage.id || stage.slug} className="hover:shadow-md transition">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStage(i, -1)} disabled={i === 0 || saving}><ArrowUp className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1 || saving}><ArrowDown className="w-3 h-3" /></Button>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: stage.color + "20", color: stage.color }}>{stage.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-lg">{stage.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{stage.slug}</div>
                </div>
                <div className="flex items-center gap-2">
                  {stage.is_initial && <Badge className="bg-teal-600">بداية</Badge>}
                  {stage.is_final && <Badge className="bg-emerald-600">نهاية</Badge>}
                  <Badge variant="outline" className="font-mono">#{stage.stage_order}</Badge>
                  {stage.id && <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => removeStage(stage.id!)}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Workflow Preview */}
      {stages.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4 text-teal-600" /> معاينة مسار العمل</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {stages.map((stage, i) => (
                <div key={stage.slug} className="flex items-center gap-2">
                  <div className="rounded-xl px-3 py-2 text-sm font-bold text-white flex items-center gap-1.5" style={{ backgroundColor: stage.color }}>
                    <span>{stage.icon}</span> {stage.name}
                  </div>
                  {i < stages.length - 1 && <span className="text-muted-foreground font-bold">→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
