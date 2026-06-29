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
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("all");
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

  useEffect(() => {
    if (tenantId) {
      (supabase as any)
        .from("branches")
        .select("id,name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at")
        .then(({ data }: any) => setBranches(data ?? []));
    }
  }, [tenantId]);

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

      let accQuery = (supabase as any).from("cash_accounts").select("*").eq("tenant_id", tenantId).eq("is_active", true);
      if (branchId !== "all") {
        accQuery = accQuery.eq("branch_id", branchId);
      }
      accQuery = accQuery.order("created_at");

      const branchCashSelect = branchId === "all" ? "*,cash_accounts(name)" : "*,cash_accounts!inner(name,branch_id)";
      let txQuery = (supabase as any).from("cash_transactions").select(branchCashSelect).eq("tenant_id", tenantId).eq("status", "posted").gte("happened_at", from).lte("happened_at", to);
      if (branchId !== "all") {
        txQuery = txQuery.eq("cash_accounts.branch_id", branchId);
      }
      txQuery = txQuery.order("happened_at", { ascending: false });

      const futureSelect = branchId === "all" ? "id,cash_account_id,direction,amount,status,happened_at" : "id,cash_account_id,direction,amount,status,happened_at,cash_accounts!inner(branch_id)";
      let futureQuery = (supabase as any).from("cash_transactions").select(futureSelect).eq("tenant_id", tenantId).eq("status", "posted").gt("happened_at", to);
      if (branchId !== "all") {
        futureQuery = futureQuery.eq("cash_accounts.branch_id", branchId);
      }

      let closeQuery = (supabase as any).from("daily_cash_closings").select("*,cash_accounts(name)").eq("tenant_id", tenantId);
      if (branchId !== "all") {
        closeQuery = closeQuery.eq("branch_id", branchId);
      }
      closeQuery = closeQuery.order("closing_date", { ascending: false }).limit(40);

      const [acc, tx, future, close] = await Promise.all([
        accQuery,
        txQuery,
        futureQuery,
        closeQuery,
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
  useEffect(() => { load(); }, [canUse, tenantId, date, branchId]);

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
          branch_id: r.account.branch_id || null,
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

    <div className="grid md:grid-cols-[200px_200px_auto] gap-3 items-end">
      <div>
        <Label>{t("common.branch")}</Label>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("cashClosing.allBranches")}</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div><Label>{t("cashClosing.date")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="flex flex-wrap gap-2"><Button onClick={fillExpected} variant="outline">{t("cashClosing.fillExpected")}</Button><Button onClick={closeAllSafes} disabled={saving || !rows.length}>{saving ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Calculator className="w-4 h-4 ms-1" />}{t("cashClosing.closeAll")}</Button></div>
    </div>

    {loadErrors.length > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-900 space-y-2">
      <div className="font-black">لم يتم قراءة الإقفال بشكل كامل؛ لا تعتمد على الأرقام قبل الإصلاح.</div>
      {loadErrors.map((e, i) => <div key={i} className="rounded-lg bg-white/80 border border-red-100 px-3 py-2 text-xs break-words">{e}</div>)}
      <Button size="sm" onClick={repairCashClosing} disabled={repairing}>إصلاح وقراءة الخزن</Button>
    </CardContent></Card>}

    {!loading && rows.length === 0 && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900 space-y-2"><div className="font-black">لا توجد خزائن مقروءة.</div><Button size="sm" onClick={repairCashClosing}><Plus className="w-4 h-4 ms-1" />إنشاء الخزنة الرئيسية</Button></CardContent></Card>}

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <>
      <div className="grid md:grid-cols-4 gap-3">
        <Kpi label={t("cashClosing.operatingIn")} value={fmtMoney(totals.operatingIn, t("common.egp"))} />
        <Kpi label={t("cashClosing.operatingOut")} value={fmtMoney(totals.operatingOut, t("common.egp"))} warn={totals.operatingOut > 0} />
        <Kpi label={t("cashClosing.expected")} value={fmtMoney(totals.expected, t("common.egp"))} />
        <Kpi label={t("cashClosing.difference")} value={fmtMoney(totals.diff, t("common.egp"))} warn={Math.abs(totals.diff) >= 0.01} />
      </div>

      {(totals.transferIn || totals.transferOut) ? <Card className="border-blue-200 bg-blue-50"><CardContent className="p-4 text-sm text-blue-900"><b>تحويلات داخلية اليوم:</b> داخل {fmtMoney(totals.transferIn, t("common.egp"))} / خارج {fmtMoney(totals.transferOut, t("common.egp"))} — لا تعتبر دخل أو مصروف، فقط نقل بين الخزن.</CardContent></Card> : null}

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4" />{t("cashClosing.actualSafes")}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((r) => <div key={r.account.id} className={`rounded-2xl border p-4 space-y-3 ${Math.abs(r.diff) >= 0.01 ? "border-amber-300 bg-amber-50" : ""}`}>
          <div className="flex items-start justify-between gap-2"><div><div className="font-black text-lg">{r.account.name}</div><div className="text-xs text-muted-foreground">{t("cashClosing.start")}: {fmtMoney(r.opening, t("common.egp"))}</div></div><Badge variant={r.diff ? "destructive" : "secondary"}>{t("cashClosing.diff")} {fmtMoney(r.diff, t("common.egp"))}</Badge></div>
          <div className="grid grid-cols-2 gap-2 text-xs"><Mini label={t("cashClosing.operatingInLabel")} value={fmtMoney(r.operatingIn, t("common.egp"))} /><Mini label={t("cashClosing.operatingOutLabel")} value={fmtMoney(r.operatingOut, t("common.egp"))} /><Mini label={t("cashClosing.transferIn")} value={fmtMoney(r.transferIn, t("common.egp"))} /><Mini label={t("cashClosing.transferOut")} value={fmtMoney(r.transferOut, t("common.egp"))} /><Mini label={t("cashClosing.expectedLabel")} value={fmtMoney(r.expected, t("common.egp"))} /></div>
          <div><Label>{t("cashClosing.actualLabel")}</Label><Input type="number" value={countedMap[r.account.id] ?? String(r.expected)} onChange={(e) => setCountedMap({ ...countedMap, [r.account.id]: e.target.value })} /></div>
        </div>)}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">{t("cashClosing.notesTitle")}</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea placeholder={t("cashClosing.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} /><Button onClick={closeAllSafes} disabled={saving || !rows.length} className="w-full">{t("cashClosing.closeTodayBtn")}</Button></CardContent></Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">{t("cashClosing.latestTx")}</CardTitle></CardHeader><CardContent className="space-y-2">{dayTx.slice(0, 20).map((t_row) => <div key={t_row.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><b>{t_row.description}</b><div className="text-xs text-muted-foreground">{t_row.cash_accounts?.name} · {fmtDate(t_row.happened_at)}</div></div><Badge variant={t_row.direction === "out" ? "destructive" : "secondary"}>{t_row.direction === "in" ? "+" : "-"} {fmtMoney(t_row.amount, t("common.egp"))}</Badge></div>)}{!dayTx.length && <Empty text={t("cashClosing.noTx")} />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("cashClosing.latestClosings")}</CardTitle></CardHeader><CardContent className="space-y-2">{closings.slice(0, 12).map((c) => <div key={c.id} className="rounded-xl border p-3 text-xs"><div className="font-bold">{c.cash_accounts?.name} — {c.closing_date}</div><div>متوقع: {fmtMoney(c.expected_balance, t("common.egp"))} · فعلي: {fmtMoney(c.counted_balance, t("common.egp"))} · فرق: <b>{fmtMoney(c.difference, t("common.egp"))}</b></div></div>)}{!closings.length && <Empty text={t("cashClosing.noClosings")} />}</CardContent></Card>
      </div>
    </>}
  </div>;
}
function Kpi({ label, value, warn = false }: { label: string; value: any; warn?: boolean }) { return <Card className={warn ? "border-amber-200 bg-amber-50" : ""}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/60 p-2"><div className="text-[11px] text-muted-foreground">{label}</div><div className="font-black">{value}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-muted-foreground">{text}</div>; }
