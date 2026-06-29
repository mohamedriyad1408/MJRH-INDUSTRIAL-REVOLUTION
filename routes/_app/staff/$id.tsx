import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, ArrowRight, Save, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/staff/$id")({
  component: StaffDetailPage,
});

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type Employee = any;
type Schedule = { id?: string; day_of_week: number; start_time: string | null; end_time: string | null; is_off: boolean };

function StaffDetailPage() {
  const { t, dir } = useI18n();
  const { id } = Route.useParams();
  const { hasRole, tenantId } = useAuth();
  const nav = useNavigate();
  const isOwner = hasRole("owner");
  const canEditSchedule = isOwner || hasRole("ops_manager") || hasRole("cs_manager");

  const [emp, setEmp] = useState<Employee | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: e } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
    setEmp(e);
    const { data: s } = await supabase.from("work_schedules").select("*").eq("employee_id", id);
    const map = new Map<number, Schedule>();
    (s ?? []).forEach((row: any) => map.set(row.day_of_week, row));
    setSchedules(Array.from({ length: 7 }, (_, d) => map.get(d) ?? { day_of_week: d, start_time: "09:00", end_time: "18:00", is_off: false }));
    const { data: lv } = await supabase.from("leave_requests").select("*").eq("employee_id", id).order("created_at", { ascending: false });
    setLeaves(lv ?? []);
    const { data: av } = await supabase.from("advance_requests").select("*").eq("employee_id", id).order("created_at", { ascending: false });
    setAdvances(av ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (tenantId) {
      (supabase as any)
        .from("branches")
        .select("id,name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at")
        .then(({ data }: any) => setBranches(data ?? []));
    }
  }, [tenantId]);

  async function saveBasic() {
    if (!emp) return;
    setSaving(true);
    const { error } = await (supabase as any).from("employees").update({
      full_name: emp.full_name, job_title: emp.job_title, phone: emp.phone, email: emp.email,
      role: emp.role || null, station: emp.station || null,
      branch_id: emp.branch_id || null,
      monthly_salary: Number(emp.monthly_salary) || 0,
      commission_percent: Number(emp.commission_percent) || 0,
      is_active: emp.is_active, notes: emp.notes,
    }).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("تم الحفظ");
  }

  async function saveSchedule() {
    setSaving(true);
    // Upsert each day
    for (const s of schedules) {
      const payload = {
        employee_id: id, day_of_week: s.day_of_week,
        start_time: s.is_off ? null : s.start_time,
        end_time: s.is_off ? null : s.end_time,
        is_off: s.is_off,
      };
      await supabase.from("work_schedules").upsert(payload, { onConflict: "employee_id,day_of_week" });
    }
    setSaving(false);
    toast.success("تم حفظ جدول العمل");
  }

  async function removeEmployee() {
    if (!confirm("حذف الموظف نهائياً؟")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); nav({ to: "/staff" }); }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!emp) return <Card className="p-8 text-center text-muted-foreground">الموظف غير موجود</Card>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/staff"><ArrowRight className="w-4 h-4" /></Link></Button>
          <h1 className="text-2xl font-bold">{emp.full_name}</h1>
          {!emp.is_active && <Badge variant="outline">موقوف</Badge>}
        </div>
        {isOwner && (
          <Button variant="ghost" size="sm" onClick={removeEmployee}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="schedule">جدول العمل</TabsTrigger>
          <TabsTrigger value="leaves">الإجازات ({leaves.length})</TabsTrigger>
          <TabsTrigger value="advances">السلف ({advances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">البيانات الأساسية</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Fld label="الاسم"><Input value={emp.full_name} onChange={(v) => setEmp({ ...emp, full_name: v.target.value })} disabled={!isOwner} /></Fld>
              <Fld label="الوظيفة"><Input value={emp.job_title} onChange={(v) => setEmp({ ...emp, job_title: v.target.value })} disabled={!isOwner} /></Fld>
              <Fld label="الفرع">
                <Select value={emp.branch_id ?? "none"} onValueChange={(v) => setEmp({ ...emp, branch_id: v === "none" ? null : v })} disabled={!isOwner}>
                  <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فرع</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Fld>
              <Fld label="الهاتف"><Input value={emp.phone ?? ""} onChange={(v) => setEmp({ ...emp, phone: v.target.value })} disabled={!isOwner} /></Fld>
              <Fld label="الإيميل"><Input value={emp.email ?? ""} onChange={(v) => setEmp({ ...emp, email: v.target.value })} disabled={!isOwner} /></Fld>
              <Fld label="تاريخ التعيين"><Input value={fmtDate(emp.hire_date)} disabled /></Fld>
              <Fld label="نشط؟">
                <div className="flex items-center gap-2 mt-2">
                  <Switch checked={emp.is_active} onCheckedChange={(c) => setEmp({ ...emp, is_active: c })} disabled={!isOwner} />
                  <span className="text-sm text-muted-foreground">{emp.is_active ? "نشط" : "موقوف"}</span>
                </div>
              </Fld>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">الدور والمحطة</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Fld label="الدور">
                <Select value={emp.role ?? "none"} onValueChange={(v) => setEmp({ ...emp, role: v === "none" ? null : v })} disabled={!isOwner}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    <SelectItem value="cs_manager">مدير خدمة عملاء</SelectItem>
                    <SelectItem value="ops_manager">مدير تشغيل</SelectItem>
                    <SelectItem value="courier">مندوب</SelectItem>
                    <SelectItem value="owner">مالك</SelectItem>
                  </SelectContent>
                </Select>
              </Fld>
              <Fld label="المحطة">
                <Select value={emp.station ?? "none"} onValueChange={(v) => setEmp({ ...emp, station: v === "none" ? null : v })} disabled={!isOwner}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="reception">الاستلام</SelectItem>
                    <SelectItem value="cleaning">التنظيف</SelectItem>
                    <SelectItem value="ironing">الكي</SelectItem>
                    <SelectItem value="packing">التغليف</SelectItem>
                    <SelectItem value="delivery">التسليم</SelectItem>
                  </SelectContent>
                </Select>
              </Fld>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">الراتب والعمولة</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Fld label="الراتب الشهري"><Input type="number" value={emp.monthly_salary} onChange={(v) => setEmp({ ...emp, monthly_salary: v.target.value })} disabled={!isOwner} /></Fld>
              <Fld label="العمولة %"><Input type="number" value={emp.commission_percent} onChange={(v) => setEmp({ ...emp, commission_percent: v.target.value })} disabled={!isOwner} /></Fld>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Fld label="ملاحظات"><Textarea rows={3} value={emp.notes ?? ""} onChange={(v) => setEmp({ ...emp, notes: v.target.value })} disabled={!isOwner} /></Fld>
            </CardContent>
          </Card>

          {isOwner && (
            <div className="flex justify-end">
              <Button onClick={saveBasic} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ms-1" /> حفظ</>}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader><CardTitle className="text-base">جدول العمل الأسبوعي</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {schedules.map((s, i) => (
                <div key={s.day_of_week} className="flex items-center gap-3 flex-wrap border-b pb-2">
                  <div className="w-20 font-medium">{DAYS[s.day_of_week]}</div>
                  <div className="flex items-center gap-2">
                    <Switch checked={!s.is_off} onCheckedChange={(c) => {
                      const next = [...schedules]; next[i] = { ...s, is_off: !c }; setSchedules(next);
                    }} disabled={!canEditSchedule} />
                    <span className="text-xs text-muted-foreground">{s.is_off ? "إجازة" : "عمل"}</span>
                  </div>
                  {!s.is_off && (
                    <>
                      <Input type="time" value={s.start_time ?? ""} className="w-32" disabled={!canEditSchedule}
                        onChange={(e) => { const next = [...schedules]; next[i] = { ...s, start_time: e.target.value }; setSchedules(next); }} />
                      <span className="text-muted-foreground">إلى</span>
                      <Input type="time" value={s.end_time ?? ""} className="w-32" disabled={!canEditSchedule}
                        onChange={(e) => { const next = [...schedules]; next[i] = { ...s, end_time: e.target.value }; setSchedules(next); }} />
                    </>
                  )}
                </div>
              ))}
              {canEditSchedule && (
                <div className="flex justify-end pt-2">
                  <Button onClick={saveSchedule} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ms-1" /> حفظ الجدول</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-start p-3">النوع</th><th className="text-start p-3">من</th>
                  <th className="text-start p-3">إلى</th><th className="text-start p-3">السبب</th>
                  <th className="text-start p-3">الحالة</th>
                </tr></thead>
                <tbody>
                  {leaves.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد طلبات إجازة</td></tr>}
                  {leaves.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="p-3">{leaveTypeAr(l.leave_type, t)}</td>
                      <td className="p-3 text-xs">{fmtDate(l.start_date)}</td>
                      <td className="p-3 text-xs">{fmtDate(l.end_date)}</td>
                      <td className="p-3 text-muted-foreground">{l.reason || "—"}</td>
                      <td className="p-3"><LeaveStatusBadge s={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advances">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-start p-3">التاريخ</th><th className="text-end p-3">المبلغ</th>
                  <th className="text-start p-3">السبب</th><th className="text-start p-3">الحالة</th>
                </tr></thead>
                <tbody>
                  {advances.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">لا توجد سلف</td></tr>}
                  {advances.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-3 text-xs">{fmtDate(a.created_at)}</td>
                      <td className="p-3 text-end font-semibold">{fmtMoney(a.amount)}</td>
                      <td className="p-3 text-muted-foreground">{a.reason || "—"}</td>
                      <td className="p-3"><AdvStatusBadge s={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-sm">{label}</Label>{children}</div>;
}
function leaveTypeAr(t: string, fn: any) {
  return { annual: fn("leave.annual", "سنوية"), sick: fn("leave.sick", "مرضية"), unpaid: fn("leave.unpaid", "بدون أجر"), emergency: fn("leave.emergency", "طارئة") }[t] ?? t;
}
function LeaveStatusBadge({ s }: { s: string }) {
  if (s === "pending") return <Badge variant="secondary">قيد المراجعة</Badge>;
  if (s === "approved") return <Badge className="bg-emerald-600">موافق</Badge>;
  return <Badge variant="destructive">مرفوض</Badge>;
}
function AdvStatusBadge({ s }: { s: string }) {
  if (s === "pending") return <Badge variant="secondary">قيد المراجعة</Badge>;
  if (s === "approved") return <Badge className="bg-emerald-600">موافق</Badge>;
  return <Badge variant="destructive">مرفوض</Badge>;
}
