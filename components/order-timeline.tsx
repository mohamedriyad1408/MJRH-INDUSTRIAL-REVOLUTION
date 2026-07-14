import { Link } from "@tanstack/react-router";
import { resolveAppUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, History, MapPin, Truck, CheckCircle2, ArrowRight, Shirt, RotateCcw, ShieldCheck, Image as ImageIcon, CreditCard, Scale, Send, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type ServiceUnit = any;
export type OrderIssue = { title: string; detail: string; action: string; href?: string; tone: "red" | "amber" | "blue"; units?: ServiceUnit[] };

export function buildOrderIssues(order: any, units: ServiceUnit[], pickups: any[], qcs: any[]): OrderIssue[] {
  const out: OrderIssue[] = [];
  const activePickup = pickups.find((p) => ["pending", "assigned"].includes(p.status));
  const activeUnits = units.filter((u) => u.status !== "cancelled" && u.current_stage !== "cancelled");
  const reclean = activeUnits.filter((u) => u.needs_reclean);
  const qcFailed = activeUnits.filter((u) => u.current_stage === "qc_failed");
  const notCleaned = activeUnits.filter((u) => ["both", "cleaning"].includes(u.service_type) && ["cleaning", "received"].includes(u.current_stage));
  const notIroned = activeUnits.filter((u) => ["both", "ironing"].includes(u.service_type) && !u.ironing_completed_at && !["ironing_done", "qc_passed"].includes(u.current_stage));
  const notQc = activeUnits.filter((u) => !["qc_passed", "delivered", "cancelled"].includes(u.current_stage));

  if (activePickup) out.push({ title: "استلام مفتوح", detail: activePickup.status === "pending" ? "الطلب لسه مستني تعيين مندوب للاستلام من العميل" : "المندوب اتعين ولسه لم يؤكد الاستلام", action: "تابع من الخريطة أو لوحة السائق", href: "/live-map", tone: "blue" });
  if (!activeUnits.length && order.status !== "cancelled") out.push({ title: "الطلب بلا قطع", detail: "لا يمكن تشغيل الطلب قبل تسجيل القطع", action: "أضف القطع من أسفل صفحة الطلب", tone: "red" });
  if (reclean.length) out.push({ title: "مرتجع غسيل", detail: `${reclean.length} قطعة رجعت للغسيل`, action: "افتح محطة الغسيل وأنهِ المرتجع", href: "/stations/cleaning", tone: "red", units: reclean });
  if (qcFailed.length) out.push({ title: "مشكلة جودة", detail: `${qcFailed.length} قطعة موقوفة في الجودة`, action: "راجع محطة الجودة أو تواصل مع العميل", href: "/stations/qc", tone: "red", units: qcFailed });
  if (order.status === "cleaning" && notCleaned.length) out.push({ title: "الغسيل لم يكتمل", detail: `${notCleaned.length} قطعة لم يتم تعليمها كمنظفة`, action: "أكمل القطع في محطة الغسيل", href: "/stations/cleaning", tone: "amber", units: notCleaned });
  if (order.status === "ironing" && notIroned.length) out.push({ title: "الكي لم يكتمل", detail: `${notIroned.length} قطعة لم يتم تعليمها كمكوية`, action: "أكمل القطع في محطة الكي", href: "/stations/ironing", tone: "amber", units: notIroned });
  if (["packing", "ready"].includes(order.status) && notQc.length) out.push({ title: "الجودة غير مكتملة", detail: `${notQc.length} قطعة لم تعتمد من الجودة`, action: "افتح محطة الجودة", href: "/stations/qc", tone: "amber", units: notQc });
  if (["ready", "out_for_delivery"].includes(order.status) && order.payment_status !== "paid") out.push({ title: "الدفع غير مكتمل", detail: "لا يجب تسليم الطلب قبل تسجيل الدفع أو تحصيله", action: "راجع ذمم العملاء أو تحصيل المندوب", href: "/receivables", tone: "amber" });
  if (["packing", "ready"].includes(order.status) && !order.invoice_finalized_at) out.push({ title: "الفاتورة لم تعتمد", detail: "الفاتورة النهائية قيد المراجعة", action: "راجع بنود الفاتورة واضغط تأكيد وإشعار", tone: "amber" });
  if (["pending_review", "underpaid"].includes(order.payment_verification_status ?? "")) out.push({ title: "إيصال دفع يحتاج مراجعة", detail: order.payment_verification_status === "underpaid" ? "المبلغ المقروء أقل من المطلوب" : "الإيصال قيد المراجعة", action: "راجع صورة الإيصال والدفع", tone: "red" });
  return out;
}

export function OrderIssuePanel({ issues }: { issues: OrderIssue[] }) {
  const { t } = useI18n();
  if (!issues.length) return <Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-4 text-sm text-emerald-700 font-bold text-center">{t("order.issuesOk")}</CardContent></Card>;
  const cls = (tone: string) => tone === "red" ? "border-red-200 bg-red-50 text-red-800" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-800";
  return <Card>
    <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> {t("order.issuesTitle")}</CardTitle></CardHeader>
    <CardContent className="grid md:grid-cols-2 gap-2">
      {issues.map((x, i) => {
        const body = <div className={`rounded-xl border p-3 text-sm ${cls(x.tone)}`}>
          <div className="font-black">{x.title}</div>
          <div className="text-xs opacity-80 mt-1">{x.detail}</div>
          {x.units?.length ? <div className="mt-2 flex flex-wrap gap-2">
            {x.units.slice(0, 4).map((u: any) => <div key={u.id} className="flex items-center gap-1 rounded-lg bg-white/70 border px-2 py-1 text-[11px]">
              {u.photo_url && <img src={u.photo_url} className="w-6 h-6 rounded object-cover" />}
              <span className="font-bold">{u.label_code}</span><span>{u.name}</span>
            </div>)}
            {x.units.length > 4 && <span className="text-[11px] opacity-70">+{x.units.length - 4}</span>}
          </div> : null}
          <div className="text-xs font-bold mt-2">{t("order.nextStep")}: {x.action}</div>
        </div>;
        return x.href ? <Link key={i} to={resolveAppUrl(x.href) as any}>{body}</Link> : <div key={i}>{body}</div>;
      })}
    </CardContent>
  </Card>;
}

export function returnTypeAr(t: string, fn: any) { return ({ reclean: fn("return.type.reclean", "إعادة تنظيف"), reiron: fn("return.type.reiron", "إعادة كي"), repair: fn("return.type.repair", "تصليح"), refund: fn("return.type.refund", "رد مبلغ"), other: fn("return.type.other", "أخرى") } as Record<string,string>)[t] ?? t; }
export function returnStatusAr(s: string, fn: any) { return ({ open: fn("return.status.open", "مفتوح"), in_cleaning: fn("return.status.in_cleaning", "في التنظيف"), in_ironing: fn("return.status.in_ironing", "في الكي"), in_packing: fn("return.status.in_packing", "في التغليف"), in_qc: fn("return.status.in_qc", "في الجودة"), ready_for_delivery: fn("return.status.ready_for_delivery", "جاهز للتسليم"), resolved: fn("return.status.resolved", "مغلق"), cancelled: fn("return.status.cancelled", "ملغي") } as Record<string,string>)[s] ?? s; }

const STATUS_AR: Record<string, string> = {
  received: "دخل الاستقبال",
  cleaning: "دخل الغسيل",
  ironing: "دخل الكي",
  packing: "دخل التغليف",
  ready: "جاهز للتسليم",
  out_for_delivery: "خرج للتسليم",
  delivered: "تم التسليم",
  cancelled: "تم الإلغاء",
};

export function OrderTimeline({
  order, units, historyRows, pickupRows, cancelRows, qcRows, operationRows, attachmentRows, cashRows, journalRows, messageRows, employeeLedgerRows, customerReturnRows,
}: {
  order: any;
  units: ServiceUnit[];
  historyRows: any[];
  pickupRows: any[];
  cancelRows: any[];
  qcRows: any[];
  operationRows: any[];
  attachmentRows: any[];
  cashRows: any[];
  journalRows: any[];
  messageRows: any[];
  employeeLedgerRows: any[];
  customerReturnRows: any[];
}) {
  const { t, language } = useI18n();
  const events: { at: string; title: string; detail: string; tone?: string; icon: React.ReactNode; href?: string; meta?: React.ReactNode }[] = [];
  const money = (v: any) => `${Number(v ?? 0).toLocaleString("en-US")} ${t("common.egp")}`;

  events.push({ at: order.created_at, title: "إنشاء الطلب", detail: `تم إنشاء الطلب #${order.order_number} للعميل ${order.customers?.full_name ?? ""}`, icon: <History className="w-4 h-4" /> });

  pickupRows.forEach((p) => {
    events.push({ at: p.created_at, title: "طلب استلام من العميل", detail: `${p.customer_name} — ${p.address}`, icon: <MapPin className="w-4 h-4" />, tone: "blue" });
    if (p.driver_employee_id) events.push({ at: p.updated_at ?? p.created_at, title: "تعيين مندوب للاستلام", detail: p.employees?.full_name ?? "مندوب", icon: <Truck className="w-4 h-4" />, tone: "blue" });
    if (p.picked_up_at) events.push({ at: p.picked_up_at, title: "المندوب استلم الطلب", detail: "دخل الطلب إلى رحلة التشغيل", icon: <CheckCircle2 className="w-4 h-4" />, tone: "ok" });
  });

  historyRows.forEach((h) => events.push({ at: h.created_at, title: t(`track.step.${h.to_status}`, STATUS_AR[h.to_status] ?? h.to_status), detail: h.notes ?? "تغيير حالة الطلب", icon: <ArrowRight className="w-4 h-4" />, tone: h.to_status === "cancelled" ? "bad" : undefined }));

  units.forEach((u) => {
    if (u.assigned_ironing_employee_id) events.push({ at: u.ironing_completed_at ?? order.updated_at ?? order.created_at, title: `توزيع كي ${u.label_code}`, detail: `${u.name} → ${u.employees?.full_name ?? "فني كي"}${u.ironing_completed_at ? " — تم الكي" : ""}`, icon: <Shirt className="w-4 h-4" />, tone: u.ironing_completed_at ? "ok" : "blue" });
    if (u.needs_reclean || u.reclean_reason) events.push({ at: u.reclean_reported_at ?? order.updated_at ?? order.created_at, title: `مرتجع تنظيف ${u.label_code}`, detail: `${u.name} — ${u.reclean_reason ?? "رجوع للتنظيف"}`, icon: <RotateCcw className="w-4 h-4" />, tone: u.needs_reclean ? "bad" : "amber" });
    if ((u as any).label_status && (u as any).label_status !== "labeled") events.push({ at: order.updated_at ?? order.created_at, title: `مشكلة ليبل ${u.label_code}`, detail: `${u.name} — ${(u as any).label_status}`, icon: <AlertTriangle className="w-4 h-4" />, tone: "bad" });
  });

  qcRows.forEach((q) => events.push({ at: q.checked_at, title: q.result === "passed" ? "اعتماد جودة" : "مشكلة جودة", detail: `${q.service_units?.label_code ?? "قطعة"} — ${q.notes ?? q.result}`, icon: <ShieldCheck className="w-4 h-4" />, tone: q.result === "passed" ? "ok" : "bad" }));

  attachmentRows.forEach((a) => events.push({
    at: a.created_at,
    title: a.label ?? "مرفق على الطلب",
    detail: a.url,
    icon: <ImageIcon className="w-4 h-4" />,
    tone: String(a.label ?? "").includes("دفع") || String(a.label ?? "").includes("InstaPay") ? "ok" : "blue",
    href: a.url,
    meta: a.url ? <a href={a.url} target="_blank" rel="noreferrer" className="text-xs underline text-teal-700">عرض المستند</a> : null,
  }));

  if (order.payment_proof_url && !attachmentRows.some((a) => a.url === order.payment_proof_url)) {
    events.push({ at: order.payment_proof_uploaded_at ?? order.payment_verified_at ?? order.updated_at ?? order.created_at, title: "صورة تحويل InstaPay", detail: order.payment_proof_url, icon: <ImageIcon className="w-4 h-4" />, tone: "ok", href: order.payment_proof_url, meta: <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs underline text-teal-700">عرض الإيصال</a> });
  }

  cashRows.forEach((c) => events.push({ at: c.happened_at, title: c.direction === "in" ? "حركة خزنة داخلة" : "حركة خزنة خارجة", detail: `${c.description} — ${money(c.amount)} — ${c.cash_accounts?.name ?? "خزنة"}`, icon: <CreditCard className="w-4 h-4" />, tone: c.status === "void" ? "bad" : "ok" }));

  journalRows.forEach((j) => events.push({
    at: j.created_at,
    title: `قيد محاسبي: ${j.source_type}`,
    detail: `${j.description} — ${j.status}`,
    icon: <Scale className="w-4 h-4" />,
    tone: j.status === "void" ? "bad" : "ok",
    meta: <div className="mt-1 space-y-1">{(j.journal_lines ?? []).map((l: any) => <div key={l.id} className="text-[11px] text-muted-foreground">{l.chart_accounts?.code} {l.chart_accounts?.name}: مدين {money(l.debit)} / دائن {money(l.credit)}</div>)}</div>,
  }));

  employeeLedgerRows.forEach((l) => events.push({ at: l.entry_at ?? l.created_at, title: `دفتر الموظف: ${l.employees?.full_name ?? "موظف"}`, detail: `${l.description} — ${money(l.amount)} — ${l.direction}`, icon: <Truck className="w-4 h-4" />, tone: "ok" }));

  customerReturnRows.forEach((r) => {
    events.push({ at: r.created_at, title: `مرتجع عميل: ${returnTypeAr(r.return_type, t)}`, detail: `${r.service_units?.label_code ?? "قطعة"} — ${r.reason} — ${returnStatusAr(r.status, t)}`, icon: <RotateCcw className="w-4 h-4" />, tone: r.status === "resolved" ? "ok" : "amber" });
    if (r.resolved_at) events.push({ at: r.resolved_at, title: "إغلاق مرتجع العميل", detail: `${r.service_units?.label_code ?? "قطعة"} — تم الحل`, icon: <CheckCircle2 className="w-4 h-4" />, tone: "ok" });
  });

  messageRows.forEach((m) => events.push({ at: m.sent_at ?? m.created_at, title: `رسالة عميل ${m.channel}`, detail: `${m.status}: ${m.message}`, icon: <Send className="w-4 h-4" />, tone: m.status === "failed" ? "bad" : m.status === "sent" ? "ok" : "amber" }));

  operationRows.forEach((op) => {
    events.push({ at: op.created_at, title: `APDO: ${op.process_name}`, detail: `${op.process_key} — تقرير: ${op.report_bucket ?? "—"}${op.cash_account_id ? ` — خزنة: ${op.cash_accounts?.name ?? "مربوطة"}` : ""}${op.journal_entry_id ? " — قيد مربوط" : ""}`, icon: <History className="w-4 h-4" />, tone: "blue" });
  });

  cancelRows.forEach((c) => events.push({ at: c.created_at, title: c.cancel_type === "order" ? "إلغاء طلب" : "إلغاء بند/قطعة", detail: c.reason, icon: <Trash2 className="w-4 h-4" />, tone: "bad" }));

  if (order.invoice_finalized_at) events.push({ at: order.invoice_finalized_at, title: "اعتماد الفاتورة", detail: `الإجمالي ${money(order.total)}${order.invoice_finalized_at ? " — تم الاعتماد" : ""}`, icon: <CreditCard className="w-4 h-4" />, tone: "ok" });
  if (order.payment_verified_at || order.payment_proof_uploaded_at) events.push({ at: order.payment_verified_at ?? order.payment_proof_uploaded_at, title: "تسجيل الدفع", detail: order.overpayment_amount > 0 ? `مدفوع ${money(order.customer_payment_amount ?? order.total)} مع زيادة ${money(order.overpayment_amount)}` : `تم تسجيل الدفع ${money(order.customer_payment_amount ?? order.total)}`, icon: <CreditCard className="w-4 h-4" />, tone: "ok" });
  if (order.delivered_at) events.push({ at: order.delivered_at, title: "تم التسليم النهائي", detail: "انتهت رحلة الطلب وتم التسليم للعميل", icon: <CheckCircle2 className="w-4 h-4" />, tone: "ok" });

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const cls = (tone?: string) => tone === "bad" ? "border-red-200 bg-red-50" : tone === "ok" ? "border-emerald-200 bg-emerald-50" : tone === "blue" ? "border-blue-200 bg-blue-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white";

  return <Card>
    <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4 text-teal-600" /> {t("order.timelineTitle")}</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {events.map((e, i) => <div key={i} className={`rounded-xl border p-3 flex items-start gap-3 ${cls(e.tone)}`}>
        <div className="mt-0.5 text-teal-700">{e.icon}</div>
        <div className="flex-1 min-w-0"><div className="font-black text-sm">{e.title}</div><div className="text-xs text-muted-foreground mt-0.5 break-words">{e.detail}</div>{e.meta}</div>
        <div className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(e.at).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}</div>
      </div>)}
    </CardContent>
  </Card>;
}
