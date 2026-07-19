import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UsersRound, Loader2, RefreshCw, Search, Wallet } from "lucide-react";
import { interpolate, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/receivables")({
  head: () => ({ meta: [{ title: "ذمم العملاء" }] }),
  component: ReceivablesPage,
});

function ReceivablesPage() {
  const { t, dir } = useI18n();
  const { hasRole } = useAuth();
  const canUse = hasRole("owner", "cs_manager", "ops_manager");
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const [b, l] = await Promise.all([
      supabase.from("v_customer_balances").select("*").order("balance", { ascending: false }),
      supabase.from("customer_financial_ledger").select("*,customers(full_name,phone),orders(order_number)").order("entry_at", { ascending: false }).limit(150),
    ]);
    if (b.error) toast.error(b.error.message);
    setBalances((b.data ?? []).filter((x: any) => Number(x.balance ?? 0) !== 0));
    setLedger(l.data ?? []);
    setLoading(false);
  }

  async function syncUnpaidOrders() {
    const { data, error } = await supabase.from("orders").select("id").neq("status", "cancelled").eq("payment_status", "unpaid").limit(500);
    if (error) return toast.error(error.message);
    let n = 0;
    for (const o of data ?? []) {
      const r = await supabase.rpc("sync_order_financials", { _order_id: o.id });
      if (!r.error) n++;
    }
    toast.success(interpolate(t("receivables.toastSync", "تمت مزامنة {count} طلب آجل مع ذمم العملاء"), { count: n }));
    load();
  }

  useEffect(() => { if (canUse) load(); }, [canUse]);
  const filtered = useMemo(() => balances.filter((x) => !q || `${x.full_name} ${x.phone}`.toLowerCase().includes(q.toLowerCase())), [balances, q]);
  const total = balances.reduce((s, x) => s + Number(x.balance ?? 0), 0);

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("receivables.errAccess", "ذمم العملاء للمالك والتشغيل وخدمة العملاء فقط.")}</CardContent></Card>;
  const curr = t("common.egp");

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><UsersRound className="w-7 h-7 text-teal-600" />{t("receivables.pageTitle", "ذمم العملاء والمديونيات")}</h1><p className="text-sm text-muted-foreground">{t("receivables.subtitle", "كشف حساب العملاء: فواتير آجلة، مدفوعات، وأرصدة مستحقة.")}</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={load}>{t("common.refresh")}</Button><Button onClick={syncUnpaidOrders}><RefreshCw className="w-4 h-4 ms-1" />{t("receivables.syncBtn", "مزامنة الآجل")}</Button></div>
    </div>
    <div className="grid md:grid-cols-3 gap-3"><Kpi label={t("receivables.totalDebt", "إجمالي المديونية")} value={fmtMoney(total, curr)} /><Kpi label={t("receivables.customersWithDebt", "عملاء عليهم رصيد")} value={balances.length} /><Kpi label={t("receivables.latestEntries", "آخر قيود")} value={ledger.length} /></div>
    <div className="relative max-w-md"><Search className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pe-9" placeholder={t("receivables.searchPlaceholder", "بحث باسم العميل أو الهاتف")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="grid lg:grid-cols-[1fr_420px] gap-4">
      <Card><CardHeader><CardTitle className="text-base">{t("receivables.balancesTitle", "أرصدة العملاء")}</CardTitle></CardHeader><CardContent className="space-y-2">{filtered.map((c) => <div key={c.customer_id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><div className="font-black">{c.full_name}</div><div className="text-xs text-muted-foreground">{c.phone} · {t("receivables.lastEntry", "آخر حركة")} {c.last_entry_at ? fmtDate(c.last_entry_at) : "—"}</div></div><Badge variant={Number(c.balance) > 0 ? "destructive" : "secondary"}>{fmtMoney(c.balance, curr)}</Badge></div>)}{!filtered.length && <Empty text={t("receivables.emptyDebt", "لا توجد مديونيات")} />}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4" />{t("receivables.ledgerTitle", "آخر قيود العملاء")}</CardTitle></CardHeader><CardContent className="space-y-2">{ledger.map((l) => <div key={l.id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{l.customers?.full_name ?? t("station.common.customer")}</b><Badge variant={l.direction === "customer_owes" ? "destructive" : "secondary"}>{l.entry_type === "invoice" ? t("receivables.invoice", "فاتورة") : t("receivables.payment", "سداد")}</Badge></div><div className="text-xs text-muted-foreground mt-1">{t("receivables.orderNo", "طلب #")}{l.orders?.order_number ?? "—"} · {fmtDate(l.entry_at)}</div><div className="font-black mt-2">{fmtMoney(l.amount, curr)}</div></div>)}</CardContent></Card>
    </div>}
  </div>;
}
function Kpi({ label, value }: { label: string; value: any }) { return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></CardContent></Card>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-muted-foreground">{text}</div>; }
