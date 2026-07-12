import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Building2, Users, CreditCard, Sparkles, ArrowLeft, ArrowRight, Bell, Palette, ShieldCheck, Workflow, GitBranch, Settings2 } from "lucide-react";
import { buildCoreSetupPayload, CORE_SETUP_STEPS, DEFAULT_CORE_DEPARTMENTS, DEFAULT_SETUP_FORM, type SetupFormState } from "@/lib/core-platform";

export const Route = createFileRoute("/$tenant/onboarding")({
  head: () => ({ meta: [{ title: "MJRH Core Platform Setup Wizard" }] }),
  component: CoreSetupWizardPage,
});

const DAYS = [
  { key: "sat", label: "السبت" }, { key: "sun", label: "الأحد" }, { key: "mon", label: "الإثنين" },
  { key: "tue", label: "الثلاثاء" }, { key: "wed", label: "الأربعاء" }, { key: "thu", label: "الخميس" }, { key: "fri", label: "الجمعة" },
];

function mergeSetup(profile: any, tenant: any): SetupFormState {
  const raw = profile?.raw_setup || {};
  const org = raw.organization || profile?.organization || {};
  return {
    ...DEFAULT_SETUP_FORM,
    organizationName: org.name || tenant?.name || DEFAULT_SETUP_FORM.organizationName,
    industry: org.industry || DEFAULT_SETUP_FORM.industry,
    businessType: org.business_type || tenant?.business_type || DEFAULT_SETUP_FORM.businessType,
    country: org.country || DEFAULT_SETUP_FORM.country,
    currency: org.currency || DEFAULT_SETUP_FORM.currency,
    languages: org.languages || DEFAULT_SETUP_FORM.languages,
    timezone: org.timezone || DEFAULT_SETUP_FORM.timezone,
    branches: raw.branches || profile?.branches || DEFAULT_SETUP_FORM.branches,
    departments: raw.departments || DEFAULT_CORE_DEPARTMENTS,
    workingHours: raw.working_hours || profile?.working_hours || DEFAULT_SETUP_FORM.workingHours,
    tax: raw.tax || profile?.tax || DEFAULT_SETUP_FORM.tax,
    operationalModel: raw.operational_model || profile?.operational_model || DEFAULT_SETUP_FORM.operationalModel,
    workflowStyle: raw.workflow_style || profile?.workflow_style || DEFAULT_SETUP_FORM.workflowStyle,
    accounting: raw.accounting || profile?.accounting || DEFAULT_SETUP_FORM.accounting,
    roles: raw.roles || DEFAULT_SETUP_FORM.roles,
    notifications: raw.notifications || profile?.notifications || DEFAULT_SETUP_FORM.notifications,
    numbering: raw.document_numbering || profile?.document_numbering || DEFAULT_SETUP_FORM.numbering,
    approvals: raw.approvals || profile?.approvals || DEFAULT_SETUP_FORM.approvals,
    branding: raw.branding || profile?.branding || DEFAULT_SETUP_FORM.branding,
  };
}

