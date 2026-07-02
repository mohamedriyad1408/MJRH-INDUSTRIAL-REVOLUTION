import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/staff/new")({
  component: NewStaffPage,
});

function NewStaffPage() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const nav = useNavigate();
  const isOwner = hasRole("owner");

  const [form, setForm] = useState({
    full_name: "",
    job_title: "",
    branch_id: "",
    role: "none",
    station: "none",
    phone: "",
    email: "",
    hire_date: new Date().toISOString().slice(0, 10),
    monthly_salary: "0",
    commission_percent: "0",
    notes: "",
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenantId) {
      supabase
        .from("branches")
        .select("id,name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at")
        .then(({ data }: any) => {
          setBranches(data ?? []);
          if (data && data.length > 0) {
            setForm((old) => ({ ...old, branch_id: data[0].id }));
          }
        });
    }
  }, [tenantId]);

  if (!isOwner) {
    return <Card className="p-8 text-center text-muted-foreground">{t("common.noRole")}</Card>;
  }

  async function submit() {
    if (!form.full_name.trim() || !form.job_title.trim()) {
      toast.error("الاسم والوظيفة مطلوبان");
      return;
    }
    setSaving(true);
    const payload: any = {
      full_name: form.full_name.trim(),
      job_title: form.job_title.trim(),
      branch_id: form.branch_id || null,
      role: form.role === "none" ? null : form.role,
      station: form.station === "none" ? null : form.station,
      phone: form.phone || null,
      email: form.email || null,
      hire_date: form.hire_date,
      monthly_salary: Number(form.monthly_salary) || 0,
      commission_percent: Number(form.commission_percent) || 0,
      notes: form.notes || null,
    };
    const { data, error } = await supabase.from("employees").insert(payload).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إضافة الموظف");
    nav({ to: "/$tenant/staff/$id", params: { id: data!.id } as any });
  }

  return (
    <div className="space-y-4 max-w-3xl" dir={dir}>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to={"/$tenant/staff" as any}><ArrowRight className="w-4 h-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{t("nav./staff/new")}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("staff.basicInfo")}</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label={t("login.fullName")}><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label={t("common.branch")}>
            <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
              <SelectTrigger><SelectValue placeholder={t("common.branch")} /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("common.role")} hint="e.g. Ironer, Courier, Accountant">
            <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
          </Field>
          <Field label={t("common.phone", "Phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label={t("login.email")}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={t("staff.hireDate")}><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("staff.roleAndStation")}</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label={t("common.role")}>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common.noRole")}</SelectItem>
                <SelectItem value="cs_manager">{t("role.cs_manager")}</SelectItem>
                <SelectItem value="ops_manager">{t("role.ops_manager")}</SelectItem>
                <SelectItem value="courier">{t("role.courier")}</SelectItem>
                <SelectItem value="owner">{t("role.owner")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("stage.received")}>
            <Select value={form.station} onValueChange={(v) => setForm({ ...form, station: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="reception">{t("stage.received")}ist</SelectItem>
                <SelectItem value="cleaning">{t("stage.cleaning")}</SelectItem>
                <SelectItem value="ironing">{t("stage.ironing")}</SelectItem>
                <SelectItem value="packing">{t("stage.packing")}</SelectItem>
                <SelectItem value="delivery">{t("stage.ready")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("staff.salaryAndCommission")}</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label={t("staff.monthlySalary")}><Input type="number" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} /></Field>
          <Field label={t("staff.commission")}><Input type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Field label={t("order.notes")}><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link to={"/$tenant/staff" as any}>{t("common.cancel")}</Link></Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("staff.saveStaff")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        ملاحظة: لتفعيل دخول الموظف للنظام، يجب أن يسجل حساباً بنفس الإيميل من صفحة الدخول، ثم يمكنك ربط الدور به من ملفه الشخصي.
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
