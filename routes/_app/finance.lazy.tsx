import { createLazyFileRoute } from "@tanstack/react-router";
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
import { useI18n, interpolate } from "@/lib/i18n";

export const Route = createLazyFileRoute("/_app/finance")({
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

type Expense = { 
  id: string; 
  category: string; 
  amount: number; 
  description: string | null; 
  spent_at: string; 
  created_at: string; 
  status?: string; 
  source_type?: string | null; 
  employee_id?: string | null;
  branches?: { name: string } | null;
  cash_accounts?: { name: string } | null;
};
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
  const [employees, setEmployees] = useState<Employee[]>([]);
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
      const { data: payrollData, error: payrollError } = await supabase
        .rpc("sync_monthly_payroll_payables", { _month: new Date().toISOString().slice(0, 10) });
      if (payrollError) toast.error(payrollError.message);
      setPayrollSync(payrollData ?? null);

      const addBranch = (q: any) => branchId === "all" ? q : q.eq("branch_id", branchId);
      let oq = addBranch(supabase.from("orders").select("total,payment_status,payment_method,branch_id").neq("status", "cancelled"));
      if (fromDate) oq = oq.gte("created_at", fromDate);

      let eq = addBranch(supabase.from("expenses").select("*,branches(name),cash_accounts(name)").neq("status", "void")).order("spent_at", { ascending: false });
      if (fromDate) eq = eq.gte("spent_at", fromDate);

      const [ordRes, expRes, advRes, empRes, brRes, caRes] = await Promise.all([
        oq, eq,
        supabase.from("employee_requests").select("id,employee_id,amount,reason,status,created_at,decided_at,employees(full_name)").eq("type", "advance").order("created_at", { ascending: false }),
        addBranch(supabase.from("employees").select("id,full_name,monthly_salary,commission_percent,branch_id").eq("is_active", true)).order("full_name"),
        tenantId ? supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at") : Promise.resolve({ data: [] }),
        branchId === "all" ? supabase.from("cash_accounts").select("id,name,branch_id").eq("is_active", true).order("name") : supabase.from("cash_accounts").select("id,name,branch_id").eq("is_active", true).eq("branch_id", branchId).order("name"),
      ]);

      setRevenue((ordRes.data ?? []).reduce((acc: any, o: any) => {
        const tVal = Number(o.total ?? 0); acc.total += tVal; acc.count++;
        if (o.payment_status === "paid") acc.paid += tVal; else acc.unpaid += tVal;
        return acc;
      }, { total: 0, paid: 0, unpaid: 0, count: 0 }));
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
    toast.success(t("finance.toastSyncSuccess"));
    load();
  }

  const approvedAdvancesTotal = advances.filter((a) => a.status === "approved").reduce((s, a) => s + Number(a.amount), 0);
  const payrollGrossFromSync = Number(payrollSync?.gross_total ?? 0);
  const visibleExpenses = expenses.filter((e) => !(e.category === "salaries" && ["payroll_line", "auto_payroll_line"].includes(e.source_type ?? "")));
  const totalExpenses = visibleExpenses.reduce((s, e) => s + Number(e.amount), 0) + payrollGrossFromSync;
  const netProfit = revenue.total - totalExpenses;

  async function decideRequest(id: string, status: "approved"|"rejected") {
    const { error } = await supabase.from("employee_requests").update({ status, decided_by: user?.id, decided_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(status === "approved" ? t("finance.toastApproved") : t("finance.toastRejected")); load(); }
  }

  async function deleteExpense(id: string) {
    if (!confirm(t("common.confirmDelete"))) return;
    const { error } = await supabase.from("expenses").update({ status: "void" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(t("common.toastDeleted")); load(); }
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{t("finance.title")}</h1><p className="text-sm text-muted-foreground">{t("finance.subtitle")}</p></div>
        <div className="flex items-center gap-2">
          <Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.allBranches")}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
          <Select value={range} onValueChange={(v) => setRange(v as any)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7d">{t("common.range7")}</SelectItem><SelectItem value="30d">{t("common.range30")}</SelectItem><SelectItem value="all">{t("common.rangeAll")}</SelectItem></SelectContent></Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t("finance.totalRevenue")} value={fmtMoney(revenue.total, t("common.egp"))} icon={<TrendingUp className="w-4 h-4" />} sub={`${revenue.count} orders`} tone="success" />
        <StatCard label={t("finance.collected")} value={fmtMoney(revenue.paid, t("common.egp"))} sub={`${t("finance.remaining")}: ${fmtMoney(revenue.unpaid, t("common.egp"))}`} />
        <StatCard label={t("finance.expenses")} value={fmtMoney(totalExpenses, t("common.egp"))} icon={<TrendingDown className="w-4 h-4" />} tone="warn" />
        <StatCard label={t("finance.netProfit")} value={fmtMoney(netProfit, t("common.egp"))} icon={<Wallet className="w-4 h-4" />} tone={netProfit >= 0 ? "success" : "danger"} sub={`Advances: ${fmtMoney(approvedAdvancesTotal)}`} />
      </div>

      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg text-white"><Users className="w-6 h-6" /></div>
              <div><div className="font-black text-lg">{t("finance.monthPayrollAuto")}</div><p className="text-sm text-muted-foreground">{t("finance.payrollHelp")}</p></div>
            </div>
            <Button onClick={syncPayrollNow} disabled={syncingPayroll} className="bg-teal-600 hover:bg-teal-700">{syncingPayroll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 ms-1" />}{t("finance.syncPayroll")}</Button>
          </div>
          {payrollSync && <div className="text-xs font-bold text-teal-800">{interpolate(t("finance.lastSync"), { count: payrollSync.employees_count, gross: fmtMoney(payrollSync.gross_total), net: fmtMoney(payrollSync.net_total) })}</div>}
        </CardContent>
      </Card>

      <Tabs defaultValue="expenses" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList><TabsTrigger value="expenses">{t("finance.expensesTab")}</TabsTrigger><TabsTrigger value="advances">{t("finance.advancesTab")}</TabsTrigger><TabsTrigger value="revenue">{t("finance.revenueTab")}</TabsTrigger></TabsList>
          {isOwner && <div className="flex gap-2"><NewExpenseDialog onCreated={load} userId={user?.id} tenantId={tenantId ?? undefined} branches={branches} cashAccounts={cashAccounts} defaultBranchId={branchId === "all" ? "" : branchId} /></div>}
        </div>

        <TabsContent value="expenses">
          <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-start p-3">{t("common.date")}</th><th className="text-start p-3">{t("common.category")}</th><th className="text-start p-3">{t("common.description")}</th><th className="text-end p-3">{t("common.amount")}</th><th className="p-3 w-16"></th></tr></thead>
            <tbody>
              {visibleExpenses.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t("common.noExpenses")}</td></tr>}
              {visibleExpenses.map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-xs">{fmtDate(e.spent_at)}</td>
                  <td className="p-3"><Badge variant="outline">{t("accounting.expense.cat." + e.category)}</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs"><div>{e.description || "—"}</div><div className="text-[10px] text-teal-700">{e.branches?.name ?? t("common.noBranch")}</div></td>
                  <td className="p-3 text-end font-bold">{fmtMoney(e.amount, t("common.egp"))}</td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={() => deleteExpense(e.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="advances">
          <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-start p-3">{t("common.date")}</th><th className="text-start p-3">{t("common.employee")}</th><th className="text-end p-3">{t("common.amount")}</th><th className="text-start p-3">{t("common.reason")}</th><th className="text-start p-3">{t("common.status")}</th><th className="p-3 w-32"></th></tr></thead>
            <tbody>
              {advances.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3 text-xs">{fmtDate(a.created_at)}</td>
                  <td className="p-3 font-bold">{a.employee_name}</td>
                  <td className="p-3 text-end font-mono">{fmtMoney(a.amount, t("common.egp"))}</td>
                  <td className="p-3 text-xs text-muted-foreground">{a.reason || "—"}</td>
                  <td className="p-3"><AdvanceStatus s={a.status} t={t} /></td>
                  <td className="p-3">
                    {a.status === "pending" && isOwner && (
                      <div className="flex gap-1"><Button size="sm" onClick={() => decideRequest(a.id, "approved")}><Check className="w-3 h-3 ms-1" />{t("finance.approve")}</Button><Button size="sm" variant="outline" onClick={() => decideRequest(a.id, "rejected")}><X className="w-3 h-3 ms-1" />{t("finance.reject")}</Button></div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card><CardHeader><CardTitle className="text-base">{t("finance.revenueSummary")}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Stat title={t("finance.totalRevenue")} value={fmtMoney(revenue.total, t("common.egp"))} />
            <Stat title={t("finance.collected")} value={fmtMoney(revenue.paid, t("common.egp"))} />
            <Stat title={t("finance.remaining")} value={fmtMoney(revenue.unpaid, t("common.egp"))} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, sub, icon, tone }: any) {
  const toneCls = tone === "success" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "danger" ? "text-destructive" : "";
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span>{icon}</div><div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>{sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}</CardContent></Card>;
}
function Stat({ title, value }: { title: string; value: string }) {
  return <div className="p-4 rounded-lg border"><div className="text-xs text-muted-foreground">{title}</div><div className="text-lg font-bold mt-1">{value}</div></div>;
}
function AdvanceStatus({ s, t }: { s: string, t: any }) {
  if (s === "pending") return <Badge variant="secondary">{t("finance.pendingReview")}</Badge>;
  if (s === "approved") return <Badge className="bg-emerald-600">{t("finance.approved")}</Badge>;
  return <Badge variant="destructive">{t("finance.rejected")}</Badge>;
}

function NewExpenseDialog({ onCreated, userId, tenantId, branches, cashAccounts, defaultBranchId }: { onCreated: () => void; userId?: string; tenantId?: string; branches: any[]; cashAccounts: any[]; defaultBranchId?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].value);
  const [status, setStatus] = useState<"paid" | "payable">("paid");
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const [cashAccountId, setCashAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const visibleSafes = cashAccounts.filter((c) => !branchId || c.branch_id === branchId);

  useEffect(() => { if (open) setBranchId((old) => old || defaultBranchId || branches[0]?.id || ""); }, [open, defaultBranchId, branches]);
  useEffect(() => { if (status === "paid" && visibleSafes.length && !visibleSafes.some((c) => c.id === cashAccountId)) setCashAccountId(visibleSafes[0].id); }, [status, branchId, cashAccounts]);

  async function submit() {
    const amt = Number(amount); if (!amt || amt <= 0) { toast.error(t("finance.errReqFields")); return; }
    if (!branchId) { toast.error(t("inventory.errBranch")); return; }
    if (status === "paid" && !cashAccountId) { toast.error(t("accounting.error.noSafeSelected")); return; }
    setSaving(true);
    const { data: expense, error } = await supabase.from("expenses").insert({
      tenant_id: tenantId, category, amount: amt, description: description || null, created_by: userId, branch_id: branchId, status,
      cash_account_id: status === "paid" ? cashAccountId : null, paid_at: status === "paid" ? new Date().toISOString() : null,
    }).select("id").single();
    if (!error && expense?.id) {
      await supabase.rpc("record_operation_event", { _process_key: "expense_created", _process_name: status === "paid" ? t("finance.recordPaidExpense", "Paid Expense") : t("finance.recordPayableExpense", "Payable Expense"), _source_type: "expense", _source_id: expense.id, _branch_id: branchId, _cash_account_id: status === "paid" ? cashAccountId : null, _report_bucket: "finance/reports", _requires_notification: false, _data: { tenant_id: tenantId, category, amount: amt, status }, _output: { cash_impact: status === "paid", journal_required: true, appears_in_report: true } }).then(() => null);
    }
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success(t("finance.toastExpenseSuccess")); setOpen(false); setAmount(""); setDescription(""); onCreated(); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="w-4 h-4 ms-1" />{t("finance.newExpense")}</Button></DialogTrigger>
      <DialogContent className="rounded-3xl max-w-md"><DialogHeader><DialogTitle>{t("finance.addExpense")}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>{t("common.branch")}</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger><SelectValue placeholder={t("inventory.branchPlaceholder")} /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{t("common.category")}</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{t("common." + c.value, c.label)}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{t("common.status")}</Label><Select value={status} onValueChange={(v: any) => setStatus(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">{t("accounting.expenses.paid")}</SelectItem><SelectItem value="payable">{t("accounting.expenses.unpaid")}</SelectItem></SelectContent></Select></div>
          {status === "paid" && <div><Label>{t("accounting.cash.account")}</Label><Select value={cashAccountId} onValueChange={setCashAccountId}><SelectTrigger><SelectValue placeholder={t("accounting.error.noSafeSelected")} /></SelectTrigger><SelectContent>{visibleSafes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>}
          <div><Label>{t("common.amount")}</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>{t("common.description")}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
