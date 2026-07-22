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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calculator, Landmark, WalletCards, Receipt, Users, Loader2, Plus, CheckCircle2, RefreshCw } from "lucide-react";
import { interpolate, useI18n } from "@/lib/i18n";

export const Route = createLazyFileRoute("/_app/accounting")({
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
    const rpcFor = await supabase.rpc("ensure_default_cash_account_for", { _tenant_id: tenantId });
    if (rpcFor.error) {
      errs.push(rpcFor.error.message);
      const rpc = await supabase.rpc("ensure_default_cash_account");
      if (rpc.error) errs.push(rpc.error.message);
    }

    let dataQuery = supabase
      .from("cash_accounts")
      .select("*,branches(name)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);
    if (branchId !== "all") dataQuery = dataQuery.eq("branch_id", branchId);
    let { data, error } = await dataQuery.order("created_at");
    if (error) errs.push(error.message);

    if ((!data || data.length === 0) && tenantId && branchId === "all") {
      const ins = await supabase.from("cash_accounts").insert({
        tenant_id: tenantId,
        name: t("accounting.cash.mainSafe", "الخزنة الرئيسية"),
        account_type: "cash",
        opening_balance: 0,
        current_balance: 0,
        branch_id: branches[0]?.id || null,
        is_active: true,
      }).select("*,branches(name)").single();
      if (!ins.error && ins.data) data = [ins.data];
      else if (ins.error) errs.push(ins.error.message);
    }
    if (errs.length) setLoadErrors((old: any) => [...new Set([...old, ...errs])].slice(0, 6));
    return data ?? [];
  }

  async function load() {
    if (!canUse) { setLoading(false); return; }
    if (!tenantId) {
      setLoading(false);
      setLoadErrors([t("accounting.error.noTenant")]);
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
        (branchId === "all" ? supabase.from("cash_transactions").select(branchCashSelect).eq("tenant_id", tenantId) : supabase.from("cash_transactions").select(branchCashSelect).eq("tenant_id", tenantId).eq("cash_accounts.branch_id", branchId)).order("happened_at", { ascending: false }).limit(80),
        addBranch(supabase.from("expenses").select("*,employees(full_name)").eq("tenant_id", tenantId)).gte("spent_at", bounds.fromIso).lte("spent_at", bounds.toIso).order("spent_at", { ascending: false }),
        addBranch(supabase.from("employees").select("id,full_name,monthly_salary,commission_percent,is_active").eq("tenant_id", tenantId)).eq("is_active", true).order("full_name"),
        supabase.from("payroll_periods").select("*").eq("tenant_id", tenantId).order("period_start", { ascending: false }).limit(12),
        (branchId === "all" ? supabase.from("payroll_lines").select("*,employees(full_name,branch_id),payroll_periods(period_start,period_end,status)").eq("tenant_id", tenantId) : supabase.from("payroll_lines").select(`${branchEmployeeSelect},payroll_periods(period_start,period_end,status)`).eq("tenant_id", tenantId).eq("employees.branch_id", branchId)).order("created_at", { ascending: false }).limit(100),
        (branchId === "all" ? supabase.from("employee_financial_ledger").select("*,employees(full_name)").eq("tenant_id", tenantId) : supabase.from("employee_financial_ledger").select(branchEmployeeSelect).eq("tenant_id", tenantId).eq("employees.branch_id", branchId)).order("entry_at", { ascending: false }).limit(120),
      ]);
      const val = (i: number) => results[i].status === "fulfilled" ? (results[i] as any).value : { data: [], error: (results[i] as any).reason };
      const ca = val(0), ct = val(1), ex = val(2), em = val(3), pp = val(4), pl = val(5), lg = val(6);
      const errs = [ca, ct, ex, em, pp, pl, lg].map((r: any) => r.error?.message).filter(Boolean);
      if (errs.length) setLoadErrors((old: any) => [...new Set([...old, ...errs])].slice(0, 6));
      setCashAccounts(ca.data ?? []); setCashTx(ct.data ?? []); setExpenses(ex.data ?? []); setEmployees(em.data ?? []); setPeriods(pp.data ?? []); setLines(pl.data ?? []); setLedger(lg.data ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("branches").select("id,name").eq("tenant_id", tenantId).eq("is_active", true).order("created_at").then(({ data }: any) => {
      const list = data ?? [];
      setBranches(list);
      setCashForm((old: any) => ({ ...old, branch_id: old.branch_id || list[0]?.id || "" }));
    });
  }, [tenantId]);

  useEffect(() => { load(); }, [canUse, tenantId, month, branchId]);

  const kpis = useMemo(() => {
    const cash = cashAccounts.reduce((s, x) => s + Number(x.current_balance ?? 0), 0);
    const payable = expenses.filter((x: any) => x.status === "payable").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const paid = expenses.filter((x: any) => x.status === "paid").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const payrollDue = lines.filter((x: any) => x.status === "posted").reduce((s, x) => s + Number(x.net_pay ?? 0), 0);
    return { cash, payable, paid, payrollDue };
  }, [cashAccounts, expenses, lines]);

  async function addCashAccount() {
    if (!tenantId) return toast.error(t("accounting.error.noTenantSimple"));
    if (!cashForm.name.trim()) return toast.error(t("accounting.error.noName"));
    const selectedBranchId = cashForm.branch_id || (branchId !== "all" ? branchId : branches[0]?.id);
    if (branches.length && !selectedBranchId) return toast.error(t("accounting.error.noBranch"));
    const opening = Number(cashForm.opening_balance || 0);
    let createdCashAccountId: string | null = null;
    const rpc = await supabase.rpc("create_cash_account_with_opening", {
      _name: cashForm.name.trim(),
      _account_type: cashForm.account_type,
      _opening_balance: opening,
    });
    if (rpc.error) {
      // Fallback for old deployments/database before the RPC migration: keep the owner working now.
      const { data: account, error: insErr } = await supabase.from("cash_accounts").insert({
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
        await supabase.from("cash_transactions").insert({
          tenant_id: tenantId,
          cash_account_id: account.id,
          direction: "in",
          amount: opening,
          description: t("accounting.cash.openingBalance") + ": " + cashForm.name.trim(),
          source_type: "manual",
        });
      }
    } else {
      createdCashAccountId = (rpc.data as any)?.id || null;
    }
    await supabase.rpc("record_operation_event", { _process_key: "cash_account_created", _process_name: t("accounting.cash.addSafe"), _source_type: "cash_account", _source_id: createdCashAccountId, _branch_id: selectedBranchId || null, _cash_account_id: createdCashAccountId, _report_bucket: "accounting/cash", _requires_notification: false, _data: { tenant_id: tenantId, name: cashForm.name.trim(), opening_balance: opening, account_type: cashForm.account_type }, _output: { cash_impact: opening > 0, journal_required: opening > 0, appears_in_report: true } }).then(() => null);
    toast.success(createdCashAccountId ? t("accounting.toast.addedSuccess") : t("accounting.toast.addedFallback"));
    setCashForm({ name: "", account_type: "cash", opening_balance: "0", branch_id: selectedBranchId || "" });
    load();
  }

  async function addCashTx() {
    if (!tenantId) return toast.error(t("accounting.error.noTenantSimple"));
    if (!txForm.cash_account_id) return toast.error(t("accounting.error.noSafeSelected"));
    const amount = Number(txForm.amount);
    if (!amount || amount <= 0) return toast.error(t("accounting.error.invalidAmount"));
    const account = cashAccounts.find((c: any) => c.id === txForm.cash_account_id);
    const { data: tx, error } = await supabase.from("cash_transactions").insert({
      tenant_id: tenantId, cash_account_id: txForm.cash_account_id, direction: txForm.direction, amount: amount, description: txForm.description || t("accounting.cash.manualTx"), source_type: "manual_cash_transaction", created_by: user?.id,
    }).select("id").single();
    if (!error && tx?.id) await supabase.rpc("record_operation_event", { _process_key: "manual_cash_transaction", _process_name: t("accounting.manualTxName"), _source_type: "manual_cash_transaction", _source_id: tx.id, _branch_id: account?.branch_id ?? null, _cash_account_id: txForm.cash_account_id, _report_bucket: "accounting/ledger", _requires_notification: false, _data: { tenant_id: tenantId, direction: txForm.direction, amount: Number(txForm.amount), description: txForm.description || t("accounting.cash.manualTx") }, _output: { cash_impact: true, journal_required: true, appears_in_report: true } }).then(() => null);
    if (error) toast.error(error.message); else { toast.success(t("accounting.toast.txRecorded")); setTxForm({ cash_account_id: "", direction: "in", amount: "0", description: "" }); load(); }
  }

  async function transferCash() {
    if (!tenantId) return toast.error(t("accounting.error.noTenantSimple"));
    if (!transferForm.from_cash_account_id || !transferForm.to_cash_account_id) return toast.error(t("accounting.error.selectBothSafes"));
    if (transferForm.from_cash_account_id === transferForm.to_cash_account_id) return toast.error(t("accounting.error.sameSafe"));
    const amount = Number(transferForm.amount || 0);
    if (amount <= 0) return toast.error(t("accounting.error.invalidTransferAmount"));
    const fromAccount = cashAccounts.find((c: any) => c.id === transferForm.from_cash_account_id);
    const toAccount = cashAccounts.find((c: any) => c.id === transferForm.to_cash_account_id);
    const { error } = await supabase.rpc("transfer_cash_between_accounts", {
      _from_id: transferForm.from_cash_account_id,
      _to_id: transferForm.to_cash_account_id,
      _amount: amount,
      _notes: transferForm.notes.trim() || t("accounting.cash.internalTransfer"),
    });

    if (error) return toast.error(error.message);
    await supabase.rpc("record_operation_event", { _process_key: "cash_transfer", _process_name: t("accounting.transferTxName"), _source_type: "cash_transfer", _source_id: null, _branch_id: fromAccount?.branch_id ?? toAccount?.branch_id ?? null, _cash_account_id: transferForm.from_cash_account_id, _report_bucket: "accounting/cash", _requires_notification: false, _data: { tenant_id: tenantId, from_cash_account_id: transferForm.from_cash_account_id, to_cash_account_id: transferForm.to_cash_account_id, amount, notes: transferForm.notes || null }, _output: { cash_impact: true, journal_required: true, appears_in_report: true, not_income_or_expense: true } }).then(() => null);
    toast.success(t("accounting.toast.transferSuccess"));
    setTransferForm({ from_cash_account_id: "", to_cash_account_id: "", amount: "0", notes: "" });
    load();
  }

  async function repairCashNow() {
    setFixingCash(true);
    try {
      const errs: string[] = [];
      const r1 = await supabase.rpc("ensure_default_cash_account_for", { _tenant_id: tenantId }); if (r1.error) errs.push(r1.error.message);
      const r2 = await supabase.rpc("repair_tenant_cash_balances", { _tenant_id: tenantId }); if (r2.error) errs.push(r2.error.message);
      const r3 = await supabase.rpc("repair_cash_closing_discrepancies", { _tenant_id: tenantId }); if (r3.error) errs.push(r3.error.message);
      if (errs.length) toast.error(errs.join(" | ")); else toast.success(t("accounting.toast.repairSuccess"));
      await load();
    } finally {
      setFixingCash(false);
    }
  }

  async function syncApprovedAdvances() {
    const { data: adv, error } = await supabase.from("employee_requests").select("*,employees(full_name)").eq("type", "advance").eq("status", "approved").gte("created_at", bounds.fromIso).lte("created_at", bounds.toIso);
    if (error) return toast.error(error.message);
    let created = 0;
    const ensured = cashAccounts.length ? cashAccounts : await ensureCashAccount();
    const mainCash = ensured[0]?.id;
    for (const a of adv ?? []) {
      const amount = Number(a.amount ?? 0); if (!amount || !mainCash) continue;
      const desc = t("accounting.ledger.entry.advance") + ": " + (a.employees?.full_name ?? "");
      const { data: exp, error: eErr } = await supabase.from("expenses").upsert({
        tenant_id: tenantId, branch_id: ensured[0]?.branch_id ?? null, cash_account_id: mainCash, category: "salaries", amount, description: desc, spent_at: a.created_at, status: "paid", employee_id: a.employee_id, source_type: "employee_advance", source_id: a.id, paid_at: a.created_at, created_by: user?.id,
      }, { onConflict: "tenant_id,source_type,source_id" }).select("id").single();
      if (!eErr) {
        await supabase.from("cash_transactions").insert({ tenant_id: tenantId, cash_account_id: mainCash, direction: "out", amount, description: desc, source_type: "employee_advance", source_id: a.id, created_by: user?.id }).then(() => null);
        await supabase.from("employee_financial_ledger").insert({ tenant_id: tenantId, employee_id: a.employee_id, entry_type: "advance", amount, direction: "employee_owes", source_type: "employee_advance", source_id: a.id, description: desc, created_by: user?.id }).then(() => null);
        await supabase.rpc("record_operation_event", { _process_key: "employee_advance_synced", _process_name: t("accounting.advanceTxName"), _source_type: "employee_advance", _source_id: a.id, _branch_id: ensured[0]?.branch_id ?? null, _cash_account_id: mainCash, _report_bucket: "accounting/payroll", _requires_notification: false, _data: { tenant_id: tenantId, employee_id: a.employee_id, amount }, _output: { cash_impact: true, journal_required: true, appears_in_report: true } }).then(() => null);
        if (exp) created++;
      }
    }
    toast.success(interpolate(t("accounting.toast.advancesSynced"), { count: created }));
    load();
  }

  async function generatePayroll() {
    const { data, error } = await supabase.rpc("sync_monthly_payroll_payables", { _month: bounds.start });
    if (error) return toast.error(error.message);
    toast.success(interpolate(t("accounting.toast.payrollGenerated"), { count: data?.employees_count ?? 0 }));
    load();
  }

  async function postPayroll(periodId: string) {
    const periodLines = lines.filter((l: any) => l.payroll_period_id === periodId);
    for (const l of periodLines) {
      const gross = Number(l.gross_pay ?? 0); if (!gross) continue;
      const desc = t("accounting.ledger.entry.salary_accrual") + " " + (l.employees?.full_name ?? "") + " " + t("common.for") + " " + (l.payroll_periods?.period_start ?? "");
      const { data: exp } = await supabase.from("expenses").upsert({
        tenant_id: tenantId, category: "salaries", amount: gross, description: desc, spent_at: bounds.toIso, status: "payable", employee_id: l.employee_id, source_type: "payroll_line", source_id: l.id, due_at: bounds.toIso, created_by: user?.id,
      }, { onConflict: "tenant_id,source_type,source_id" }).select("id").single();
      await supabase.from("employee_financial_ledger").insert({ tenant_id: tenantId, employee_id: l.employee_id, entry_type: "salary_accrual", amount: gross, direction: "employee_due", source_type: "payroll_line", source_id: l.id, description: desc, created_by: user?.id }).then(() => null);
      if (Number(l.advances_deducted ?? 0) > 0) {
        await supabase.from("employee_financial_ledger").insert({ tenant_id: tenantId, employee_id: l.employee_id, entry_type: "advance_deduction", amount: Number(l.advances_deducted), direction: "employee_due", source_type: "payroll_line", source_id: l.id, description: t("accounting.ledger.entry.advance_deduction"), created_by: user?.id }).then(() => null);
      }
      await supabase.from("payroll_lines").update({ status: "posted", expense_id: exp?.id ?? l.expense_id }).eq("id", l.id);
      await supabase.rpc("record_operation_event", { _process_key: "payroll_posted", _process_name: t("accounting.process.payrollAccrual"), _source_type: "payroll_line", _source_id: l.id, _branch_id: l.employees?.branch_id ?? null, _cash_account_id: null, _report_bucket: "accounting/payroll", _requires_notification: false, _data: { tenant_id: tenantId, employee_id: l.employee_id, gross }, _output: { cash_impact: false, journal_required: true, appears_in_report: true } }).then(() => null);
    }
    await supabase.from("payroll_periods").update({ status: "posted", posted_at: new Date().toISOString() }).eq("id", periodId);
    toast.success(t("accounting.toast.payrollPosted"));
    load();
  }

  async function payPayroll(periodId: string) {
    const ensured = cashAccounts.length ? cashAccounts : await ensureCashAccount();
    const mainCash = ensured[0]?.id;
    if (!mainCash) return toast.error(t("accounting.error.repairFailed"));
    const periodLines = lines.filter((l: any) => l.payroll_period_id === periodId);
    for (const l of periodLines) {
      const net = Number(l.net_pay ?? 0); if (!net) continue;
      const desc = t("accounting.ledger.entry.salary_payment") + " " + (l.employees?.full_name ?? "");
      const { data: tx, error } = await supabase.from("cash_transactions").insert({ tenant_id: tenantId, cash_account_id: mainCash, direction: "out", amount: net, description: desc, source_type: "payroll_payment", source_id: l.id, created_by: user?.id }).select("id").single();
      if (!error) {
        if (l.expense_id) await supabase.from("expenses").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", l.expense_id);
        await supabase.from("payroll_lines").update({ status: "paid", cash_transaction_id: tx?.id }).eq("id", l.id);
        await supabase.from("employee_financial_ledger").insert({ tenant_id: tenantId, employee_id: l.employee_id, entry_type: "salary_payment", amount: net, direction: "employee_due", source_type: "payroll_payment", source_id: l.id, description: desc, created_by: user?.id }).then(() => null);
        await supabase.rpc("record_operation_event", { _process_key: "payroll_paid", _process_name: t("accounting.salaryPaymentTxName"), _source_type: "payroll_payment", _source_id: l.id, _branch_id: l.employees?.branch_id ?? ensured[0]?.branch_id ?? null, _cash_account_id: mainCash, _report_bucket: "accounting/payroll", _requires_notification: false, _data: { tenant_id: tenantId, employee_id: l.employee_id, net }, _output: { cash_impact: true, journal_required: true, appears_in_report: true } }).then(() => null);
      }
    }
    await supabase.from("payroll_periods").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", periodId);
    toast.success(t("accounting.toast.payrollPaid"));
    load();
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("accounting.noAccess")}</CardContent></Card>;

  return <div className="space-y-5" dir={dir}>
    <Card className="border-teal-200 bg-teal-50"><CardContent className="p-4 text-sm text-teal-900">{t("accounting.loadErrorTitle")}</CardContent></Card>
    {loadErrors.map((e, i) => <div key={i} className="bg-red-50 text-red-700 p-2 rounded-xl text-xs">{e}</div>)}
    {(!loading && !cashAccounts.length && tenantId) && <Card className="border-amber-200 bg-amber-50">
      <CardHeader><CardTitle className="text-base">{t("accounting.noSafeTitle")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>{t("accounting.noSafeSubtitle")}</div>
        <Button size="sm" onClick={repairCashNow} disabled={fixingCash}>{fixingCash ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}{t("accounting.btn.repairNow")}</Button>
        <Button size="sm" onClick={repairCashNow} disabled={fixingCash}>{fixingCash ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Plus className="w-4 h-4 ms-1" />}{t("accounting.btn.repairMainSafe")}</Button>
      </CardContent>
    </Card>}

    <div className="grid md:grid-cols-4 gap-3">
      <Kpi label={t("accounting.kpi.safes")} value={fmtMoney(kpis.cash, t("common.egp"))} icon={<Landmark className="w-4 h-4" />} />
      <Kpi label={t("accounting.kpi.paidExpenses")} value={fmtMoney(kpis.paid, t("common.egp"))} icon={<WalletCards className="w-4 h-4" />} />
      <Kpi label={t("accounting.kpi.payableExpenses")} value={fmtMoney(kpis.payable, t("common.egp"))} icon={<Receipt className="w-4 h-4" />} warn={kpis.payable > 0} />
      <Kpi label={t("accounting.kpi.payrollDue")} value={fmtMoney(kpis.payrollDue, t("common.egp"))} icon={<Users className="w-4 h-4" />} warn={kpis.payrollDue > 0} />
    </div>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <Tabs defaultValue="payroll" className="space-y-4">
      <TabsList>
        <TabsTrigger value="payroll">{t("accounting.tab.payroll")}</TabsTrigger>
        <TabsTrigger value="cash">{t("accounting.tab.cash")}</TabsTrigger>
        <TabsTrigger value="expenses">{t("accounting.tab.expenses")}</TabsTrigger>
        <TabsTrigger value="ledger">{t("accounting.tab.ledger")}</TabsTrigger>
      </TabsList>

      <TabsContent value="payroll" className="space-y-4">
        <div className="flex flex-wrap gap-2"><Button onClick={generatePayroll}><RefreshCw className="w-4 h-4 ms-1" />{t("accounting.btn.generatePayroll")}</Button><Button variant="outline" onClick={syncApprovedAdvances}>{t("accounting.btn.syncAdvances")}</Button></div>
        <div className="grid md:grid-cols-2 gap-3">
          {periods.map((p) => <Card key={p.id}><CardHeader><CardTitle className="text-base flex items-center justify-between"><span>{p.period_start} → {p.period_end}</span><Status s={p.status} t={t} /></CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="grid grid-cols-3 gap-2"><Mini label={t("accounting.payroll.salary")} value={fmtMoney(p.gross_total, t("common.egp"))} /><Mini label={t("accounting.payroll.advances")} value={fmtMoney(p.advances_total, t("common.egp"))} /><Mini label={t("accounting.payroll.net")} value={fmtMoney(p.net_total, t("common.egp"))} /></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => postPayroll(p.id)} disabled={p.status !== "draft"}>{t("accounting.btn.postPayroll")}</Button><Button size="sm" onClick={() => payPayroll(p.id)} disabled={p.status === "paid" || p.status === "draft"}><CheckCircle2 className="w-4 h-4 ms-1" />{t("accounting.btn.payPayroll")}</Button></div></CardContent></Card>)}
          {!periods.length && <Empty text={t("accounting.payroll.empty")} />}
        </div>
        <Card><CardHeader><CardTitle className="text-base">{t("accounting.payroll.itemsTitle")}</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto"><PayrollTable rows={lines} t={t} /></CardContent></Card>
      </TabsContent>

      <TabsContent value="cash" className="grid lg:grid-cols-[360px_1fr] gap-4">
        <div className="space-y-4"><Card><CardHeader><CardTitle className="text-base"><Plus className="w-4 h-4 inline ms-1" />{t("accounting.cash.addSafe")}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-blue-50 border border-blue-100 p-2 text-xs text-blue-800">{t("accounting.cash.addSafeGuide")}</div><Field label={t("common.name")}><Input value={cashForm.name} onChange={(e: any) => setCashForm({ ...cashForm, name: e.target.value })} /></Field><Field label={t("common.branch")}><Select value={cashForm.branch_id || (branchId !== "all" ? branchId : "")} onValueChange={(v: any) => setCashForm({ ...cashForm, branch_id: v })}><SelectTrigger><SelectValue placeholder={t("accounting.error.noBranch")} /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></Field><Field label={t("common.type")}><Select value={cashForm.account_type} onValueChange={(v: any) => setCashForm({ ...cashForm, account_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">{t("accounting.account.type.cash")}</SelectItem><SelectItem value="bank">{t("accounting.account.type.bank")}</SelectItem><SelectItem value="wallet">{t("accounting.account.type.wallet")}</SelectItem><SelectItem value="instapay">InstaPay</SelectItem></SelectContent></Select></Field><Field label={t("accounting.cash.currentMoney")}><Input type="number" value={cashForm.opening_balance} onChange={(e: any) => setCashForm({ ...cashForm, opening_balance: e.target.value })} /></Field><Button onClick={addCashAccount} className="w-full">{t("common.add")}</Button></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("accounting.cash.manualTx")}</CardTitle></CardHeader><CardContent className="space-y-3"><Field label={t("accounting.cash.account")}><Select value={txForm.cash_account_id} onValueChange={(v: any) => setTxForm({ ...txForm, cash_account_id: v })}><SelectTrigger><SelectValue placeholder={t("common.open")} /></SelectTrigger><SelectContent>{cashAccounts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}{c.branches?.name ? ` — ${c.branches.name}` : ""}</SelectItem>)}</SelectContent></Select></Field><div className="grid grid-cols-2 gap-2"><Field label={t("common.type")}><Select value={txForm.direction} onValueChange={(v: any) => setTxForm({ ...txForm, direction: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in">{t("common.in")}</SelectItem><SelectItem value="out">{t("common.out")}</SelectItem></SelectContent></Select></Field><Field label={t("common.amount")}><Input type="number" value={txForm.amount} onChange={(e: any) => setTxForm({ ...txForm, amount: e.target.value })} /></Field></div><Textarea placeholder={t("common.description")} value={txForm.description} onChange={(e: any) => setTxForm({ ...txForm, description: e.target.value })} /><Button onClick={addCashTx} className="w-full">{t("common.record")}</Button></CardContent></Card>
        <Card className="border-teal-200"><CardHeader><CardTitle className="text-base">{t("accounting.cash.transferTitle")}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-teal-50 border border-teal-100 p-2 text-xs text-teal-800">{t("accounting.cash.transferGuide")}</div><Field label={t("accounting.cash.fromSafe")}><Select value={transferForm.from_cash_account_id} onValueChange={(v: any) => setTransferForm({ ...transferForm, from_cash_account_id: v })}><SelectTrigger><SelectValue placeholder={t("common.open")} /></SelectTrigger><SelectContent>{cashAccounts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}{c.branches?.name ? ` — ${c.branches.name}` : ""} — {fmtMoney(c.current_balance)}</SelectItem>)}</SelectContent></Select></Field><Field label={t("accounting.cash.toSafe")}><Select value={transferForm.to_cash_account_id} onValueChange={(v: any) => setTransferForm({ ...transferForm, to_cash_account_id: v })}><SelectTrigger><SelectValue placeholder={t("common.open")} /></SelectTrigger><SelectContent>{cashAccounts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}{c.branches?.name ? ` — ${c.branches.name}` : ""} — {fmtMoney(c.current_balance)}</SelectItem>)}</SelectContent></Select></Field><Field label={t("common.amount")}><Input type="number" value={transferForm.amount} onChange={(e: any) => setTransferForm({ ...transferForm, amount: e.target.value })} /></Field><Textarea placeholder={t("accounting.cash.transferReason")} value={transferForm.notes} onChange={(e: any) => setTransferForm({ ...transferForm, notes: e.target.value })} /><Button onClick={transferCash} className="w-full">{t("accounting.cash.btn.transfer")}</Button></CardContent></Card></div>
        <div className="space-y-4"><div className="grid md:grid-cols-2 gap-3">{cashAccounts.map((c: any) => <Card key={c.id}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{typeAr(c.account_type, t)}{c.branches?.name ? ` — ${c.branches.name}` : ""}</div><div className="text-xl font-black">{c.name}</div><div className={`mt-2 text-2xl font-black ${Number(c.current_balance ?? 0) < 0 ? "text-red-600" : "text-teal-700"}`}>{fmtMoney(c.current_balance)}</div></CardContent></Card>)}</div><Card><CardHeader><CardTitle className="text-base">{t("accounting.cash.txLog")}</CardTitle></CardHeader><CardContent className="space-y-2">{cashTx.map((t) => <Row key={t.id} a={fmtDate(t.happened_at)} b={t.description} c={`${t.direction === "in" ? "+" : "-"} ${fmtMoney(t.amount)}`} danger={t.direction === "out"} />)}{!cashTx.length && <Empty text={t("common.noTx")} />}</CardContent></Card></div>
      </TabsContent>

      <TabsContent value="expenses"><Card><CardHeader><CardTitle className="text-base">{t("accounting.expenses.title")}</CardTitle></CardHeader><CardContent className="space-y-2">{expenses.map((e: any) => <Row key={e.id} a={fmtDate(e.spent_at)} b={`${catAr(e.category, t)} — ${e.description ?? ""}`} c={fmtMoney(e.amount)} danger={e.status === "payable"} badge={e.status === "payable" ? t("accounting.expenses.unpaid") : t("accounting.expenses.paid")} />)}{!expenses.length && <Empty text={t("accounting.expenses.empty")} />}</CardContent></Card></TabsContent>

      <TabsContent value="ledger"><Card><CardHeader><CardTitle className="text-base">{t("accounting.ledger.title")}</CardTitle></CardHeader><CardContent className="space-y-2">{ledger.map((l: any) => <Row key={l.id} a={fmtDate(l.entry_at)} b={`${l.employees?.full_name ?? t("common.employee")} — ${entryAr(l.entry_type, t)} — ${l.description ?? ""}`} c={fmtMoney(l.amount)} danger={l.entry_type === "advance"} />)}{!ledger.length && <Empty text={t("accounting.ledger.empty")} />}</CardContent></Card></TabsContent>
    </Tabs>}
  </div>;
}

function PayrollTable({ rows, t }: { rows: any[]; t: any }) {
  return <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-start p-3">{t("common.employee")}</th><th className="text-end p-3">{t("accounting.payroll.salary")}</th><th className="text-end p-3">{t("accounting.payroll.daily")}</th><th className="text-end p-3">{t("staff.commission")}</th><th className="text-end p-3">{t("finance.advancesTab")}</th><th className="text-end p-3">{t("accounting.payroll.net")}</th><th className="p-3">{t("common.status")}</th></tr></thead><tbody>{rows.map((r: any) => <tr key={r.id} className="border-t"><td className="p-3 font-bold">{r.employees?.full_name}</td><td className="p-3 text-end">{fmtMoney(r.base_salary, t("common.egp"))}</td><td className="p-3 text-end">{fmtMoney(r.daily_salary, t("common.egp"))}</td><td className="p-3 text-end">{fmtMoney(r.commission_amount, t("common.egp"))}</td><td className="p-3 text-end text-red-600">{fmtMoney(r.advances_deducted, t("common.egp"))}</td><td className="p-3 text-end font-black text-teal-700">{fmtMoney(r.net_pay, t("common.egp"))}</td><td className="p-3"><Status s={r.status} t={t} /></td></tr>)}</tbody></table>;
}
function Kpi({ label, value, icon, warn = false }: { label: string; value: string; icon: React.ReactNode; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="text-2xl font-black mt-2">{value}</div></CardContent></Card>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/60 p-2"><div className="text-xs text-muted-foreground">{label}</div><div className="font-black">{value}</div></div>; }
function Row({ a, b, c, danger, badge }: { a: string; b: string; c: string; danger?: boolean; badge?: string }) { return <div className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><div className="min-w-24 text-xs text-muted-foreground">{a}</div><div className="flex-1 font-medium">{b}</div>{badge && <Badge variant={danger ? "destructive" : "secondary"}>{badge}</Badge>}<div className={`font-black ${danger ? "text-red-600" : "text-teal-700"}`}>{c}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function Empty({ text }: { text: string }) { return <Card><CardContent className="p-8 text-center text-muted-foreground">{text}</CardContent></Card>; }
function Status({ s, t }: { s: string; t: any }) {
  const map: Record<string, string> = {
    draft: t("common.draft", "Draft"),
    posted: t("common.posted", "Posted"),
    paid: t("orders.paid", "Paid"),
    void: t("track.cancelled", "Void"),
  };
  return <Badge variant={s === "paid" ? "secondary" : s === "posted" ? "outline" : s === "void" ? "destructive" : "default"}>{map[s] ?? s}</Badge>;
}
function typeAr(s: string, t: any) { return ({ cash: t("accounting.account.type.cash", "خزنة"), bank: t("accounting.account.type.bank", "بنك"), wallet: t("accounting.account.type.wallet", "محفظة"), instapay: "InstaPay" } as Record<string, string>)[s] ?? s; }
function catAr(s: string, t: any) { return ({ salaries: t("accounting.expense.cat.salaries", "رواتب"), rent: t("accounting.expense.cat.rent", "إيجار"), water: t("accounting.expense.cat.water", "مياه"), electricity: t("accounting.expense.cat.electricity", "كهرباء"), supplies: t("accounting.expense.cat.supplies", "خامات"), maintenance: t("accounting.expense.cat.maintenance", "صيانة"), other: t("accounting.expense.cat.other", "garment.other") } as Record<string, string>)[s] ?? s; }
function entryAr(s: string, t: any) { return ({ salary_accrual: t("accounting.ledger.entry.salary_accrual", "استحقاق راتب"), commission_accrual: t("accounting.ledger.entry.commission_accrual", "استحقاق عمولة"), advance: t("accounting.ledger.entry.advance", "سلفة"), advance_deduction: t("accounting.ledger.entry.advance_deduction", "خصم سلفة"), salary_payment: t("accounting.ledger.entry.salary_payment", "صرف راتب"), adjustment: t("accounting.ledger.entry.adjustment", "تسوية") } as Record<string, string>)[s] ?? s; }
