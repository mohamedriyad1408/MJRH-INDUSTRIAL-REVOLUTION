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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calculator, Landmark, WalletCards, Receipt, Users, Loader2, Plus, CheckCircle2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/accounting")({
  head: () => ({ meta: [{ title: "المحاسبة والخزنة" }] }),
  component: AccountingPage,
});

type Employee = { id: string; full_name: string; monthly_salary: number; commission_percent: number; is_active: boolean };

function monthBounds(date = new Date()) {
  const s = new Date(date.getFullYear(), date.getMonth(), 1);
  const e = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10), fromIso: s.toISOString(), toIso: e.toISOString() };
}

function AccountingPage() {
  const { hasRole, user, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const canUse = hasRole("owner", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [cashTx, setCashTx] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");
  const [cashForm, setCashForm] = useState({ name: "", account_type: "cash", opening_balance: "0", branch_id: "" });
  const [txForm, setTxForm] = useState({ cash_account_id: "", direction: "in", amount: "0", description: "" });
  const [transferForm, setTransferForm] = useState({ from_cash_account_id: "", to_cash_account_id: "", amount: "0", notes: "" });
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [fixingCash, setFixingCash] = useState(false);

  const bounds = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return monthBounds(new Date(y, m - 1, 1));
  }, [month]);


  async function ensureCashAccount() {
    if (!tenantId) return [];
    const errs: string[] = [];
    const rpcFor = await (supabase as any).rpc("ensure_default_cash_account_for", { _tenant_id: tenantId });
    if (rpcFor.error) {
      errs.push(rpcFor.error.message);
      const rpc = await (supabase as any).rpc("ensure_default_cash_account");
      if (rpc.error) errs.push(rpc.error.message);
    }

    let dataQuery = (supabase as any)
      .from("cash_accounts")
      .select("*,branches(name)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);
    if (branchId !== "all") dataQuery = dataQuery.eq("branch_id", branchId);
    let { data, error } = await dataQuery.order("created_at");
    if (error) errs.push(error.message);

    if ((!data || data.length === 0) && tenantId && branchId === "all") {
      const ins = await (supabase as any).from("cash_accounts").insert({
        tenant_id: tenantId,
        name: "الخزنة الرئيسية",
        account_type: "cash",
        opening_balance: 0,
        current_balance: 0,
        branch_id: branches[0]?.id || null,
        is_active: true,
      }).select("*,branches(name)").single();
      if (!ins.error && ins.data) data = [ins.data];
      else if (ins.error) errs.push(ins.error.message);
    }
    if (errs.length) setLoadErrors((old) => [...new Set([...old, ...errs])].slice(0, 6));
    return data ?? [];
  }

  async function load() {
    if (!canUse) { setLoading(false); return; }
    if (!tenantId) {
      setLoading(false);
      setLoadErrors(["لم يتم تحديد مغسلة للحساب الحالي. سجل خروج ثم دخول، أو راجع دور المستخدم من لوحة الإدارة."]);
      return;
    }
    setLoading(true);
    setLoadErrors([]);
    try {
      const ensuredCash = await ensureCashAccount();
      const addBranch = (q: any, column = "branch_id") => branchId === "all" ? q : q.eq(column, branchId);
      const branchCashSelect = branchId === "all" ? "*,cash_accounts(name)" : "*,cash_accounts!inner(name,branch_id)";
      const branchEmployeeSelect = branchId === "all" ? "*,employees(full_name)" : "*,employees!inner(full_name,branch_id)";
      const results = await Promise.allSettled([
        Promise.resolve({ data: ensuredCash, error: null }),
        (branchId === "all" ? (supabase as any).from("cash_transactions").select(branchCashSelect).eq("tenant_id", tenantId) : (supabase as any).from("cash_transactions").select(branchCashSelect).eq("tenant_id", tenantId).eq("cash_accounts.branch_id", branchId)).order("happened_at", { ascending: false }).limit(80),
        addBranch((supabase as any).from("expenses").select("*,employees(full_name)").eq("tenant_id", tenantId)).gte("spent_at", bounds.fromIso).lte("spent_at", bounds.toIso).order("spent_at", { ascending: false }),
        addBranch((supabase as any).from("employees").select("id,full_name,monthly_salary,commission_percent,is_active").eq("tenant_id", tenantId)).eq("is_active", true).order("full_name"),
        (supabase as any).from("payroll_periods").select("*").eq("tenant_id", tenantId).order("period_start", { ascending: false }).limit(12),
        (branchId === "all" ? (supabase as any).from("payroll_lines").select("*,employees(full_name,branch_id),payroll_periods(period_start,period_end,status)").eq("tenant_id", tenantId) : (supabase as any).from("payroll_lines").select(`${branchEmployeeSelect},payroll_periods(period_start,period_end,status)`).eq("tenant_id", tenantId).eq("employees.branch_id", branchId)).order("created_at", { ascending: false }).limit(100),
        (branchId === "all" ? (supabase as any).from("employee_financial_ledger").select("*,employees(full_name)").eq("tenant_id", tenantId) : (supabase as any).from("employee_financial_ledger").select(branchEmployeeSelect).eq("tenant_id", tenantId).eq("employees.branch_id", branchId)).order("entry_at", { ascending: false }).limit(120),
      ]);
      const val = (i: number) => results[i].status === "fulfilled" ? (results[i] as any).value : { data: [], error: (results[i] as any).reason };
      const ca = val(0), ct = val(1), ex = val(2), em = val(3), pp = val(4), pl = val(5), lg = val(6);
      const errs = [ca, ct, ex, em, pp, pl, lg].map((r: any) => r.error?.message).filter(Boolean);
      if (errs.length) setLoadErrors((old) => [...new Set([...old, ...errs])].slice(0, 6));
      setCashAccounts(ca.data ?? []); setCashTx(ct.data ?? []); setExpenses(ex.data ?? []); setEmployees(em.data ?? []); setPeriods(pp.data ?? []); setLines(pl.data ?? []); setLedger(lg.data ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!tenantId) return;
    (supabase as any).from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at").then(({ data }: any) => {
      const list = data ?? [];
      setBranches(list);
      setCashForm((old) => ({ ...old, branch_id: old.branch_id || list[0]?.id || "" }));
    });
  }, [tenantId]);

  useEffect(() => { load(); }, [canUse, tenantId, month, branchId]);

  const kpis = useMemo(() => {
    const cash = cashAccounts.reduce((s, x) => s + Number(x.current_balance ?? 0), 0);
    const payable = expenses.filter((x) => x.status === "payable").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const paid = expenses.filter((x) => x.status === "paid").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const payrollDue = lines.filter((x) => x.status === "posted").reduce((s, x) => s + Number(x.net_pay ?? 0), 0);
    return { cash, payable, paid, payrollDue };
  }, [cashAccounts, expenses, lines]);

  async function addCashAccount() {
    if (!tenantId) return toast.error("لم يتم تحديد المغسلة");
    if (!cashForm.name.trim()) return toast.error("اكتب اسم الخزنة/الحساب");
    const selectedBranchId = cashForm.branch_id || (branchId !== "all" ? branchId : branches[0]?.id);
    if (branches.length && !selectedBranchId) return toast.error("اختار الفرع قبل إضافة الخزنة");
    const opening = Number(cashForm.opening_balance || 0);
    let createdCashAccountId: string | null = null;
    const rpc = await (supabase as any).rpc("create_cash_account_with_opening", {
      _name: cashForm.name.trim(),
      _account_type: cashForm.account_type,
      _opening_balance: opening,
    });
    if (rpc.error) {
      // Fallback for old deployments/database before the RPC migration: keep the owner working now.
      const { data: account, error: insErr } = await (supabase as any).from("cash_accounts").insert({
        tenant_id: tenantId,
        name: cashForm.name.trim(),
        account_type: cashForm.account_type,
        opening_balance: opening,
        current_balance: 0,
        branch_id: selectedBranchId || null,
        is_active: true,
      }).select("*").single();
      if (insErr) return toast.error(insErr.message || rpc.error.message);
      createdCashAccountId = account?.id ?? null;
      if (opening > 0 && account?.id) {
        const tx = await (supabase as any).from("cash_transactions").insert({
          tenant_id: tenantId,
          cash_account_id: account.id,
          direction: "in",
          amount: opening,
          description: `رصيد افتتاحي: ${cashForm.name.trim()}`,
          source_type: "cash_opening_balance",
          source_id: account.id,
          created_by: user?.id,
        });
        if (tx.error) await (supabase as any).from("cash_accounts").update({ current_balance: opening }).eq("id", account.id);
      }
      toast.success("تم إضافة الحساب. وسيتم ترحيل القيد المحاسبي تلقائيًا بعد تحديث قاعدة البيانات.");
    } else {
      createdCashAccountId = rpc.data ?? null;
      if (rpc.data && selectedBranchId) await (supabase as any).from("cash_accounts").update({ branch_id: selectedBranchId }).eq("id", rpc.data);
      toast.success("تم إضافة الحساب وتسجيل الرصيد في الخزنة والقيود");
    }
    await (supabase as any).rpc("record_operation_event", { _process_key: "cash_account_created", _process_name: "إضافة خزنة أو حساب", _source_type: "cash_account", _source_id: createdCashAccountId, _branch_id: selectedBranchId || null, _cash_account_id: createdCashAccountId, _report_bucket: "accounting/cash", _requires_notification: false, _data: { tenant_id: tenantId, name: cashForm.name.trim(), opening_balance: opening, account_type: cashForm.account_type }, _output: { cash_impact: opening > 0, journal_required: opening > 0, appears_in_report: true } }).then(() => null);
    setCashForm({ name: "", account_type: "cash", opening_balance: "0", branch_id: selectedBranchId || "" });
    load();
  }

  async function addCashTx() {
    if (!tenantId) return toast.error("لم يتم تحديد المغسلة");
    if (!txForm.cash_account_id) return toast.error("اختار الخزنة");
    if (!Number(txForm.amount)) return toast.error("اكتب مبلغ صحيح");
    const account = cashAccounts.find((c) => c.id === txForm.cash_account_id);
    const { data: tx, error } = await (supabase as any).from("cash_transactions").insert({
      tenant_id: tenantId, cash_account_id: txForm.cash_account_id, direction: txForm.direction, amount: Number(txForm.amount), description: txForm.description || "حركة يدوية", source_type: "manual_cash_transaction", created_by: user?.id,
    }).select("id").single();
    if (!error && tx?.id) await (supabase as any).rpc("record_operation_event", { _process_key: "manual_cash_transaction", _process_name: "حركة خزنة يدوية", _source_type: "manual_cash_transaction", _source_id: tx.id, _branch_id: account?.branch_id ?? null, _cash_account_id: txForm.cash_account_id, _report_bucket: "accounting/ledger", _requires_notification: false, _data: { tenant_id: tenantId, direction: txForm.direction, amount: Number(txForm.amount), description: txForm.description || "حركة يدوية" }, _output: { cash_impact: true, journal_required: true, appears_in_report: true } }).then(() => null);
    if (error) toast.error(error.message); else { toast.success("تم تسجيل الحركة وتحديث الخزنة"); setTxForm({ cash_account_id: "", direction: "in", amount: "0", description: "" }); load(); }
  }

  async function transferCash() {
    if (!tenantId) return toast.error("لم يتم تحديد المغسلة");
    if (!transferForm.from_cash_account_id || !transferForm.to_cash_account_id) return toast.error("اختار خزنة التحويل وخزنة الاستلام");
    if (transferForm.from_cash_account_id === transferForm.to_cash_account_id) return toast.error("لا يمكن التحويل لنفس الخزنة");
    const amount = Number(transferForm.amount || 0);
    if (amount <= 0) return toast.error("اكتب مبلغ تحويل صحيح");
    const { error } = await (supabase as any).rpc("transfer_cash_between_accounts", {
      _from_cash_account_id: transferForm.from_cash_account_id,
      _to_cash_account_id: transferForm.to_cash_account_id,
      _amount: amount,
      _notes: transferForm.notes || null,
    });
    if (error) return toast.error(error.message);
    const fromAccount = cashAccounts.find((c) => c.id === transferForm.from_cash_account_id);
    const toAccount = cashAccounts.find((c) => c.id === transferForm.to_cash_account_id);
    await (supabase as any).rpc("record_operation_event", { _process_key: "cash_transfer", _process_name: "تحويل بين الخزن", _source_type: "cash_transfer", _source_id: null, _branch_id: fromAccount?.branch_id ?? toAccount?.branch_id ?? null, _cash_account_id: transferForm.from_cash_account_id, _report_bucket: "accounting/cash", _requires_notification: false, _data: { tenant_id: tenantId, from_cash_account_id: transferForm.from_cash_account_id, to_cash_account_id: transferForm.to_cash_account_id, amount, notes: transferForm.notes || null }, _output: { cash_impact: true, journal_required: true, appears_in_report: true, not_income_or_expense: true } }).then(() => null);
    toast.success("تم التحويل بين الخزن بدون التأثير على الإيرادات أو المصروفات");
    setTransferForm({ from_cash_account_id: "", to_cash_account_id: "", amount: "0", notes: "" });
    load();
  }

  async function repairCashNow() {
    setFixingCash(true);
    try {
      const errs: string[] = [];
      const r1 = await (supabase as any).rpc("ensure_default_cash_account_for", { _tenant_id: tenantId }); if (r1.error) errs.push(r1.error.message);
      const r2 = await (supabase as any).rpc("repair_cash_account_balances"); if (r2.error) errs.push(r2.error.message);
      const r3 = await (supabase as any).rpc("sync_manual_cash_transactions_journals"); if (r3.error) errs.push(r3.error.message);
      if (errs.length) toast.error(errs.join(" | ")); else toast.success("تم فحص وإصلاح الخزنة والحسابات");
      await load();
    } finally {
      setFixingCash(false);
    }
  }

  async function syncApprovedAdvances() {
    const ensured = cashAccounts.length ? cashAccounts : await ensureCashAccount();
    const mainCash = ensured[0]?.id;
    if (!mainCash) return toast.error("تعذر إنشاء الخزنة الرئيسية");
    const { data: adv, error } = await (supabase as any)
      .from("employee_requests")
      .select("id,employee_id,amount,reason,created_at,employees(full_name)")
      .eq("type", "advance").eq("status", "approved")
      .gte("created_at", bounds.fromIso).lte("created_at", bounds.toIso);
    if (error) return toast.error(error.message);
    let created = 0;
    for (const a of adv ?? []) {
      const amount = Number(a.amount ?? 0); if (!amount) continue;
      const desc = `سلفة موظف: ${a.employees?.full_name ?? "موظف"}`;
      const { data: exp, error: eErr } = await (supabase as any).from("expenses").upsert({
        tenant_id: tenantId, branch_id: ensured[0]?.branch_id ?? null, cash_account_id: mainCash, category: "salaries", amount, description: desc, spent_at: a.created_at, status: "paid", employee_id: a.employee_id, source_type: "employee_advance", source_id: a.id, paid_at: a.created_at, created_by: user?.id,
      }, { onConflict: "tenant_id,source_type,source_id" }).select("id").single();
      if (!eErr) {
        await (supabase as any).from("cash_transactions").insert({ tenant_id: tenantId, cash_account_id: mainCash, direction: "out", amount, description: desc, source_type: "employee_advance", source_id: a.id, created_by: user?.id }).then(() => null);
        await (supabase as any).from("employee_financial_ledger").insert({ tenant_id: tenantId, employee_id: a.employee_id, entry_type: "advance", amount, direction: "employee_owes", source_type: "employee_advance", source_id: a.id, description: desc, created_by: user?.id }).then(() => null);
        await (supabase as any).rpc("record_operation_event", { _process_key: "employee_advance_synced", _process_name: "تسجيل سلفة موظف", _source_type: "employee_advance", _source_id: a.id, _branch_id: ensured[0]?.branch_id ?? null, _cash_account_id: mainCash, _report_bucket: "accounting/payroll", _requires_notification: false, _data: { tenant_id: tenantId, employee_id: a.employee_id, amount }, _output: { cash_impact: true, journal_required: true, appears_in_report: true } }).then(() => null);
        if (exp) created++;
      }
    }
    toast.success(`تمت مزامنة ${created} سلفة كمصروف وحركة خزنة`);
    load();
  }

  async function generatePayroll() {
    const { data, error } = await (supabase as any).rpc("sync_monthly_payroll_payables", { _month: bounds.start });
    if (error) return toast.error(error.message);
    toast.success(`تم توليد مسير الرواتب: ${data?.employees_count ?? 0} موظف`);
    load();
  }

  async function postPayroll(periodId: string) {
    const periodLines = lines.filter((l) => l.payroll_period_id === periodId);
    for (const l of periodLines) {
      const gross = Number(l.gross_pay ?? 0); if (!gross) continue;
      const desc = `استحقاق راتب ${l.employees?.full_name ?? "موظف"} عن ${l.payroll_periods?.period_start}`;
      const { data: exp } = await (supabase as any).from("expenses").upsert({
        tenant_id: tenantId, category: "salaries", amount: gross, description: desc, spent_at: bounds.toIso, status: "payable", employee_id: l.employee_id, source_type: "payroll_line", source_id: l.id, due_at: bounds.toIso, created_by: user?.id,
      }, { onConflict: "tenant_id,source_type,source_id" }).select("id").single();
      await (supabase as any).from("employee_financial_ledger").insert({ tenant_id: tenantId, employee_id: l.employee_id, entry_type: "salary_accrual", amount: gross, direction: "employee_due", source_type: "payroll_line", source_id: l.id, description: desc, created_by: user?.id }).then(() => null);
      if (Number(l.advances_deducted ?? 0) > 0) {
        await (supabase as any).from("employee_financial_ledger").insert({ tenant_id: tenantId, employee_id: l.employee_id, entry_type: "advance_deduction", amount: Number(l.advances_deducted), direction: "employee_due", source_type: "payroll_line", source_id: l.id, description: "خصم سلف من الراتب", created_by: user?.id }).then(() => null);
      }
      await (supabase as any).from("payroll_lines").update({ status: "posted", expense_id: exp?.id ?? l.expense_id }).eq("id", l.id);
      await (supabase as any).rpc("record_operation_event", { _process_key: "payroll_posted", _process_name: "اعتماد راتب كمصروف آجل", _source_type: "payroll_line", _source_id: l.id, _branch_id: l.employees?.branch_id ?? null, _cash_account_id: null, _report_bucket: "accounting/payroll", _requires_notification: false, _data: { tenant_id: tenantId, employee_id: l.employee_id, gross }, _output: { cash_impact: false, journal_required: true, appears_in_report: true } }).then(() => null);
    }
    await (supabase as any).from("payroll_periods").update({ status: "posted", posted_at: new Date().toISOString() }).eq("id", periodId);
    toast.success("تم ترحيل الرواتب كمصروفات مستحقة");
    load();
  }

  async function payPayroll(periodId: string) {
    const ensured = cashAccounts.length ? cashAccounts : await ensureCashAccount();
    const mainCash = ensured[0]?.id;
    if (!mainCash) return toast.error("تعذر إنشاء الخزنة الرئيسية للدفع");
    const periodLines = lines.filter((l) => l.payroll_period_id === periodId);
    for (const l of periodLines) {
      const net = Number(l.net_pay ?? 0); if (!net) continue;
      const desc = `صرف راتب ${l.employees?.full_name ?? "موظف"}`;
      const { data: tx, error } = await (supabase as any).from("cash_transactions").insert({ tenant_id: tenantId, cash_account_id: mainCash, direction: "out", amount: net, description: desc, source_type: "payroll_payment", source_id: l.id, created_by: user?.id }).select("id").single();
      if (!error) {
        if (l.expense_id) await (supabase as any).from("expenses").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", l.expense_id);
        await (supabase as any).from("payroll_lines").update({ status: "paid", cash_transaction_id: tx?.id }).eq("id", l.id);
        await (supabase as any).from("employee_financial_ledger").insert({ tenant_id: tenantId, employee_id: l.employee_id, entry_type: "salary_payment", amount: net, direction: "employee_due", source_type: "payroll_payment", source_id: l.id, description: desc, created_by: user?.id }).then(() => null);
        await (supabase as any).rpc("record_operation_event", { _process_key: "payroll_paid", _process_name: "صرف راتب", _source_type: "payroll_payment", _source_id: l.id, _branch_id: l.employees?.branch_id ?? ensured[0]?.branch_id ?? null, _cash_account_id: mainCash, _report_bucket: "accounting/payroll", _requires_notification: false, _data: { tenant_id: tenantId, employee_id: l.employee_id, net }, _output: { cash_impact: true, journal_required: true, appears_in_report: true } }).then(() => null);
      }
    }
    await (supabase as any).from("payroll_periods").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", periodId);
    toast.success("تم صرف الرواتب وتحديث الخزنة");
    load();
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">المحاسبة متاحة للمالك ومدير التشغيل فقط.</CardContent></Card>;

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><Calculator className="w-7 h-7 text-teal-600" />{t("accounting.title")}</h1><p className="text-sm text-muted-foreground">{t("accounting.subtitle")}</p></div>
      <div className="flex gap-2"><Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.allBranches")}</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><Button variant="outline" onClick={load}>{t("common.refresh")}</Button></div>
    </div>
    <div className="grid md:grid-cols-4 gap-3">
      <Kpi label={t("accounting.kpi.safes")} value={fmtMoney(kpis.cash, t("common.egp"))} icon={<Landmark />} />
      <Kpi label={t("accounting.kpi.paidExpenses")} value={fmtMoney(kpis.paid, t("common.egp"))} icon={<Receipt />} />
      <Kpi label={t("accounting.kpi.payableExpenses")} value={fmtMoney(kpis.payable, t("common.egp"))} icon={<WalletCards />} warn />
      <Kpi label={t("accounting.kpi.payrollDue")} value={fmtMoney(kpis.payrollDue, t("common.egp"))} icon={<Users />} warn={kpis.payrollDue > 0} />
    </div>

    {!loading && <Card className="border-teal-200 bg-teal-50/60"><CardContent className="p-4 text-sm text-teal-900 space-y-1">
      <div className="font-black">طريقة الاستخدام المختصرة</div>
      <div>١) افتح رواتب الشهر واضغط <b>جهّز رواتب الشهر</b> لو الرواتب غير ظاهرة.</div>
      <div>٢) اضغط <b>اعتماد كمصروف آجل</b> ليظهر الراتب كمصروف حتى قبل الدفع.</div>
      <div>٣) عند الدفع اضغط <b>صرف الرواتب</b> فيخصم من الخزنة تلقائيًا.</div>
    </CardContent></Card>}

    {!loading && loadErrors.length > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-900 space-y-2">
      <div className="font-black">الحسابات لم تُقرأ بشكل كامل، لذلك الأصفار الحالية ليست نتيجة مالية مؤكدة.</div>
      {loadErrors.map((e, i) => <div key={i} className="rounded-lg bg-white/70 border border-red-100 px-3 py-2 text-xs break-words">{e}</div>)}
      <Button size="sm" onClick={repairCashNow} disabled={fixingCash}>{fixingCash ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}إصلاح وقراءة الخزنة الآن</Button>
    </CardContent></Card>}

    {!loading && cashAccounts.length === 0 && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900 space-y-2">
      <div className="font-black">لا توجد خزنة مقروءة لهذه المغسلة.</div>
      <div>اضغط الزر التالي لإنشاء الخزنة الرئيسية تلقائيًا، أو أضف خزنة من تبويب الخزنة واكتب الرصيد الموجود الآن.</div>
      <Button size="sm" onClick={repairCashNow} disabled={fixingCash}>{fixingCash ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Plus className="w-4 h-4 ms-1" />}إنشاء/إصلاح الخزنة الرئيسية</Button>
    </CardContent></Card>}

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <Tabs defaultValue="payroll" className="space-y-4">
      <TabsList>
        <TabsTrigger value="payroll">{t("accounting.tab.payroll")}</TabsTrigger>
        <TabsTrigger value="cash">{t("accounting.tab.cash")}</TabsTrigger>
        <TabsTrigger value="expenses">{t("accounting.tab.expenses")}</TabsTrigger>
        <TabsTrigger value="ledger">{t("accounting.tab.ledger")}</TabsTrigger>
      </TabsList>

      <TabsContent value="payroll" className="space-y-4">
        <div className="flex flex-wrap gap-2"><Button onClick={generatePayroll}><RefreshCw className="w-4 h-4 ms-1" />{t("accounting.btn.generatePayroll")}</Button><Button variant="outline" onClick={syncApprovedAdvances}>تسجيل السلف في الحسابات</Button></div>
        <div className="grid md:grid-cols-2 gap-3">
          {periods.map((p) => <Card key={p.id}><CardHeader><CardTitle className="text-base flex items-center justify-between"><span>{p.period_start} → {p.period_end}</span><Status s={p.status} /></CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="grid grid-cols-3 gap-2"><Mini label="الإجمالي" value={fmtMoney(p.gross_total, t("common.egp"))} /><Mini label="السلف" value={fmtMoney(p.advances_total, t("common.egp"))} /><Mini label="الصافي" value={fmtMoney(p.net_total, t("common.egp"))} /></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => postPayroll(p.id)} disabled={p.status !== "draft"}>{t("accounting.btn.postPayroll")}</Button><Button size="sm" onClick={() => payPayroll(p.id)} disabled={p.status === "paid" || p.status === "draft"}><CheckCircle2 className="w-4 h-4 ms-1" />{t("accounting.btn.payPayroll")}</Button></div></CardContent></Card>)}
          {!periods.length && <Empty text="لم يتم توليد أي مسير رواتب بعد" />}
        </div>
        <Card><CardHeader><CardTitle className="text-base">بنود آخر الرواتب</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto"><PayrollTable rows={lines} /></CardContent></Card>
      </TabsContent>

      <TabsContent value="cash" className="grid lg:grid-cols-[360px_1fr] gap-4">
        <div className="space-y-4"><Card><CardHeader><CardTitle className="text-base"><Plus className="w-4 h-4 inline ms-1" />إضافة خزنة أو حساب</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-blue-50 border border-blue-100 p-2 text-xs text-blue-800">اكتب اسم الخزنة والفلوس الموجودة فيها الآن. النظام سيضيفها للرصيد ويسجل قيد افتتاحي تلقائيًا.</div><Field label="الاسم"><Input value={cashForm.name} onChange={(e) => setCashForm({ ...cashForm, name: e.target.value })} /></Field><Field label="الفرع"><Select value={cashForm.branch_id || (branchId !== "all" ? branchId : "")} onValueChange={(v) => setCashForm({ ...cashForm, branch_id: v })}><SelectTrigger><SelectValue placeholder="اختار الفرع" /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></Field><Field label="النوع"><Select value={cashForm.account_type} onValueChange={(v) => setCashForm({ ...cashForm, account_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">خزنة نقدية</SelectItem><SelectItem value="bank">بنك</SelectItem><SelectItem value="wallet">محفظة</SelectItem><SelectItem value="instapay">InstaPay</SelectItem></SelectContent></Select></Field><Field label="الفلوس الموجودة الآن"><Input type="number" value={cashForm.opening_balance} onChange={(e) => setCashForm({ ...cashForm, opening_balance: e.target.value })} /></Field><Button onClick={addCashAccount} className="w-full">إضافة</Button></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">حركة يدوية</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="الحساب"><Select value={txForm.cash_account_id} onValueChange={(v) => setTxForm({ ...txForm, cash_account_id: v })}><SelectTrigger><SelectValue placeholder="اختار" /></SelectTrigger><SelectContent>{cashAccounts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.branches?.name ? ` — ${c.branches.name}` : ""}</SelectItem>)}</SelectContent></Select></Field><div className="grid grid-cols-2 gap-2"><Field label="النوع"><Select value={txForm.direction} onValueChange={(v) => setTxForm({ ...txForm, direction: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in">داخل</SelectItem><SelectItem value="out">خارج</SelectItem></SelectContent></Select></Field><Field label="المبلغ"><Input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} /></Field></div><Textarea placeholder="البيان" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} /><Button onClick={addCashTx} className="w-full">تسجيل</Button></CardContent></Card>
        <Card className="border-teal-200"><CardHeader><CardTitle className="text-base">تحويل بين الخزن</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-teal-50 border border-teal-100 p-2 text-xs text-teal-800">استخدمها لما خزنة تكون بالسالب وخزنة أخرى فيها رصيد. التحويل لا يزود إيرادات ولا مصروفات.</div><Field label="من خزنة"><Select value={transferForm.from_cash_account_id} onValueChange={(v) => setTransferForm({ ...transferForm, from_cash_account_id: v })}><SelectTrigger><SelectValue placeholder="اختار" /></SelectTrigger><SelectContent>{cashAccounts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.branches?.name ? ` — ${c.branches.name}` : ""} — {fmtMoney(c.current_balance)}</SelectItem>)}</SelectContent></Select></Field><Field label="إلى خزنة"><Select value={transferForm.to_cash_account_id} onValueChange={(v) => setTransferForm({ ...transferForm, to_cash_account_id: v })}><SelectTrigger><SelectValue placeholder="اختار" /></SelectTrigger><SelectContent>{cashAccounts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.branches?.name ? ` — ${c.branches.name}` : ""} — {fmtMoney(c.current_balance)}</SelectItem>)}</SelectContent></Select></Field><Field label="المبلغ"><Input type="number" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} /></Field><Textarea placeholder="سبب التحويل" value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} /><Button onClick={transferCash} className="w-full">تنفيذ التحويل</Button></CardContent></Card></div>
        <div className="space-y-4"><div className="grid md:grid-cols-2 gap-3">{cashAccounts.map((c) => <Card key={c.id}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{typeAr(c.account_type)}{c.branches?.name ? ` — ${c.branches.name}` : ""}</div><div className="text-xl font-black">{c.name}</div><div className={`mt-2 text-2xl font-black ${Number(c.current_balance ?? 0) < 0 ? "text-red-600" : "text-teal-700"}`}>{fmtMoney(c.current_balance)}</div></CardContent></Card>)}</div><Card><CardHeader><CardTitle className="text-base">سجل المعاملات</CardTitle></CardHeader><CardContent className="space-y-2">{cashTx.map((t) => <Row key={t.id} a={fmtDate(t.happened_at)} b={t.description} c={`${t.direction === "in" ? "+" : "-"} ${fmtMoney(t.amount)}`} danger={t.direction === "out"} />)}{!cashTx.length && <Empty text="لا توجد معاملات" />}</CardContent></Card></div>
      </TabsContent>

      <TabsContent value="expenses"><Card><CardHeader><CardTitle className="text-base">مصروفات الشهر: المدفوعة والآجلة</CardTitle></CardHeader><CardContent className="space-y-2">{expenses.map((e) => <Row key={e.id} a={fmtDate(e.spent_at)} b={`${catAr(e.category)} — ${e.description ?? ""}`} c={fmtMoney(e.amount)} danger={e.status === "payable"} badge={e.status === "payable" ? "آجل" : "مدفوع"} />)}{!expenses.length && <Empty text="لا توجد مصروفات لهذا الشهر" />}</CardContent></Card></TabsContent>

      <TabsContent value="ledger"><Card><CardHeader><CardTitle className="text-base">دفتر حسابات الموظفين</CardTitle></CardHeader><CardContent className="space-y-2">{ledger.map((l) => <Row key={l.id} a={fmtDate(l.entry_at)} b={`${l.employees?.full_name ?? "موظف"} — ${entryAr(l.entry_type)} — ${l.description ?? ""}`} c={fmtMoney(l.amount)} danger={l.entry_type === "advance"} />)}{!ledger.length && <Empty text="لا توجد قيود موظفين" />}</CardContent></Card></TabsContent>
    </Tabs>}
  </div>;
}

