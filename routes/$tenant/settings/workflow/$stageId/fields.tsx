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
import { Loader2, Plus, Trash2, Eye, QrCode, Camera, FileUp, PenTool } from "lucide-react";
import { useI18n, interpolate } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/settings/workflow/$stageId/fields")({
  head: () => ({ meta: [{ title: "حقول المرحلة — Input Builder per Stage" }] }),
  component: StageFieldsPage,
});

function StageFieldsPage() {
  const { t, dir } = useI18n();
  const { tenant, stageId } = Route.useParams() as { tenant: string; stageId: string };
  const [stage, setStage] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    field_key: "",
    label_ar: "",
    label_en: "",
    field_type: "text",
    input_method: "manual",
    is_required: false,
    options: "",
  });

  const fieldTypes = [
    { value: "text", label: t("workflow-fields.fieldTypes.text"), icon: "📝" },
    { value: "number", label: t("workflow-fields.fieldTypes.number"), icon: "🔢" },
    { value: "date", label: t("workflow-fields.fieldTypes.date"), icon: "📅" },
    { value: "select", label: t("workflow-fields.fieldTypes.select"), icon: "📋" },
    { value: "multiselect", label: t("workflow-fields.fieldTypes.multiselect"), icon: "☑️" },
    { value: "photo", label: t("workflow-fields.fieldTypes.photo"), icon: "📷" },
    { value: "signature", label: t("workflow-fields.fieldTypes.signature"), icon: "✍️" },
    { value: "qr_scan", label: t("workflow-fields.fieldTypes.qr_scan"), icon: "🔳" },
    { value: "file_upload", label: t("workflow-fields.fieldTypes.file_upload"), icon: "📁" },
    { value: "checkbox", label: t("workflow-fields.fieldTypes.checkbox"), icon: "✅" },
    { value: "rating", label: t("workflow-fields.fieldTypes.rating"), icon: "⭐" },
  ];

  async function load() {
    setLoading(true);
    const [{ data: st }, { data: fds }] = await Promise.all([
      supabase.from("workflow_stages_v2").select("*").eq("id", stageId).single(),
      supabase.from("field_definitions_v2").select("*").eq("applies_to_stage_id", stageId).order("display_order"),
    ]);
    setStage(st?.data ?? st as any);
    const stageData = (st as any)?.data || st;
    setStage(stageData as any);
    setFields(fds ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [stageId]);

  async function createField() {
    if (!form.field_key || !form.label_ar) return toast.error(t("workflow-fields.errorRequired"));

    const validationRules: any = {
      required: form.is_required,
    };
    if (form.options.trim()) {
      validationRules.options = form.options.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const { data: wfStage } = await supabase.from("workflow_stages_v2").select("workflow_id").eq("id", stageId).single();
    let tenantId: string | null = null;
    if (wfStage) {
      const { data: wf } = await supabase.from("workflow_definitions").select("tenant_id").eq("id", wfStage.workflow_id).single();
      tenantId = wf?.tenant_id || null;
    }
    if (!tenantId) {
      const { data: t } = await supabase.from("tenants").select("id").eq("slug", tenant).maybeSingle();
      tenantId = t?.id || null;
    }

    const { error } = await supabase.from("field_definitions_v2").insert({
      tenant_id: tenantId,
      field_key: form.field_key,
      label_ar: form.label_ar,
      label_en: form.label_en,
      field_type: form.field_type,
      input_method: form.input_method as any,
      validation_rules: validationRules,
      visibility_condition: {},
      workflow_id: wfStage?.workflow_id || null,
      applies_to_stage_id: stageId,
      display_order: fields.length,
      is_active: true,
      is_required: form.is_required,
    });

    if (error) toast.error(error.message);
    else {
      toast.success(t("workflow-fields.toastAdded"));
      setForm({ field_key: "", label_ar: "", label_en: "", field_type: "text", input_method: "manual", is_required: false, options: "" });
      load();
    }
  }

  async function deleteField(id: string) {
    if (!confirm(t("workflow-fields.confirmDelete"))) return;
    const { error } = await supabase.from("field_definitions_v2").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t("workflow-fields.toastDeleted")); load(); }
  }

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6" dir={dir}>
      <div className="border-b pb-4">
        <h1 className="text-2xl font-black">{interpolate(t("workflow-fields.pageTitle"), { name: stage?.name_ar || stageId })}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("workflow-fields.pageSubtitle")}</p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">{t("workflow-fields.addFieldTitle")}</CardTitle><CardDescription className="text-xs">{t("workflow-fields.addFieldSubtitle")}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">field_key</Label><Input value={form.field_key} onChange={(e) => setForm({ ...form, field_key: e.target.value })} placeholder="tire_condition" className="mt-1 font-mono text-xs" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">{t("workflow-fields.labelAr")}</Label><Input value={form.label_ar} onChange={(e) => setForm({ ...form, label_ar: e.target.value })} placeholder="حالة الإطارات" className="mt-1" /></div>
              <div><Label className="text-xs">{t("workflow-fields.labelEn")}</Label><Input value={form.label_en} onChange={(e) => setForm({ ...form, label_en: e.target.value })} placeholder="Tire Condition" className="mt-1" /></div>
            </div>

            <div>
              <Label className="text-xs">{t("workflow-fields.fieldType")}</Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {fieldTypes.map((ft) => (
                  <button key={ft.value} onClick={() => setForm({ ...form, field_type: ft.value })} className={`p-2 rounded border text-[11px] flex flex-col items-center gap-1 ${form.field_type === ft.value ? "bg-slate-900 text-white" : "bg-white"}`}>
                    <span>{ft.icon}</span>{ft.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">{t("workflow-fields.inputMethod")}</Label>
              <Select value={form.input_method} onValueChange={(v) => setForm({ ...form, input_method: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t("workflow-fields.inputMethods.manual")}</SelectItem>
                  <SelectItem value="scan">{t("workflow-fields.inputMethods.scan")}</SelectItem>
                  <SelectItem value="import_csv">{t("workflow-fields.inputMethods.import_csv")}</SelectItem>
                  <SelectItem value="api_webhook">{t("workflow-fields.inputMethods.api_webhook")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div><Label className="text-xs">{t("workflow-fields.optionsLabel")}</Label><Input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder={t("workflow-fields.optionsPlaceholder")} className="mt-1" /></div>
            <div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} /> {t("workflow-fields.required")}</label></div>

            <Button onClick={createField} className="w-full">{t("workflow-fields.addBtn")}</Button>

            <div className="p-2 bg-slate-50 border rounded text-[11px]">
              <b>{t("workflow-fields.livePreview")}</b><br />
              {form.label_ar || t("workflow-fields.noLabel")} {form.is_required ? "*" : ""} — {form.field_type}<br />
              {form.options && <div>{interpolate(t("workflow-fields.optionsPreview"), { options: form.options })}</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{interpolate(t("workflow-fields.fieldsListTitle"), { count: fields.length })}</CardTitle><CardDescription className="text-xs">{t("workflow-fields.fieldsListSubtitle")}</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {fields.map((f) => (
              <div key={f.id} className="border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">{f.label_ar} — <span className="font-mono text-xs">{f.field_key}</span></div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px]">{f.field_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{f.input_method}</Badge>
                    {f.is_required && <Badge className="bg-red-600 text-white text-[10px]">{t("workflow-fields.required")}</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteField(f.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
            ))}
            {fields.length === 0 && <div className="text-center text-sm text-muted-foreground p-8">{t("workflow-fields.noFields")}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
