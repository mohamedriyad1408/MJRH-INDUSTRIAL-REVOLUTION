import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, GripVertical, Save, Workflow, ShieldCheck } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_admin/admin/workflow-builder")({
  head: () => ({ meta: [{ title: "Workflow Builder v2 — محرك سير عمل مؤسسي" }] }),
  component: WorkflowBuilderPage,
});

type Stage = {
  id?: string;
  name_ar: string;
  name_en: string;
  slug: string;
  stage_order: number;
  required_role: string;
  sla_target_mins: number;
  sla_max_mins: number;
  required_fields: string[];
  icon: string;
  color: string;
  is_initial: boolean;
  is_final: boolean;
};

const defaultFields = [
  "room_number",
  "guest_status",
  "cleaning_type",
  "minibar_used",
  "maintenance_issue",
  "photo_url",
  "guest_name",
  "checkout_time",
  "floor",
];

function SortableStage({ stage, index, onChange, onRemove }: { stage: Stage; index: number; onChange: (s: Stage) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.slug || `stage-${index}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab p-1">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </button>
          <Badge variant="outline" className="font-mono text-xs">#{stage.stage_order}</Badge>
          <Input value={stage.slug} onChange={(e) => onChange({ ...stage, slug: e.target.value })} placeholder="slug (e.g. inspection)" className="w-32 h-7 text-xs" />
          {stage.is_initial && <Badge className="bg-emerald-600 text-white text-[10px]">Initial</Badge>}
          {stage.is_final && <Badge className="bg-slate-900 text-white text-[10px]">Final</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}><Trash2 className="w-4 h-4 text-red-500" /></Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">الاسم عربي</Label>
          <Input value={stage.name_ar} onChange={(e) => onChange({ ...stage, name_ar: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Name EN</Label>
          <Input value={stage.name_en} onChange={(e) => onChange({ ...stage, name_en: e.target.value })} className="mt-1" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">الدور المسؤول</Label>
          <Select value={stage.required_role} onValueChange={(v) => onChange({ ...stage, required_role: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cs_manager">خدمة عملاء</SelectItem>
              <SelectItem value="ops_manager">تشغيل</SelectItem>
              <SelectItem value="housekeeper">Housekeeper</SelectItem>
              <SelectItem value="housekeeping_supervisor">Housekeeping Supervisor</SelectItem>
              <SelectItem value="maintenance">صيانة</SelectItem>
              <SelectItem value="front_office">Front Office</SelectItem>
              <SelectItem value="employee">موظف عام</SelectItem>
              <SelectItem value="courier">مندوب</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">SLA Target (mins)</Label>
          <Input type="number" value={stage.sla_target_mins} onChange={(e) => onChange({ ...stage, sla_target_mins: Number(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">SLA Max (mins)</Label>
          <Input type="number" value={stage.sla_max_mins} onChange={(e) => onChange({ ...stage, sla_max_mins: Number(e.target.value) })} className="mt-1" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Icon</Label>
          <Input value={stage.icon} onChange={(e) => onChange({ ...stage, icon: e.target.value })} placeholder="🔍" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input type="color" value={stage.color} onChange={(e) => onChange({ ...stage, color: e.target.value })} className="mt-1 h-9" />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={stage.is_initial} onChange={(e) => onChange({ ...stage, is_initial: e.target.checked })} /> Initial</label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={stage.is_final} onChange={(e) => onChange({ ...stage, is_final: e.target.checked })} /> Final</label>
        </div>
      </div>

      <div>
        <Label className="text-xs">Required Fields (whitelist)</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {defaultFields.map((f) => (
            <label key={f} className={`text-[10px] px-2 py-1 rounded-full border cursor-pointer ${stage.required_fields.includes(f) ? "bg-slate-900 text-white" : "bg-white"}`}>
              <input type="checkbox" className="hidden" checked={stage.required_fields.includes(f)} onChange={(e) => {
                if (e.target.checked) onChange({ ...stage, required_fields: [...stage.required_fields, f] });
                else onChange({ ...stage, required_fields: stage.required_fields.filter((x) => x !== f) });
              }} /> {f}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowBuilderPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "اختبار عام - 5 مراحل", name_en: "Generic Test - 5 Stages", industry: "test", is_template: true });
  const [stages, setStages] = useState<Stage[]>([
    { name_ar: "استلام", name_en: "Intake", slug: "intake", stage_order: 1, required_role: "cs_manager", sla_target_mins: 60, sla_max_mins: 120, required_fields: [], icon: "📥", color: "#0d9488", is_initial: true, is_final: false },
    { name_ar: "تشخيص", name_en: "Diagnosis", slug: "diagnosis", stage_order: 2, required_role: "ops_manager", sla_target_mins: 120, sla_max_mins: 240, required_fields: [], icon: "🔍", color: "#3b82f6", is_initial: false, is_final: false },
    { name_ar: "تنفيذ", name_en: "Execution", slug: "execution", stage_order: 3, required_role: "employee", sla_target_mins: 240, sla_max_mins: 480, required_fields: [], icon: "⚙️", color: "#8b5cf6", is_initial: false, is_final: false },
    { name_ar: "جودة", name_en: "Quality", slug: "qc", stage_order: 4, required_role: "ops_manager", sla_target_mins: 60, sla_max_mins: 120, required_fields: [], icon: "✅", color: "#f59e0b", is_initial: false, is_final: false },
    { name_ar: "تسليم", name_en: "Delivery", slug: "delivery", stage_order: 5, required_role: "courier", sla_target_mins: 60, sla_max_mins: 120, required_fields: [], icon: "🚚", color: "#10b981", is_initial: false, is_final: true },
  ]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  async function loadWorkflows() {
    setLoading(true);
    const { data } = await supabase.from("workflow_definitions").select("*").order("created_at", { ascending: false }).limit(50);
    setWorkflows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadWorkflows(); }, []);

  async function loadWorkflow(id: string) {
    setSelectedId(id);
    const { data: wf } = await supabase.from("workflow_definitions").select("*").eq("id", id).single();
    if (!wf) return;
    setForm({ name: wf.name, name_en: wf.name_en || "", industry: wf.industry, is_template: wf.is_template });
    const { data: stgs } = await supabase.from("workflow_stages_v2").select("*").eq("workflow_id", id).order("stage_order");
    if (stgs) {
      setStages(stgs.map((s: any) => ({
        id: s.id,
        name_ar: s.name_ar,
        name_en: s.name_en || "",
        slug: s.slug,
        stage_order: s.stage_order,
        required_role: s.required_role || "employee",
        sla_target_mins: s.sla_target_mins,
        sla_max_mins: s.sla_max_mins,
        required_fields: Array.isArray(s.required_fields) ? s.required_fields : [],
        icon: s.icon || "📦",
        color: s.color || "#0d9488",
        is_initial: s.is_initial,
        is_final: s.is_final,
      })));
    }
  }

  async function saveWorkflow() {
    setSaving(true);
    try {
      let workflowId = selectedId;

      if (!workflowId) {
        const { data, error } = await supabase.from("workflow_definitions").insert({
          name: form.name,
          name_en: form.name_en,
          industry: form.industry,
          is_template: form.is_template,
          is_active: true,
        }).select().single();
        if (error) throw error;
        workflowId = data.id;
        setSelectedId(workflowId);
      } else {
        const { error } = await supabase.from("workflow_definitions").update({
          name: form.name,
          name_en: form.name_en,
          industry: form.industry,
          is_template: form.is_template,
        }).eq("id", workflowId);
        if (error) throw error;
      }

      // Validate whitelist for condition_json server-side (mandatory)
      // Here stages required_fields must be from allowed list
      const allowedFields = ["room_number", "guest_status", "cleaning_type", "minibar_used", "maintenance_issue", "photo_url", "guest_name", "checkout_time", "floor", "intake_photo_url", "delivery_photo_url", "custom_fields"];
      for (const st of stages) {
        for (const rf of st.required_fields) {
          if (!allowedFields.includes(rf)) {
            throw new Error(`Field ${rf} not allowed — whitelist: ${allowedFields.join(", ")}`);
          }
        }
      }

      // Delete existing stages and recreate (simple for v1 of builder)
      await supabase.from("workflow_stages_v2").delete().eq("workflow_id", workflowId);

      for (let i = 0; i < stages.length; i++) {
        const s = { ...stages[i], stage_order: i + 1 };
        const { data: inserted, error } = await supabase.from("workflow_stages_v2").insert({
          workflow_id: workflowId,
          name_ar: s.name_ar,
          name_en: s.name_en,
          slug: s.slug,
          stage_order: s.stage_order,
          required_role: s.required_role,
          sla_target_mins: s.sla_target_mins,
          sla_max_mins: s.sla_max_mins,
          required_fields: s.required_fields,
          icon: s.icon,
          color: s.color,
          is_initial: s.is_initial,
          is_final: s.is_final,
        }).select().single();
        if (error) throw error;

        // Update local id for transitions
        stages[i].id = inserted.id;
      }

      // Create linear transitions (for Phase 1 simple) — in real builder user would define custom
      await supabase.from("workflow_transitions").delete().eq("workflow_id", workflowId);
      for (let i = 0; i < stages.length - 1; i++) {
        const from = stages[i];
        const to = stages[i + 1];
        // Whitelist validation for condition_json
        const cond: any = {};
        if (from.slug === "qc") cond.requires_qc = true;
        // Server-side whitelist check (mandatory) — already done in DB trigger validate_transition_condition

        await supabase.from("workflow_transitions").insert({
          workflow_id: workflowId,
          from_stage_id: from.id,
          to_stage_id: to.id,
          condition_json: cond,
          required_role: to.required_role,
        });
      }

      toast.success("تم حفظ الـ Workflow بنجاح — بدون كود مغسلة");
      loadWorkflows();
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setStages((items) => {
        const oldIndex = items.findIndex((i) => i.slug === active.id);
        const newIndex = items.findIndex((i) => i.slug === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((it, idx) => ({ ...it, stage_order: idx + 1 }));
      });
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Workflow className="w-6 h-6" /> Workflow Builder v2 — محرك مؤسسي عام</h1>
          <p className="text-sm text-muted-foreground mt-1">مدير غير تقني ينشئ مرحلة جديدة من الواجهة بدون كود — Zero-cost, dnd-kit مجاني، تحقق Whitelist إلزامي</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs"><ShieldCheck className="w-3 h-3 me-1" /> Condition whitelist server-side</Badge>
            <Badge variant="outline" className="text-xs">Feature Flag: workflow_engine_version v1/v2</Badge>
            <Badge variant="outline" className="text-xs">Snapshot: work_orders.workflow_version_snapshot</Badge>
          </div>
        </div>
        <Button onClick={saveWorkflow} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />} حفظ Workflow</Button>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">القوالب الموجودة</CardTitle><CardDescription className="text-xs">اختر للتعديل أو أنشئ جديد</CardDescription></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-auto">
            <Button variant="outline" className="w-full" onClick={() => { setSelectedId(null); setForm({ name: "قالب جديد", name_en: "New Template", industry: "generic", is_template: true }); setStages([]); }}>+ قالب جديد</Button>
            {workflows.map((wf) => (
              <div key={wf.id} onClick={() => loadWorkflow(wf.id)} className={`p-3 border rounded-xl cursor-pointer hover:bg-slate-50 ${selectedId === wf.id ? "bg-slate-900 text-white" : "bg-white"}`}>
                <div className="font-bold text-sm">{wf.name}</div>
                <div className="text-xs opacity-70">{wf.industry} • v{wf.version} {wf.is_template ? "• Template" : ""}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">تعريف الـ Workflow</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div><Label className="text-xs">الاسم عربي</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Name EN</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="mt-1" /></div>
              <div>
                <Label className="text-xs">Industry</Label>
                <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">test (للاختبار)</SelectItem>
                    <SelectItem value="hospitality">hospitality (فندق)</SelectItem>
                    <SelectItem value="generic">generic</SelectItem>
                    <SelectItem value="cleaning">cleaning</SelectItem>
                    <SelectItem value="laundry">laundry (legacy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_template} onChange={(e) => setForm({ ...form, is_template: e.target.checked })} /> Template عام</label></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-base">المراحل — Stages (قابلة للتشكيل)</CardTitle><CardDescription className="text-xs">اسحب لإعادة الترتيب — بدون كود مغسلة — كل مرحلة تحفظ في workflow_stages_v2</CardDescription></div>
              <Button size="sm" variant="outline" onClick={() => setStages([...stages, { name_ar: "مرحلة جديدة", name_en: "New Stage", slug: `stage_${stages.length + 1}`, stage_order: stages.length + 1, required_role: "employee", sla_target_mins: 60, sla_max_mins: 120, required_fields: [], icon: "📦", color: "#0d9488", is_initial: false, is_final: false }])}><Plus className="w-4 h-4 me-1" /> إضافة مرحلة</Button>
            </CardHeader>
            <CardContent>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={stages.map((s) => s.slug)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {stages.map((st, idx) => (
                      <SortableStage key={st.slug} stage={st} index={idx} onChange={(newSt) => setStages(stages.map((s, i) => i === idx ? newSt : s))} onRemove={() => setStages(stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stage_order: i + 1 })))} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {stages.length === 0 && <div className="text-center text-sm text-muted-foreground p-8">لا توجد مراحل — أضف مراحل من الزر فوق</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