function PayrollTable({ rows }: { rows: any[] }) {
  return <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-start p-3">الموظف</th><th className="text-end p-3">راتب</th><th className="text-end p-3">يومي</th><th className="text-end p-3">عمولة</th><th className="text-end p-3">سلف</th><th className="text-end p-3">صافي</th><th className="p-3">حالة</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id} className="border-t"><td className="p-3 font-bold">{r.employees?.full_name}</td><td className="p-3 text-end">{fmtMoney(r.base_salary)}</td><td className="p-3 text-end">{fmtMoney(r.daily_salary)}</td><td className="p-3 text-end">{fmtMoney(r.commission_amount)}</td><td className="p-3 text-end text-red-600">{fmtMoney(r.advances_deducted)}</td><td className="p-3 text-end font-black text-teal-700">{fmtMoney(r.net_pay)}</td><td className="p-3"><Status s={r.status} /></td></tr>)}</tbody></table>;
}
function Kpi({ label, value, icon, warn = false }: { label: string; value: string; icon: React.ReactNode; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="text-2xl font-black mt-2">{value}</div></CardContent></Card>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/60 p-2"><div className="text-xs text-muted-foreground">{label}</div><div className="font-black">{value}</div></div>; }
function Row({ a, b, c, danger, badge }: { a: string; b: string; c: string; danger?: boolean; badge?: string }) { return <div className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><div className="min-w-24 text-xs text-muted-foreground">{a}</div><div className="flex-1 font-medium">{b}</div>{badge && <Badge variant={danger ? "destructive" : "secondary"}>{badge}</Badge>}<div className={`font-black ${danger ? "text-red-600" : "text-teal-700"}`}>{c}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function Empty({ text }: { text: string }) { return <Card><CardContent className="p-8 text-center text-muted-foreground">{text}</CardContent></Card>; }
function Status({ s }: { s: string }) { return <Badge variant={s === "paid" ? "secondary" : s === "posted" ? "outline" : s === "void" ? "destructive" : "default"}>{({ draft: "مسودة", posted: "مُرحّل", paid: "مدفوع", void: "ملغي" } as any)[s] ?? s}</Badge>; }
function typeAr(s: string) { return ({ cash: "خزنة", bank: "بنك", wallet: "محفظة", instapay: "InstaPay" } as any)[s] ?? s; }
function catAr(s: string) { return ({ salaries: "رواتب", rent: "إيجار", water: "مياه", electricity: "كهرباء", supplies: "خامات", maintenance: "صيانة", other: "أخرى" } as any)[s] ?? s; }
function entryAr(s: string) { return ({ salary_accrual: "استحقاق راتب", commission_accrual: "استحقاق عمولة", advance: "سلفة", advance_deduction: "خصم سلفة", salary_payment: "صرف راتب", adjustment: "تسوية" } as any)[s] ?? s; }
