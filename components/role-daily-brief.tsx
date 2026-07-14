import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { resolveAppUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardCopy, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Role = "owner" | "ops" | "cs";

type Brief = {
  ordersToday: number;
  revenueToday: number;
  expensesToday: number;
  cashIn: number;
  cashOut: number;
  active: number;
  late: number;
  ready: number;
  unpaidReady: number;
  reclean: number;
  qcIssues: number;
  pickupsOpen: number;
  invoicesNeedReview: number;
  proofsNeedReview: number;
  queuedMessages: number;
};

function line(title: string, value: string | number, warn = false) {
  return { title, value, warn };
}

export function RoleDailyBrief({ role }: { role: Role }) {
  const [data, setData] = useState<Brief | null>(null);
  const { t, dir } = useI18n();

  async function load() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();
    const now = new Date().toISOString();

    const [ordersRes, expensesRes, cashRes, recleanRes, qcRes, pickupsRes, msgsRes, invoiceRes, proofRes] = await Promise.all([
      supabase.from("orders").select("id,total,status,payment_status,promised_delivery_at,created_at").gte("created_at", startIso),
      supabase.from("expenses").select("amount,status,spent_at").gte("spent_at", startIso).neq("status", "void"),
      (supabase.from("cash_transactions").select("amount,direction,happened_at").gte("happened_at", startIso).neq("status", "void") as unknown as Promise<any>).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("service_units").select("id,orders!inner(status)", { count: "exact", head: true }).eq("needs_reclean", true).not("orders.status", "in", "(delivered,cancelled)"),
      supabase.from("service_units").select("id,orders!inner(status)", { count: "exact", head: true }).eq("current_stage", "qc_failed").not("orders.status", "in", "(delivered,cancelled)"),
      supabase.from("pickup_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "assigned"]),
      (supabase.from("customer_messages").select("id", { count: "exact", head: true }).eq("status", "queued") as unknown as Promise<any>).then((r: any) => r).catch(() => ({ count: 0 })),
      supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
      supabase.from("orders").select("id", { count: "exact", head: true }).in("payment_verification_status", ["pending_review", "underpaid"]),
    ]);

    const orders = ordersRes.data ?? [];
    const expenses = expensesRes.data ?? [];
    const cash = cashRes.data ?? [];
    const validOrders = orders.filter((o: any) => o.status !== "cancelled");
    setData({
      ordersToday: validOrders.length,
      revenueToday: validOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0),
      expensesToday: expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0),
      cashIn: cash.filter((x: any) => x.direction === "in").reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
      cashOut: cash.filter((x: any) => x.direction === "out").reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
      active: orders.filter((o: any) => !["delivered", "cancelled"].includes(o.status)).length,
      late: orders.filter((o: any) => o.promised_delivery_at && o.promised_delivery_at < now && !["delivered", "cancelled"].includes(o.status)).length,
      ready: orders.filter((o: any) => o.status === "ready").length,
      unpaidReady: orders.filter((o: any) => ["ready", "out_for_delivery"].includes(o.status) && o.payment_status !== "paid").length,
      reclean: recleanRes.count ?? 0,
      qcIssues: qcRes.count ?? 0,
      pickupsOpen: pickupsRes.count ?? 0,
      invoicesNeedReview: invoiceRes.count ?? 0,
      proofsNeedReview: proofRes.count ?? 0,
      queuedMessages: msgsRes.count ?? 0,
    });
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    if (role === "owner") return [
      line(t("brief.revenueToday"), fmtMoney(data.revenueToday, t("common.egp"))),
      line(t("brief.expensesToday"), fmtMoney(data.expensesToday, t("common.egp")), data.expensesToday > data.revenueToday),
      line(t("brief.netProfit"), fmtMoney(data.revenueToday - data.expensesToday, t("common.egp")), data.revenueToday - data.expensesToday < 0),
      line(t("brief.cashIn"), fmtMoney(data.cashIn, t("common.egp"))),
      line(t("brief.cashOut"), fmtMoney(data.cashOut, t("common.egp"))),
      line(t("brief.activeOrders"), data.active, data.active > 0),
    ];
    if (role === "ops") return [
      line(t("brief.ordersToday"), data.ordersToday),
      line(t("brief.lateOrders"), data.late, data.late > 0),
      line(t("brief.readyOrders"), data.ready),
      line(t("brief.pickupsOpen"), data.pickupsOpen, data.pickupsOpen > 0),
      line(t("brief.reclean"), data.reclean, data.reclean > 0),
      line(t("brief.qcIssues"), data.qcIssues, data.qcIssues > 0),
    ];
    return [
      line(t("brief.ordersToday"), data.ordersToday),
      line(t("brief.unpaidReady"), data.unpaidReady, data.unpaidReady > 0),
      line(t("brief.invoicesNeedReview"), data.invoicesNeedReview, data.invoicesNeedReview > 0),
      line(t("brief.proofsNeedReview"), data.proofsNeedReview, data.proofsNeedReview > 0),
      line(t("brief.queuedMessages"), data.queuedMessages, data.queuedMessages > 0),
      line(t("brief.lateOrders"), data.late, data.late > 0),
    ];
  }, [data, role, t]);

  const title = role === "owner" ? t("brief.ownerTitle") : role === "ops" ? t("brief.opsTitle") : t("brief.csTitle");
  const notificationAudience = role === "owner" ? "owner" : role === "ops" ? "ops" : "cs";
  const link = role === "owner" ? "/dashboard" : role === "ops" ? "/ops" : "/cs";

  function reportText() {
    return `${title}\n${rows.map((r) => `- ${r.title}: ${r.value}`).join("\n")}`;
  }

  function copySummary() {
    if (!data) return;
    navigator.clipboard?.writeText(reportText());
    toast.success("تم نسخ التقرير اليومي");
  }

  async function saveToNotifications() {
    if (!data) return;
    const { error } = await supabase.from("app_notifications").insert({
      audience: notificationAudience,
      title,
      body: reportText(),
      href: link,
      tone: "info",
    });
    if (error) toast.error(error.message);
    else toast.success("تم حفظ التقرير في جرس التنبيهات");
  }

  if (!data) return null;
  return <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50" dir={dir}>
    <CardHeader><CardTitle className="text-base flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-teal-600" />{title}</span><span className="flex gap-2"><Button size="sm" variant="outline" onClick={copySummary}><ClipboardCopy className="w-3 h-3 ms-1" />{t("brief.copy")}</Button><Button size="sm" onClick={saveToNotifications}>{t("brief.saveAlert")}</Button></span></CardTitle></CardHeader>
    <CardContent className="grid md:grid-cols-3 gap-2">
      {rows.map((r) => <div key={r.title} className={`rounded-xl border p-3 bg-white ${r.warn ? "border-amber-200" : ""}`}><div className="text-xs text-muted-foreground">{r.title}</div><div className="font-black mt-1">{r.value}</div>{r.warn && <Badge variant="destructive" className="mt-2">{t("brief.review")}</Badge>}</div>)}
      <Link to={resolveAppUrl(link) as any} className="md:col-span-3 text-xs text-teal-700 underline font-bold">{t("brief.openDashboard")}</Link>
    </CardContent>
  </Card>;
}
