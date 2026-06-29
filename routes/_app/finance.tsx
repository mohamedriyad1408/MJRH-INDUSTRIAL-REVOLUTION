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
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/finance")({
  head: () => ({ meta: [{ title: "الحسابات - MJRH" }] }),
  component: FinancePage,
});

const EXPENSE_CATEGORIES = [
  { value: "salaries", label: "Salaries" },
  { value: "rent", label: "Rent" },
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
  { value: "supplies", label: "Supplies" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

type Expense = { id: string; category: string; amount: number; description: string | null; spent_at: string; created_at: string; status?: string; source_type?: string | null; employee_id?: string | null };
// ✅ Phase 2: Use employees instead of technicians
type AdvanceRequest = { id: string; employee_id: string | null; employee_name: string; amount: number; reason: string | null; status: "pending"|"approved"|"rejected"; created_at: string; decided_at: string | null };
type Employee = { id: string; full_name: string; monthly_salary?: number; commission_percent?: number };

function FinancePage() {
  const { hasRole, user, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const isOwner = hasRole("owner");
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState({ total: 0, paid: 0, unpaid: 0, count: 0 });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); // ✅ was: techs/technicians
  const [payrollSync, setPayrollSync] = useState<any>(null);
  const [syncingPayroll, setSyncingPayroll] = useState(false);
  const [range, setRange] = useState<"7d"|"30d"|"all">("30d");
  const [branches, setBranches] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");

  const fromDate = useMemo(() => {
    if (range === "all") return null;
    const d = new Date(); d.setDate(d.getDate() - (range === "7d" ? 7 : 30));
    return d.toISOString();
  }, [range]);

  async function load() {
    setLoading(true);
    try {
      // الوضع السهل: أول ما صاحب العمل يفتح الحسابات، النظام يجهز رواتب الشهر كمصروفات آجلة بدون خطوات معقدة.
      const { data: payrollData, error: payrollError } = await supabase
        .rpc("sync_monthly_payroll_payables", { _month: new Date().toISOString().slice(0, 10) });
      if (payrollError) toast.error(`تعذر تجهيز الرواتب: ${payrollError.message}`);
      setPayrollSync(payrollData ?? null);

      const addBranch = (q: any) => branchId === "all" ? q : q.eq("branch_id", branchId);
      let oq = addBranch(supabase.from("orders").select("total,payment_status,payment_method,branch_id").neq("status", "cancelled"));
      if (fromDate) oq = oq.gte("created_at", fromDate);

      let eq = addBranch(supabase.from("expenses").select("*,branches(name),cash_accounts(name)").neq("status", "void")).order("spent_at", { ascending: false });
      if (fromDate) eq = eq.gte("spent_at", fromDate);

      const [ordRes, expRes, advRes, empRes, brRes, caRes] = await Promise.all([
        oq,
        eq,
        supabase
          .from("employee_requests")
          .select("id,employee_id,amount,reason,status,created_at,decided_at,employees(full_name)")
          .eq("type", "advance")
          .order("created_at", { ascending: false }),
        addBranch(supabase.from("employees").select("id,full_name,monthly_salary,commission_percent,branch_id").eq("is_active", true)).order("full_name"),
        tenantId ? supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at") : Promise.resolve({ data: [] }),
        branchId === "all" ? supabase.from("cash_accounts").select("id,name,branch_id").eq("is_active", true).order("name") : supabase.from("cash_accounts").select("id,name,branch_id").eq("is_active", true).eq("branch_id", branchId).order("name"),
      ]);

      if (ordRes.error) toast.error(ordRes.error.message);
      if (expRes.error) toast.error(expRes.error.message);
      if (advRes.error) toast.error(advRes.error.message);
      if (empRes.error) toast.error(empRes.error.message);
      if ((brRes as any).error) toast.error((brRes as any).error.message);
      if ((caRes as any).error) toast.error((caRes as any).error.message);

      const orders = ordRes.data ?? [];
      const rev = orders.reduce((acc: any, o: any) => {
        const t = Number(o.total ?? 0); acc.total += t; acc.count++;
        if (o.payment_status === "paid") acc.paid += t; else acc.unpaid += t;
        return acc;
      }, { total: 0, paid: 0, unpaid: 0, count: 0 });
      setRevenue(rev);
      setExpenses((expRes.data ?? []) as any);
      setAdvances(((advRes.data ?? []) as any).map((a: any) => ({ ...a, employee_name: a.employees?.full_name ?? "—" })));
      setEmployees((empRes.data ?? []) as any);
      setBranches(((brRes as any).data ?? []) as any);
      setCashAccounts(((caRes as any).data ?? []) as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [fromDate, branchId, tenantId]);

  async function syncPayrollNow() {
    setSyncingPayroll(true);
    const { data, error } = await supabase.rpc("sync_monthly_payroll_payables", { _month: new Date().toISOString().slice(0, 10) });
    setSyncingPayroll(false);
    if (error) return toast.error(error.message);
    setPayrollSync(data);
    toast.success("تم تجهيز رواتب وعمولات الشهر كمصروفات آجلة");
    load();
  }

  const pendingAdvances = advances.filter((a) => a.status === "pending");
  const approvedAdvancesTotal = advances.filter((a) => a.status === "approved").reduce((s, a) => s + Number(a.amount), 0);
  const payrollGrossFromSync = Number(payrollSync?.gross_total ?? 0);
  const payrollNetFromSync = Number(payrollSync?.net_total ?? payrollGrossFromSync);
  const expectedMonthlySalaries = payrollGrossFromSync || employees.reduce((s, e) => s + Number(e.monthly_salary ?? 0), 0);
  const payablePayroll = payrollGrossFromSync;
  const visibleExpenses = expenses.filter((e) => !(e.category === "salaries" && ["payroll_line", "auto_payroll_line"].includes(e.source_type ?? "")));
  const nonPayrollExpenses = visibleExpenses.filter((e) => e.category !== "salaries").reduce((s, e) => s + Number(e.amount), 0);
  const dailyAndAdvanceSalaryExpenses = visibleExpenses.filter((e) => e.category === "salaries").reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = nonPayrollExpenses + payrollGrossFromSync + dailyAndAdvanceSalaryExpenses;
  const netProfit = revenue.total - totalExpenses;

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("finance.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("finance.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">{t("common.branch")}:</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("common.allBranches")}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
          <Label className="text-sm">{t("common.period")}:</Label>
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t("common.range7")}</SelectItem>
              <SelectItem value="30d">{t("common.range30")}</SelectItem>
              <SelectItem value="all">{t("common.rangeAll")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t("finance.totalRevenue")} value={fmtMoney(revenue.total, t("common.egp"))} icon={<TrendingUp className="w-4 h-4" />} sub={`${revenue.count} طلب`} tone="success" />
        <StatCard label={t("finance.collected")} value={fmtMoney(revenue.paid, t("common.egp"))} sub={`${t("finance.remaining")}: ${fmtMoney(revenue.unpaid, t("common.egp"))}`} />
        <StatCard label={t("finance.expenses")} value={fmtMoney(totalExpenses, t("common.egp"))} icon={<TrendingDown className="w-4 h-4" />} tone="warn" />
        <StatCard label={t("finance.netProfit")} value={fmtMoney(netProfit, t("common.egp"))} icon={<Wallet className="w-4 h-4" />} tone={netProfit >= 0 ? "success" : "danger"} sub={`سلف معتمدة: ${fmtMoney(approvedAdvancesTotal)}`} />
      </div>

      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-black text-lg flex items-center gap-2"><Users className="w-5 h-5 text-teal-700" />{t("finance.monthPayrollAuto")}</div>
              <p className="text-sm text-muted-foreground">{t("finance.payrollHelp")}</p>
            </div>
            <Button onClick={syncPayrollNow} disabled={syncingPayroll}>
              {syncingPayroll ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}
              {t("finance.syncPayroll")}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat title={t("finance.monthSalaries")} value={fmtMoney(expectedMonthlySalaries)} />
            <Stat title={t("finance.netAfterAdvances")} value={fmtMoney(payrollNetFromSync)} />
            <Stat title={t("finance.payrollPayable")} value={fmtMoney(payablePayroll)} />
            <Stat title={t("finance.advancesDeducted")} value={fmtMoney(approvedAdvancesTotal)} />
          </div>
          {payrollSync && <div className="text-xs text-teal-700 font-bold">آخر مزامنة: {payrollSync.employees_count ?? 0} موظف · إجمالي رواتب الشهر {fmtMoney(Number(payrollSync.gross_total ?? 0))} · صافي بعد السلف {fmtMoney(Number(payrollSync.net_total ?? 0))}</div>}
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-blue-50/40">
        <CardContent className="p-3 text-sm text-blue-800">
          ملاحظة: الرواتب الشهرية تظهر مرة واحدة من مسير الرواتب، والسلف تخصم من الصافي. بنود الرواتب الفنية القديمة أو المكررة لا تظهر في جدول المصروفات حتى لا تضاعف الرقم على صاحب العمل.
        </CardContent>
      </Card>

      <Tabs defaultValue={pendingAdvances.length ? "advances" : "expenses"}>
        <TabsList>
          <TabsTrigger value="expenses">{t("finance.expensesTab")}</TabsTrigger>
          <TabsTrigger value="advances">
            {t("finance.advancesTab")}
            {pendingAdvances.length > 0 && <Badge variant="destructive" className="me-2">{pendingAdvances.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="revenue">{t("finance.revenueTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-3">
          <div className="flex justify-end"><NewExpenseDialog onCreated={load} userId={user?.id} tenantId={tenantId ?? undefined} branches={branches} cashAccounts={cashAccounts} defaultBranchId={branchId !== "all" ? branchId : branches[0]?.id} /></div>
          {loading ? <Spinner /> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="text-start p-3">{t("common.date")}</th>
                  <th className="text-start p-3">{t("common.category")}</th>
                  <th className="text-start p-3">{t("common.description")}</th>
                  <th className="text-end p-3">{t("common.amount")}</th>
                  {isOwner && <th className="p-3 w-12"></th>}
                </tr></thead>
                <tbody>
                  {visibleExpenses.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t("common.noExpenses")}</td></tr>}
                  {visibleExpenses.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="p-3">{fmtDate(e.spent_at)}</td>
                      <td className="p-3"><div className="flex flex-wrap gap-1"><Badge variant="secondary">{EXPENSE_CATEGORIES.find(c=>c.value===e.category)?.label ?? e.category}</Badge>{e.status === "payable" && <Badge variant="outline" className="border-amber-300 text-amber-700">آجل</Badge>}{e.source_type === "auto_payroll_line" && <Badge className="bg-teal-600">تلقائي</Badge>}</div></td>
                      <td className="p-3 text-muted-foreground"><div>{e.description || "—"}</div><div className="text-[11px] text-teal-700">{(e as any).branches?.name ?? "بدون فرع"}{(e as any).cash_accounts?.name ? ` · ${(e as any).cash_accounts.name}` : ""}</div></td>
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
                  <th className="text-start p-3">{t("common.date")}</th>
                  <th className="text-start p-3">{t("common.employee")}</th>
                  <th className="text-end p-3">{t("common.amount")}</th>
                  <th className="text-start p-3">{t("common.reason")}</th>
                  <th className="text-start p-3">{t("common.status")}</th>
                  {isOwner && <th className="p-3">إجراء</th>}
                </tr></thead>
                <tbody>
                  {advances.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{t("common.noRequests")}</td></tr>}
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
                            <Button size="sm" onClick={() => decide(a.id, "approved", user?.id, load)}><Check className="w-4 h-4 ms-1" />{t("finance.approve")}</Button>
                            <Button size="sm" variant="outline" onClick={() => decide(a.id, "rejected", user?.id, load)}><X className="w-4 h-4 ms-1" />{t("finance.reject")}</Button>
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
          <Card><CardHeader><CardTitle className="text-base">{t("finance.revenueSummary")}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Stat title="إجمالي الإيرادات" value={fmtMoney(revenue.total, t("common.egp"))} />
            <Stat title="المحصّل" value={fmtMoney(revenue.paid, t("common.egp"))} />
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
function NewExpenseDialog({ onCreated, userId, tenantId, branches, cashAccounts, defaultBranchId }: { onCreated: () => void; userId?: string; tenantId?: string; branches: any[]; cashAccounts: any[]; defaultBranchId?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
  const [status, setStatus] = useState<"paid" | "payable">("paid");
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const [cashAccountId, setCashAccountId] = useState("");
  const [amount, setAmount] = useState(""); const [description, setDescription] = useState(""); const [saving, setSaving] = useState(false);
  const visibleSafes = cashAccounts.filter((c) => !branchId || c.branch_id === branchId);
  useEffect(() => { if (open) setBranchId((old) => old || defaultBranchId || branches[0]?.id || ""); }, [open, defaultBranchId, branches]);
  useEffect(() => { if (status === "paid" && visibleSafes.length && !visibleSafes.some((c) => c.id === cashAccountId)) setCashAccountId(visibleSafes[0].id); }, [status, branchId, cashAccounts]);
  async function submit() {
    const amt = Number(amount); if (!amt || amt <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    if (!branchId) { toast.error("اختار الفرع"); return; }
    if (status === "paid" && !cashAccountId) { toast.error("اختار الخزنة التي دفعت المصروف"); return; }
    setSaving(true);
    const { data: expense, error } = await supabase.from("expenses").insert({
      tenant_id: tenantId,
      category: category as any,
      amount: amt,
      description: description || null,
      created_by: userId,
      branch_id: branchId,
      status,
      cash_account_id: status === "paid" ? cashAccountId : null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    }).select("id").single();

    // لا نسجل حركة خزنة يدويًا هنا.
    // قاعدة البيانات تقوم تلقائيًا بإنشاء حركة الخزنة والقيد المحاسبي عبر trg_expenses_financial_sync.
    if (!error && expense?.id) {
      await supabase.rpc("record_operation_event", {
        _process_key: "expense_created",
        _process_name: status === "paid" ? "تسجيل مصروف مدفوع" : "تسجيل مصروف آجل",
        _source_type: "expense",
        _source_id: expense.id,
        _branch_id: branchId,
        _cash_account_id: status === "paid" ? cashAccountId : null,
        _report_bucket: "finance/reports",
        _requires_notification: false,
        _data: { tenant_id: tenantId, category, amount: amt, status },
        _output: { cash_impact: status === "paid", journal_required: true, appears_in_report: true },
      }).then(() => null);
    }
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("تم إضافة المصروف وسيتم إنشاء القيد وحركة الخزنة تلقائيًا"); setOpen(false); setAmount(""); setDescription(""); onCreated(); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" />{t("finance.newExpense")}</Button></DialogTrigger>
      <DialogContent dir="rtl"><DialogHeader><DialogTitle>{t("finance.addExpense")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("common.branch")}</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger><SelectValue placeholder="اختار الفرع" /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{t("common.category")}</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{t("common." + c.value, c.label)}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{t("common.status")}</Label><Select value={status} onValueChange={(v) => setStatus(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">مدفوع الآن</SelectItem><SelectItem value="payable">آجل / مستحق</SelectItem></SelectContent></Select></div>
          {status === "paid" && <div><Label>الخزنة التي دفعت</Label><Select value={cashAccountId} onValueChange={setCashAccountId}><SelectTrigger><SelectValue placeholder="اختار الخزنة" /></SelectTrigger><SelectContent>{visibleSafes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>}
          <div><Label>{t("common.amount")}</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>{t("common.description")} ({t("common.optional", "optional")})</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function NewAdvanceDialog({ employees, onCreated, userId }: { employees: Employee[]; onCreated: () => void; userId?: string }) {
  const { t } = useI18n();
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
      <DialogTrigger asChild><Button variant="outline"><Plus className="w-4 h-4 ms-1" />{t("finance.advanceRequest")}</Button></DialogTrigger>
      <DialogContent dir="rtl"><DialogHeader><DialogTitle>{t("finance.addAdvance")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("common.employee")}</Label><Select value={empId} onValueChange={setEmpId}><SelectTrigger><SelectValue placeholder="اختر موظف" /></SelectTrigger><SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{t("common.amount")}</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>{t("common.reason")} ({t("common.optional", "optional")})</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال للمالك"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
