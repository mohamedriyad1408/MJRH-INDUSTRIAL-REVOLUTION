import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, TrendingUp, TrendingDown, Wallet, Check, X, Trash2, RefreshCw, Users } from "lucide-react";

export const Route = createFileRoute("/_app/finance")({
  head: () => ({ meta: [{ title: "الحسابات - MJRH" }] }),
  component: FinancePage,
});

const EXPENSE_CATEGORIES = [
  { value: "salaries", label: "رواتب وعمولات" },
  { value: "rent", label: "الإيجار" },
  { value: "water", label: "فاتورة المياه" },
  { value: "electricity", label: "فاتورة الكهرباء" },
  { value: "supplies", label: "الخامات والمستلزمات" },
  { value: "maintenance", label: "الصيانة" },
  { value: "other", label: "أخرى" },
];

type Expense = { id: string; category: string; amount: number; description: string | null; spent_at: string; created_at: string; status?: string; source_type?: string | null; employee_id?: string | null };
// ✅ Phase 2: Use employees instead of technicians
type AdvanceRequest = { id: string; employee_id: string | null; employee_name: string; amount: number; reason: string | null; status: "pending"|"approved"|"rejected"; created_at: string; decided_at: string | null };
type Employee = { id: string; full_name: string; monthly_salary?: number; commission_percent?: number };

