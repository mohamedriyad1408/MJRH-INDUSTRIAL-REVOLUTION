import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@/hooks/use-server-fn";
import { supabase } from "@/integrations/supabase/client";

import { adminApi } from "@/lib/admin-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Crown } from "lucide-react";

export const Route = createFileRoute("/_app/staff/users")({
  head: () => ({ meta: [{ title: "إدارة المستخدمين" }] }),
  component: StaffUsersPage,
});

type Row = { user_id: string; role: string; tenant_id: string };
type Profile = { id: string; full_name: string };

function StaffUsersPage() {
  const { hasRole, tenantId } = useAuth();
  const fn = useServerFn(adminApi.createTenantUser);
  const [rows, setRows] = useState<(Row & { full_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const { data: rs } = await supabase.from("user_roles").select("user_id, role, tenant_id").eq("tenant_id", tenantId);
    const ids = Array.from(new Set((rs ?? []).map((r) => r.user_id)));
    const { data: ps } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] as Profile[] };
    const profMap = new Map((ps ?? []).map((p) => [p.id, p.full_name]));
    setRows(((rs ?? []) as Row[]).map((r) => ({ ...r, full_name: profMap.get(r.user_id) })));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  if (!hasRole("owner")) return <Card className="p-8 text-center">صلاحية مالك المغسلة فقط.</Card>;
  if (!tenantId) return <Card className="p-8 text-center">لا توجد مغسلة مرتبطة بحسابك.</Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6" /> إدارة المستخدمين</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" /> مستخدم جديد</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة مستخدم للمغسلة</DialogTitle></DialogHeader>
            <NewUserForm tenantId={tenantId} fn={fn} onDone={() => { setOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <Card key={i} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{r.full_name ?? r.user_id.slice(0, 8)}</div>
              </div>
              <Badge variant="outline">{r.role}</Badge>
            </Card>
          ))}
          {!rows.length && <Card className="p-8 text-center text-muted-foreground">لا يوجد مستخدمون. أضف أول حساب.</Card>}
        </div>
      )}
    </div>
  );
}

type CreateFn = (args: { tenantId: string; email: string; password: string; fullName: string; role: "cs_manager" | "ops_manager" | "employee" | "customer" | "courier"; station?: string | null; jobRole?: string | null; monthlySalary?: number; commissionPercent?: number; branchId?: string | null }) => Promise<unknown>;

function NewUserForm({ tenantId, fn, onDone }: { tenantId: string; fn: CreateFn; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"cs_manager" | "ops_manager" | "employee" | "customer" | "courier">("employee");
  const [station, setStation] = useState("none");
  const [jobRole, setJobRole] = useState("other");
  const [monthlySalary, setMonthlySalary] = useState("0");
  const [commissionPercent, setCommissionPercent] = useState("0");
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("");
  useEffect(() => { (supabase as any).from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at").then(({ data }: any) => { const list = data ?? []; setBranches(list); setBranchId((old) => old || list[0]?.id || ""); }); }, [tenantId]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await fn({ tenantId, email, password, fullName, role, station: station === "none" ? null : station, jobRole, monthlySalary: Number(monthlySalary || 0), commissionPercent: Number(commissionPercent || 0), branchId: branchId || null }); toast.success("تم إنشاء المستخدم وربطه بموظف عند الحاجة"); onDone(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
    finally { setLoading(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>الاسم الكامل</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
      <div><Label>البريد</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><Label>كلمة المرور</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
      <div>
        <Label>الدور</Label>
        <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cs_manager">مدير خدمة عملاء</SelectItem>
            <SelectItem value="ops_manager">مدير تشغيل</SelectItem>
            <SelectItem value="employee">موظف</SelectItem>
            <SelectItem value="courier">مندوب</SelectItem>
            <SelectItem value="customer">عميل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role !== "customer" && (
        <div className="border rounded-lg p-3 space-y-3">
          <div className="text-sm font-bold">بيانات التشغيل والراتب</div>
          <div>
            <Label>الفرع</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="اختار الفرع" /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>المحطة</Label>
            <Select value={station} onValueChange={setStation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون محطة</SelectItem>
                <SelectItem value="reception">الاستقبال</SelectItem>
                <SelectItem value="cleaning">الغسيل</SelectItem>
                <SelectItem value="ironing">الكي</SelectItem>
                <SelectItem value="packing">التغليف</SelectItem>
                <SelectItem value="delivery">التوصيل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>نوع الوظيفة</Label>
            <Select value={jobRole} onValueChange={setJobRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="other">أخرى</SelectItem>
                <SelectItem value="receptionist">استقبال</SelectItem>
                <SelectItem value="cleaning_tech">فني غسيل</SelectItem>
                <SelectItem value="ironing_tech">فني كي</SelectItem>
                <SelectItem value="packing_tech">تغليف</SelectItem>
                <SelectItem value="driver">مندوب</SelectItem>
                <SelectItem value="ops_manager">مدير تشغيل</SelectItem>
                <SelectItem value="cs_manager">خدمة عملاء</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>راتب شهري</Label><Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} /></div>
            <div><Label>نسبة/عمولة %</Label><Input type="number" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">المستخدم سيظهر في الموظفين ومحطته فورًا.</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin ms-1" />} إنشاء
      </Button>
    </form>
  );
}
