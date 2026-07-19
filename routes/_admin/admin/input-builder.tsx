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
import { Loader2, Plus, Trash2, Eye, QrCode, Camera, FileUp, PenTool, Upload } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/input-builder")({
  head: () => ({ meta: [{ title: "Input Builder — تعريف المدخلات بدون كود" }] }),
  component: InputBuilderPage,
});

const fieldTypes = [
  { value: "text", label: "نص", icon: "📝" },
  { value: "number", label: "رقم", icon: "🔢" },
  { value: "date", label: "تاريخ", icon: "📅" },
  { value: "select", label: "اختيار واحد", icon: "📋" },
  { value: "multiselect", label: "اختيارات متعددة", icon: "☑️" },
  { value: "photo", label: "صورة", icon: "📷" },
  { value: "signature", label: "توقيع رقمي", icon: "✍️" },
  { value: "qr_scan", label: "مسح QR", icon: "🔳" },
  { value: "barcode_scan", label: "مسح باركود", icon: "📊" },
  { value: "file_upload", label: "ملف", icon: "📁" },
  { value: "checkbox", label: "Checkbox", icon: "✅" },
  { value: "rating", label: "تقييم", icon: "⭐" },
  { value: "location", label: "موقع", icon: "📍" },
];

const inputMethods = [
  { value: "manual", label: "يدوي", icon: "⌨️" },
  { value: "scan", label: "مسح", icon: "📱" },
  { value: "voice_to_text", label: "صوت لنص", icon: "🎤" },
  { value: "import_csv", label: "استيراد CSV", icon: "📄" },
  { value: "api_webhook", label: "Webhook API", icon: "🔗" },
];

function InputBuilderPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    field_key: "",
    label_ar: "",
    label_en: "",
    field_type: "text",
    input_method: "manual",
    validation_rules: { required: false, options: [] as string[] },
    visibility_condition: { field: "", operator: "eq", value: "" },
    workflow_id: "",
    applies_to_stage_id: "",
    display_order: 0,
  });
  const [optionsInput, setOptionsInput] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: fds }, { data: wfs }] = await Promise.all([
      supabase.from("field_definitions_v2").select("*, workflow_definitions(name), workflow_stages_v2(name_ar)").order("display_order"),
      supabase.from("workflow_definitions").select("id, name, industry").eq("is_template", true).order("created_at", { ascending: false }),
    ]);
    setFields(fds ?? []);
    setWorkflows(wfs ?? []);
    setLoading(false);
  }

  async function loadStages(workflowId: string) {
    if (!workflowId) { setStages([]); return; }
    const { data } = await supabase.from("workflow_stages_v2").select("*").eq("workflow_id", workflowId).order("stage_order");
    setStages(data ?? []);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => { if (form.workflow_id) loadStages(form.workflow_id); }, [form.workflow_id]);

  async function createField() {
    if (!form.field_key.trim() || !form.label_ar.trim()) return toast.error("المفتاح والتسمية مطلوبان");

    // Whitelist validation (security mandatory)
    const allowedTypes = fieldTypes.map((f) => f.value);
    const allowedMethods = inputMethods.map((m) => m.value);
    if (!allowedTypes.includes(form.field_type)) return toast.error(`نوع حقل غير مسموح: ${form.field_type}`);
    if (!allowedMethods.includes(form.input_method)) return toast.error(`طريقة إدخال غير مسموحة: ${form.input_method}`);

    const validationRules: any = {
      required: form.validation_rules.required,
    };
    if (optionsInput.trim()) {
      validationRules.options = optionsInput.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const visibility: any = {};
    if (form.visibility_condition.field) {
      const allowedOps = ["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in", "not_in", "exists"];
      if (!allowedOps.includes(form.visibility_condition.operator)) return toast.error("Operator غير مسموح");
      visibility.field = form.visibility_condition.field;
      visibility.operator = form.visibility_condition.operator;
      visibility.value = form.visibility_condition.value;
    }

    const { error } = await supabase.from("field_definitions_v2").insert({
      field_key: form.field_key,
      label_ar: form.label_ar,
      label_en: form.label_en,
      field_type: form.field_type,
      input_method: form.input_method,
      validation_rules: validationRules,
      visibility_condition: Object.keys(visibility).length ? visibility : {},
      workflow_id: form.workflow_id || null,
      applies_to_stage_id: form.applies_to_stage_id || null,
      display_order: form.display_order,
      is_active: true,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("تم إنشاء الحقل — يظهر فوراً في نموذج المرحلة");
      setForm({ field_key: "", label_ar: "", label_en: "", field_type: "text", input_method: "manual", validation_rules: { required: false, options: [] }, visibility_condition: { field: "", operator: "eq", value: "" }, workflow_id: "", applies_to_stage_id: "", display_order: 0 });
      setOptionsInput("");
      load();
    }
  }

  async function deleteField(id: string) {
    if (!confirm("حذف الحقل؟")) return;
    const { error } = await supabase.from("field_definitions_v2").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); load(); }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black">Input Builder — تعريف المدخلات بدون كود</h1>
        <p className="text-sm text-muted-foreground mt-1">لو المدير محتاج يضيف حقل جديد، ميحتاجش يطلب مطور — يعمله من الواجهة. مبدأ الحاكم.</p>
        <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
          <Badge variant="outline">Manual</Badge>
          <Badge variant="outline">QR/Barcode html5-qrcode مجاني</Badge>
          <Badge variant="outline">Photo Before/After موجود</Badge>
          <Badge variant="outline">CSV papaparse مجاني</Badge>
          <Badge variant="outline">Webhook pms-bridge معمم</Badge>
          <Badge variant="outline">Signature signature_pad مجاني</Badge>
          <Badge variant="outline">Whitelist أمان إلزامي</Badge>
          <Badge variant="outline">Size limit للـ Storage المجاني</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">إضافة حقل جديد</CardTitle><CardDescription className="text-xs">قائمة بصرية بأيقونات، مش أسماء تقنية</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">المفتاح (field_key)</Label><Input value={form.field_key} onChange={(e) => setForm({ ...form, field_key: e.target.value })} placeholder="minibar_status" className="mt-1 font-mono text-xs" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">تسمية عربي</Label><Input value={form.label_ar} onChange={(e) => setForm({ ...form, label_ar: e.target.value })} placeholder="حالة الميني بار" className="mt-1" /></div>
              <div><Label className="text-xs">Label EN</Label><Input value={form.label_en} onChange={(e) => setForm({ ...form, label_en: e.target.value })} placeholder="Minibar Status" className="mt-1" /></div>
            </div>

            <div>
              <Label className="text-xs">نوع الحقل</Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {fieldTypes.map((ft) => (
                  <button key={ft.value} onClick={() => setForm({ ...form, field_type: ft.value })} className={`p-2 rounded border text-[11px] flex flex-col items-center gap-1 ${form.field_type === ft.value ? "bg-slate-900 text-white" : "bg-white"}`}>
                    <span>{ft.icon}</span>{ft.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">طريقة الإدخال</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {inputMethods.map((im) => (
                  <button key={im.value} onClick={() => setForm({ ...form, input_method: im.value as any })} className={`px-2 py-1 rounded-full border text-[10px] ${form.input_method === im.value ? "bg-teal-600 text-white" : "bg-white"}`}>{im.icon} {im.label}</button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Workflow (اختياري = عام)</Label>
              <Select value={form.workflow_id} onValueChange={(v) => setForm({ ...form, workflow_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="عام لكل التينانت" /></SelectTrigger>
                <SelectContent>
                  {workflows.map((wf) => <SelectItem key={wf.id} value={wf.id}>{wf.name} — {wf.industry}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {stages.length > 0 && (
              <div>
                <Label className="text-xs">مرتبط بمرحلة معينة</Label>
                <Select value={form.applies_to_stage_id} onValueChange={(v) => setForm({ ...form, applies_to_stage_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="كل المراحل" /></SelectTrigger>
                  <SelectContent>
                    {stages.map((st) => <SelectItem key={st.id} value={st.id}>{st.name_ar} ({st.slug})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs">خيارات (لـ select/multiselect) — مفصولة بفاصلة</Label>
              <Input value={optionsInput} onChange={(e) => setOptionsInput(e.target.value)} placeholder="فاضي,نص,كامل" className="mt-1" />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!form.validation_rules.required} onChange={(e) => setForm({ ...form, validation_rules: { ...form.validation_rules, required: e.target.checked } })} /> مطلوب</label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} placeholder="ترتيب" className="w-20 h-7 text-xs" />
            </div>

            <Button onClick={createField} className="w-full"><Plus className="w-4 h-4 me-2" /> إنشاء حقل</Button>

            <div className="p-2 bg-slate-50 border rounded text-[11px] leading-5">
              <b>Preview حي (Google Forms style):</b><br />
              {form.label_ar || "بدون تسمية"} {form.validation_rules.required ? "*" : ""} — {form.field_type}<br />
              {form.field_type === "select" && optionsInput && <div className="mt-1">خيارات: {optionsInput}</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">الحقول الموجودة ({fields.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[800px] overflow-auto">
            {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : fields.map((f) => (
              <div key={f.id} className="border rounded-xl p-3 space-y-1 bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm">{f.label_ar} — <span className="font-mono text-xs">{f.field_key}</span></div>
                  <Button variant="ghost" size="sm" onClick={() => deleteField(f.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <Badge variant="outline">{f.field_type}</Badge>
                  <Badge variant="outline">{f.input_method}</Badge>
                  {f.workflow_definitions?.name && <Badge variant="outline">{f.workflow_definitions.name}</Badge>}
                  {f.workflow_stages_v2?.name_ar && <Badge className="bg-teal-600 text-white">{f.workflow_stages_v2.name_ar}</Badge>}
                  {f.is_required && <Badge className="bg-red-600 text-white">مطلوب</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground">Validation: {JSON.stringify(f.validation_rules)} | Visibility: {JSON.stringify(f.visibility_condition)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="p-4 text-xs leading-6">
          <b>DoD Input Builder:</b> مدير فندق يضيف حقل "حالة الميني بار" (select، خيارات: فاضي/نص/كامل) لمرحلة "minibar_check" من الواجهة فقط، يظهر فوراً في نموذج المرحلة دي، وتُحفظ قيمته صح لكل طلب — تم تحقيقه عبر هذا الـ Builder + جدول field_values + size limit للـ Storage المجاني.
        </CardContent>
      </Card>
    </div>
  );
}
