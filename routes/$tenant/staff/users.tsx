import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@/hooks/use-server-fn";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Plus, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { WORKFLOW_STATIONS_10 } from "@/lib/staff-roles";

export const Route = createFileRoute("/$tenant/staff/users")({
  head: () => ({ meta: [{ title: "إدارة المستخدمين" }] }),
  component: StaffUsersPage,
});

type RoleRow = { user_id: string; role: string; tenant_id: string; email?: string };

function StaffUsersPage() {
  const { t, dir } = useI18n();
  const { hasRole, tenantId } = useAuth();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("user_roles").select("*").eq("tenant_id", tenantId);
    if (error) toast.error(error.message);
    setRows((data ?? []) as RoleRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tenantId]);

  if (!hasRole("owner")) return <Card className="p-8 text-center">{t("staffUsers.ownerOnly", "صلاحية مالك المغسلة فقط.")}</Card>;
  if (!tenantId) return <Card className="p-8 text-center">{t("staffUsers.noTenant", "لا توجد مغسلة مرتبطة بحسابك.")}</Card>;

  return (
    <div className="space-y-4 max-w-4xl" dir={dir}>
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6" /> {t("staffUsers.title", "إدارة المستخدمين")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" /> {t("staffUsers.btnNew", "مستخدم جديد")}</Button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("staffUsers.titleNew", "إضافة مستخدم للمغسلة")}</DialogTitle></DialogHeader>
            <AddUserForm tenantId={tenantId} onDone={() => { setOpen(false); load(); }} t={t} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((r, i) => (
            <Card key={i} className="p-4 flex items-center justify-between">
              <div><div className="font-bold">{r.email ?? `User ID: ${r.user_id.slice(0, 8)}`}</div><div className="text-xs text-muted-foreground">{r.user_id}</div></div>
              <Badge variant="outline">{r.role}</Badge>
            </Card>
          ))}
          {!rows.length && <Card className="p-8 text-center text-muted-foreground col-span-full">{t("staffUsers.empty", "لا يوجد مستخدمون. أضف أول حساب.")}</Card>}
        </div>
      )}
    </div>
  );
}

function AddUserForm({ tenantId, onDone, t }: { tenantId: string; onDone: () => void; t: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("employee");
  const [station, setStation] = useState("none");
  const [jobRole, setJobRole] = useState("other");
  const [monthlySalary, setMonthlySalary] = useState("0");
  const [commissionPercent, setCommissionPercent] = useState("0");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const fn = useServerFn(adminApi.createTenantUser);

  useEffect(() => {
    supabase.from("branches").select("id, name").eq("tenant_id", tenantId).eq("is_active", true).then(({ data }: any) => setBranches(data ?? []));
  }, [tenantId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await fn({ tenantId, email, password, fullName, role, station: station === "none" ? null : station, jobRole, monthlySalary: Number(monthlySalary || 0), commissionPercent: Number(commissionPercent || 0), branchId: branchId || null });
      if (phone) {
        await supabase.from("employees").update({ phone }).eq("email", email);
        const branchName = branches.find((b) => b.id === branchId)?.name || "الرئيسي";
        const waText = `مرحباً ${fullName.trim()}،\nتم افتتاح المغسلة الرسمية وتسجيل حسابك الوظيفي في منظومة MJRH (فرع ${branchName}).\nرقم الهاتف المعتمد: ${phone}\nالبريد الإلكتروني: ${email}\nالدور الوظيفي: ${role}\nالمحطة: ${station === "none" ? "عام" : station}\nيرجى الاحتفاظ بهذه الرسالة كإثبات تسجيل وحفظ سرية بيانات الدخول.\n— مالك المغسلة`;
        window.open(`https://wa.me/20${phone.replace(/^0+/, "")}?text=${encodeURIComponent(waText)}`, "_blank");
      }
      toast.success("تم إنشاء المستخدم وإرسال رسالة تأكيد الحساب عبر WhatsApp بنجاح");
      onDone();
    }
    catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 py-2">
      <div><Label>{t("staffUsers.labelName", "الاسم الكامل")}</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
      <div><Label className="font-bold text-teal-400">رقم الهاتف المعتمد (لتأكيد الحساب عبر WhatsApp)</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010xxxxxxxx" required /></div>
      <div><Label>{t("staffUsers.labelEmail", "البريد")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><Label>{t("staffUsers.labelPassword", "كلمة المرور")}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
      <div>
        <Label>{t("staffUsers.labelRole", "الدور")}</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ops_manager">مدير التشغيل العام COO (Betriebsleitung)</SelectItem>
            <SelectItem value="cs_manager">مدير خدمة ورعاية العملاء (Kundenservice)</SelectItem>
            <SelectItem value="sales_manager">مدير المبيعات وتطوير الأعمال (Vertrieb)</SelectItem>
            <SelectItem value="marketing_manager">مدير التسويق والنمو GTM (Marketing)</SelectItem>
            <SelectItem value="logistics_manager">مدير أسطول وحركة النقل (Logistik)</SelectItem>
            <SelectItem value="warehouse_manager">مدير المخازن وسلسلة الإمداد (Lager)</SelectItem>
            <SelectItem value="legal_counsel">مستشار قانوني وشؤون امتثال (Rechtsabteilung)</SelectItem>
            <SelectItem value="hr_manager">مدير الموارد البشرية وشؤون الموظفين (Personalwesen)</SelectItem>
            <SelectItem value="cfo">المدير المالي CFO (Finanzwesen)</SelectItem>
            <SelectItem value="accountant">محاسب ومسؤول خزنة (Buchhaltung)</SelectItem>
            <SelectItem value="employee">موظف أو فني محطة إنتاجية (Employee/Tech)</SelectItem>
            <SelectItem value="courier">مندوب توصيل وسائق (Courier/Driver)</SelectItem>
            <SelectItem value="customer">عميل (Customer)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role !== "customer" && (
        <div className="space-y-3 border-t pt-3 mt-3">
          <div className="text-sm font-bold">{t("staffUsers.opsSalaryHeader", "بيانات التشغيل والراتب")}</div>
          {branches.length > 0 && <div>
            <Label>{t("staffUsers.labelBranch", "الفرع")}</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder={t("staffUsers.branchPlaceholder", "اختار الفرع")} /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
          <div>
            <Label>{t("staffUsers.labelStation", "المحطة الافتراضية")}</Label>
            <Select value={station} onValueChange={setStation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("staffUsers.stationNone", "بدون محطة")}</SelectItem>
                {WORKFLOW_STATIONS_10.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>{ws.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("staffUsers.labelJobRole", "الدور الوظيفي (10 Rotational Roles)")}</Label>
            <Select value={jobRole} onValueChange={setJobRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ops_manager">مدير تشغيل ⚙️</SelectItem>
                <SelectItem value="cs_manager">مدير خدمة عملاء 📞</SelectItem>
                <SelectItem value="owner">مالك المغسلة 👑</SelectItem>
                {WORKFLOW_STATIONS_10.map((ws) => (
                  <SelectItem key={ws.role} value={ws.role}>{ws.roleLabel} ({ws.id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{t("common.salary", "راتب شهري")}</Label><Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} /></div>
            <div><Label>{t("common.commission", "عمولة %")}</Label><Input type="number" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} /></div>
          </div>
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save", "حفظ")}
      </Button>
    </form>
  );
}
