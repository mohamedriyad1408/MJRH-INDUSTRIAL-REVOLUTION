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
import { BookOpenCheck, FileBarChart, Scale, LockKeyhole, Plus, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/ledger")({
  head: () => ({ meta: [{ title: "Ledger - MJRH" }] }),
  component: LedgerPage,
});

function boundsFromMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const s = new Date(y, m - 1, 1);
  const e = new Date(y, m, 0, 23, 59, 59);
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10), fromIso: s.toISOString(), toIso: e.toISOString() };
}

function LedgerPage() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const canUse = hasRole("owner");
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [trial, setTrial] = useState<any[]>([]);
  const [pl, setPl] = useState<any[]>([]);
  const [manual, setManual] = useState({ description: "", debit_account: "", credit_account: "", amount: "0", memo: "" });
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [repairing, setRepairing] = useState(false);
  const b = useMemo(() => boundsFromMonth(month), [month]);

  async function load() {
    if (!canUse) { setLoading(false); return; }
    if (!tenantId) {
      setLoading(false);
      setLoadErrors([t("ledger.err.noTenant", "لم يتم تحديد مغسلة للحساب الحالي. سجل خروج ودخول أو راجع دور المستخدم.")]);
      return;
    }
    setLoading(true);
    setLoadErrors([]);
    try {
      const ensureFor = await supabase.rpc("ensure_default_chart_accounts_for", { _tenant_id: tenantId });
      if (ensureFor.error) {
        const ensure = await supabase.rpc("ensure_default_chart_accounts");
        if (ensure.error) setLoadErrors((old) => [...old, ensureFor.error.message, ensure.error.message]);
      }
      const results = await Promise.allSettled([
        supabase.from("chart_accounts").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("code"),
        supabase.from("journal_entries").select("*,journal_lines(*,chart_accounts(code,name,account_type))").eq("tenant_id", tenantId).gte("entry_date", b.start).lte("entry_date", b.end).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("accounting_periods").select("*").eq("tenant_id", tenantId).order("period_start", { ascending: false }).limit(18),
        supabase.from("v_trial_balance").select("*").eq("tenant_id", tenantId).order("code"),
        supabase.from("v_profit_loss").select("*").eq("tenant_id", tenantId).order("code"),
      ]);
      const val = (i: number) => results[i].status === "fulfilled" ? (results[i] as any).value : { data: [], error: (results[i] as any).reason };
      const a = val(0), j = val(1), p = val(2), tr = val(3), profit = val(4);
      const errs = [a, j, p, tr, profit].map((r: any) => r.error?.message).filter(Boolean);
      if (errs.length) setLoadErrors((old) => [...new Set([...old, ...errs])].slice(0, 8));
      setAccounts(a.data ?? []); setJournals(j.data ?? []); setPeriods(p.data ?? []); setTrial(tr.data ?? []); setPl(profit.data ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [canUse, tenantId, month]);

  const monthlyPl = useMemo(() => {
    const map = new Map<string, any>();
    for (const j of journals) {
      for (const l of j.journal_lines ?? []) {
        const acc = l.chart_accounts;
        if (!acc || !["revenue", "expense"].includes(acc.account_type)) continue;
        const key = `${acc.code}-${acc.name}`;
        const amount = acc.account_type === "revenue" ? Number(l.credit ?? 0) - Number(l.debit ?? 0) : Number(l.debit ?? 0) - Number(l.credit ?? 0);
        const old = map.get(key) ?? { code: acc.code, name: acc.name, account_type: acc.account_type, amount: 0 };
        old.amount += amount;
        map.set(key, old);
      }
    }
    return [...map.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
  }, [journals]);

  const pnl = useMemo(() => {
    const revenue = monthlyPl.filter((x) => x.account_type === "revenue").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const expense = monthlyPl.filter((x) => x.account_type === "expense").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    return { revenue, expense, net: revenue - expense };
  }, [monthlyPl]);
  const trialTotals = useMemo(() => ({ debit: trial.reduce((s, x) => s + Number(x.total_debit ?? 0), 0), credit: trial.reduce((s, x) => s + Number(x.total_credit ?? 0), 0) }), [trial]);
  const isClosed = periods.some((p) => p.status === "closed" && b.start >= p.period_start && b.end <= p.period_end);

  async function createJournal(description: string, sourceType: string | null, sourceId: string | null, lines: any[]) {
    if (!tenantId) throw new Error(t("ledger.err.noTenant", "لم يتم تحديد المغسلة"));
    const forTenant = await supabase.rpc("create_journal_entry_for_tenant", {
      _tenant_id: tenantId,
      _entry_date: b.end,
      _description: description,
      _source_type: sourceType,
      _source_id: sourceId,
      _lines: lines,
    });
    if (!forTenant.error) return;

    // Fallback for databases before tenant-explicit RPC exists.
    const legacy = await supabase.rpc("create_journal_entry", {
      _entry_date: b.end,
      _description: description,
      _source_type: sourceType,
      _source_id: sourceId,
      _lines: lines,
    });
    if (legacy.error) throw new Error(`${forTenant.error.message} | ${legacy.error.message}`);
  }

  async function repairLedger() {
    if (!tenantId) return toast.error(t("ledger.err.noTenant", "لم يتم تحديد المغسلة"));
    setRepairing(true);
    const errs: string[] = [];
    try {
      const base = await supabase.rpc("repair_ledger_basics");
      if (base.error) {
        const r1 = await supabase.rpc("ensure_default_chart_accounts_for", { _tenant_id: tenantId }); if (r1.error) errs.push(r1.error.message);
        const r2 = await supabase.rpc("ensure_default_cash_account_for", { _tenant_id: tenantId }); if (r2.error) errs.push(r2.error.message);
        const r3 = await supabase.rpc("sync_manual_cash_transactions_journals"); if (r3.error) errs.push(r3.error.message);
        const r4 = await supabase.rpc("repair_cash_account_balances"); if (r4.error) errs.push(r4.error.message);
      }
      if (errs.length) toast.error(errs.join(" | ")); else toast.success(t("ledger.toast.repaired"));
      await load();
    } finally {
      setRepairing(false);
    }
  }

  async function postMonthAutomatically() {
    try {
      if (isClosed) return toast.error(t("ledger.err.monthClosed", "الشهر مقفول ولا يمكن ترحيله"));
      if (!tenantId) return toast.error(t("ledger.err.noTenant", "لم يتم تحديد المغسلة"));

      const [{ data: orders, error: oErr }, { data: expenses, error: eErr }] = await Promise.all([
        supabase.from("orders").select("id").eq("tenant_id", tenantId).neq("status", "cancelled").gte("created_at", b.fromIso).lte("created_at", b.toIso),
        supabase.from("expenses").select("id").eq("tenant_id", tenantId).neq("status", "void").gte("spent_at", b.fromIso).lte("spent_at", b.toIso),
      ]);
      if (oErr) throw oErr;
      if (eErr) throw eErr;

      let syncedOrders = 0;
      let syncedExpenses = 0;
      for (const o of orders ?? []) {
        const r = await supabase.rpc("sync_order_financials", { _order_id: o.id });
        if (!r.error) syncedOrders++;
      }
      for (const e of expenses ?? []) {
        const r = await supabase.rpc("sync_expense_financials", { _expense_id: e.id });
        if (!r.error) syncedExpenses++;
      }
      await supabase.rpc("repair_ledger_basics").then(() => null);
      toast.success(interpolate(t("ledger.toast.autoPostOk"), { syncedOrders, syncedExpenses }));
      load();
    } catch (e: any) { toast.error(e.message ?? t("ledger.err.autoPostFailed", "تعذر فحص القيود")); }
  }

  async function addManualJournal() {
    try {
      if (!manual.description || !manual.debit_account || !manual.credit_account || !Number(manual.amount)) return toast.error(t("ledger.err.completeData", "أكمل بيانات القيد"));
      await createJournal(manual.description, null, null, [
        { account_id: manual.debit_account, debit: Number(manual.amount), credit: 0, memo: manual.memo },
        { account_id: manual.credit_account, debit: 0, credit: Number(manual.amount), memo: manual.memo },
      ]);
      toast.success(t("ledger.toast.created"));
      setManual({ description: "", debit_account: "", credit_account: "", amount: "0", memo: "" });
      load();
    } catch (e: any) { toast.error(e.message ?? t("ledger.err.createFailed", "تعذر إنشاء القيد")); }
  }

  async function closeMonth() {
    if (!confirm(t("ledger.confirm.close", "إقفال الشهر يمنع إضافة أو تعديل قيود داخل الفترة. متأكد؟"))) return;
    const { error } = await supabase.from("accounting_periods").upsert({ tenant_id: tenantId, period_start: b.start, period_end: b.end, status: "closed", closed_at: new Date().toISOString() }, { onConflict: "tenant_id,period_start,period_end" });
    if (error) toast.error(error.message); else { toast.success(t("ledger.toast.closed")); load(); }
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("ledger.err.ownerOnly", "القيود والتقارير المالية للمالك فقط.")}</CardContent></Card>;

  const curr = t("common.egp");

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><BookOpenCheck className="w-7 h-7 text-teal-600" />{t("ledger.title")}</h1><p className="text-sm text-muted-foreground">{t("ledger.subtitle")}</p></div>
      <div className="flex gap-2"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><Button variant="outline" onClick={load}>{t("common.refresh")}</Button></div>
    </div>
    <div className="grid md:grid-cols-4 gap-3">
      <Kpi label={t("ledger.kpi.revenue")} value={fmtMoney(pnl.revenue, curr)} />
      <Kpi label={t("ledger.kpi.expense", "المصروفات")} value={fmtMoney(pnl.expense, curr)} warn />
      <Kpi label={t("ledger.kpi.netProfit")} value={fmtMoney(pnl.net, curr)} warn={pnl.net < 0} />
      <Kpi label={t("ledger.kpi.balance")} value={trialTotals.debit === trialTotals.credit ? t("ledger.kpi.balanced") : t("ledger.kpi.unbalanced")} warn={trialTotals.debit !== trialTotals.credit} />
    </div>
    {isClosed && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 font-bold text-amber-800">{t("ledger.alert.closed", "هذا الشهر مقفول محاسبيًا. لا يمكن إضافة قيود جديدة داخله.")}</CardContent></Card>}
    <Card className="border-blue-200 bg-blue-50"><CardContent className="p-4 text-sm text-blue-900"><b>{t("ledger.alert.warning", "تنبيه: لا تستخدم هذه الصفحة في التشغيل اليومي إلا لو أنت فاهم القيود. النظام ينشئ أغلب القيود تلقائيًا من الطلبات، المصروفات، الخزنة، المخزون، والرواتب.")}</b></CardContent></Card>

    {!loading && loadErrors.length > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-900 space-y-2">
      <div className="font-black">{t("ledger.alert.readErr", "دفتر القيود لم يُقرأ بشكل كامل، لذلك الأرقام الظاهرة قد تكون ناقصة.")}</div>
      {loadErrors.map((e, i) => <div key={i} className="rounded-lg bg-white/80 border border-red-100 px-3 py-2 text-xs break-words">{e}</div>)}
      <Button size="sm" onClick={repairLedger} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}{t("ledger.btn.repairNow", "إصلاح دفتر القيود الآن")}</Button>
    </CardContent></Card>}

    {!loading && !loadErrors.length && accounts.length === 0 && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900 space-y-2">
      <div className="font-black">{t("ledger.alert.noChart", "شجرة الحسابات غير ظاهرة لهذه المغسلة.")}</div>
      <div>{t("ledger.alert.chartHint", "اضغط إصلاح ليتم إنشاء الحسابات الأساسية: الخزنة، الذمم، الإيرادات، المصروفات، الرواتب.")}</div>
      <Button size="sm" onClick={repairLedger} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}{t("ledger.btn.createChart", "إنشاء شجرة الحسابات")}</Button>
    </CardContent></Card>}

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <Tabs defaultValue="journals" className="space-y-4">
      <TabsList><TabsTrigger value="journals">{t("ledger.tab.journals", "القيود")}</TabsTrigger><TabsTrigger value="pl">{t("ledger.tab.pl", "الأرباح والخسائر")}</TabsTrigger><TabsTrigger value="trial">{t("ledger.tab.trial", "ميزان المراجعة")}</TabsTrigger><TabsTrigger value="close">{t("ledger.tab.close", "الإقفال")}</TabsTrigger></TabsList>
      <TabsContent value="journals" className="grid lg:grid-cols-[380px_1fr] gap-4">
        <div className="space-y-4"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-4 h-4" />{t("ledger.autoPost.title", "ترحيل تلقائي")}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{t("ledger.autoPost.desc", "يفحص الطلبات والمصروفات داخل الشهر وينشئ القيود الناقصة فقط. لا يجمع الشهر في قيد إجمالي حتى لا تتضاعف الإيرادات أو المصروفات.")}</p><Button onClick={postMonthAutomatically} disabled={isClosed} className="w-full">{t("ledger.autoPost.btn", "فحص وترحيل الناقص فقط")}</Button></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" />{t("ledger.manual.title", "قيد يدوي للمحاسب")}</CardTitle></CardHeader><CardContent className="space-y-3"><Field label={t("ledger.manual.descLabel", "البيان")}><Input value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} /></Field><div className="grid grid-cols-2 gap-2"><Field label={t("ledger.manual.debitLabel", "مدين")}><AccountSelect accounts={accounts} value={manual.debit_account} onChange={(v) => setManual({ ...manual, debit_account: v })} t={t} /></Field><Field label={t("ledger.manual.creditLabel", "دائن")}><AccountSelect accounts={accounts} value={manual.credit_account} onChange={(v) => setManual({ ...manual, credit_account: v })} t={t} /></Field></div><Field label={t("ledger.manual.amountLabel", "المبلغ")}><Input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} /></Field><Textarea placeholder={t("ledger.manual.memoPlaceholder", "مذكرة")} value={manual.memo} onChange={(e) => setManual({ ...manual, memo: e.target.value })} /><Button onClick={addManualJournal} disabled={isClosed} className="w-full">{t("ledger.manual.saveBtn", "حفظ القيد")}</Button></CardContent></Card></div>
        <Card><CardHeader><CardTitle className="text-base">{t("ledger.journals.title", "قيود الشهر")}</CardTitle></CardHeader><CardContent className="space-y-3">{journals.map((j) => <JournalCard key={j.id} journal={j} curr={curr} t={t} />)}{!journals.length && <Empty text={t("ledger.journals.empty", "لا توجد قيود لهذا الشهر")} />}</CardContent></Card>
      </TabsContent>
      <TabsContent value="pl"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileBarChart className="w-4 h-4" />{t("ledger.pl.title", "قائمة الأرباح والخسائر لشهر")} {month}</CardTitle></CardHeader><CardContent className="space-y-2">{monthlyPl.map((r) => <Row key={r.code} a={`${r.code} — ${r.name}`} b={r.account_type === "revenue" ? t("ledger.pl.rev", "إيراد") : t("ledger.pl.exp", "مصروف")} c={fmtMoney(r.amount, curr)} danger={r.account_type === "expense"} />)}{!monthlyPl.length && <Empty text={t("ledger.pl.empty", "لا توجد إيرادات أو مصروفات مرحلة لهذا الشهر")} />}<div className="border-t pt-3 mt-3 flex justify-between font-black text-lg"><span>{t("ledger.kpi.netProfit")}</span><span className={pnl.net >= 0 ? "text-emerald-700" : "text-red-700"}>{fmtMoney(pnl.net, curr)}</span></div></CardContent></Card></TabsContent>
      <TabsContent value="trial"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Scale className="w-4 h-4" />{t("ledger.tab.trial", "ميزان المراجعة")}</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-start p-3">{t("ledger.trial.account", "الحساب")}</th><th className="text-end p-3">{t("ledger.manual.debitLabel", "مدين")}</th><th className="text-end p-3">{t("ledger.manual.creditLabel", "دائن")}</th><th className="text-end p-3">{t("ledger.trial.balance", "الرصيد")}</th></tr></thead><tbody>{trial.map((r) => <tr key={r.account_id} className="border-t"><td className="p-3 font-bold">{r.code} — {r.name}</td><td className="p-3 text-end">{fmtMoney(r.total_debit, curr)}</td><td className="p-3 text-end">{fmtMoney(r.total_credit, curr)}</td><td className="p-3 text-end font-black">{fmtMoney(r.balance, curr)}</td></tr>)}<tr className="border-t bg-muted/30 font-black"><td className="p-3">{t("ledger.trial.total", "الإجمالي")}</td><td className="p-3 text-end">{fmtMoney(trialTotals.debit, curr)}</td><td className="p-3 text-end">{fmtMoney(trialTotals.credit, curr)}</td><td></td></tr></tbody></table></CardContent></Card></TabsContent>
      <TabsContent value="close"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><LockKeyhole className="w-4 h-4" />{t("ledger.close.title", "الإقفال الشهري")}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{t("ledger.close.desc", "بعد مراجعة القيود وميزان المراجعة، اقفل الشهر لمنع أي تعديل غير مقصود.")}</p><Button variant="destructive" onClick={closeMonth} disabled={isClosed}>{t("ledger.close.btn", "إقفال شهر")} {month}</Button><div className="space-y-2 pt-3">{periods.map((p) => <Row key={p.id} a={`${p.period_start} → ${p.period_end}`} b={p.status === "closed" ? t("ledger.close.closed", "مقفول") : t("ledger.close.open", "مفتوح")} c={p.closed_at ? fmtDate(p.closed_at) : "—"} />)}</div></CardContent></Card></TabsContent>
    </Tabs>}
  </div>;
}