function FinancePage() {
  const { hasRole, user } = useAuth();
  const isOwner = hasRole("owner");
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState({ total: 0, paid: 0, unpaid: 0, count: 0 });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); // ✅ was: techs/technicians
  const [payrollSync, setPayrollSync] = useState<any>(null);
  const [syncingPayroll, setSyncingPayroll] = useState(false);
  const [range, setRange] = useState<"7d"|"30d"|"all">("30d");

  const fromDate = useMemo(() => {
    if (range === "all") return null;
    const d = new Date(); d.setDate(d.getDate() - (range === "7d" ? 7 : 30));
    return d.toISOString();
  }, [range]);

  async function load() {
    setLoading(true);
    // الوضع السهل: أول ما صاحب العمل يفتح الحسابات، النظام يجهز رواتب الشهر كمصروفات آجلة بدون خطوات معقدة.
    const { data: payrollData } = await (supabase as any).rpc("sync_monthly_payroll_payables", { _month: new Date().toISOString().slice(0, 10) }).catch(() => ({ data: null }));
    setPayrollSync(payrollData);

    let oq = supabase.from("orders").select("total,payment_status,payment_method").neq("status", "cancelled");
    if (fromDate) oq = oq.gte("created_at", fromDate);
    const { data: orders } = await oq;
    const rev = (orders ?? []).reduce((acc: any, o: any) => {
      const t = Number(o.total ?? 0); acc.total += t; acc.count++;
      if (o.payment_status === "paid") acc.paid += t; else acc.unpaid += t;
      return acc;
    }, { total: 0, paid: 0, unpaid: 0, count: 0 });
    setRevenue(rev);

    let eq = supabase.from("expenses").select("*").order("spent_at", { ascending: false });
    if (fromDate) eq = eq.gte("spent_at", fromDate);
    const { data: exp } = await eq;
    setExpenses((exp ?? []) as any);

    // ✅ Phase 2: fetch from employee_requests (unified) instead of advance_requests on technicians
    const { data: adv } = await supabase
      .from("employee_requests")
      .select("id,employee_id,amount,reason,status,created_at,decided_at,employees(full_name)")
      .eq("type", "advance")
      .order("created_at", { ascending: false });
    setAdvances(((adv ?? []) as any).map((a: any) => ({
      ...a,
      employee_name: a.employees?.full_name ?? "—",
    })));

    // ✅ Phase 2: employees table instead of technicians
    const { data: emps } = await supabase.from("employees").select("id,full_name,monthly_salary,commission_percent").eq("is_active", true).order("full_name");
    setEmployees((emps ?? []) as any);

    setLoading(false);
  }

  useEffect(() => { load(); }, [fromDate]);

  async function syncPayrollNow() {
    setSyncingPayroll(true);
    const { data, error } = await (supabase as any).rpc("sync_monthly_payroll_payables", { _month: new Date().toISOString().slice(0, 10) });
    setSyncingPayroll(false);
    if (error) return toast.error(error.message);
    setPayrollSync(data);
    toast.success("تم تجهيز رواتب وعمولات الشهر كمصروفات آجلة");
    load();
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pendingAdvances = advances.filter((a) => a.status === "pending");
  const approvedAdvancesTotal = advances.filter((a) => a.status === "approved").reduce((s, a) => s + Number(a.amount), 0);
  const payrollExpenses = expenses.filter((e) => e.category === "salaries").reduce((s, e) => s + Number(e.amount), 0);
  const payablePayroll = expenses.filter((e) => e.category === "salaries" && e.status === "payable").reduce((s, e) => s + Number(e.amount), 0);
  const expectedMonthlySalaries = employees.reduce((s, e) => s + Number(e.monthly_salary ?? 0), 0);
  const netProfit = revenue.total - totalExpenses - approvedAdvancesTotal;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">الحسابات والمالية</h1>
          <p className="text-sm text-muted-foreground">إيرادات، مصروفات، وطلبات السلف</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">الفترة:</Label>
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">آخر 7 أيام</SelectItem>
              <SelectItem value="30d">آخر 30 يوم</SelectItem>
              <SelectItem value="all">كل الفترات</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي الإيرادات" value={fmtMoney(revenue.total)} icon={<TrendingUp className="w-4 h-4" />} sub={`${revenue.count} طلب`} tone="success" />
        <StatCard label="المحصّل" value={fmtMoney(revenue.paid)} sub={`متبقي: ${fmtMoney(revenue.unpaid)}`} />
        <StatCard label="المصروفات" value={fmtMoney(totalExpenses)} icon={<TrendingDown className="w-4 h-4" />} tone="warn" />
        <StatCard label="صافي الربح" value={fmtMoney(netProfit)} icon={<Wallet className="w-4 h-4" />} tone={netProfit >= 0 ? "success" : "danger"} sub={`سلف معتمدة: ${fmtMoney(approvedAdvancesTotal)}`} />
      </div>

      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-black text-lg flex items-center gap-2"><Users className="w-5 h-5 text-teal-700" />رواتب الشهر ظاهرة تلقائيًا</div>
              <p className="text-sm text-muted-foreground">النظام يجمع رواتب الموظفين وعمولاتهم وسلفهم ويضيفها كمصروفات آجلة لهذا الشهر. لا تحتاج تعمل خطوات محاسبية معقدة.</p>
            </div>
            <Button onClick={syncPayrollNow} disabled={syncingPayroll}>
              {syncingPayroll ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}
              ظبط الرواتب الآن
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat title="رواتب مسجلة" value={fmtMoney(expectedMonthlySalaries)} />
            <Stat title="مصروفات رواتب ظاهرة" value={fmtMoney(payrollExpenses)} />
            <Stat title="رواتب آجلة" value={fmtMoney(payablePayroll)} />
            <Stat title="سلف معتمدة" value={fmtMoney(approvedAdvancesTotal)} />
          </div>
          {payrollSync && <div className="text-xs text-teal-700 font-bold">آخر مزامنة: {payrollSync.employees_count ?? 0} موظف · إجمالي مستحق {fmtMoney(Number(payrollSync.gross_total ?? 0))} · صافي بعد السلف {fmtMoney(Number(payrollSync.net_total ?? 0))}</div>}
        </CardContent>
      </Card>

      <Tabs defaultValue={pendingAdvances.length ? "advances" : "expenses"}>
        <TabsList>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="advances">
            طلبات السلف
            {pendingAdvances.length > 0 && <Badge variant="destructive" className="me-2">{pendingAdvances.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-3">
          <div className="flex justify-end"><NewExpenseDialog onCreated={load} userId={user?.id} /></div>
          {loading ? <Spinner /> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-start p-3">التاريخ</th>
                  <th className="text-start p-3">الفئة</th>
                  <th className="text-start p-3">الوصف</th>
                  <th className="text-end p-3">المبلغ</th>
                  {isOwner && <th className="p-3 w-12"></th>}
                </tr></thead>
                <tbody>
                  {expenses.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد مصروفات</td></tr>}
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="p-3">{fmtDate(e.spent_at)}</td>
                      <td className="p-3"><div className="flex flex-wrap gap-1"><Badge variant="secondary">{EXPENSE_CATEGORIES.find(c=>c.value===e.category)?.label ?? e.category}</Badge>{e.status === "payable" && <Badge variant="outline" className="border-amber-300 text-amber-700">آجل</Badge>}{e.source_type === "auto_payroll_line" && <Badge className="bg-teal-600">تلقائي</Badge>}</div></td>
                      <td className="p-3 text-muted-foreground">{e.description || "—"}</td>
                      <td className="p-3 text-end font-semibold">{fmtMoney(e.amount)}</td>
                      {isOwner && <td className="p-3">
                        <Button size="icon" variant="ghost" onClick={async () => {
                          if (!confirm("حذف المصروف؟")) return;
                          const { error } = await supabase.from("expenses").delete().eq("id", e.id);
                          if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
                        }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="advances" className="space-y-3">
          <div className="flex justify-end"><NewAdvanceDialog employees={employees} onCreated={load} userId={user?.id} /></div>
          {loading ? <Spinner /> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-start p-3">التاريخ</th>
                  <th className="text-start p-3">الموظف</th>
                  <th className="text-end p-3">المبلغ</th>
                  <th className="text-start p-3">السبب</th>
                  <th className="text-start p-3">الحالة</th>
                  {isOwner && <th className="p-3">إجراء</th>}
                </tr></thead>
                <tbody>
                  {advances.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد طلبات</td></tr>}
                  {advances.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-3">{fmtDate(a.created_at)}</td>
                      <td className="p-3 font-medium">{a.employee_name}</td>
                      <td className="p-3 text-end font-semibold">{fmtMoney(a.amount)}</td>
                      <td className="p-3 text-muted-foreground">{a.reason || "—"}</td>
                      <td className="p-3"><AdvanceStatus s={a.status} /></td>
                      {isOwner && <td className="p-3">
                        {a.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => decide(a.id, "approved", user?.id, load)}><Check className="w-4 h-4 ms-1" />موافقة</Button>
                            <Button size="sm" variant="outline" onClick={() => decide(a.id, "rejected", user?.id, load)}><X className="w-4 h-4 ms-1" />رفض</Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">{fmtDate(a.decided_at)}</span>}
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="revenue">
          <Card><CardHeader><CardTitle className="text-base">ملخص الإيرادات</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Stat title="إجمالي الإيرادات" value={fmtMoney(revenue.total)} />
            <Stat title="المحصّل" value={fmtMoney(revenue.paid)} />
            <Stat title="المتبقي على العملاء" value={fmtMoney(revenue.unpaid)} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function decide(id: string, status: "approved"|"rejected", uid: string|undefined, reload: () => void) {
  const { error } = await supabase.from("employee_requests").update({ status, decided_by: uid, decided_at: new Date().toISOString() }).eq("id", id);
  if (error) toast.error(error.message);
  else { toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض"); reload(); }
}

function StatCard({ label, value, sub, icon, tone }: any) {
  const toneCls = tone === "success" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "danger" ? "text-destructive" : "";
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span>{icon}</div><div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>{sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}</CardContent></Card>;
}
function Stat({ title, value }: { title: string; value: string }) {
  return <div className="p-4 rounded-lg border"><div className="text-xs text-muted-foreground">{title}</div><div className="text-lg font-bold mt-1">{value}</div></div>;
}
function Spinner() { return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>; }
function AdvanceStatus({ s }: { s: string }) {
  if (s === "pending") return <Badge variant="secondary">قيد المراجعة</Badge>;
  if (s === "approved") return <Badge className="bg-emerald-600">موافق</Badge>;
  return <Badge variant="destructive">مرفوض</Badge>;
}
function NewExpenseDialog({ onCreated, userId }: { onCreated: () => void; userId?: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
  const [amount, setAmount] = useState(""); const [description, setDescription] = useState(""); const [saving, setSaving] = useState(false);
  async function submit() {
    const amt = Number(amount); if (!amt || amt <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({ category: category as any, amount: amt, description: description || null, created_by: userId });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("تم إضافة المصروف"); setOpen(false); setAmount(""); setDescription(""); onCreated(); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" />مصروف جديد</Button></DialogTrigger>
      <DialogContent dir="rtl"><DialogHeader><DialogTitle>إضافة مصروف</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>الفئة</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>المبلغ</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>الوصف (اختياري)</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function NewAdvanceDialog({ employees, onCreated, userId }: { employees: Employee[]; onCreated: () => void; userId?: string }) {
  const [open, setOpen] = useState(false);
  const [empId, setEmpId] = useState(""); const [amount, setAmount] = useState(""); const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false);
  async function submit() {
    const emp = employees.find((e) => e.id === empId); if (!emp) { toast.error("اختر موظف"); return; }
    const amt = Number(amount); if (!amt || amt <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    setSaving(true);
    const { error } = await supabase.from("employee_requests").insert({ employee_id: emp.id, type: "advance", amount: amt, reason: reason || null, created_by: userId, status: "pending" });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("تم إرسال الطلب"); setOpen(false); setAmount(""); setReason(""); setEmpId(""); onCreated(); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="w-4 h-4 ms-1" />طلب سلفة</Button></DialogTrigger>
      <DialogContent dir="rtl"><DialogHeader><DialogTitle>طلب سلفة لموظف</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>الموظف</Label><Select value={empId} onValueChange={setEmpId}><SelectTrigger><SelectValue placeholder="اختر موظف" /></SelectTrigger><SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>المبلغ</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>السبب (اختياري)</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال للمالك"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
