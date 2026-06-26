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
import { LockKeyhole, Loader2, Calculator, RefreshCw, Plus } from "lucide-react";

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
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [repairing, setRepairing] = useState(false);

  async function load() {
    if (!canUse) { setLoading(false); return; }
    if (!tenantId) {
      setLoading(false);
      setLoadErrors(["لم يتم تحديد مغسلة للحساب الحالي. سجل خروج ودخول أو راجع دور المستخدم."]);
      return;
    }
    setLoading(true);
    setLoadErrors([]);
    try {
      const errs: string[] = [];
      const ensureFor = await (supabase as any).rpc("ensure_default_cash_account_for", { _tenant_id: tenantId });
      if (ensureFor.error) {
        errs.push(ensureFor.error.message);
        const legacy = await (supabase as any).rpc("ensure_default_cash_account");
        if (legacy.error) errs.push(legacy.error.message);
      }

      let { data: acc, error: accErr } = await (supabase as any)
        .from("cash_accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at");

      if (accErr) errs.push(accErr.message);
      if ((!acc || acc.length === 0) && tenantId) {
        const ins = await (supabase as any).from("cash_accounts").insert({
          tenant_id: tenantId,
          name: "الخزنة الرئيسية",
          account_type: "cash",
          opening_balance: 0,
          current_balance: 0,
          is_active: true,
        }).select("*").single();
        if (!ins.error && ins.data) acc = [ins.data];
        else if (ins.error) errs.push(ins.error.message);
      }

      const safeAccounts = acc ?? [];
      const first = safeAccounts.some((a: any) => a.id === accountId) ? accountId : safeAccounts[0]?.id || "";
      setAccounts(safeAccounts);
      if (first !== accountId) setAccountId(first);

      if (!first) {
        setTx([]); setClosings([]);
        if (errs.length) setLoadErrors([...new Set(errs)].slice(0, 6));
        return;
      }

      const from = new Date(date + "T00:00:00").toISOString();
      const to = new Date(date + "T23:59:59").toISOString();
      const [t, c] = await Promise.all([
        (supabase as any).from("cash_transactions")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("cash_account_id", first)
          .eq("status", "posted")
          .gte("happened_at", from)
          .lte("happened_at", to)
          .order("happened_at", { ascending: false }),
        (supabase as any).from("daily_cash_closings")
          .select("*,cash_accounts(name)")
          .eq("tenant_id", tenantId)
          .eq("cash_account_id", first)
          .order("closing_date", { ascending: false })
          .limit(30),
      ]);
      if (t.error) errs.push(t.error.message);
      if (c.error) errs.push(c.error.message);
      setTx(t.data ?? []); setClosings(c.data ?? []);
      if (errs.length) setLoadErrors([...new Set(errs)].slice(0, 6));
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
    const opening = expected - cashIn + cashOut;
    return { cashIn, cashOut, opening, expected, diff: Number(counted || 0) - expected };
  }, [tx, accounts, accountId, counted]);

  async function repairCashClosing() {
    if (!tenantId) return toast.error("لم يتم تحديد المغسلة");
    setRepairing(true);
    const errs: string[] = [];
    try {
      const r0 = await (supabase as any).rpc("repair_cash_closing_basics");
      if (r0.error) {
        const r1 = await (supabase as any).rpc("ensure_default_cash_account_for", { _tenant_id: tenantId }); if (r1.error) errs.push(r1.error.message);
        const r2 = await (supabase as any).rpc("repair_cash_account_balances"); if (r2.error) errs.push(r2.error.message);
        const r3 = await (supabase as any).rpc("sync_manual_cash_transactions_journals"); if (r3.error) errs.push(r3.error.message);
      }
      if (errs.length) toast.error(errs.join(" | ")); else toast.success("تم إصلاح وتجهيز الخزنة للإقفال");
      await load();
    } finally {
      setRepairing(false);
    }
  }

  async function closeDay() {
    if (!accountId) return toast.error("لا توجد خزنة. اضغط تحديث وسيقوم النظام بإنشاء الخزنة الرئيسية.");
    if (totals.diff !== 0 && notes.trim().length < 3) return toast.error("يوجد فرق في الخزنة. اكتب سبب الفرق قبل الإقفال.");
    const acc = accounts.find((a) => a.id === accountId);
    const { error } = await (supabase as any).from("daily_cash_closings").upsert({
      cash_account_id: accountId,
      closing_date: date,
      tenant_id: tenantId,
      opening_balance: totals.opening,
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
    if (error) return toast.error(error.message);

    const dayStart = new Date(date + "T00:00:00").toISOString();
    const dayEnd = new Date(date + "T23:59:59").toISOString();
    const [ordersToday, deliveredToday, reclean, qcIssues, unpaidReady, invoiceReview] = await Promise.all([
      (supabase as any).from("orders").select("id,total,status", { count: "exact" }).eq("tenant_id", tenantId).gte("created_at", dayStart).lte("created_at", dayEnd),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "delivered").gte("updated_at", dayStart).lte("updated_at", dayEnd),
      (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("needs_reclean", true),
      (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("current_stage", "qc_failed"),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid"),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
    ]);
    const dayOrders = ordersToday.data ?? [];
    const dayRevenue = dayOrders.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
    const active = dayOrders.filter((o: any) => !["delivered", "cancelled"].includes(o.status)).length;

    const body = [
      `تقرير نهاية اليوم وإقفال الخزنة`,
      `الخزنة: ${acc?.name ?? "خزنة"}`,
      `اليوم: ${date}`,
      "",
      "الخزنة:",
      `- داخل اليوم: ${fmtMoney(totals.cashIn)}`,
      `- خارج اليوم: ${fmtMoney(totals.cashOut)}`,
      `- الرصيد المتوقع: ${fmtMoney(totals.expected)}`,
      `- النقدية الموجودة فعليًا: ${fmtMoney(Number(counted || 0))}`,
      `- الفرق: ${fmtMoney(totals.diff)}`,
      notes ? `- سبب الفرق: ${notes}` : null,
      "",
      "الحركة:",
      `- طلبات اليوم: ${ordersToday.count ?? dayOrders.length}`,
      `- تم تسليمها اليوم: ${deliveredToday.count ?? 0}`,
      `- طلبات نشطة من طلبات اليوم: ${active}`,
      `- إيراد اليوم: ${fmtMoney(dayRevenue)}`,
      "",
      "المتابعات المفتوحة:",
      `- مرتجعات غسيل: ${reclean.count ?? 0}`,
      `- مشاكل جودة: ${qcIssues.count ?? 0}`,
      `- جاهز غير مدفوع: ${unpaidReady.count ?? 0}`,
      `- فواتير تحتاج اعتماد: ${invoiceReview.count ?? 0}`,
    ].filter(Boolean).join("\n");

    await (supabase as any).from("app_notifications").insert({
      tenant_id: tenantId,
      audience: "owner",
      title: totals.diff !== 0 ? "تقرير نهاية اليوم - فرق خزنة" : "تقرير نهاية اليوم",
      body,
      href: "/today",
      tone: totals.diff !== 0 ? "warning" : (active || (reclean.count ?? 0) || (qcIssues.count ?? 0) ? "warning" : "success"),
    }).then(() => null);

    toast.success("تم إقفال الخزنة وحفظ تقرير في التنبيهات");
    setNotes("");
    load();
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">إقفال الخزنة للمالك ومدير التشغيل فقط.</CardContent></Card>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black flex items-center gap-2"><LockKeyhole className="w-7 h-7 text-teal-600" />إقفال الخزنة اليومي</h1><p className="text-sm text-muted-foreground">آخر اليوم: اختار الخزنة، اكتب النقدية الموجودة فعليًا، والنظام يحسب الفرق.</p></div><div className="flex gap-2"><Button variant="outline" onClick={load}>تحديث</Button><Button onClick={repairCashClosing} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}إصلاح الخزنة</Button></div></div>
    <div className="grid md:grid-cols-3 gap-3"><div><Label>اليوم</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div><Label>الخزنة</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger><SelectValue placeholder="اختار" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} — {fmtMoney(a.current_balance)}</SelectItem>)}</SelectContent></Select></div><div><Label>النقدية الموجودة فعليًا</Label><Input type="number" value={counted} onChange={(e) => setCounted(e.target.value)} /></div></div>

    {!loading && loadErrors.length > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-900 space-y-2">
      <div className="font-black">إقفال الخزنة لم يقرأ البيانات بشكل كامل، لذلك الأصفار الحالية قد تكون غير صحيحة.</div>
      {loadErrors.map((e, i) => <div key={i} className="rounded-lg bg-white/80 border border-red-100 px-3 py-2 text-xs break-words">{e}</div>)}
      <Button size="sm" onClick={repairCashClosing} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}إصلاح وقراءة الخزنة الآن</Button>
    </CardContent></Card>}

    {!loading && accounts.length === 0 && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900 space-y-2">
      <div className="font-black">لا توجد خزنة مقروءة لهذه المغسلة.</div>
      <div>اضغط الزر التالي لإنشاء الخزنة الرئيسية ثم أعد الإقفال.</div>
      <Button size="sm" onClick={repairCashClosing} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Plus className="w-4 h-4 ms-1" />}إنشاء/إصلاح الخزنة الرئيسية</Button>
    </CardContent></Card>}

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <>
      <div className="grid md:grid-cols-5 gap-3"><Kpi label="بداية اليوم" value={fmtMoney(totals.opening)} /><Kpi label="داخل اليوم" value={fmtMoney(totals.cashIn)} /><Kpi label="خارج اليوم" value={fmtMoney(totals.cashOut)} /><Kpi label="الرصيد المتوقع" value={fmtMoney(totals.expected)} /><Kpi label="الفرق" value={fmtMoney(totals.diff)} warn={totals.diff !== 0} /></div>
      <div className="grid lg:grid-cols-[1fr_380px] gap-4"><Card><CardHeader><CardTitle className="text-base">حركات اليوم</CardTitle></CardHeader><CardContent className="space-y-2">{tx.map((t) => <div key={t.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><b>{t.description}</b><div className="text-xs text-muted-foreground">{fmtDate(t.happened_at)}</div></div><Badge variant={t.direction === "out" ? "destructive" : "secondary"}>{t.direction === "in" ? "+" : "-"} {fmtMoney(t.amount)}</Badge></div>)}{!tx.length && <div className="p-8 text-center text-muted-foreground">لا توجد حركات اليوم</div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" />إقفال</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea placeholder="سبب الفرق إن وجد" value={notes} onChange={(e) => setNotes(e.target.value)} /><Button onClick={closeDay} className="w-full">إقفال اليوم</Button><div className="pt-3 space-y-2">{closings.map((c) => <div key={c.id} className="rounded-xl border p-3 text-xs"><div className="font-bold">{c.cash_accounts?.name} — {c.closing_date}</div><div>فرق: <b>{fmtMoney(c.difference)}</b></div></div>)}</div></CardContent></Card></div>
    </>}
  </div>;
}
function Kpi({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