function AccountSelect({ accounts, value, onChange, t }: { accounts: any[]; value: string; onChange: (v: string) => void; t: any }) { return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={t("ledger.select.account", "الحساب")} /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent></Select>; }
function JournalCard({ journal, curr, t }: { journal: any; curr: string; t: any }) { const debit = (journal.journal_lines ?? []).reduce((s: number, l: any) => s + Number(l.debit), 0); return <div className="rounded-2xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">{journal.description}</div><Badge>{fmtMoney(debit, curr)}</Badge></div><div className="text-xs text-muted-foreground mt-1">{journal.entry_date}</div><div className="mt-2 space-y-1">{(journal.journal_lines ?? []).map((l: any) => <div key={l.id} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs"><span>{l.chart_accounts?.code} — {l.chart_accounts?.name}</span><span className="text-emerald-700">{t("ledger.manual.debitLabel", "مدين")} {Number(l.debit) ? fmtMoney(l.debit, curr) : "—"}</span><span className="text-red-700">{t("ledger.manual.creditLabel", "دائن")} {Number(l.credit) ? fmtMoney(l.credit, curr) : "—"}</span></div>)}</div></div>; }
function Kpi({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function Row({ a, b, c, danger }: { a: string; b: string; c: string; danger?: boolean }) { return <div className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><div className="flex-1 font-bold">{a}</div><Badge variant={danger ? "destructive" : "secondary"}>{b}</Badge><div className="font-black">{c}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-muted-foreground">{text}</div>; }