function CoreSetupWizardPage() {
  const { tenantId } = useAuth();
  const { dir } = useI18n();
  const nav = useNavigate();
  const { tenant } = Route.useParams() as { tenant: string };
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [customDepartmentName, setCustomDepartmentName] = useState("");
  const [form, setForm] = useState<SetupFormState>(DEFAULT_SETUP_FORM);

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const [profileRes, onboardingRes, tenantRes] = await Promise.all([
      supabase.from("core_setup_profiles").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenant_onboarding").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenants").select("name,business_type").eq("id", tenantId).maybeSingle(),
    ]);
    setForm(mergeSetup(profileRes.data, tenantRes.data));
    setStep(Math.min(Math.max(onboardingRes.data?.current_step || 1, 1), 8));
    setIsCompleted(Boolean(onboardingRes.data?.is_completed && profileRes.data?.status === "completed"));
    setLoading(false);
  }

  useEffect(() => { load(); }, [tenantId]);

  function update<K extends keyof SetupFormState>(key: K, value: SetupFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: string, checked: boolean) {
    const days = checked ? Array.from(new Set([...form.workingHours.days, day])) : form.workingHours.days.filter((d) => d !== day);
    update("workingHours", { ...form.workingHours, days });
  }

  function toggleLanguage(lang: string, checked: boolean) {
    const languages = checked ? Array.from(new Set([...form.languages, lang])) : form.languages.filter((l) => l !== lang);
    update("languages", languages.length ? languages : ["ar"]);
  }

  function validateStep(targetStep = step) {
    if (targetStep >= 1) {
      if (!form.organizationName.trim()) return "اسم المنظمة مطلوب";
      if (!form.industry.trim()) return "الصناعة مطلوبة كإعداد، وليست كود داخل المنصة";
      if (!form.businessType.trim()) return "نوع النشاط مطلوب كإعداد";
    }
    if (targetStep >= 2 && !form.branches.some((b) => b.name.trim())) return "أضف فرعاً واحداً على الأقل";
    if (targetStep >= 3 && !form.departments.some((d) => d.enabled)) return "يجب تفعيل قسم واحد على الأقل";
    return null;
  }

  async function saveDraft(nextStep?: number) {
    if (!tenantId) return;
    const err = validateStep(step);
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const payload = buildCoreSetupPayload(form);
      const { error: profileError } = await supabase.from("core_setup_profiles").upsert({
        tenant_id: tenantId,
        status: "draft",
        organization: payload.organization,
        branches: payload.branches,
        working_hours: payload.working_hours,
        tax: payload.tax,
        operational_model: payload.operational_model,
        workflow_style: payload.workflow_style,
        accounting: payload.accounting,
        notifications: payload.notifications,
        document_numbering: payload.document_numbering,
        approvals: payload.approvals,
        branding: payload.branding,
        raw_setup: payload,
      }, { onConflict: "tenant_id" });
      if (profileError) throw profileError;

      const target = nextStep || step;
      const { error: onboardingError } = await supabase.from("tenant_onboarding").upsert({
        tenant_id: tenantId,
        current_step: target,
        completed_steps: CORE_SETUP_STEPS.filter((s) => s.id < target).map((s) => s.id),
        branch_data: payload.branches,
        catalog_choice: "manual",
        staff_data: payload.roles,
        payment_method: payload.accounting.basis,
        is_completed: false,
      }, { onConflict: "tenant_id" });
      if (onboardingError) throw onboardingError;
      setStep(target);
      toast.success("تم حفظ إعدادات نظام التشغيل");
    } catch (e: any) {
      toast.error(e.message || "تعذر حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  async function completeSetup() {
    if (!tenantId) return;
    const err = validateStep(8);
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const payload = buildCoreSetupPayload(form);
      const { error, data } = await supabase.rpc("complete_mjrh_core_setup", { _tenant_id: tenantId, _setup: payload });
      if (error) throw error;
      setIsCompleted(true);
      toast.success(`تم توليد MJRH Core Platform — ${data?.departments || 0} أقسام`);
      nav({ to: `/${tenant}/dashboard` as any, replace: true });
    } catch (e: any) {
      toast.error(e.message || "تعذر توليد المنصة");
    } finally {
      setSaving(false);
    }
  }

  const next = () => saveDraft(Math.min(step + 1, 8));
  const prev = () => setStep(Math.max(step - 1, 1));

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6" dir={dir}>
      <div className="text-center space-y-3">
        <Badge className="bg-slate-950 text-white hover:bg-slate-950 px-4 py-1.5 rounded-full">
          <Sparkles className="w-3 h-3 ms-1" /> Mandatory MJRH Core Platform Setup
        </Badge>
        <h1 className="text-3xl md:text-4xl font-black">معالج بناء نظام التشغيل</h1>
        <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
          هذه ليست شاشة إعداد مغسلة. كل إجابة هنا تتحول إلى Configuration يبني منصة عامة: Actors, Departments, Workflows, Tasks, Documents, Financial Events, Reports, Notifications.
        </p>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 pt-3">
          {CORE_SETUP_STEPS.map((s) => (
            <button key={s.id} onClick={() => setStep(s.id)} className={`rounded-2xl border p-2 text-center transition ${step === s.id ? "bg-slate-950 text-white border-slate-950" : step > s.id ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-white hover:bg-slate-50"}`}>
              <div className="font-black text-sm">{step > s.id ? <CheckCircle2 className="w-4 h-4 mx-auto" /> : s.id}</div>
              <div className="text-[10px] font-bold mt-1 truncate">{s.title}</div>
            </button>
          ))}
        </div>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step === 1 && <><Building2 className="w-5 h-5" /> 1. الهوية الأساسية</>}
            {step === 2 && <><GitBranch className="w-5 h-5" /> 2. الفروع وساعات العمل</>}
            {step === 3 && <><Users className="w-5 h-5" /> 3. Department Engine</>}
            {step === 4 && <><Workflow className="w-5 h-5" /> 4. Workflow Engine</>}
            {step === 5 && <><CreditCard className="w-5 h-5" /> 5. Financial Engine</>}
            {step === 6 && <><ShieldCheck className="w-5 h-5" /> 6. Permissions & Approvals</>}
            {step === 7 && <><Bell className="w-5 h-5" /> 7. Notifications & Branding</>}
            {step === 8 && <><Settings2 className="w-5 h-5" /> 8. Generate Platform</>}
          </CardTitle>
          <CardDescription>{CORE_SETUP_STEPS.find((s) => s.id === step)?.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Organization Name *</Label><Input className="mt-1" value={form.organizationName} onChange={(e) => update("organizationName", e.target.value)} placeholder="MJRH Client Company" /></div>
              <div><Label>Industry *</Label><Input className="mt-1" value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="مثال: Healthcare / Manufacturing / Hospitality" /></div>
              <div><Label>Business Type *</Label><Input className="mt-1" value={form.businessType} onChange={(e) => update("businessType", e.target.value)} placeholder="مثال: Hospital / Hotel / Factory" /></div>
              <div><Label>Country</Label><Input className="mt-1" value={form.country} onChange={(e) => update("country", e.target.value.toUpperCase())} /></div>
              <div><Label>Currency</Label><Input className="mt-1" value={form.currency} onChange={(e) => update("currency", e.target.value.toUpperCase())} /></div>
              <div><Label>Timezone</Label><Input className="mt-1" value={form.timezone} onChange={(e) => update("timezone", e.target.value)} /></div>
              <div className="md:col-span-2 space-y-2"><Label>Languages</Label><div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><Checkbox checked={form.languages.includes("ar")} onCheckedChange={(v) => toggleLanguage("ar", Boolean(v))} /> العربية</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={form.languages.includes("en")} onCheckedChange={(v) => toggleLanguage("en", Boolean(v))} /> English</label></div></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Label>Branches</Label>
                {form.branches.map((b, idx) => <div key={idx} className="grid md:grid-cols-[1fr_1fr_80px] gap-2"><Input value={b.name} onChange={(e) => { const branches = [...form.branches]; branches[idx] = { ...branches[idx], name: e.target.value }; update("branches", branches); }} placeholder="اسم الفرع" /><Input value={b.city || ""} onChange={(e) => { const branches = [...form.branches]; branches[idx] = { ...branches[idx], city: e.target.value }; update("branches", branches); }} placeholder="المدينة" /><Button variant="outline" onClick={() => update("branches", form.branches.filter((_, i) => i !== idx))} disabled={form.branches.length === 1}>حذف</Button></div>)}
                <Button variant="outline" onClick={() => update("branches", [...form.branches, { name: "", city: "", address: "" }])}>+ إضافة فرع</Button>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-4"><div><Label>Start</Label><Input type="time" className="mt-1" value={form.workingHours.start} onChange={(e) => update("workingHours", { ...form.workingHours, start: e.target.value })} /></div><div><Label>End</Label><Input type="time" className="mt-1" value={form.workingHours.end} onChange={(e) => update("workingHours", { ...form.workingHours, end: e.target.value })} /></div></div>
              <div className="flex flex-wrap gap-3">{DAYS.map((d) => <label key={d.key} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><Checkbox checked={form.workingHours.days.includes(d.key)} onCheckedChange={(v) => toggleDay(d.key, Boolean(v))} /> {d.label}</label>)}</div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-sm text-blue-900">الأقسام الافتراضية موجودة دائماً، ويمكن إضافة أقسام أخرى لاحقاً. لا يوجد أي اسم صناعة داخل الكود.</div>
              <div className="grid md:grid-cols-2 gap-3">{form.departments.map((d, idx) => <div key={d.key} className="flex items-center gap-3 rounded-2xl border p-3"><Checkbox checked={d.enabled} onCheckedChange={(v) => { const departments = [...form.departments]; departments[idx] = { ...departments[idx], enabled: Boolean(v) }; update("departments", departments); }} /><div className="flex-1"><div className="font-black">{d.name_ar}</div><div className="text-xs text-muted-foreground">{d.name_en} — {d.key}</div></div></div>)}</div>
              <div className="flex gap-2"><Input value={customDepartmentName} onChange={(e) => setCustomDepartmentName(e.target.value)} placeholder="قسم إضافي" /><Button variant="outline" onClick={() => { const name = customDepartmentName.trim(); if (!name) return; const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `department_${form.departments.length + 1}`; update("departments", [...form.departments, { key, name_ar: name, name_en: name, enabled: true }]); setCustomDepartmentName(""); }}>إضافة</Button></div>
            </div>
          )}

          {step === 4 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Operational Model</Label><Select value={form.operationalModel} onValueChange={(v) => update("operationalModel", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single_branch_workflow">Single branch workflow</SelectItem><SelectItem value="multi_branch_shared_services">Multi-branch shared services</SelectItem><SelectItem value="holding_multi_org">Holding / Multi organization</SelectItem><SelectItem value="field_operations">Field operations</SelectItem></SelectContent></Select></div>
              <div><Label>Workflow Style</Label><Select value={form.workflowStyle} onValueChange={(v) => update("workflowStyle", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="department_task_flow">Department → Tasks</SelectItem><SelectItem value="case_management">Case management</SelectItem><SelectItem value="asset_lifecycle">Asset lifecycle</SelectItem><SelectItem value="approval_pipeline">Approval pipeline</SelectItem></SelectContent></Select></div>
              <div className="md:col-span-2"><Label>Workflow Notes</Label><Textarea className="mt-1" placeholder="أي ملاحظات تشغيلية تتحول لاحقاً إلى Config وليس كود خاص" /></div>
            </div>
          )}

          {step === 5 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Accounting Basis</Label><Select value={form.accounting.basis} onValueChange={(v) => update("accounting", { ...form.accounting, basis: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash basis</SelectItem><SelectItem value="accrual">Accrual basis</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select></div>
              <div><Label>Fiscal Year Start</Label><Input className="mt-1" value={form.accounting.fiscalYearStart} onChange={(e) => update("accounting", { ...form.accounting, fiscalYearStart: e.target.value })} placeholder="01-01" /></div>
              <div><Label>Document Prefix</Label><Input className="mt-1" value={form.numbering.prefix} onChange={(e) => update("numbering", { ...form.numbering, prefix: e.target.value.toUpperCase() })} /></div>
              <div><Label>Next Number</Label><Input type="number" className="mt-1" value={form.numbering.nextNumber} onChange={(e) => update("numbering", { ...form.numbering, nextNumber: Number(e.target.value || 1) })} /></div>
              <div className="md:col-span-2 flex items-center gap-3 rounded-2xl border p-3"><Checkbox checked={form.tax.enabled} onCheckedChange={(v) => update("tax", { ...form.tax, enabled: Boolean(v) })} /><div className="font-bold">Enable Tax System</div></div>
              {form.tax.enabled && <><div><Label>Tax ID</Label><Input className="mt-1" value={form.tax.taxId || ""} onChange={(e) => update("tax", { ...form.tax, taxId: e.target.value })} /></div><div><Label>Tax Rate %</Label><Input className="mt-1" value={form.tax.rate || ""} onChange={(e) => update("tax", { ...form.tax, rate: e.target.value })} /></div></>}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">{form.roles.map((r, idx) => <div key={r.key} className="rounded-2xl border p-3 space-y-2"><div className="font-black">{r.name_ar}</div><div className="text-xs text-muted-foreground">{r.name_en}</div><Label className="text-xs">Approval Level</Label><Input type="number" value={r.approval_level} onChange={(e) => { const roles = [...form.roles]; roles[idx] = { ...roles[idx], approval_level: Number(e.target.value || 0) }; update("roles", roles); }} /></div>)}</div>
              <Separator />
              {form.approvals.map((a, idx) => <div key={a.key} className="grid md:grid-cols-3 gap-2"><Input value={a.label} onChange={(e) => { const approvals = [...form.approvals]; approvals[idx] = { ...approvals[idx], label: e.target.value }; update("approvals", approvals); }} /><Input placeholder="Min amount" value={a.minAmount || ""} onChange={(e) => { const approvals = [...form.approvals]; approvals[idx] = { ...approvals[idx], minAmount: e.target.value }; update("approvals", approvals); }} /><Input type="number" value={a.levels} onChange={(e) => { const approvals = [...form.approvals]; approvals[idx] = { ...approvals[idx], levels: Number(e.target.value || 1) }; update("approvals", approvals); }} /></div>)}
            </div>
          )}

          {step === 7 && (
            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 rounded-2xl border p-3"><Checkbox checked={form.notifications.whatsapp} onCheckedChange={(v) => update("notifications", { ...form.notifications, whatsapp: Boolean(v) })} /> WhatsApp Notifications</label>
              <label className="flex items-center gap-3 rounded-2xl border p-3"><Checkbox checked={form.notifications.email} onCheckedChange={(v) => update("notifications", { ...form.notifications, email: Boolean(v) })} /> Email Notifications</label>
              <label className="flex items-center gap-3 rounded-2xl border p-3"><Checkbox checked={form.notifications.inApp} onCheckedChange={(v) => update("notifications", { ...form.notifications, inApp: Boolean(v) })} /> In-app Notifications</label>
              <div><Label>Primary Color</Label><Input type="color" className="mt-1 h-11" value={form.branding.primaryColor} onChange={(e) => update("branding", { ...form.branding, primaryColor: e.target.value })} /></div>
              <div><Label>Public URL</Label><Input className="mt-1" value={form.branding.publicUrl || ""} onChange={(e) => update("branding", { ...form.branding, publicUrl: e.target.value })} /></div>
              <div><Label>Logo URL</Label><Input className="mt-1" value={form.branding.logoUrl || ""} onChange={(e) => update("branding", { ...form.branding, logoUrl: e.target.value })} /></div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-950 text-white p-5 space-y-3">
                <div className="font-black text-lg flex items-center gap-2"><Palette className="w-5 h-5" /> Final OS Configuration</div>
                <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-200"><div>Organization: <b className="text-white">{form.organizationName}</b></div><div>Industry Config: <b className="text-white">{form.industry}</b></div><div>Branches: <b className="text-white">{form.branches.filter((b) => b.name.trim()).length}</b></div><div>Departments: <b className="text-white">{form.departments.filter((d) => d.enabled).length}</b></div><div>Workflow: <b className="text-white">{form.workflowStyle}</b></div><div>Currency: <b className="text-white">{form.currency}</b></div></div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900"><b>قاعدة المعمارية:</b> عند الضغط على Finish سيتم توليد الأقسام، الملاحة، الأدوار، مخطط workflow عام، المستندات والأحداث المالية من الـ configuration فقط. لا يتم نسخ أي منطق Laundry.</div>
              {isCompleted && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> تم إكمال التفعيل. المنصة جاهزة.</div>}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={prev} disabled={step === 1 || saving}><ArrowRight className="w-4 h-4 me-2" /> رجوع</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => saveDraft(step)} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}</Button>
              {step < 8 ? <Button onClick={next} disabled={saving}>التالي <ArrowLeft className="w-4 h-4 ms-2" /></Button> : <Button onClick={completeSetup} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <CheckCircle2 className="w-4 h-4 me-2" />} Finish & Generate OS</Button>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
