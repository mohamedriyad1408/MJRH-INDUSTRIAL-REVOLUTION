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

export const Route = createFileRoute("/_app/ledger")({
  head: () => ({ meta: [{ title: "القيود والتقارير المالية" }] }),
  component: LedgerPage,
});

function boundsFromMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const s = new Date(y, m - 1, 1);
  const e = new Date(y, m, 0, 23, 59, 59);
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10), fromIso: s.toISOString(), toIso: e.toISOString() };
}

function LedgerPage() {
  const { hasRole } = useAuth();
  const canUse = hasRole("owner");
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [trial, setTrial] = useState<any[]>([]);
  const [pl, setPl] = useState<any[]>([]);
  const [manual, setManual] = useState({ description: "", debit_account: "", credit_account: "", amount: "0", memo: "" });
  const b = useMemo(() => boundsFromMonth(month), [month]);

  async function load() {
    if (!canUse) { setLoading(false); return; }
    setLoading(true);
    try {
      await (supabase as any).rpc("ensure_default_chart_accounts").catch(() => null);
      const results = await Promise.allSettled([
        (supabase as any).from("chart_accounts").select("*").eq("is_active", true).order("code"),
        (supabase as any).from("journal_entries").select("*,journal_lines(*,chart_accounts(code,name,account_type))").gte("entry_date", b.start).lte("entry_date", b.end).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
        (supabase as any).from("accounting_periods").select("*").order("period_start", { ascending: false }).limit(18),
        (supabase as any).from("v_trial_balance").select("*").order("code"),
        (supabase as any).from("v_profit_loss").select("*").order("code"),
      ]);
      const val = (i: number) => results[i].status === "fulfilled" ? (results[i] as any).value : { data: [], error: (results[i] as any).reason };
      const a = val(0), j = val(1), p = val(2), t = val(3), profit = val(4);
      [a, j, p, t, profit].forEach((r: any) => r.error && toast.error(r.error.message ?? "تعذر تحميل جزء من البيانات"));
      setAccounts(a.data ?? []); setJournals(j.data ?? []); setPeriods(p.data ?? []); setTrial(t.data ?? []); setPl(profit.data ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [canUse, month]);

  const pnl = useMemo(() => {
    const revenue = pl.filter((x) => x.account_type === "revenue").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const expense = pl.filter((x) => x.account_type === "expense").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    return { revenue, expense, net: revenue - expense };
  }, [pl]);
  const trialTotals = useMemo(() => ({ debit: trial.reduce((s, x) => s + Number(x.total_debit ?? 0), 0), credit: trial.reduce((s, x) => s + Number(x.total_credit ?? 0), 0) }), [trial]);
  const isClosed = periods.some((p) => p.status === "closed" && b.start >= p.period_start && b.end <= p.period_end);

  async function createJournal(description: string, sourceType: string | null, sourceId: string | null, lines: any[]) {
    const { error } = await (supabase as any).rpc("create_journal_entry", {
      _entry_date: b.end,
      _description: description,
      _source_type: sourceType,
      _source_id: sourceId,
      _lines: lines,
    });
    if (error) throw error;
  }

  async function postMonthAutomatically() {
    try {
      if (isClosed) return toast.error("الشهر مقفول ولا يمكن ترحيله");
      const [{ data: orders }, { data: expenses }] = await Promise.all([
        (supabase as any).from("orders").select("id,total,delivery_fee,payment_status,payment_method,status").neq("status", "cancelled").gte("created_at", b.fromIso).lte("created_at", b.toIso),
        (supabase as any).from("expenses").select("id,amount,category,status,description").neq("status", "void").gte("spent_at", b.fromIso).lte("spent_at", b.toIso),
      ]);
      const paidRevenue = (orders ?? []).filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const unpaidRevenue = (orders ?? []).filter((o: any) => o.payment_status !== "paid").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const paidExpenses = (expenses ?? []).filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
      const payableExpenses = (expenses ?? []).filter((e: any) => e.status === "payable").reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);

      const monthSourceId = crypto.randomUUID();
      if (paidRevenue > 0) await createJournal("ترحيل الإيرادات المحصلة للشهر", "month_paid_revenue_" + month, monthSourceId, [
        { account_code: "1000", debit: paidRevenue, credit: 0, memo: "تحصيلات العملاء" },
        { account_code: "4000", debit: 0, credit: paidRevenue, memo: "إيرادات خدمات" },
      ]);
      if (unpaidRevenue > 0) await createJournal("ترحيل الإيرادات الآجلة / ذمم العملاء", "month_unpaid_revenue_" + month, crypto.randomUUID(), [
        { account_code: "1100", debit: unpaidRevenue, credit: 0, memo: "ذمم عملاء" },
        { account_code: "4000", debit: 0, credit: unpaidRevenue, memo: "إيرادات خدمات آجلة" },
      ]);
      if (paidExpenses > 0) await createJournal("ترحيل المصروفات المدفوعة للشهر", "month_paid_expenses_" + month, crypto.randomUUID(), [
        { account_code: "5100", debit: paidExpenses, credit: 0, memo: "مصروفات تشغيلية" },
        { account_code: "1000", debit: 0, credit: paidExpenses, memo: "صرف من الخزنة" },
      ]);
      if (payableExpenses > 0) await createJournal("ترحيل المصروفات المستحقة للشهر", "month_payable_expenses_" + month, crypto.randomUUID(), [
        { account_code: "5100", debit: payableExpenses, credit: 0, memo: "مصروفات مستحقة" },
        { account_code: "2000", debit: 0, credit: payableExpenses, memo: "دائنون/مصروفات مستحقة" },
      ]);
      toast.success("تم ترحيل بيانات الشهر إلى قيود محاسبية متوازنة");
      load();
    } catch (e: any) { toast.error(e.message ?? "تعذر الترحيل"); }
  }

  async function addManualJournal() {
    try {
      if (!manual.description || !manual.debit_account || !manual.credit_account || !Number(manual.amount)) return toast.error("أكمل بيانات القيد");
      await createJournal(manual.description, null, null, [
        { account_id: manual.debit_account, debit: Number(manual.amount), credit: 0, memo: manual.memo },
        { account_id: manual.credit_account, debit: 0, credit: Number(manual.amount), memo: manual.memo },
      ]);
      toast.success("تم إنشاء القيد");
      setManual({ description: "", debit_account: "", credit_account: "", amount: "0", memo: "" });
      load();
    } catch (e: any) { toast.error(e.message ?? "تعذر إنشاء القيد"); }
  }

  async function closeMonth() {
    if (!confirm("إقفال الشهر يمنع إضافة أو تعديل قيود داخل الفترة. متأكد؟")) return;
    const { error } = await (supabase as any).from("accounting_periods").upsert({ period_start: b.start, period_end: b.end, status: "closed", closed_at: new Date().toISOString() }, { onConflict: "tenant_id,period_start,period_end" });
    if (error) toast.error(error.message); else { toast.success("تم إقفال الشهر"); load(); }
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">القيود والتقارير المالية للمالك فقط.</CardContent></Card>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><BookOpenCheck className="w-7 h-7 text-teal-600" />دفتر القيود للمحاسب</h1><p className="text-sm text-muted-foreground">هذه صفحة متقدمة للمراجعة المحاسبية. صاحب العمل العادي يكتفي بصفحة الحسابات والخزنة.</p></div>
      <div className="flex gap-2"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><Button variant="outline" onClick={load}>تحديث</Button></div>
    </div>
    <div className="grid md:grid-cols-4 gap-3">
      <Kpi label="الإيرادات" value={fmtMoney(pnl.revenue)} />
      <Kpi label="المصروفات" value={fmtMoney(pnl.expense)} warn />
      <Kpi label="صافي الربح" value={fmtMoney(pnl.net)} warn={pnl.net < 0} />
      <Kpi label="اتزان الميزان" value={trialTotals.debit === trialTotals.credit ? "متزن" : "غير متزن"} warn={trialTotals.debit !== trialTotals.credit} />
    </div>
    {isClosed && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 font-bold text-amber-800">هذا الشهر مقفول محاسبيًا. لا يمكن إضافة قيود جديدة داخله.</CardContent></Card>}
    <Card className="border-blue-200 bg-blue-50"><CardContent className="p-4 text-sm text-blue-900"><b>تنبيه:</b> لا تستخدم هذه الصفحة في التشغيل اليومي إلا لو أنت فاهم القيود. النظام ينشئ أغلب القيود تلقائيًا من الطلبات، المصروفات، الخزنة، المخزون، والرواتب.</CardContent></Card>

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <Tabs defaultValue="journals" className="space-y-4">
      <TabsList><TabsTrigger value="journals">القيود</TabsTrigger><TabsTrigger value="pl">الأرباح والخسائر</TabsTrigger><TabsTrigger value="trial">ميزان المراجعة</TabsTrigger><TabsTrigger value="close">الإقفال</TabsTrigger></TabsList>
      <TabsContent value="journals" className="grid lg:grid-cols-[380px_1fr] gap-4">
        <div className="space-y-4"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-4 h-4" />ترحيل تلقائي</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">يجمع إيرادات الشهر، الذمم، المصروفات المدفوعة والآجلة، ثم ينشئ قيود مزدوجة متوازنة.</p><Button onClick={postMonthAutomatically} disabled={isClosed} className="w-full">إنشاء قيود الشهر تلقائيًا</Button></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" />قيد يدوي للمحاسب</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="البيان"><Input value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} /></Field><div className="grid grid-cols-2 gap-2"><Field label="مدين"><AccountSelect accounts={accounts} value={manual.debit_account} onChange={(v) => setManual({ ...manual, debit_account: v })} /></Field><Field label="دائن"><AccountSelect accounts={accounts} value={manual.credit_account} onChange={(v) => setManual({ ...manual, credit_account: v })} /></Field></div><Field label="المبلغ"><Input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} /></Field><Textarea placeholder="مذكرة" value={manual.memo} onChange={(e) => setManual({ ...manual, memo: e.target.value })} /><Button onClick={addManualJournal} disabled={isClosed} className="w-full">حفظ القيد</Button></CardContent></Card></div>
        <Card><CardHeader><CardTitle className="text-base">قيود الشهر</CardTitle></CardHeader><CardContent className="space-y-3">{journals.map((j) => <JournalCard key={j.id} journal={j} />)}{!journals.length && <Empty text="لا توجد قيود لهذا الشهر" />}</CardContent></Card>
      </TabsContent>
      <TabsContent value="pl"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileBarChart className="w-4 h-4" />قائمة الأرباح والخسائر</CardTitle></CardHeader><CardContent className="space-y-2">{pl.map((r) => <Row key={r.code} a={`${r.code} — ${r.name}`} b={r.account_type === "revenue" ? "إيراد" : "مصروف"} c={fmtMoney(r.amount)} danger={r.account_type === "expense"} />)}<div className="border-t pt-3 mt-3 flex justify-between font-black text-lg"><span>صافي الربح</span><span className={pnl.net >= 0 ? "text-emerald-700" : "text-red-700"}>{fmtMoney(pnl.net)}</span></div></CardContent></Card></TabsContent>
      <TabsContent value="trial"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Scale className="w-4 h-4" />ميزان المراجعة</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-start p-3">الحساب</th><th className="text-end p-3">مدين</th><th className="text-end p-3">دائن</th><th className="text-end p-3">الرصيد</th></tr></thead><tbody>{trial.map((r) => <tr key={r.account_id} className="border-t"><td className="p-3 font-bold">{r.code} — {r.name}</td><td className="p-3 text-end">{fmtMoney(r.total_debit)}</td><td className="p-3 text-end">{fmtMoney(r.total_credit)}</td><td className="p-3 text-end font-black">{fmtMoney(r.balance)}</td></tr>)}<tr className="border-t bg-muted/30 font-black"><td className="p-3">الإجمالي</td><td className="p-3 text-end">{fmtMoney(trialTotals.debit)}</td><td className="p-3 text-end">{fmtMoney(trialTotals.credit)}</td><td></td></tr></tbody></table></CardContent></Card></TabsContent>
      <TabsContent value="close"><Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><LockKeyhole className="w-4 h-4" />الإقفال الشهري</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">بعد مراجعة القيود وميزان المراجعة، اقفل الشهر لمنع أي تعديل غير مقصود.</p><Button variant="destructive" onClick={closeMonth} disabled={isClosed}>إقفال شهر {month}</Button><div className="space-y-2 pt-3">{periods.map((p) => <Row key={p.id} a={`${p.period_start} → ${p.period_end}`} b={p.status === "closed" ? "مقفول" : "مفتوح"} c={p.closed_at ? fmtDate(p.closed_at) : "—"} />)}</div></CardContent></Card></TabsContent>
    </Tabs>}
  </div>;
}

function AccountSelect({ accounts, value, onChange }: { accounts: any[]; value: string; onChange: (v: string) => void }) { return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="الحساب" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}</SelectContent></Select>; }
function JournalCard({ journal }: { journal: any }) { const debit = (journal.journal_lines ?? []).reduce((s: number, l: any) => s + Number(l.debit), 0); return <div className="rounded-2xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">{journal.description}</div><Badge>{fmtMoney(debit)}</Badge></div><div className="text-xs text-muted-foreground mt-1">{journal.entry_date}</div><div className="mt-2 space-y-1">{(journal.journal_lines ?? []).map((l: any) => <div key={l.id} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs"><span>{l.chart_accounts?.code} — {l.chart_accounts?.name}</span><span className="text-emerald-700">مدين {Number(l.debit) ? fmtMoney(l.debit) : "—"}</span><span className="text-red-700">دائن {Number(l.credit) ? fmtMoney(l.credit) : "—"}</span></div>)}</div></div>; }
function Kpi({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }
function Row({ a, b, c, danger }: { a: string; b: string; c: string; danger?: boolean }) { return <div className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"><div className="flex-1 font-bold">{a}</div><Badge variant={danger ? "destructive" : "secondary"}>{b}</Badge><div className="font-black">{c}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-muted-foreground">{text}</div>; }
