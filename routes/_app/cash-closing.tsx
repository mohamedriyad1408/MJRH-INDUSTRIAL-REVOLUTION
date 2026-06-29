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
import { toast } from "sonner";
import { LockKeyhole, Loader2, Calculator, RefreshCw, Plus, Banknote } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/cash-closing")({
  head: () => ({ meta: [{ title: "إقفال الخزائن" }] }),
  component: CashClosingPage,
});

type CashRow = {
  account: any;
  opening: number;
  cashIn: number;
  cashOut: number;
  transferIn: number;
  transferOut: number;
  operatingIn: number;
  operatingOut: number;
  expected: number;
  counted: number;
  diff: number;
  tx: any[];
};

function effectOf(t: any) {
  return t.status === "posted" ? (t.direction === "in" ? Number(t.amount ?? 0) : -Number(t.amount ?? 0)) : 0;
}

function CashClosingPage() {
  const { hasRole, user, tenantId } = useAuth();
  const { t, dir } = useI18n();
  const canUse = hasRole("owner", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dayTx, setDayTx] = useState<any[]>([]);
  const [afterTx, setAfterTx] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [countedMap, setCountedMap] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

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
      if (errs.length) toast.error(errs.join(" | ")); else toast.success("تم تجهيز الخزن للإقفال");
      await load();
    } finally {
      setRepairing(false);
    }
  }

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
      const ensure = await (supabase as any).rpc("ensure_default_cash_account_for", { _tenant_id: tenantId });
      if (ensure.error) errs.push(ensure.error.message);

      const from = new Date(date + "T00:00:00").toISOString();
      const to = new Date(date + "T23:59:59").toISOString();
      const [acc, tx, future, close] = await Promise.all([
        (supabase as any).from("cash_accounts").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("created_at"),
        (supabase as any).from("cash_transactions").select("*,cash_accounts(name)").eq("tenant_id", tenantId).eq("status", "posted").gte("happened_at", from).lte("happened_at", to).order("happened_at", { ascending: false }),
        (supabase as any).from("cash_transactions").select("id,cash_account_id,direction,amount,status,happened_at").eq("tenant_id", tenantId).eq("status", "posted").gt("happened_at", to),
        (supabase as any).from("daily_cash_closings").select("*,cash_accounts(name)").eq("tenant_id", tenantId).order("closing_date", { ascending: false }).limit(40),
      ]);
      [acc, tx, future, close].forEach((r: any) => r.error && errs.push(r.error.message));
      setAccounts(acc.data ?? []);
      setDayTx(tx.data ?? []);
      setAfterTx(future.data ?? []);
      setClosings(close.data ?? []);
      if (errs.length) setLoadErrors([...new Set(errs)].slice(0, 8));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [canUse, tenantId, date]);

  const rows: CashRow[] = useMemo(() => {
    return accounts.map((account) => {
      const tx = dayTx.filter((t) => t.cash_account_id === account.id);
      const futureEffect = afterTx.filter((t) => t.cash_account_id === account.id).reduce((s, t) => s + effectOf(t), 0);
      const expected = Number(account.current_balance ?? 0) - futureEffect;
      const cashIn = tx.filter((x) => x.direction === "in").reduce((s, x) => s + Number(x.amount ?? 0), 0);
      const cashOut = tx.filter((x) => x.direction === "out").reduce((s, x) => s + Number(x.amount ?? 0), 0);
      const transferIn = tx.filter((x) => x.direction === "in" && x.source_type === "cash_transfer").reduce((s, x) => s + Number(x.amount ?? 0), 0);
      const transferOut = tx.filter((x) => x.direction === "out" && x.source_type === "cash_transfer").reduce((s, x) => s + Number(x.amount ?? 0), 0);
      const operatingIn = cashIn - transferIn;
      const operatingOut = cashOut - transferOut;
      const opening = expected - cashIn + cashOut;
      const counted = countedMap[account.id] === undefined ? expected : Number(countedMap[account.id] || 0);
      return { account, opening, cashIn, cashOut, transferIn, transferOut, operatingIn, operatingOut, expected, counted, diff: counted - expected, tx };
    });
  }, [accounts, dayTx, afterTx, countedMap]);

  useEffect(() => {
    if (!rows.length) return;
    setCountedMap((old) => {
      const next = { ...old };
      for (const r of rows) if (next[r.account.id] === undefined) next[r.account.id] = String(r.expected);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length, dayTx.length, afterTx.length]);

  const totals = useMemo(() => ({
    opening: rows.reduce((s, r) => s + r.opening, 0),
    operatingIn: rows.reduce((s, r) => s + r.operatingIn, 0),
    operatingOut: rows.reduce((s, r) => s + r.operatingOut, 0),
    transferIn: rows.reduce((s, r) => s + r.transferIn, 0),
    transferOut: rows.reduce((s, r) => s + r.transferOut, 0),
    expected: rows.reduce((s, r) => s + r.expected, 0),
    counted: rows.reduce((s, r) => s + r.counted, 0),
    diff: rows.reduce((s, r) => s + r.diff, 0),
  }), [rows]);

  function fillExpected() {
    const next: Record<string, string> = {};
    rows.forEach((r) => { next[r.account.id] = String(r.expected); });
    setCountedMap(next);
    toast.success("تم ملء النقدية الفعلية بالرصيد المتوقع لكل الخزن");
  }

  async function closeAllSafes() {
    if (!tenantId) return toast.error("لم يتم تحديد المغسلة");
    if (!rows.length) return toast.error("لا توجد خزائن لإقفالها");
    const hasDiff = rows.some((r) => Math.abs(r.diff) >= 0.01);
    if (hasDiff && notes.trim().length < 3) return toast.error("يوجد فرق في خزنة أو أكثر. اكتب سبب الفرق قبل الإقفال.");
    setSaving(true);
    try {
      const errs: string[] = [];
      for (const r of rows) {
        const { error } = await (supabase as any).from("daily_cash_closings").upsert({
          tenant_id: tenantId,
          cash_account_id: r.account.id,
          closing_date: date,
          opening_balance: r.opening,
          cash_in: r.cashIn,
          cash_out: r.cashOut,
          expected_balance: r.expected,
          counted_balance: r.counted,
          difference: r.diff,
          status: "closed",
          notes: notes || null,
          closed_by: user?.id,
          closed_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,cash_account_id,closing_date" });
        if (error) errs.push(`${r.account.name}: ${error.message}`);
      }
      if (errs.length) return toast.error(errs.join(" | "));

      const body = [
        "تقرير إقفال كل الخزن",
        `اليوم: ${date}`,
        `دخل تشغيل: ${fmtMoney(totals.operatingIn)}`,
        `خرج تشغيل: ${fmtMoney(totals.operatingOut)}`,
        `تحويلات داخلية: داخل ${fmtMoney(totals.transferIn)} / خارج ${fmtMoney(totals.transferOut)}`,
        `الرصيد المتوقع: ${fmtMoney(totals.expected)}`,
        `النقدية الفعلية: ${fmtMoney(totals.counted)}`,
        `إجمالي الفرق: ${fmtMoney(totals.diff)}`,
        notes ? `سبب الفرق: ${notes}` : null,
        "",
        ...rows.map((r) => `- ${r.account.name}: متوقع ${fmtMoney(r.expected)} / فعلي ${fmtMoney(r.counted)} / فرق ${fmtMoney(r.diff)}`),
      ].filter(Boolean).join("\n");

      await (supabase as any).from("app_notifications").insert({
        tenant_id: tenantId,
        audience: "owner",
        title: Math.abs(totals.diff) >= 0.01 ? "إقفال الخزن - يوجد فرق" : "إقفال الخزن اليومي",
        body,
        href: "/cash-closing",
        tone: Math.abs(totals.diff) >= 0.01 ? "warning" : "success",
      }).then(() => null);

      toast.success("تم إقفال كل الخزن في حركة واحدة");
      setNotes("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">إقفال الخزن للمالك ومدير التشغيل فقط.</CardContent></Card>;

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><LockKeyhole className="w-7 h-7 text-teal-600" />{t("cashClosing.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("cashClosing.subtitle")}</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}>{t("common.refresh")}</Button><Button variant="outline" onClick={repairCashClosing} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}إصلاح</Button></div>
    </div>

    <div className="grid md:grid-cols-[240px_auto] gap-3 items-end">
      <div><Label>اليوم</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="flex flex-wrap gap-2"><Button onClick={fillExpected} variant="outline">ملء المتوقع كفعلي</Button><Button onClick={closeAllSafes} disabled={saving || !rows.length}>{saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Calculator className="w-4 h-4 ms-1" />}إقفال كل الخزن</Button></div>
    </div>

    {loadErrors.length > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-900 space-y-2">
      <div className="font-black">لم يتم قراءة الإقفال بشكل كامل؛ لا تعتمد على الأرقام قبل الإصلاح.</div>
      {loadErrors.map((e, i) => <div key={i} className="rounded-lg bg-white/80 border border-red-100 px-3 py-2 text-xs break-words">{e}</div>)}
      <Button size="sm" onClick={repairCashClosing} disabled={repairing}>إصلاح وقراءة الخزن</Button>
    </CardContent></Card>}

    {!loading && rows.length === 0 && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900 space-y-2"><div className="font-black">لا توجد خزائن مقروءة.</div><Button size="sm" onClick={repairCashClosing}><Plus className="w-4 h-4 ms-1" />إنشاء الخزنة الرئيسية</Button></CardContent></Card>}

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <>
      <div className="grid md:grid-cols-4 gap-3">
        <Kpi label="دخل تشغيل اليوم" value={fmtMoney(totals.operatingIn)} />
        <Kpi label="خرج تشغيل اليوم" value={fmtMoney(totals.operatingOut)} warn={totals.operatingOut > 0} />
        <Kpi label="الرصيد المتوقع" value={fmtMoney(totals.expected)} />
        <Kpi label="إجمالي الفرق" value={fmtMoney(totals.diff)} warn={Math.abs(totals.diff) >= 0.01} />
      </div>

      {(totals.transferIn || totals.transferOut) ? <Card className="border-blue-200 bg-blue-50"><CardContent className="p-4 text-sm text-blue-900"><b>تحويلات داخلية اليوم:</b> داخل {fmtMoney(totals.transferIn)} / خارج {fmtMoney(totals.transferOut)} — لا تعتبر دخل أو مصروف، فقط نقل بين الخزن.</CardContent></Card> : null}

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4" />النقدية الفعلية لكل خزنة</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((r) => <div key={r.account.id} className={`rounded-2xl border p-4 space-y-3 ${Math.abs(r.diff) >= 0.01 ? "border-amber-300 bg-amber-50" : ""}`}>
          <div className="flex items-start justify-between gap-2"><div><div className="font-black text-lg">{r.account.name}</div><div className="text-xs text-muted-foreground">بداية: {fmtMoney(r.opening)}</div></div><Badge variant={r.diff ? "destructive" : "secondary"}>فرق {fmtMoney(r.diff)}</Badge></div>
          <div className="grid grid-cols-2 gap-2 text-xs"><Mini label="دخل تشغيل" value={fmtMoney(r.operatingIn)} /><Mini label="خرج تشغيل" value={fmtMoney(r.operatingOut)} /><Mini label="تحويل داخل" value={fmtMoney(r.transferIn)} /><Mini label="تحويل خارج" value={fmtMoney(r.transferOut)} /><Mini label="المتوقع" value={fmtMoney(r.expected)} /></div>
          <div><Label>النقدية الموجودة فعليًا</Label><Input type="number" value={countedMap[r.account.id] ?? String(r.expected)} onChange={(e) => setCountedMap({ ...countedMap, [r.account.id]: e.target.value })} /></div>
        </div>)}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">سبب الفرق إن وجد</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea placeholder="مثال: عجز/زيادة عند الجرد، تحويل لم يسجل، مصروف لم يدخل..." value={notes} onChange={(e) => setNotes(e.target.value)} /><Button onClick={closeAllSafes} disabled={saving || !rows.length} className="w-full">إقفال كل الخزن اليوم</Button></CardContent></Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">آخر حركات اليوم</CardTitle></CardHeader><CardContent className="space-y-2">{dayTx.slice(0, 20).map((t) => <div key={t.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><b>{t.description}</b><div className="text-xs text-muted-foreground">{t.cash_accounts?.name} · {fmtDate(t.happened_at)}</div></div><Badge variant={t.direction === "out" ? "destructive" : "secondary"}>{t.direction === "in" ? "+" : "-"} {fmtMoney(t.amount)}</Badge></div>)}{!dayTx.length && <Empty text="لا توجد حركات اليوم" />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">آخر الإقفالات</CardTitle></CardHeader><CardContent className="space-y-2">{closings.slice(0, 12).map((c) => <div key={c.id} className="rounded-xl border p-3 text-xs"><div className="font-bold">{c.cash_accounts?.name} — {c.closing_date}</div><div>متوقع: {fmtMoney(c.expected_balance)} · فعلي: {fmtMoney(c.counted_balance)} · فرق: <b>{fmtMoney(c.difference)}</b></div></div>)}{!closings.length && <Empty text="لا توجد إقفالات سابقة" />}</CardContent></Card>
      </div>
    </>}
  </div>;
}
function Kpi({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/60 p-2"><div className="text-[11px] text-muted-foreground">{label}</div><div className="font-black">{value}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-muted-foreground">{text}</div>; }
