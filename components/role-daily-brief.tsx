import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardCopy, Sparkles } from "lucide-react";

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

  async function load() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();
    const now = new Date().toISOString();

    const [ordersRes, expensesRes, cashRes, recleanRes, qcRes, pickupsRes, msgsRes, invoiceRes, proofRes] = await Promise.all([
      (supabase as any).from("orders").select("id,total,status,payment_status,promised_delivery_at,created_at").gte("created_at", startIso),
      (supabase as any).from("expenses").select("amount,status,spent_at").gte("spent_at", startIso).neq("status", "void"),
      (supabase as any).from("cash_transactions").select("amount,direction,happened_at").gte("happened_at", startIso).neq("status", "void").then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("needs_reclean", true),
      (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("current_stage", "qc_failed"),
      (supabase as any).from("pickup_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "assigned"]),
      (supabase as any).from("customer_messages").select("id", { count: "exact", head: true }).eq("status", "queued").then((r: any) => r).catch(() => ({ count: 0 })),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("payment_verification_status", ["pending_review", "underpaid"]),
    ]);

    const orders = ordersRes.data ?? [];
    const expenses = expensesRes.data ?? [];
    const cash = cashRes.data ?? [];
    setData({
      ordersToday: orders.length,
      revenueToday: orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0),
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
      line("إيراد اليوم", fmtMoney(data.revenueToday)),
      line("مصروفات اليوم", fmtMoney(data.expensesToday), data.expensesToday > data.revenueToday),
      line("صافي مبدئي", fmtMoney(data.revenueToday - data.expensesToday), data.revenueToday - data.expensesToday < 0),
      line("داخل الخزنة", fmtMoney(data.cashIn)),
      line("خارج الخزنة", fmtMoney(data.cashOut)),
      line("طلبات تحتاج متابعة", data.active, data.active > 0),
    ];
    if (role === "ops") return [
      line("طلبات اليوم", data.ordersToday),
      line("طلبات متأخرة", data.late, data.late > 0),
      line("طلبات جاهزة", data.ready),
      line("استلامات مفتوحة", data.pickupsOpen, data.pickupsOpen > 0),
      line("مرتجعات غسيل", data.reclean, data.reclean > 0),
      line("مشاكل جودة", data.qcIssues, data.qcIssues > 0),
    ];
    return [
      line("طلبات اليوم", data.ordersToday),
      line("جاهز غير مدفوع", data.unpaidReady, data.unpaidReady > 0),
      line("فواتير تحتاج اعتماد", data.invoicesNeedReview, data.invoicesNeedReview > 0),
      line("إيصالات تحتاج مراجعة", data.proofsNeedReview, data.proofsNeedReview > 0),
      line("رسائل جاهزة", data.queuedMessages, data.queuedMessages > 0),
      line("طلبات متأخرة", data.late, data.late > 0),
    ];
  }, [data, role]);

  function copySummary() {
    if (!data) return;
    const title = role === "owner" ? "ملخص المالك اليومي" : role === "ops" ? "ملخص التشغيل اليومي" : "ملخص خدمة العملاء اليومي";
    const text = `${title}\n${rows.map((r) => `- ${r.title}: ${r.value}`).join("\n")}`;
    navigator.clipboard?.writeText(text);
    toast.success("تم نسخ التقرير اليومي");
  }

  const title = role === "owner" ? "تقرير المالك اليومي" : role === "ops" ? "تقرير التشغيل اليومي" : "تقرير خدمة العملاء اليومي";
  const link = role === "owner" ? "/dashboard" : role === "ops" ? "/ops" : "/cs";

  if (!data) return null;
  return <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50">
    <CardHeader><CardTitle className="text-base flex items-center justify-between gap-2"><span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-teal-600" />{title}</span><Button size="sm" variant="outline" onClick={copySummary}><ClipboardCopy className="w-3 h-3 ms-1" />نسخ</Button></CardTitle></CardHeader>
    <CardContent className="grid md:grid-cols-3 gap-2">
      {rows.map((r) => <div key={r.title} className={`rounded-xl border p-3 bg-white ${r.warn ? "border-amber-200" : ""}`}><div className="text-xs text-muted-foreground">{r.title}</div><div className="font-black mt-1">{r.value}</div>{r.warn && <Badge variant="destructive" className="mt-2">راجع</Badge>}</div>)}
      <Link to={link as any} className="md:col-span-3 text-xs text-teal-700 underline font-bold">افتح لوحة الدور</Link>
    </CardContent>
  </Card>;
}
