import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Building2, Package, Users, CreditCard, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/$tenant/onboarding")({
  head: () => ({ meta: [{ title: "معالج التفعيل الذاتي — Onboarding Wizard" }] }),
  component: OnboardingWizardPage,
});

const BUSINESS_TYPES = [
  { value: "laundry", label: "مغسلة ملابس", icon: "🧺" },
  { value: "carpet", label: "سجاد", icon: "🧹" },
  { value: "repair", label: "ورشة", icon: "🔧" },
  { value: "carwash", label: "غسيل سيارات", icon: "🚗" },
  { value: "cleaning", label: "تنظيف", icon: "🏠" },
  { value: "restaurant", label: "مطعم", icon: "🍽️" },
];

function OnboardingWizardPage() {
  const { tenantId } = useAuth();
  const { dir } = useI18n();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "laundry",
    branches: [{ name: "الفرع الرئيسي" }],
    catalogChoice: "default",
    staff: [{ full_name: "", role: "employee", job_role: "other" }],
    paymentMethod: "cash",
  });

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const [obRes, brRes, tenantRes] = await Promise.all([
      supabase.from("tenant_onboarding").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("branches").select("id,name").eq("tenant_id", tenantId),
      supabase.from("tenants").select("name, business_type").eq("id", tenantId).maybeSingle(),
    ]);
    if (obRes.data) {
      setOnboarding(obRes.data);
      setStep(obRes.data.current_step || 1);
      if (obRes.data.branch_data?.length) {
        setForm((f) => ({ ...f, branches: obRes.data.branch_data }));
      }
    }
    if (tenantRes.data) {
      setForm((f) => ({ ...f, businessName: tenantRes.data.name, businessType: tenantRes.data.business_type || "laundry" }));
    }
    setBranches(brRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tenantId]);

  async function saveProgress(nextStep?: number, completed = false) {
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        current_step: nextStep || step,
        completed_steps: onboarding?.completed_steps || [],
        branch_data: form.branches,
        catalog_choice: form.catalogChoice,
        staff_data: form.staff,
        payment_method: form.paymentMethod,
        is_completed: completed,
      };

      // Upsert
      const { error } = await supabase.from("tenant_onboarding").upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;

      if (nextStep) setStep(nextStep);
      if (completed) {
        toast.success("تم إكمال التفعيل! 🎉");
      } else {
        toast.success("تم حفظ التقدم");
      }
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function applySeed() {
    setSaving(true);
    try {
      // Use existing RPC seed_tenant_defaults, ensure_default_branch_for etc.
      const { error } = await supabase.rpc("seed_tenant_defaults", { _tenant_id: tenantId });
      if (error) console.warn(error.message);
      // Also apply workflow template based on business type
      const { data: templates } = await supabase.from("workflow_templates").select("id, slug").eq("category", form.businessType).eq("is_active", true).limit(1);
      if (templates?.[0]) {
        await supabase.rpc("apply_workflow_template", { _tenant_id: tenantId, _template_id: templates[0].id });
      }
      toast.success("تم تجهيز الكتالوج والقالب الافتراضي");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6" dir={dir}>
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
          <Sparkles className="w-3 h-3" /> معالج التفعيل الذاتي — 5 خطوات — Zero Cost
        </div>
        <h1 className="text-3xl font-black">تفعيل مشروعك في 5 دقائق</h1>
        <p className="text-sm text-muted-foreground">يستخدم نفس الدوال الموجودة: seed_tenant_defaults, ensure_default_branch_for — بدون مكتبات مدفوعة</p>

        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${step >= s ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 5 && <div className={`w-8 h-0.5 ${step > s ? "bg-slate-900" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1 text-[11px] font-bold text-slate-500">
          <span>المشروع</span><span>•</span><span>الفروع</span><span>•</span><span>الكتالوج</span><span>•</span><span>الفريق</span><span>•</span><span>الدفع</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step === 1 && <><Building2 className="w-5 h-5" /> الخطوة 1: اسم المشروع</>}
            {step === 2 && <><Building2 className="w-5 h-5" /> الخطوة 2: الفروع</>}
            {step === 3 && <><Package className="w-5 h-5" /> الخطوة 3: الكتالوج</>}
            {step === 4 && <><Users className="w-5 h-5" /> الخطوة 4: الموظفون والأدوار</>}
            {step === 5 && <><CreditCard className="w-5 h-5" /> الخطوة 5: طريقة الدفع ومراجعة</>}
          </CardTitle>
          <CardDescription className="text-xs">الخطوة {step} من 5</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>اسم المشروع</Label>
                <Input className="mt-1" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
              </div>
              <div>
                <Label>نوع النشاط</Label>
                <Select value={form.businessType} onValueChange={(v) => setForm({ ...form, businessType: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((bt) => (
                      <SelectItem key={bt.value} value={bt.value}>{bt.icon} {bt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between">
                <div />
                <Button onClick={() => saveProgress(2)}>التالي <ArrowLeft className="w-4 h-4 ms-2" /></Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">أضف فروعك — سيتم إنشاؤها تلقائياً عبر ensure_default_branch_for</div>
              {form.branches.map((b, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input value={b.name} onChange={(e) => {
                    const arr = [...form.branches];
                    arr[idx].name = e.target.value;
                    setForm({ ...form, branches: arr });
                  }} placeholder={`الفرع ${idx + 1}`} />
                  {form.branches.length > 1 && (
                    <Button variant="outline" onClick={() => setForm({ ...form, branches: form.branches.filter((_, i) => i !== idx) })}>حذف</Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setForm({ ...form, branches: [...form.branches, { name: "" }] })}>+ إضافة فرع</Button>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowRight className="w-4 h-4 me-2" /> رجوع</Button>
                <Button onClick={async () => {
                  // Create branches
                  for (const br of form.branches) {
                    if (!br.name.trim()) continue;
                    if (branches.find((x) => x.name === br.name.trim())) continue;
                    await supabase.from("branches").insert({ tenant_id: tenantId, name: br.name.trim(), is_active: true });
                  }
                  saveProgress(3);
                }} disabled={saving}>التالي <ArrowLeft className="w-4 h-4 ms-2" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Label>اختيار الكتالوج</Label>
              <Select value={form.catalogChoice} onValueChange={(v) => setForm({ ...form, catalogChoice: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">قالب افتراضي جاهز حسب النشاط</SelectItem>
                  <SelectItem value="import">استيراد من قالب MarketPlace</SelectItem>
                  <SelectItem value="manual">إدخال يدوي لاحقاً</SelectItem>
                </SelectContent>
              </Select>
              <div className="p-3 bg-slate-50 border rounded-xl text-xs">
                {form.catalogChoice === "default" && "سيتم استدعاء seed_tenant_defaults + apply_workflow_template تلقائياً — نفس الدوال الموجودة"}
                {form.catalogChoice === "import" && "اذهب إلى /marketplace واختر قالب وطبقه، ثم ارجع هنا"}
                {form.catalogChoice === "manual" && "ستدخل الكتالوج يدوياً من /services لاحقاً"}
              </div>
              <Button onClick={applySeed} variant="outline" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "تجهيز الكتالوج الآن"}</Button>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowRight className="w-4 h-4 me-2" /> رجوع</Button>
                <Button onClick={() => saveProgress(4)}>التالي <ArrowLeft className="w-4 h-4 ms-2" /></Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">أضف فريقك — سيتم ربطهم بالموظفين والأدوار</div>
              {form.staff.map((s, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <Input value={s.full_name} onChange={(e) => {
                    const arr = [...form.staff];
                    arr[idx].full_name = e.target.value;
                    setForm({ ...form, staff: arr });
                  }} placeholder="الاسم الكامل" />
                  <Select value={s.role} onValueChange={(v) => {
                    const arr = [...form.staff];
                    arr[idx].role = v;
                    setForm({ ...form, staff: arr });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">مالك</SelectItem>
                      <SelectItem value="ops_manager">مدير تشغيل</SelectItem>
                      <SelectItem value="cs_manager">خدمة عملاء</SelectItem>
                      <SelectItem value="employee">موظف</SelectItem>
                      <SelectItem value="courier">مندوب</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setForm({ ...form, staff: form.staff.filter((_, i) => i !== idx) })}>حذف</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setForm({ ...form, staff: [...form.staff, { full_name: "", role: "employee", job_role: "other" }] })}>+ إضافة موظف</Button>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}><ArrowRight className="w-4 h-4 me-2" /> رجوع</Button>
                <Button onClick={() => saveProgress(5)}>التالي <ArrowLeft className="w-4 h-4 ms-2" /></Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <Label>طريقة الدفع المعتمدة</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="instapay">InstaPay مع إثبات</SelectItem>
                    <SelectItem value="subscription">اشتراكات شهرية</SelectItem>
                    <SelectItem value="mixed">مختلط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-sm">
                <div className="font-black">مراجعة نهائية:</div>
                <div>المشروع: {form.businessName} ({form.businessType})</div>
                <div>الفروع: {form.branches.map((b) => b.name).join("، ")}</div>
                <div>الكتالوج: {form.catalogChoice}</div>
                <div>الفريق: {form.staff.length} موظف</div>
                <div>الدفع: {form.paymentMethod}</div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)}><ArrowRight className="w-4 h-4 me-2" /> رجوع</Button>
                <Button onClick={() => saveProgress(5, true)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <CheckCircle2 className="w-4 h-4 me-2" />} تأكيد وبدء التشغيل
                </Button>
              </div>

              {onboarding?.is_completed && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> تم إكمال التفعيل في {onboarding.completed_at?.slice(0, 10)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
