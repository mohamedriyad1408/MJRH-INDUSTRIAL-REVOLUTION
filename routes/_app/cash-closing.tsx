import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LockKeyhole, Loader2, Calculator } from "lucide-react";

export const Route = createFileRoute("/_app/cash-closing")({
  head: () => ({ meta: [{ title: "إقفال الخزنة اليومي" }] }),
  component: CashClosingPage,
});

function CashClosingPage() {
  const { hasRole, user, tenantId } = useAuth();
  const canUse = hasRole("owner", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const [tx, setTx] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [counted, setCounted] = useState("0");
  const [notes, setNotes] = useState("");

  async function load() {
    if (!canUse) { setLoading(false); return; }
    setLoading(true);
    try {
      await (supabase as any).rpc("ensure_default_cash_account").catch(() => null);
      let { data: acc, error: accErr } = await (supabase as any).from("cash_accounts").select("*").eq("is_active", true).order("created_at");
      if ((!acc || acc.length === 0) && tenantId) {
        const ins = await (supabase as any).from("cash_accounts").insert({ tenant_id: tenantId, name: "الخزنة الرئيسية", account_type: "cash", opening_balance: 0, current_balance: 0 }).select("*").single();
        if (!ins.error && ins.data) acc = [ins.data];
      }
      if (accErr) toast.error(accErr.message);
      const first = accountId || acc?.[0]?.id || "";
      setAccounts(acc ?? []); setAccountId(first);
      if (!first) { setTx([]); setClosings([]); return; }
      const from = new Date(date + "T00:00:00").toISOString();
      const to = new Date(date + "T23:59:59").toISOString();
      const [t, c] = await Promise.all([
        (supabase as any).from("cash_transactions").select("*").eq("cash_account_id", first).gte("happened_at", from).lte("happened_at", to).order("happened_at", { ascending: false }),
        (supabase as any).from("daily_cash_closings").select("*,cash_accounts(name)").order("closing_date", { ascending: false }).limit(30),
      ]);
      if (t.error) toast.error(t.error.message);
      if (c.error) toast.error(c.error.message);
      setTx(t.data ?? []); setClosings(c.data ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [canUse, date, accountId]);

  const totals = useMemo(() => {
    const cashIn = tx.filter((x) => x.direction === "in").reduce((s, x) => s + Number(x.amount), 0);
    const cashOut = tx.filter((x) => x.direction === "out").reduce((s, x) => s + Number(x.amount), 0);
    const acc = accounts.find((a) => a.id === accountId);
    const expected = Number(acc?.current_balance ?? 0);
    return { cashIn, cashOut, expected, diff: Number(counted || 0) - expected };
  }, [tx, accounts, accountId, counted]);

  async function closeDay() {
    if (!accountId) return toast.error("لا توجد خزنة. اضغط تحديث وسيقوم النظام بإنشاء الخزنة الرئيسية.");
    const acc = accounts.find((a) => a.id === accountId);
    const { error } = await (supabase as any).from("daily_cash_closings").upsert({
      cash_account_id: accountId,
      closing_date: date,
      opening_balance: Number(acc?.opening_balance ?? 0),
      cash_in: totals.cashIn,
      cash_out: totals.cashOut,
      expected_balance: totals.expected,
      counted_balance: Number(counted || 0),
      difference: totals.diff,
      status: "closed",
      notes: notes || null,
      closed_by: user?.id,
      closed_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,cash_account_id,closing_date" });
    if (error) toast.error(error.message); else { toast.success("تم إقفال الخزنة لليوم"); setNotes(""); load(); }
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">إقفال الخزنة للمالك ومدير التشغيل فقط.</CardContent></Card>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black flex items-center gap-2"><LockKeyhole className="w-7 h-7 text-teal-600" />إقفال الخزنة اليومي</h1><p className="text-sm text-muted-foreground">راجع حركات اليوم، الرصيد المتوقع، وعدّ النقدية الفعلية.</p></div><Button variant="outline" onClick={load}>تحديث</Button></div>
    <div className="grid md:grid-cols-3 gap-3"><div><Label>اليوم</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div><Label>الخزنة</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger><SelectValue placeholder="اختار" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div><div><Label>النقدية المعدودة</Label><Input type="number" value={counted} onChange={(e) => setCounted(e.target.value)} /></div></div>
    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <>
      <div className="grid md:grid-cols-4 gap-3"><Kpi label="داخل اليوم" value={fmtMoney(totals.cashIn)} /><Kpi label="خارج اليوم" value={fmtMoney(totals.cashOut)} /><Kpi label="الرصيد المتوقع" value={fmtMoney(totals.expected)} /><Kpi label="فرق الجرد" value={fmtMoney(totals.diff)} warn={totals.diff !== 0} /></div>
      <div className="grid lg:grid-cols-[1fr_380px] gap-4"><Card><CardHeader><CardTitle className="text-base">حركات اليوم</CardTitle></CardHeader><CardContent className="space-y-2">{tx.map((t) => <div key={t.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><b>{t.description}</b><div className="text-xs text-muted-foreground">{fmtDate(t.happened_at)}</div></div><Badge variant={t.direction === "out" ? "destructive" : "secondary"}>{t.direction === "in" ? "+" : "-"} {fmtMoney(t.amount)}</Badge></div>)}{!tx.length && <div className="p-8 text-center text-muted-foreground">لا توجد حركات اليوم</div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" />إقفال</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea placeholder="ملاحظات الجرد" value={notes} onChange={(e) => setNotes(e.target.value)} /><Button onClick={closeDay} className="w-full">إقفال اليوم</Button><div className="pt-3 space-y-2">{closings.map((c) => <div key={c.id} className="rounded-xl border p-3 text-xs"><div className="font-bold">{c.cash_accounts?.name} — {c.closing_date}</div><div>فرق: <b>{fmtMoney(c.difference)}</b></div></div>)}</div></CardContent></Card></div>
    </>}
  </div>;
}
function Kpi({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
