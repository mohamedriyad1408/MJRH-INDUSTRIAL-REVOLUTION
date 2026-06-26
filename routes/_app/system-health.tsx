import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Wrench } from "lucide-react";
import { autoAssignDrivers } from "@/lib/driver-assignment";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_app/system-health")({
  head: () => ({ meta: [{ title: "فحص النظام" }] }),
  component: SystemHealthPage,
});

type Check = {
  key: string;
  title: string;
  count: number;
  okWhenZero?: boolean;
  href?: string;
  fix?: string;
  severity: "ok" | "warn" | "danger";
  details?: { label: string; sub?: string; href?: string }[];
  error?: string;
};

function severityFor(count: number, okWhenZero = false): "ok" | "warn" | "danger" {
  if (okWhenZero) return count === 0 ? "ok" : count > 5 ? "danger" : "warn";
  return count > 0 ? "ok" : "danger";
}

function SystemHealthPage() {
  const { hasRole, tenantId } = useAuth();
  const canUse = hasRole("owner", "ops_manager") || hasRole("super_admin");
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [apdoRows, setApdoRows] = useState<any[]>([]);
  const [apdoError, setApdoError] = useState<string | null>(null);

  async function load() {
    if (!canUse) return;
    setLoading(true);
    try {
      const [
        cash, chart, settings, employees, services, customers, orders, units, pickups, readyNoDriver,
        reclean, qcFailed, unpaidReady, invoiceReview, paymentReview, driversNoLocation,
        pickupsDetail, readyNoDriverDetail, recleanDetail, qcDetail, unpaidDetail, invoiceDetail, proofDetail, driversNoLocDetail,
      ] = await Promise.all([
        (supabase as any).from("cash_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("chart_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("app_settings").select("tenant_id", { count: "exact", head: true }),
        (supabase as any).from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("service_items").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("customers").select("id", { count: "exact", head: true }),
        (supabase as any).from("orders").select("id,status", { count: "exact" }).not("status", "eq", "cancelled").limit(500),
        (supabase as any).from("service_units").select("id,order_id,status,current_stage").limit(2000),
        (supabase as any).from("pickup_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "assigned"]),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "ready").is("assigned_driver_employee_id", null),
        (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("needs_reclean", true),
        (supabase as any).from("service_units").select("id", { count: "exact", head: true }).eq("current_stage", "qc_failed"),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid"),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("status", ["packing", "ready"]).is("invoice_finalized_at", null),
        (supabase as any).from("orders").select("id", { count: "exact", head: true }).in("payment_verification_status", ["pending_review", "underpaid"]),
        (supabase as any).from("employees").select("id", { count: "exact", head: true }).eq("job_role", "driver").eq("is_active", true).is("current_lat", null),
        (supabase as any).from("pickup_requests").select("id,customer_name,status,phone").in("status", ["pending", "assigned"]).limit(5),
        (supabase as any).from("orders").select("id,order_number,customers(full_name)").eq("status", "ready").is("assigned_driver_employee_id", null).limit(5),
        (supabase as any).from("service_units").select("id,label_code,name,order_id,reclean_reason,orders(order_number)").eq("needs_reclean", true).limit(5),
        (supabase as any).from("service_units").select("id,label_code,name,order_id,staff_notes,orders(order_number)").eq("current_stage", "qc_failed").limit(5),
        (supabase as any).from("orders").select("id,order_number,total,customers(full_name)").in("status", ["ready", "out_for_delivery"]).eq("payment_status", "unpaid").limit(5),
        (supabase as any).from("orders").select("id,order_number,status,customers(full_name)").in("status", ["packing", "ready"]).is("invoice_finalized_at", null).limit(5),
        (supabase as any).from("orders").select("id,order_number,payment_verification_status,total,customers(full_name)").in("payment_verification_status", ["pending_review", "underpaid"]).limit(5),
        (supabase as any).from("employees").select("id,full_name,phone").eq("job_role", "driver").eq("is_active", true).is("current_lat", null).limit(5),
      ]);

      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [ordersNoLocation, customersNoAddress, closingToday, oldPayables, stuckOrders, activeCashForClosing] = await Promise.all([
        (supabase as any).from("orders").select("id,order_number,delivery_address,customers(full_name)").eq("order_type", "delivery").not("status", "in", "(delivered,cancelled)").is("delivery_lat", null).limit(5),
        (supabase as any).from("customers").select("id,full_name,phone").is("address", null).limit(5),
        (supabase as any).from("daily_cash_closings").select("id", { count: "exact", head: true }).eq("closing_date", todayStr),
        (supabase as any).from("expenses").select("id,amount,description,due_at,spent_at").eq("status", "payable").lt("spent_at", todayStr).limit(5),
        (supabase as any).from("orders").select("id,order_number,status,updated_at,customers(full_name)").not("status", "in", "(delivered,cancelled)").lt("updated_at", yesterdayIso).limit(5),
        (supabase as any).from("cash_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const [cashHealth, journalEntries, manualCashTx, manualCashJournals, apdoMatrix] = await Promise.all([
        (supabase as any).from("v_cash_account_health").select("*").eq("is_active", true).order("updated_at", { ascending: false }),
        (supabase as any).from("journal_entries").select("id", { count: "exact", head: true }).neq("status", "void"),
        (supabase as any).from("cash_transactions").select("id,description,amount,direction,happened_at").is("source_type", null).eq("status", "posted").limit(200),
        (supabase as any).from("journal_entries").select("source_id").eq("source_type", "manual_cash_transaction").neq("status", "void").limit(500),
        (supabase as any).from("operation_answer_matrix").select("*").order("created_at", { ascending: false }).limit(80).then((r: any) => r).catch((e: any) => ({ data: [], error: e })),
      ]);

      const activeOrders = orders.data ?? [];
      const activeUnits = (units.data ?? []).filter((u: any) => u.status !== "cancelled" && u.current_stage !== "cancelled");
      const orderIdsWithPieces = new Set(activeUnits.map((u: any) => u.order_id));
      const noPieces = activeOrders.filter((o: any) => !orderIdsWithPieces.has(o.id)).length;

      const noPieceDetails = activeOrders
        .filter((o: any) => !orderIdsWithPieces.has(o.id))
        .slice(0, 5)
        .map((o: any) => ({ label: `طلب #${o.order_number ?? o.id.slice(0, 6)}`, sub: "لا توجد قطع", href: `/orders/${o.id}` }));
      const pickupDetails = (pickupsDetail.data ?? []).map((p: any) => ({ label: p.customer_name, sub: p.status === "pending" ? "بانتظار مندوب" : "مندوب في الطريق", href: "/live-map" }));
      const readyNoDriverDetails = (readyNoDriverDetail.data ?? []).map((o: any) => ({ label: `طلب #${o.order_number}`, sub: o.customers?.full_name ?? "جاهز بلا مندوب", href: "/live-map" }));
      const recleanDetails = (recleanDetail.data ?? []).map((u: any) => ({ label: `${u.label_code} — ${u.name}`, sub: `طلب #${u.orders?.order_number ?? "?"} — ${u.reclean_reason ?? "مرتجع"}`, href: `/orders/${u.order_id}` }));
      const qcDetails = (qcDetail.data ?? []).map((u: any) => ({ label: `${u.label_code} — ${u.name}`, sub: `طلب #${u.orders?.order_number ?? "?"}`, href: `/orders/${u.order_id}` }));
      const unpaidDetails = (unpaidDetail.data ?? []).map((o: any) => ({ label: `طلب #${o.order_number}`, sub: `${o.customers?.full_name ?? "عميل"} — ${Number(o.total ?? 0).toLocaleString("en-US")} جنيه`, href: `/orders/${o.id}` }));
      const invoiceDetails = (invoiceDetail.data ?? []).map((o: any) => ({ label: `طلب #${o.order_number}`, sub: `${o.customers?.full_name ?? "عميل"} — ${o.status}`, href: `/orders/${o.id}` }));
      const proofDetails = (proofDetail.data ?? []).map((o: any) => ({ label: `طلب #${o.order_number}`, sub: o.payment_verification_status === "underpaid" ? "المبلغ أقل من المطلوب" : "قيد المراجعة", href: `/orders/${o.id}` }));
      const driverNoLocDetails = (driversNoLocDetail.data ?? []).map((d: any) => ({ label: d.full_name, sub: d.phone ?? "لم يحدث موقعه", href: "/driver" }));
      const orderNoLocationDetails = (ordersNoLocation.data ?? []).map((o: any) => ({ label: `طلب #${o.order_number}`, sub: o.delivery_address || o.customers?.full_name || "بلا موقع", href: `/orders/${o.id}` }));
      const customersNoAddressDetails = (customersNoAddress.data ?? []).map((c: any) => ({ label: c.full_name, sub: c.phone || "لا يوجد عنوان", href: "/customers" }));
      const oldPayablesDetails = (oldPayables.data ?? []).map((e: any) => ({ label: e.description || "مصروف آجل", sub: `${Number(e.amount ?? 0).toLocaleString("en-US")} جنيه`, href: "/accounting" }));
      const stuckOrderDetails = (stuckOrders.data ?? []).map((o: any) => ({ label: `طلب #${o.order_number}`, sub: `${o.customers?.full_name ?? "عميل"} — واقف في ${o.status}`, href: `/orders/${o.id}` }));

      const cashRows = cashHealth.data ?? [];
      const cashMismatchRows = cashRows.filter((c: any) => Math.abs(Number(c.balance_difference ?? 0)) >= 0.01);
      const cashHealthDetails = cashRows.slice(0, 5).map((c: any) => ({
        label: c.name,
        sub: `الرصيد: ${fmtMoney(c.current_balance)} — المتوقع: ${fmtMoney(c.expected_balance)} — حركات: ${c.posted_transactions_count ?? 0}`,
        href: "/accounting",
      }));
      const cashMismatchDetails = cashMismatchRows.slice(0, 5).map((c: any) => ({
        label: c.name,
        sub: `فرق ${fmtMoney(c.balance_difference)} بين الرصيد والحركات المسجلة`,
        href: "/accounting",
      }));
      const manualJournalIds = new Set((manualCashJournals.data ?? []).map((j: any) => j.source_id).filter(Boolean));
      const manualWithoutJournal = (manualCashTx.data ?? []).filter((t: any) => !manualJournalIds.has(t.id));
      const manualWithoutJournalDetails = manualWithoutJournal.slice(0, 5).map((t: any) => ({
        label: t.description || "حركة خزنة يدوية",
        sub: `${t.direction === "in" ? "داخل" : "خارج"} — ${fmtMoney(t.amount)} — ${fmtDate(t.happened_at)}`,
        href: "/accounting",
      }));

      const apdoData = apdoMatrix.data ?? [];
      const apdoIncomplete = apdoData.filter((r: any) => r.branch_answer !== "answered" || r.cash_answer === "missing_cash_account" || r.journal_answer === "missing_journal" || r.report_answer !== "answered" || r.notification_answer === "missing_notification");
      setApdoRows(apdoIncomplete.slice(0, 12));
      setApdoError(apdoMatrix.error?.message ?? null);

      const responses = [cash, chart, settings, employees, services, customers, orders, units, pickups, readyNoDriver, reclean, qcFailed, unpaidReady, invoiceReview, paymentReview, driversNoLocation, ordersNoLocation, customersNoAddress, closingToday, oldPayables, stuckOrders, cashHealth, journalEntries, manualCashTx, manualCashJournals, apdoMatrix];
      const errors = responses.map((r: any) => r?.error?.message).filter(Boolean);
      setDiagnostics([...new Set(errors)].slice(0, 6));

      const next: Check[] = [
        { key: "settings", title: "إعدادات المغسلة", count: settings.count ?? 0, severity: severityFor(settings.count ?? 0), href: "/settings", fix: "يتم إنشاؤها تلقائيًا عند فتح مغسلة جديدة" },
        { key: "cash", title: "الخزن والحسابات النقدية", count: cashRows.length || cash.count || 0, severity: cashHealth.error ? "danger" : severityFor(cashRows.length || cash.count || 0), href: "/accounting", fix: cashHealth.error ? "فشل قراءة صحة الخزنة؛ اضغط إصلاح الأساسيات ثم حدّث" : "لا يكفي وجود الخزنة؛ يظهر هنا رصيدها وحركاتها للتأكد أنها تعمل", details: cashHealthDetails, error: cashHealth.error?.message },
        { key: "chart", title: "شجرة الحسابات موجودة", count: chart.count ?? 0, severity: chart.error ? "danger" : (chart.count ?? 0) >= 8 ? "ok" : "danger", href: "/ledger", fix: chart.error ? "فشل قراءة شجرة الحسابات؛ اضغط إصلاح الأساسيات" : "اضغط إصلاح الأساسيات لإنشاء الحسابات", error: chart.error?.message },
        { key: "cashBalanceIntegrity", title: "اتزان أرصدة الخزن", count: cashMismatchRows.length, okWhenZero: true, severity: cashHealth.error ? "danger" : severityFor(cashMismatchRows.length, true), href: "/accounting", fix: cashMismatchRows.length ? "الرصيد الظاهر لا يساوي مجموع الحركات؛ اضغط إصلاح سريع لإعادة الحساب" : "أرصدة الخزن مطابقة للحركات المسجلة", details: cashMismatchDetails, error: cashHealth.error?.message },
        { key: "journal", title: "القيود المحاسبية تعمل", count: journalEntries.count ?? 0, severity: journalEntries.error ? "danger" : (chart.count ?? 0) >= 8 ? "ok" : "warn", href: "/ledger", fix: journalEntries.error ? "فشل قراءة القيود" : "أي دخل/خرج أو دفع أو مصروف يجب أن يظهر هنا كقيد", error: journalEntries.error?.message },
        { key: "manualNoJournal", title: "حركات خزنة بلا قيد", count: manualWithoutJournal.length, okWhenZero: true, severity: manualCashTx.error || manualCashJournals.error ? "danger" : severityFor(manualWithoutJournal.length, true), href: "/ledger", fix: manualWithoutJournal.length ? "اضغط إصلاح سريع لإنشاء قيود للحركات اليدوية القديمة" : "كل حركة خزنة يدوية لها قيد محاسبي", details: manualWithoutJournalDetails, error: manualCashTx.error?.message || manualCashJournals.error?.message },
        { key: "employees", title: "موظفون نشطون", count: employees.count ?? 0, severity: severityFor(employees.count ?? 0), href: "/staff", fix: "أضف موظفين وحدد المحطة والراتب" },
        { key: "services", title: "خدمات مفعلة", count: services.count ?? 0, severity: severityFor(services.count ?? 0), href: "/services", fix: "أضف كتالوج الخدمات قبل إنشاء الطلبات" },
        { key: "customers", title: "عملاء مسجلون", count: customers.count ?? 0, severity: (customers.count ?? 0) > 0 ? "ok" : "warn", href: "/customers", fix: "أضف عميل أو استخدم بوابة العميل" },
        { key: "noPieces", title: "طلبات بلا قطع", count: noPieces, okWhenZero: true, severity: severityFor(noPieces, true), href: "/orders", fix: "افتح الطلب وسجل القطع", details: noPieceDetails },
        { key: "pickups", title: "استلامات مفتوحة", count: pickups.count ?? 0, okWhenZero: true, severity: (pickups.count ?? 0) ? "warn" : "ok", href: "/live-map", fix: "وزعها على مندوبين من الخريطة", details: pickupDetails },
        { key: "readyNoDriver", title: "طلبات جاهزة بلا مندوب", count: readyNoDriver.count ?? 0, okWhenZero: true, severity: severityFor(readyNoDriver.count ?? 0, true), href: "/live-map", fix: "عين مندوب قبل خروج الطلب للتسليم", details: readyNoDriverDetails },
        { key: "reclean", title: "مرتجعات غسيل مفتوحة", count: reclean.count ?? 0, okWhenZero: true, severity: severityFor(reclean.count ?? 0, true), href: "/stations/cleaning", fix: "أنه المرتجع من محطة الغسيل", details: recleanDetails },
        { key: "qc", title: "مشاكل جودة مفتوحة", count: qcFailed.count ?? 0, okWhenZero: true, severity: severityFor(qcFailed.count ?? 0, true), href: "/stations/qc", fix: "راجع قرار الجودة وتواصل مع العميل عند الحاجة", details: qcDetails },
        { key: "unpaid", title: "جاهز أو خارج وغير مدفوع", count: unpaidReady.count ?? 0, okWhenZero: true, severity: severityFor(unpaidReady.count ?? 0, true), href: "/receivables", fix: "حصّل أو راجع ذمم العملاء", details: unpaidDetails },
        { key: "invoice", title: "فواتير تحتاج اعتماد", count: invoiceReview.count ?? 0, okWhenZero: true, severity: (invoiceReview.count ?? 0) ? "warn" : "ok", href: "/orders", fix: "راجع الطلب واضغط تأكيد وإشعار", details: invoiceDetails },
        { key: "proof", title: "إيصالات دفع تحتاج مراجعة", count: paymentReview.count ?? 0, okWhenZero: true, severity: severityFor(paymentReview.count ?? 0, true), href: "/orders", fix: "راجع صورة الإيصال والمبلغ", details: proofDetails },
        { key: "driverLocation", title: "مندوبون بلا موقع", count: driversNoLocation.count ?? 0, okWhenZero: true, severity: (driversNoLocation.count ?? 0) ? "warn" : "ok", href: "/driver", fix: "اطلب من المندوب الضغط على زر موقعي", details: driverNoLocDetails },
        { key: "ordersNoLocation", title: "طلبات توصيل بلا موقع", count: ordersNoLocation.data?.length ?? 0, okWhenZero: true, severity: (ordersNoLocation.data?.length ?? 0) ? "warn" : "ok", href: "/live-map", fix: "افتح الطلب وسجل موقع التسليم أو عنوان واضح", details: orderNoLocationDetails },
        { key: "customersNoAddress", title: "عملاء بلا عنوان", count: customersNoAddress.data?.length ?? 0, okWhenZero: true, severity: (customersNoAddress.data?.length ?? 0) ? "warn" : "ok", href: "/customers", fix: "أكمل عنوان العميل حتى تظهر الطلبات على الخريطة", details: customersNoAddressDetails },
        { key: "cashClosing", title: "إقفال كل خزن اليوم", count: closingToday.count ?? 0, severity: (activeCashForClosing.count ?? 0) > 0 && (closingToday.count ?? 0) >= (activeCashForClosing.count ?? 0) ? "ok" : "warn", href: "/cash-closing", fix: (activeCashForClosing.count ?? 0) > 0 && (closingToday.count ?? 0) >= (activeCashForClosing.count ?? 0) ? `تم إقفال كل الخزن اليوم (${closingToday.count}/${activeCashForClosing.count})` : `المقفول ${closingToday.count ?? 0} من ${activeCashForClosing.count ?? 0}. افتح إقفال الخزن واقفل الكل في حركة واحدة` },
        { key: "oldPayables", title: "مصروفات آجلة قديمة", count: oldPayables.data?.length ?? 0, okWhenZero: true, severity: (oldPayables.data?.length ?? 0) ? "warn" : "ok", href: "/accounting", fix: "راجع المصروفات الآجلة القديمة وادفعها أو ألغيها بسبب", details: oldPayablesDetails },
        { key: "stuckOrders", title: "طلبات واقفة أكثر من يوم", count: stuckOrders.data?.length ?? 0, okWhenZero: true, severity: (stuckOrders.data?.length ?? 0) ? "warn" : "ok", href: "/orders", fix: "افتح الطلب لمعرفة سبب التوقف والخطوة التالية", details: stuckOrderDetails },
        { key: "apdo", title: "اكتمال APDO للعمليات", count: apdoIncomplete.length, okWhenZero: true, severity: apdoMatrix.error ? "warn" : severityFor(apdoIncomplete.length, true), href: "/system-health", fix: apdoMatrix.error ? "طبّق migration الخاص بـ APDO حتى تظهر مصفوفة الإجابات" : (apdoIncomplete.length ? "فيه عمليات لا تجيب على الفرع/الخزنة/القيد/التقرير/الإشعار بالكامل" : "كل العمليات المسجلة تجيب على الأسئلة الخمسة"), details: apdoIncomplete.slice(0, 5).map((r: any) => ({ label: r.process_name, sub: `${r.branch_answer} · ${r.cash_answer} · ${r.journal_answer} · ${r.report_answer} · ${r.notification_answer}` })), error: apdoMatrix.error?.message },
      ];
      setChecks(next);
    } finally {
      setLoading(false);
    }
  }

  async function repairBasics() {
    setRepairing(true);
    const today = new Date().toISOString().slice(0, 10);
    const errs: string[] = [];
    const r1 = await (supabase as any).rpc("ensure_default_cash_account"); if (r1.error) errs.push(r1.error.message);
    const r2 = await (supabase as any).rpc("ensure_default_chart_accounts"); if (r2.error) errs.push(r2.error.message);
    const r3 = await (supabase as any).rpc("sync_monthly_payroll_payables", { _month: today }); if (r3.error) errs.push(r3.error.message);
    const r4 = await (supabase as any).rpc("repair_cash_account_balances"); if (r4.error) errs.push(r4.error.message);
    const r5 = await (supabase as any).rpc("sync_manual_cash_transactions_journals"); if (r5.error) errs.push(r5.error.message);
    try { await autoAssignDrivers(); } catch (e: any) { /* no drivers or no tasks: ignore */ }
    setRepairing(false);
    if (errs.length) toast.error(errs.join(" | ")); else toast.success("تم إصلاح الأساسيات: خزنة، حسابات، أرصدة، قيود يدوية، ورواتب الشهر");
    load();
  }

  async function fixCheck(key: string) {
    setFixingKey(key);
    try {
      if (["cash", "chart", "settings", "employees", "cashBalanceIntegrity", "manualNoJournal", "journal"].includes(key)) {
        await repairBasics();
        return;
      }
      if (["pickups", "readyNoDriver"].includes(key)) {
        const r = await autoAssignDrivers();
        toast.success(r.assigned ? `تم توزيع ${r.assigned} مهمة على المناديب` : "لا توجد مهام قابلة للتوزيع الآن");
      } else if (key === "driverLocation") {
        toast.info("الإصلاح هنا من جهاز المندوب: يفتح لوحة السائق ويضغط زر موقعي");
      } else if (key === "cashClosing") {
        toast.info("افتح صفحة إقفال الخزنة واكتب النقدية الموجودة فعليًا");
      } else {
        toast.info("هذا البند يحتاج مراجعة يدوية من الصفحة المرتبطة به");
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "تعذر تنفيذ الإصلاح");
    } finally {
      setFixingKey(null);
    }
  }

  async function createDailySystemReport() {
    const danger = checks.filter((c) => c.severity === "danger");
    const warn = checks.filter((c) => c.severity === "warn");
    const ok = checks.filter((c) => c.severity === "ok");
    const lines = [
      `تقرير فحص النظام اليومي`,
      `مشاكل حرجة: ${danger.length}`,
      `تنبيهات: ${warn.length}`,
      `بنود سليمة: ${ok.length}`,
      "",
      ...danger.map((c) => `❌ ${c.title}: ${c.count} — ${c.fix}`),
      ...warn.map((c) => `⚠️ ${c.title}: ${c.count} — ${c.fix}`),
    ];
    const body = lines.join("\n");
    const { error } = await (supabase as any).from("app_notifications").insert({
      audience: "owner",
      title: "تقرير فحص النظام اليومي",
      body,
      href: "/system-health",
      tone: danger.length ? "danger" : warn.length ? "warning" : "success",
    });
    if (error) toast.error(error.message);
    else toast.success("تم حفظ تقرير فحص النظام في جرس التنبيهات");
  }

  useEffect(() => { load(); }, [canUse]);

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">فحص النظام للمالك ومدير التشغيل فقط.</CardContent></Card>;

  const danger = checks.filter((c) => c.severity === "danger").length;
  const warn = checks.filter((c) => c.severity === "warn").length;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck className="w-7 h-7 text-teal-600" /> فحص النظام</h1>
        <p className="text-sm text-muted-foreground">مراجعة سريعة لكل أساسيات المغسلة والرحلة التشغيلية. لو فيه مشكلة، اضغط عليها لتذهب لمكان الإصلاح.</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}>تحديث</Button><Button variant="outline" onClick={createDailySystemReport}>حفظ تقرير اليوم</Button><Button onClick={repairBasics} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Wrench className="w-4 h-4 ms-1" />}إصلاح الأساسيات</Button></div>
    </div>

    <div className="grid md:grid-cols-3 gap-3">
      <Kpi title="مشاكل حرجة" value={danger} tone={danger ? "danger" : "ok"} />
      <Kpi title="تنبيهات" value={warn} tone={warn ? "warn" : "ok"} />
      <Kpi title="بنود الفحص" value={checks.length} tone="ok" />
    </div>



    {!loading && <Card className={apdoRows.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
      <CardHeader><CardTitle className="text-base">Actor → Process → Data → Output</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {apdoError ? <div className="text-amber-800">لم يتم تفعيل مصفوفة APDO بعد أو لم تُطبق الـ migration: {apdoError}</div> : apdoRows.length === 0 ? <div className="font-bold text-emerald-800">كل العمليات المسجلة مكتملة الإجابات الخمسة ✅</div> : <>
          <div className="font-bold text-amber-900">عمليات تحتاج استكمال ربط:</div>
          <div className="grid md:grid-cols-2 gap-2">{apdoRows.map((r) => <div key={r.id} className="rounded-xl border bg-white/70 p-3 text-xs">
            <div className="font-black">{r.process_name}</div>
            <div className="text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("ar-EG")} · {r.branch_name ?? "بلا فرع"}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant={r.branch_answer === "answered" ? "secondary" : "destructive"}>فرع: {answerAr(r.branch_answer)}</Badge>
              <Badge variant={["answered", "not_applicable"].includes(r.cash_answer) ? "secondary" : "destructive"}>خزنة: {answerAr(r.cash_answer)}</Badge>
              <Badge variant={["answered", "not_applicable"].includes(r.journal_answer) ? "secondary" : "destructive"}>قيد: {answerAr(r.journal_answer)}</Badge>
              <Badge variant={r.report_answer === "answered" ? "secondary" : "destructive"}>تقرير: {answerAr(r.report_answer)}</Badge>
              <Badge variant={["answered", "not_required"].includes(r.notification_answer) ? "secondary" : "destructive"}>إشعار: {answerAr(r.notification_answer)}</Badge>
            </div>
          </div>)}</div>
        </>}
      </CardContent>
    </Card>}

    {diagnostics.length > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-900 space-y-2">
      <div className="font-black">فيه استعلامات فشلت أثناء الفحص، لذلك أي رقم ظاهر ممكن يكون غير دقيق:</div>
      {diagnostics.map((d, i) => <div key={i} className="rounded-lg bg-white/70 border border-red-100 px-3 py-2 text-xs break-words">{d}</div>)}
      <div className="text-xs">اضغط <b>إصلاح الأساسيات</b> ثم <b>تحديث</b>. لو استمر الخطأ فالمشكلة في قاعدة البيانات أو الصلاحيات وليست في الواجهة.</div>
    </CardContent></Card>}

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="grid md:grid-cols-2 gap-3">
      {checks.map((c) => {
        const cls = c.severity === "danger" ? "border-red-200 bg-red-50" : c.severity === "warn" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";
        const canAutoFix = ["cash", "chart", "settings", "employees", "cashBalanceIntegrity", "manualNoJournal", "journal", "pickups", "readyNoDriver", "driverLocation", "cashClosing"].includes(c.key);
        return <Card key={c.key} className={cls}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2"><div className="font-black">{c.title}</div><Badge variant={c.severity === "danger" ? "destructive" : "secondary"}>{c.count}</Badge></div>
            <div className="text-xs text-muted-foreground">{c.fix}</div>
            {c.error && <div className="rounded-lg bg-white/70 border border-red-100 px-2 py-1 text-xs text-red-700 break-words">خطأ القراءة: {c.error}</div>}
            {c.details?.length ? <div className="space-y-1">{c.details.map((d, i) => {
              const row = <div className="rounded-lg bg-white/70 border px-2 py-1 text-xs"><div className="font-bold">{d.label}</div>{d.sub && <div className="text-muted-foreground">{d.sub}</div>}</div>;
              return d.href ? <Link key={i} to={d.href as any}>{row}</Link> : <div key={i}>{row}</div>;
            })}</div> : null}
            <div className="flex gap-2 pt-1">
              {c.href && <Button asChild size="sm" variant="outline"><Link to={c.href as any}>فتح مكان الإصلاح</Link></Button>}
              {canAutoFix && <Button size="sm" onClick={() => fixCheck(c.key)} disabled={fixingKey === c.key || repairing}>{fixingKey === c.key ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Wrench className="w-4 h-4 ms-1" />}إصلاح سريع</Button>}
            </div>
          </CardContent>
        </Card>;
      })}
    </div>}
  </div>;
}

function answerAr(s: string) {
  return ({ answered: "مكتمل", missing_branch: "ناقص", missing_cash_account: "ناقص", missing_journal: "ناقص", missing_report_bucket: "ناقص", missing_notification: "ناقص", not_applicable: "لا ينطبق", not_required: "غير مطلوب" } as Record<string, string>)[s] ?? s;
}

function Kpi({ title, value, tone }: { title: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "border-red-200 bg-red-50 text-red-800" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return <Card className={cls}><CardContent className="p-4"><div className="text-xs opacity-80">{title}</div><div className="text-3xl font-black mt-1">{value}</div></CardContent></Card>;
}
