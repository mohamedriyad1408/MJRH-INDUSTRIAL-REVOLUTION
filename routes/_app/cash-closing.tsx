import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, Plus, Loader2, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { useI18n, interpolate } from "@/lib/i18n";

export const Route = createFileRoute("/_app/cash-closing")({
  head: () => ({ meta: [{ title: "إقفال الخزائن" }] }),
  component: CashClosingPage,
});

type RowData = { account: any; expected: number; counted: number; diff: number; notes: string };

function CashClosingPage() {
  const { hasRole, tenantId } = useAuth();
  const { t, dir, language } = useI18n();
  const canUse = hasRole("owner", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [dayTx, setDayTx] = useState<any[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [notes, setNotes] = useState("");
  const [closingNow, setClosingNow] = useState(false);
  const [fixingCash, setFixingCash] = useState(false);

  async function load() {
    if (!canUse) { setLoading(false); return; }
    if (!tenantId) {
      setLoading(false);
      setLoadErrors([t("cashClosing.errNoTenant", "لم يتم تحديد المغسلة")]);
      return;
    }
    setLoading(true); setLoadErrors([]);
    const date = new Date().toISOString().slice(0, 10);

    const [cRes, clRes, txRes] = await Promise.all([
      supabase.from("cash_accounts").select("*,branches(name)").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
      supabase.from("daily_cash_closings").select("*,cash_accounts(name)").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
      supabase.from("cash_transactions").select("*,cash_accounts(name)").eq("tenant_id", tenantId).gte("happened_at", `${date}T00:00:00Z`).order("happened_at", { ascending: false }),
    ]);

    const accs = cRes.data ?? [];
    setCashAccounts(accs); setClosings(clRes.data ?? []); setDayTx(txRes.data ?? []);
    setRows(accs.map((a: any) => ({ account: a, expected: Number(a.current_balance ?? 0), counted: Number(a.current_balance ?? 0), diff: 0, notes: "" })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [canUse, tenantId]);

  async function repairCashClosing() {
    if (!tenantId) return toast.error(t("cashClosing.errNoTenant", "لم يتم تحديد المغسلة"));
    setRepairing(true);
    const errs: string[] = [];
    try {
      const r1 = await supabase.rpc("repair_cash_account_balances"); if (r1.error) errs.push(r1.error.message);
      const r2 = await supabase.rpc("repair_cash_closing_records"); if (r2.error) errs.push(r2.error.message);
      if (errs.length) toast.error(errs.join(" | ")); else toast.success(t("cashClosing.prepSuccess", "تم تجهيز الخزن للإقفال"));
      await load();
    } finally { setRepairing(false); }
  }

  function updateRow(id: string, val: string) {
    setRows(rows.map((r) => {
      if (r.account.id !== id) return r;
      const counted = Number(val);
      const diff = counted - r.expected;
      return { ...r, counted, diff };
    }));
  }

  function fillAllExpected() {
    setRows(rows.map((r) => ({ ...r, counted: r.expected, diff: 0 })));
    toast.success(t("cashClosing.successExpected", "تم ملء النقدية الفعلية بالرصيد المتوقع لكل الخزن"));
  }

  async function closeSafes() {
    if (!tenantId) return toast.error(t("cashClosing.errNoTenant", "لم يتم تحديد المغسلة"));
    if (!rows.length) return toast.error(t("cashClosing.errNoCash", "لا توجد خزائن لإقفالها"));
    const hasDiff = rows.some((r) => Math.abs(r.diff) >= 0.01);
    if (hasDiff && notes.trim().length < 3) return toast.error(t("cashClosing.errDiffNotes", "يوجد فرق في خزنة أو أكثر. اكتب سبب الفرق قبل الإقفال."));

    setClosingNow(true);
    const date = new Date().toISOString().slice(0, 10);
    let totalOpIn = 0, totalOpOut = 0, totalTrIn = 0, totalTrOut = 0;
    dayTx.forEach((tx) => {
      const amt = Number(tx.amount ?? 0);
      const isTr = tx.source_type === "cash_transfer";
      if (tx.direction === "in") { if (isTr) totalTrIn += amt; else totalOpIn += amt; }
      else { if (isTr) totalTrOut += amt; else totalOpOut += amt; }
    });

    const totals = {
      expected: rows.reduce((s, r) => s + r.expected, 0),
      counted: rows.reduce((s, r) => s + r.counted, 0),
      diff: rows.reduce((s, r) => s + r.diff, 0),
      operatingIn: totalOpIn, operatingOut: totalOpOut, transferIn: totalTrIn, transferOut: totalTrOut,
    };

    const lines = [
      t("cashClosing.reportTitle", "تقرير إقفال كل الخزن"),
      `${t("cashClosing.todayLabel", "اليوم:")} ${date}`,
      `${t("cashClosing.opIn", "دخل تشغيل:")} ${fmtMoney(totals.operatingIn)}`,
      `${t("cashClosing.opOut", "خرج تشغيل:")} ${fmtMoney(totals.operatingOut)}`,
      `${t("cashClosing.transferInVal", "تحويلات داخلية: داخل")} ${fmtMoney(totals.transferIn)} / ${t("cashClosing.transferOutVal", "خارج")} ${fmtMoney(totals.transferOut)}`,
      `${t("cashClosing.expectedBal", "الرصيد المتوقع:")} ${fmtMoney(totals.expected)}`,
      `${t("cashClosing.counted", "النقدية الفعلية:")} ${fmtMoney(totals.counted)}`,
      `${t("cashClosing.diffTotal", "إجمالي الفرق:")} ${fmtMoney(totals.diff)}`,
      notes ? `${t("cashClosing.diffReason", "سبب الفرق:")} ${notes}` : null,
      ...rows.map((r) => `- ${r.account.name}: ${t("cashClosing.expectedShort", "متوقع:")} ${fmtMoney(r.expected)} / ${t("cashClosing.countedShort", "فعلي:")} ${fmtMoney(r.counted)} / ${t("cashClosing.diffShort", "فرق:")} ${fmtMoney(r.diff)}`),
    ].filter(Boolean);

    try {
      const res = await supabase.rpc("submit_all_cash_closings", {
        _tenant_id: tenantId, _closing_date: date, _notes: notes || null, _payload_rows: rows.map((r) => ({ cash_account_id: r.account.id, expected_balance: r.expected, counted_balance: r.counted, difference: r.diff, notes: r.notes })),
      });
      if (res.error) throw res.error;

      const title = Math.abs(totals.diff) >= 0.01 ? t("cashClosing.titleDiff", "إقفال الخزن - يوجد فرق") : t("cashClosing.titleNormal", "إقفال الخزن اليومي");
      await supabase.from("notifications").insert({ tenant_id: tenantId, title, message: lines.join("\n"), audience: ["owner", "ops_manager"], tone: Math.abs(totals.diff) >= 0.01 ? "amber" : "emerald" }).then(() => null);

      toast.success(t("cashClosing.successClose", "تم إقفال كل الخزن في حركة واحدة"));
      setNotes(""); load();
    } catch (e: any) { toast.error(e.message ?? "فشل الإقفال"); } finally { setClosingNow(false); }
  }

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("cashClosing.ownerOnly", "إقفال الخزن للمالك ومدير التشغيل فقط.")}</CardContent></Card>;

  let totalOpIn = 0, totalOpOut = 0, totalTrIn = 0, totalTrOut = 0;
  dayTx.forEach((tx) => { const amt = Number(tx.amount ?? 0); const isTr = tx.source_type === "cash_transfer"; if (tx.direction === "in") { if (isTr) totalTrIn += amt; else totalOpIn += amt; } else { if (isTr) totalTrOut += amt; else totalOpOut += amt; } });
  const totals = { expected: rows.reduce((s, r) => s + r.expected, 0), counted: rows.reduce((s, r) => s + r.counted, 0), diff: rows.reduce((s, r) => s + r.diff, 0), operatingIn: totalOpIn, operatingOut: totalOpOut, transferIn: totalTrIn, transferOut: totalTrOut };
  const curr = t("common.egp");

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><Wallet className="w-7 h-7 text-teal-600" />{t("cashClosing.title", "إقفال الخزائن")}</h1><p className="text-sm text-muted-foreground">{t("cashClosing.subtitle", "جرد الخزن ومطابقة الرصيد")}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}>{t("common.refresh")}</Button><Button variant="outline" onClick={repairCashClosing} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <RefreshCw className="w-4 h-4 ms-1" />}{t("cashClosing.btnRepair", "إصلاح")}</Button></div>
    </div>

    {!loading && loadErrors.length > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-900 space-y-2">
      <div className="font-black">{t("cashClosing.alertRead", "لم يتم قراءة الإقفال بشكل كامل؛ لا تعتمد على الأرقام قبل الإصلاح.")}</div>
      {loadErrors.map((e, i) => <div key={i} className="rounded-lg bg-white/80 border border-red-100 px-3 py-2 text-xs break-words">{e}</div>)}
      <Button size="sm" onClick={repairCashClosing} disabled={repairing}>{t("cashClosing.btnRepairFull", "إصلاح وقراءة الخزن")}</Button>
    </CardContent></Card>}

    {!loading && rows.length === 0 && <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4 text-sm text-amber-900 space-y-2"><div className="font-black">{t("cashClosing.alertNoCash", "لا توجد خزائن مقروءة.")}</div><Button size="sm" onClick={repairCashClosing}><Plus className="w-4 h-4 ms-1" />{t("cashClosing.btnCreateMain", "إنشاء الخزنة الرئيسية")}</Button></CardContent></Card>}

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="grid lg:grid-cols-[1fr_420px] gap-4">
      <div className="space-y-4">
        <Card><CardHeader><CardTitle className="text-base">{t("cashClosing.title", "إقفال الخزائن")}</CardTitle></CardHeader><CardContent className="space-y-3">
          {(totals.transferIn || totals.transferOut) ? <Card className="border-blue-200 bg-blue-50"><CardContent className="p-4 text-sm text-blue-900"><b>{t("cashClosing.alertTransfer", "تحويلات داخلية اليوم:")}</b> {t("cashClosing.transferInVal", "داخل")} {fmtMoney(totals.transferIn, curr)} / {t("cashClosing.transferOutVal", "خارج")} {fmtMoney(totals.transferOut, curr)} {t("cashClosing.transferNote", "— لا تعتبر دخل أو مصروف، فقط نقل بين الخزن.")}</CardContent></Card> : null}
          <div className="space-y-2">{rows.map((r) => <div key={r.account.id} className="rounded-2xl border p-4 space-y-3 bg-card"><div className="flex justify-between items-center"><div><div className="font-black text-lg">{r.account.name}</div><div className="text-xs text-muted-foreground">{r.account.branches?.name ?? ""}</div></div><div className="text-end"><div className="text-xs text-muted-foreground">{t("cashClosing.expectedShort", "متوقع:")}</div><div className="font-bold text-lg">{fmtMoney(r.expected, curr)}</div></div></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><label className="text-xs font-bold">{t("cashClosing.countedShort", "فعلي:")}</label><Input type="number" value={r.counted} onChange={(e) => updateRow(r.account.id, e.target.value)} className="font-black text-lg h-11" /></div><div className="space-y-1 text-end"><label className="text-xs font-bold">{t("cashClosing.diffShort", "فرق:")}</label><div className={`font-black text-xl pt-2 ${r.diff === 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtMoney(r.diff, curr)}</div></div></div></div>)}</div>
          {rows.length > 0 && <div className="pt-2 space-y-3"><div className="flex justify-between items-center font-black text-lg border-t pt-3"><span>{t("cashClosing.diff", "إجمالي الفرق:")}</span><span className={totals.diff === 0 ? "text-emerald-600" : "text-red-600"}>{fmtMoney(totals.diff, curr)}</span></div><Textarea placeholder={t("cashClosing.errDiffNotes", "السبب...")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /><div className="flex gap-2"><Button variant="outline" onClick={fillAllExpected} className="flex-1">{t("cashClosing.successExpected", "مطابقة الكل")}</Button><Button onClick={closeSafes} disabled={closingNow} className="flex-1 bg-emerald-600 hover:bg-emerald-700">{closingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 ms-1" />}{t("cashClosing.successClose", "إقفال")}</Button></div></div>}
        </CardContent></Card>
      </div>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle className="text-base">{t("cashClosing.latestTx", "أحدث الحركات")}</CardTitle></CardHeader><CardContent className="space-y-2">{dayTx.slice(0, 20).map((t_row) => <div key={t_row.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><b>{t_row.description}</b><div className="text-xs text-muted-foreground">{t_row.cash_accounts?.name} · {fmtDate(t_row.happened_at)}</div></div><Badge variant={t_row.direction === "out" ? "destructive" : "secondary"}>{t_row.direction === "in" ? "+" : "-"} {fmtMoney(t_row.amount, curr)}</Badge></div>)}{!dayTx.length && <Empty text={t("cashClosing.noTx", "لا توجد معاملات")} />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t("cashClosing.latestClosings", "سجل الإقفالات")}</CardTitle></CardHeader><CardContent className="space-y-2">{closings.slice(0, 12).map((c) => <div key={c.id} className="rounded-xl border p-3 text-xs"><div className="font-bold">{c.cash_accounts?.name} — {c.closing_date}</div><div>{t("cashClosing.expectedShort", "متوقع:")} {fmtMoney(c.expected_balance, curr)} · {t("cashClosing.countedShort", "فعلي:")} {fmtMoney(c.counted_balance, curr)} · {t("cashClosing.diffShort", "فرق:")} <b>{fmtMoney(c.difference, curr)}</b></div></div>)}{!closings.length && <Empty text={t("cashClosing.noClosings", "لا توجد إقفالات")} />}</CardContent></Card>
      </div>
    </div>}
  </div>;
}
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-muted-foreground">{text}</div>; }
