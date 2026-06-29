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
import { whatsappLink } from "@/lib/rules/whatsapp";
import { interpolate, useI18n } from "@/lib/i18n";

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
  const { t, dir, language } = useI18n();
  const canUse = hasRole("owner", "ops_manager") || hasRole("super_admin");
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [apdoRows, setApdoRows] = useState<any[]>([]);
  const [apdoError, setApdoError] = useState<string | null>(null);
  const [tenantReady, setTenantReady] = useState<any | null>(null);
  const [financialAuditRows, setFinancialAuditRows] = useState<any[]>([]);
  const [deliveryBlockedRows, setDeliveryBlockedRows] = useState<any[]>([]);
  const [clientErrors, setClientErrors] = useState<any[]>([]);
  const [queuedMessages, setQueuedMessages] = useState<any[]>([]);

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
      const [ordersNoLocation, customersNoAddress, closingToday, oldPayables, stuckOrders, activeCashForClosing, tenantHealth] = await Promise.all([
        (supabase as any).from("orders").select("id,order_number,delivery_address,customers(full_name)").eq("order_type", "delivery").not("status", "in", "(delivered,cancelled)").is("delivery_lat", null).limit(5),
        (supabase as any).from("customers").select("id,full_name,phone").is("address", null).limit(5),
        (supabase as any).from("daily_cash_closings").select("id", { count: "exact", head: true }).eq("closing_date", todayStr),
        (supabase as any).from("expenses").select("id,amount,description,due_at,spent_at").eq("status", "payable").lt("spent_at", todayStr).limit(5),
        (supabase as any).from("orders").select("id,order_number,status,updated_at,customers(full_name)").not("status", "in", "(delivered,cancelled)").lt("updated_at", yesterdayIso).limit(5),
        (supabase as any).from("cash_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
        tenantId ? (supabase as any).from("tenant_bootstrap_health").select("*").eq("tenant_id", tenantId).maybeSingle().then((r: any) => r).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);

      setTenantReady(tenantHealth.data ?? null);

      const [cashHealth, journalEntries, manualCashTx, manualCashJournals, apdoMatrix, financialAudit, labelIssues, deliveryReadiness] = await Promise.all([
        (supabase as any).from("v_cash_account_health").select("*").eq("is_active", true).order("updated_at", { ascending: false }),
        (supabase as any).from("journal_entries").select("id", { count: "exact", head: true }).neq("status", "void"),
        (supabase as any).from("cash_transactions").select("id,description,amount,direction,happened_at").is("source_type", null).eq("status", "posted").limit(200),
        (supabase as any).from("journal_entries").select("source_id").eq("source_type", "manual_cash_transaction").neq("status", "void").limit(500),
        (supabase as any).from("operation_answer_matrix").select("*").order("created_at", { ascending: false }).limit(80).then((r: any) => r).catch((e: any) => ({ data: [], error: e })),
        (supabase as any).from("financial_operation_audit").select("*").order("created_at", { ascending: false }).limit(80).then((r: any) => r).catch((e: any) => ({ data: [], error: e })),
        (supabase as any).from("service_units").select("id,label_code,name,order_id,label_status,orders(order_number)").in("label_status", ["missing_label", "unclear_label"]).limit(20).then((r: any) => r).catch((e: any) => ({ data: [], error: e })),
        (supabase as any).from("delivery_readiness_audit").select("*").eq("deliverable", false).order("updated_at", { ascending: false }).limit(40).then((r: any) => r).catch((e: any) => ({ data: [], error: e })),
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
      const financialRows = financialAudit.data ?? [];
      setFinancialAuditRows(financialRows.slice(0, 12));
      const deliveryRows = deliveryReadiness.data ?? [];
      setDeliveryBlockedRows(deliveryRows.slice(0, 12));

      const [errLogs, queuedMsgs] = await Promise.all([
        (supabase as any).from("client_error_logs").select("*").is("resolved_at", null).order("created_at", { ascending: false }).limit(12).then((r: any) => r).catch(() => ({ data: [] })),
        (supabase as any).from("customer_messages").select("*,customers(full_name),orders(order_number)").eq("channel", "whatsapp").eq("status", "queued").order("created_at", { ascending: false }).limit(20).then((r: any) => r).catch(() => ({ data: [] })),
      ]);
      setClientErrors(errLogs.data ?? []);
      setQueuedMessages(queuedMsgs.data ?? []);

      const responses = [cash, chart, settings, employees, services, customers, orders, units, pickups, readyNoDriver, reclean, qcFailed, unpaidReady, invoiceReview, paymentReview, driversNoLocation, ordersNoLocation, customersNoAddress, closingToday, oldPayables, stuckOrders, cashHealth, journalEntries, manualCashTx, manualCashJournals, apdoMatrix, financialAudit, labelIssues, deliveryReadiness, tenantHealth];
      const errors = responses.map((r: any) => r?.error?.message).filter(Boolean);
      setDiagnostics([...new Set(errors)].slice(0, 6));

      const next: Check[] = [
        { key: "tenantReady", title: t("system.check.tenantReady.title"), count: tenantHealth.data?.is_ready ? 0 : 1, okWhenZero: true, severity: tenantHealth.data?.is_ready ? "ok" : "danger", href: "/admin/tenants", fix: tenantHealth.data?.is_ready ? t("system.check.tenantReady.ready") : t("system.check.tenantReady.missing"), details: tenantHealth.data ? ["has_settings", "has_branch", "has_cash_account", "has_chart_accounts", "has_employee", "has_catalog"].filter((k) => !tenantHealth.data[k]).map((k) => ({ label: readinessAr(k), sub: "ناقص" })) : [] },
        { key: "settings", title: t("system.check.settings.title"), count: settings.count ?? 0, severity: severityFor(settings.count ?? 0), href: "/settings", fix: t("system.check.settings.fix") },
        { key: "cash", title: t("system.check.cash.title"), count: cashRows.length || cash.count || 0, severity: cashHealth.error ? "danger" : severityFor(cashRows.length || cash.count || 0), href: "/accounting", fix: cashHealth.error ? t("system.check.cash.fixError") : t("system.check.cash.fixOk"), details: cashHealthDetails, error: cashHealth.error?.message },
        { key: "chart", title: t("system.check.chart.title"), count: chart.count ?? 0, severity: chart.error ? "danger" : (chart.count ?? 0) >= 8 ? "ok" : "danger", href: "/ledger", fix: chart.error ? t("system.check.chart.error") : t("system.check.chart.fix"), error: chart.error?.message },
        { key: "cashBalanceIntegrity", title: t("system.check.cashBalance.title"), count: cashMismatchRows.length, okWhenZero: true, severity: cashHealth.error ? "danger" : severityFor(cashMismatchRows.length, true), href: "/accounting", fix: cashMismatchRows.length ? t("system.check.cashBalance.fix") : t("system.check.cashBalance.ok"), details: cashMismatchDetails, error: cashHealth.error?.message },
        { key: "journal", title: t("system.check.journal.title"), count: journalEntries.count ?? 0, severity: journalEntries.error ? "danger" : (chart.count ?? 0) >= 8 ? "ok" : "warn", href: "/ledger", fix: journalEntries.error ? t("system.check.journal.error") : t("system.check.journal.fix"), error: journalEntries.error?.message },
        { key: "manualNoJournal", title: t("system.check.manualNoJournal.title"), count: manualWithoutJournal.length, okWhenZero: true, severity: manualCashTx.error || manualCashJournals.error ? "danger" : severityFor(manualWithoutJournal.length, true), href: "/ledger", fix: manualWithoutJournal.length ? t("system.check.manualNoJournal.fix") : t("system.check.manualNoJournal.ok"), details: manualWithoutJournalDetails, error: manualCashTx.error?.message || manualCashJournals.error?.message },
        { key: "employees", title: t("system.check.employees.title"), count: employees.count ?? 0, severity: severityFor(employees.count ?? 0), href: "/staff", fix: t("system.check.employees.fix") },
        { key: "services", title: t("system.check.services.title"), count: services.count ?? 0, severity: severityFor(services.count ?? 0), href: "/services", fix: t("system.check.services.fix") },
        { key: "customers", title: t("system.check.customers.title"), count: customers.count ?? 0, severity: (customers.count ?? 0) > 0 ? "ok" : "warn", href: "/customers", fix: t("system.check.customers.fix") },
        { key: "noPieces", title: t("system.check.noPieces.title"), count: noPieces, okWhenZero: true, severity: severityFor(noPieces, true), href: "/orders", fix: t("system.check.noPieces.fix"), details: noPieceDetails },
        { key: "pickups", title: t("system.check.pickups.title"), count: pickups.count ?? 0, okWhenZero: true, severity: (pickups.count ?? 0) ? "warn" : "ok", href: "/live-map", fix: t("system.check.pickups.fix"), details: pickupDetails },
        { key: "readyNoDriver", title: t("system.check.readyNoDriver.title"), count: readyNoDriver.count ?? 0, okWhenZero: true, severity: severityFor(readyNoDriver.count ?? 0, true), href: "/live-map", fix: t("system.check.readyNoDriver.fix"), details: readyNoDriverDetails },
        { key: "deliveryReadiness", title: t("system.check.deliveryReadiness.title"), count: deliveryRows.length, okWhenZero: true, severity: deliveryReadiness.error ? "warn" : severityFor(deliveryRows.length, true), href: "/driver", fix: deliveryRows.length ? t("system.check.deliveryReadiness.fix") : t("system.check.deliveryReadiness.ok"), details: deliveryRows.slice(0, 5).map((r: any) => ({ label: `طلب #${r.order_number}`, sub: deliveryIssuesAr(r.issue_codes), href: `/orders/${r.order_id}` })), error: deliveryReadiness.error?.message },
        { key: "reclean", title: t("system.check.reclean.title"), count: reclean.count ?? 0, okWhenZero: true, severity: severityFor(reclean.count ?? 0, true), href: "/stations/cleaning", fix: t("system.check.reclean.fix"), details: recleanDetails },
        { key: "labelIssues", title: t("system.check.labelIssues.title"), count: labelIssues.data?.length ?? 0, okWhenZero: true, severity: (labelIssues.data?.length ?? 0) ? "danger" : "ok", href: "/stations/drying-assembly", fix: t("system.check.labelIssues.fix"), details: (labelIssues.data ?? []).slice(0,5).map((u: any) => ({ label: `${u.label_code} — ${u.name}`, sub: `طلب #${u.orders?.order_number ?? "?"} — ${u.label_status}`, href: "/stations/drying-assembly" })), error: labelIssues.error?.message },
        { key: "qc", title: t("system.check.qc.title"), count: qcFailed.count ?? 0, okWhenZero: true, severity: severityFor(qcFailed.count ?? 0, true), href: "/stations/qc", fix: t("system.check.qc.fix"), details: qcDetails },
        { key: "unpaid", title: t("system.check.unpaid.title"), count: unpaidReady.count ?? 0, okWhenZero: true, severity: severityFor(unpaidReady.count ?? 0, true), href: "/receivables", fix: t("system.check.unpaid.fix"), details: unpaidDetails },
        { key: "invoice", title: t("system.check.invoice.title"), count: invoiceReview.count ?? 0, okWhenZero: true, severity: (invoiceReview.count ?? 0) ? "warn" : "ok", href: "/orders", fix: t("system.check.invoice.fix"), details: invoiceDetails },
        { key: "proof", title: t("system.check.proof.title"), count: paymentReview.count ?? 0, okWhenZero: true, severity: severityFor(paymentReview.count ?? 0, true), href: "/orders", fix: t("system.check.proof.fix"), details: proofDetails },
        { key: "driverLocation", title: t("system.check.driverLocation.title"), count: driversNoLocation.count ?? 0, okWhenZero: true, severity: (driversNoLocation.count ?? 0) ? "warn" : "ok", href: "/driver", fix: t("system.check.driverLocation.fix"), details: driverNoLocDetails },
        { key: "ordersNoLocation", title: t("system.check.ordersNoLocation.title"), count: ordersNoLocation.data?.length ?? 0, okWhenZero: true, severity: (ordersNoLocation.data?.length ?? 0) ? "warn" : "ok", href: "/live-map", fix: t("system.check.ordersNoLocation.fix"), details: orderNoLocationDetails },
        { key: "customersNoAddress", title: t("system.check.customersNoAddress.title"), count: customersNoAddress.data?.length ?? 0, okWhenZero: true, severity: (customersNoAddress.data?.length ?? 0) ? "warn" : "ok", href: "/customers", fix: t("system.check.customersNoAddress.fix"), details: customersNoAddressDetails },
        { key: "cashClosing", title: t("system.check.cashClosing.title"), count: closingToday.count ?? 0, severity: (activeCashForClosing.count ?? 0) > 0 && (closingToday.count ?? 0) >= (activeCashForClosing.count ?? 0) ? "ok" : "warn", href: "/cash-closing", fix: (activeCashForClosing.count ?? 0) > 0 && (closingToday.count ?? 0) >= (activeCashForClosing.count ?? 0) ? `${t("system.check.cashClosing.ok")} (${closingToday.count}/${activeCashForClosing.count})` : `${closingToday.count ?? 0}/${activeCashForClosing.count ?? 0}. ${t("system.check.cashClosing.fix")}` },
        { key: "oldPayables", title: t("system.check.oldPayables.title"), count: oldPayables.data?.length ?? 0, okWhenZero: true, severity: (oldPayables.data?.length ?? 0) ? "warn" : "ok", href: "/accounting", fix: t("system.check.oldPayables.fix"), details: oldPayablesDetails },
        { key: "stuckOrders", title: t("system.check.stuckOrders.title"), count: stuckOrders.data?.length ?? 0, okWhenZero: true, severity: (stuckOrders.data?.length ?? 0) ? "warn" : "ok", href: "/orders", fix: t("system.check.stuckOrders.fix"), details: stuckOrderDetails },
        { key: "financialAudit", title: t("system.check.financialAudit.title"), count: financialRows.length, okWhenZero: true, severity: financialAudit.error ? "warn" : (financialRows.some((r: any) => r.severity === "danger") ? "danger" : severityFor(financialRows.length, true)), href: "/accounting", fix: financialAudit.error ? t("system.check.financialAudit.migration") : (financialRows.length ? t("system.check.financialAudit.fix") : t("system.check.financialAudit.ok")), details: financialRows.slice(0, 5).map((r: any) => ({ label: r.title, sub: r.detail, href: safeFixHref(r.href) })), error: financialAudit.error?.message },
        { key: "apdo", title: t("system.check.apdo.title"), count: apdoIncomplete.length, okWhenZero: true, severity: apdoMatrix.error ? "warn" : severityFor(apdoIncomplete.length, true), href: "/system-health", fix: apdoMatrix.error ? t("system.check.apdo.migration") : (apdoIncomplete.length ? t("system.check.apdo.fix") : t("system.check.apdo.ok")), details: apdoIncomplete.slice(0, 5).map((r: any) => ({ label: r.process_name, sub: `${r.branch_answer} · ${r.cash_answer} · ${r.journal_answer} · ${r.report_answer} · ${r.notification_answer}` })), error: apdoMatrix.error?.message },
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
    if (errs.length) toast.error(errs.join(" | ")); else toast.success(t("system.toast.basicsDone"));
    load();
  }

  async function repairActionableIssues() {
    setRepairing(true);
    const errs: string[] = [];
    const notes: string[] = [];
    try {
      const today = new Date().toISOString().slice(0, 10);
      const calls: Array<[string, Promise<any>]> = [
        ["تجهيز الخزنة", (supabase as any).rpc("ensure_default_cash_account")],
        ["تجهيز شجرة الحسابات", (supabase as any).rpc("ensure_default_chart_accounts")],
        ["مزامنة رواتب الشهر", (supabase as any).rpc("sync_monthly_payroll_payables", { _month: today })],
        ["إصلاح أرصدة الخزن", (supabase as any).rpc("repair_cash_account_balances")],
        ["إصلاح قيود حركات الخزنة", (supabase as any).rpc("sync_manual_cash_transactions_journals")],
      ];
      for (const [label, promise] of calls) {
        const r = await promise;
        if (r.error) errs.push(`${label}: ${r.error.message}`);
        else notes.push(label);
      }

      if (tenantId) {
        const finance = await (supabase as any).rpc("repair_financial_operation_audit", { _tenant_id: tenantId, _max_items: 200 });
        if (finance.error) errs.push(`المراجعة المالية: ${finance.error.message}`);
        else notes.push(`المراجعة المالية: أصلح ${finance.data?.fixed ?? 0} والمتبقي ${finance.data?.remaining ?? 0}`);

        const apdo = await (supabase as any).rpc("repair_operation_events_apdo", { _tenant_id: tenantId, _max_items: 300 });
        if (apdo.error) errs.push(`إصلاح APDO: ${apdo.error.message}`);
        else notes.push(`APDO: أصلح ${apdo.data?.fixed ?? 0}`);

        const alerts = await (supabase as any).rpc("generate_smart_operational_alerts", { _tenant_id: tenantId });
        if (alerts.error) errs.push(`التنبيهات الذكية: ${alerts.error.message}`);
        else notes.push(`التنبيهات الذكية: ${alerts.data ?? 0}`);
      }

      try {
        const assigned = await autoAssignDrivers();
        notes.push(assigned.assigned ? `توزيع المناديب: ${assigned.assigned}` : "توزيع المناديب: لا توجد مهام قابلة للتوزيع");
      } catch (e: any) {
        // Not every tenant has drivers/tasks; show as note, not fatal.
        notes.push(`توزيع المناديب: ${e?.message ?? "غير متاح الآن"}`);
      }

      await load();
      if (errs.length) {
        toast.error(`${t("system.toast.someErrors")} ${errs.slice(0, 3).join(" | ")}`);
      } else {
        toast.success(`${t("system.toast.actionableDone")} ${notes.slice(0, 3).join(" · ")}`);
      }
    } finally {
      setRepairing(false);
    }
  }

  async function fixCheck(key: string) {
    setFixingKey(key);
    try {
      if (["cash", "chart", "settings", "employees", "cashBalanceIntegrity", "manualNoJournal", "journal"].includes(key)) {
        await repairBasics();
        return;
      }
      if (key === "financialAudit") {
        const { data, error } = await (supabase as any).rpc("repair_financial_operation_audit", { _tenant_id: tenantId, _max_items: 100 });
        if (error) toast.error(error.message); else toast.success(interpolate(t("notif.financeRepairDone"), { fixed: data?.fixed ?? 0, remaining: data?.remaining ?? 0 }));
        await load();
        return;
      }
      if (["pickups", "readyNoDriver"].includes(key)) {
        const r = await autoAssignDrivers();
        toast.success(r.assigned ? interpolate(t("notif.assignDriversDone"), { assigned: r.assigned, drivers: "" }) : t("notif.noAssignableTasks"));
      } else if (key === "driverLocation") {
        toast.info(t("system.toast.driverLocationManual"));
      } else if (key === "cashClosing") {
        toast.info(t("system.toast.cashClosingManual"));
      } else {
        toast.info(t("system.toast.manualReview"));
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? t("system.toast.fixFailed"));
    } finally {
      setFixingKey(null);
    }
  }

  async function repairApdoEvent(id: string) {
    setFixingKey(id);
    try {
      const { data, error } = await (supabase as any).rpc("repair_operation_event_apdo", { _event_id: id });
      if (error) throw error;
      const fixed = Array.isArray(data?.fixed) ? data.fixed.join("، ") : "";
      toast.success(fixed ? `${t("system.toast.apdoFixed")} ${fixed}` : t("system.toast.apdoAttempted"));
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? t("system.toast.apdoFailed"));
    } finally {
      setFixingKey(null);
    }
  }

  function apdoHref(r: any) {
    if (r.source_type === "order" && r.source_id) return `/orders/${r.source_id}`;
    if (r.source_type === "service_unit" && r.data?.order_id) return `/orders/${r.data.order_id}`;
    if (["expense", "payroll_line", "payroll_payment", "employee_advance", "manual_cash_transaction", "cash_transfer", "cash_account"].includes(r.source_type)) return "/accounting";
    if (["inventory_item", "inventory_movement"].includes(r.source_type)) return "/inventory";
    if (r.source_type === "pickup_request") return "/live-map";
    return "/system-health";
  }

  async function markWhatsAppSent(row: any) {
    const { error } = await (supabase as any).from("customer_messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success(t("system.toast.msgSent")); load(); }
  }

  async function resolveClientError(row: any) {
    const { error } = await (supabase as any).rpc("resolve_client_error_log", { _id: row.id, _notes: "تمت المراجعة من فحص النظام" });
    if (error) toast.error(error.message);
    else { toast.success(t("system.toast.clientErrorClosed")); load(); }
  }

  function openWhatsApp(row: any) {
    const url = whatsappLink(row.phone ?? "", row.message ?? "");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function createDailySystemReport() {
    const danger = checks.filter((c) => c.severity === "danger");
    const warn = checks.filter((c) => c.severity === "warn");
    const ok = checks.filter((c) => c.severity === "ok");
    const lines = [
      t("system.report.title"),
      `${t("system.report.danger")}: ${danger.length}`,
      `${t("system.report.warn")}: ${warn.length}`,
      `${t("system.report.ok")}: ${ok.length}`,
      "",
      ...danger.map((c) => `❌ ${c.title}: ${c.count} — ${c.fix}`),
      ...warn.map((c) => `⚠️ ${c.title}: ${c.count} — ${c.fix}`),
    ];
    const body = lines.join("\n");
    const { error } = await (supabase as any).from("app_notifications").insert({
      audience: "owner",
      title: t("system.report.title"),
      body,
      href: "/system-health",
      tone: danger.length ? "danger" : warn.length ? "warning" : "success",
    });
    if (error) toast.error(error.message);
    else toast.success(t("system.report.saved"));
  }

  useEffect(() => { load(); }, [canUse, language]);

  if (!canUse) return <Card><CardContent className="p-10 text-center text-muted-foreground">{t("system.accessDenied")}</CardContent></Card>;

  const danger = checks.filter((c) => c.severity === "danger").length;
  const warn = checks.filter((c) => c.severity === "warn").length;

  return <div className="space-y-5" dir={dir}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck className="w-7 h-7 text-teal-600" /> {t("system.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("system.description")}</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}>{t("common.refresh")}</Button><Button variant="outline" onClick={createDailySystemReport}>{t("system.saveTodayReport")}</Button><Button variant="outline" onClick={repairBasics} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Wrench className="w-4 h-4 ms-1" />}{t("system.repairBasics")}</Button><Button onClick={repairActionableIssues} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Wrench className="w-4 h-4 ms-1" />}{t("system.repairActionable")}</Button></div>
    </div>

    <div className="grid md:grid-cols-3 gap-3">
      <Kpi title={t("system.kpi.danger")} value={danger} tone={danger ? "danger" : "ok"} />
      <Kpi title={t("system.kpi.warn")} value={warn} tone={warn ? "warn" : "ok"} />
      <Kpi title={t("system.kpi.items")} value={checks.length} tone="ok" />
    </div>

    {!loading && <Card className={danger === 0 ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}>
      <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={`text-xl font-black ${danger === 0 ? "text-emerald-800" : "text-red-800"}`}>{danger === 0 ? t("system.ready.ok") : t("system.ready.notYet")}</div>
          <div className="text-sm text-muted-foreground mt-1">{t("system.ready.note")}</div>
        </div>
        <Button variant={danger === 0 ? "default" : "outline"} onClick={createDailySystemReport}>{t("system.saveReadiness")}</Button>
      </CardContent>
    </Card>}





    {!loading && <Card className={financialAuditRows.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}>
      <CardHeader><CardTitle className="text-base">{t("system.financialAuditTitle")}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {financialAuditRows.length === 0 ? <div className="font-bold text-emerald-800">{t("system.financialAuditOk")}</div> : <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-red-900">{t("system.financialAuditNeeds")}</div>
            <Button size="sm" onClick={repairActionableIssues} disabled={repairing}>{repairing ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Wrench className="w-4 h-4 ms-1" />}{t("system.repairFinanceNow")}</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-2">{financialAuditRows.map((r) => <Link key={`${r.issue_key}-${r.source_id}`} to={safeFixHref(r.href) as any}><div className="rounded-xl border bg-white/80 p-3 text-xs hover:shadow-sm"><div className="font-black">{r.title}</div><div className="text-muted-foreground mt-1">{r.detail}</div><Badge className="mt-2" variant={r.severity === "danger" ? "destructive" : "secondary"}>{r.domain}</Badge></div></Link>)}</div>
        </>}
      </CardContent>
    </Card>}



    {!loading && <Card className={deliveryBlockedRows.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}>
      <CardHeader><CardTitle className="text-base">{t("system.deliveryReadinessTitle")}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {deliveryBlockedRows.length === 0 ? <div className="font-bold text-emerald-800">{t("system.deliveryReadinessOk")}</div> : <>
          <div className="font-bold text-red-900">{t("system.deliveryBlocked")}</div>
          <div className="grid md:grid-cols-2 gap-2">{deliveryBlockedRows.map((r) => <Link key={r.order_id} to={`/orders/${r.order_id}` as any}><div className="rounded-xl border bg-white/80 p-3 text-xs hover:shadow-sm"><div className="font-black">{t("order.orderNo", "طلب #{order}").replace("{order}", String(r.order_number))}</div><div className="text-muted-foreground mt-1">{deliveryIssuesAr(r.issue_codes)}</div><div className="flex flex-wrap gap-1 mt-2"><Badge variant="outline">{t("order.piecesCount")} {r.total_units}</Badge>{r.label_issue_count > 0 && <Badge variant="destructive">مارك {r.label_issue_count}</Badge>}{r.reclean_count > 0 && <Badge className="bg-amber-500">{t("order.reclean")} {r.reclean_count}</Badge>}{r.not_qc_count > 0 && <Badge variant="outline">QC {r.not_qc_count}</Badge>}{r.unpaid > 0 && <Badge variant="destructive">{t("system.check.unpaid.title")}</Badge>}</div></div></Link>)}</div>
        </>}
      </CardContent>
    </Card>}

    {!loading && <Card className={apdoRows.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
      <CardHeader><CardTitle className="text-base">Actor → Process → Data → Output</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {apdoError ? <div className="text-amber-800">{t("system.apdoMigrationMissing")} {apdoError}</div> : apdoRows.length === 0 ? <div className="font-bold text-emerald-800">{t("system.apdoOk")}</div> : <>
          <div className="font-bold text-amber-900">{t("system.apdoNeeds")}</div>
          <div className="grid md:grid-cols-2 gap-2">{apdoRows.map((r) => <div key={r.id} className="rounded-xl border bg-white/70 p-3 text-xs">
            <div className="font-black">{r.process_name}</div>
            <div className="text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("ar-EG")} · {r.branch_name ?? "بلا فرع"}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant={r.branch_answer === "answered" ? "secondary" : "destructive"}>{t("system.apdo.branch")}: {answerAr(r.branch_answer)}</Badge>
              <Badge variant={["answered", "not_applicable"].includes(r.cash_answer) ? "secondary" : "destructive"}>{t("system.apdo.cash")}: {answerAr(r.cash_answer)}</Badge>
              <Badge variant={["answered", "not_applicable"].includes(r.journal_answer) ? "secondary" : "destructive"}>{t("system.apdo.journal")}: {answerAr(r.journal_answer)}</Badge>
              <Badge variant={r.report_answer === "answered" ? "secondary" : "destructive"}>{t("system.apdo.report")}: {answerAr(r.report_answer)}</Badge>
              <Badge variant={["answered", "not_required"].includes(r.notification_answer) ? "secondary" : "destructive"}>{t("system.apdo.notification")}: {answerAr(r.notification_answer)}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" className="h-7 text-[11px]" onClick={() => repairApdoEvent(r.id)} disabled={fixingKey === r.id}>{fixingKey === r.id ? <Loader2 className="w-3 h-3 animate-spin ms-1" /> : <Wrench className="w-3 h-3 ms-1" />}{t("system.repairOperation")}</Button>
              <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to={apdoHref(r) as any}>{t("common.openSource")}</Link></Button>
            </div>
          </div>)}</div>
        </>}
      </CardContent>
    </Card>}



    {!loading && tenantReady && <Card className={tenantReady.is_ready ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
      <CardHeader><CardTitle className="text-base">{t("system.tenantReadinessTitle")}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
        {[[ "has_settings", t("system.check.settings.title") ], [ "has_branch", t("common.branch") ], [ "has_cash_account", t("accounting.tab.cash") ], [ "has_chart_accounts", t("nav./ledger") ], [ "has_employee", t("common.employee") ], [ "has_catalog", t("nav./services") ]].map(([k,label]: any) => <div key={k} className={`rounded-xl border p-2 text-center font-bold ${tenantReady[k] ? "bg-white text-emerald-700" : "bg-white text-red-700"}`}>{label}<div>{tenantReady[k] ? "✅" : t("system.missing")}</div></div>)}
      </CardContent>
    </Card>}

    {!loading && <div className="grid lg:grid-cols-2 gap-4">
      <Card className={clientErrors.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}>
        <CardHeader><CardTitle className="text-base">{t("system.clientErrorsTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!clientErrors.length ? <div className="font-bold text-emerald-800">{t("system.clientErrorsOk")}</div> : clientErrors.map((e) => <div key={e.id} className="rounded-xl border bg-white/80 p-3 text-xs space-y-2">
            <div className="font-black text-red-800">{e.message}</div>
            <div className="text-muted-foreground break-words">{e.path} · {new Date(e.created_at).toLocaleString("ar-EG")}</div>
            {e.stack && <details><summary className="cursor-pointer text-red-700">{t("common.stack")}</summary><pre className="mt-2 whitespace-pre-wrap text-[10px] max-h-40 overflow-auto">{e.stack}</pre></details>}
            <Button size="sm" variant="outline" onClick={() => resolveClientError(e)}>{t("system.markResolved")}</Button>
          </div>)}
        </CardContent>
      </Card>

      <Card className={queuedMessages.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
        <CardHeader><CardTitle className="text-base">{t("system.whatsappQueuedTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!queuedMessages.length ? <div className="font-bold text-emerald-800">{t("system.whatsappQueuedOk")}</div> : queuedMessages.map((m) => <div key={m.id} className="rounded-xl border bg-white/80 p-3 text-xs space-y-2">
            <div className="font-black">{m.customers?.full_name ?? m.phone} {m.orders?.order_number ? `— طلب #${m.orders.order_number}` : ""}</div>
            <div className="text-muted-foreground break-words">{m.message}</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openWhatsApp(m)}>{t("system.openWhatsApp")}</Button>
              <Button size="sm" variant="outline" onClick={() => markWhatsAppSent(m)}>{t("system.markSent")}</Button>
            </div>
          </div>)}
        </CardContent>
      </Card>
    </div>}

    {diagnostics.length > 0 && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-900 space-y-2">
      <div className="font-black">{t("system.diagnosticsTitle")}</div>
      {diagnostics.map((d, i) => <div key={i} className="rounded-lg bg-white/70 border border-red-100 px-3 py-2 text-xs break-words">{d}</div>)}
      <div className="text-xs">{t("system.diagnosticsHint")}</div>
    </CardContent></Card>}

    {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div> : <div className="space-y-5">
      {healthGroups.map((g) => {
        const rows = checks.filter((c) => groupForCheck(c.key) === g.key);
        if (!rows.length) return null;
        return <div key={g.key} className="space-y-2"><h2 className="font-black text-lg">{t(g.titleKey)}</h2><div className="grid md:grid-cols-2 gap-3">{rows.map((c) => <HealthCard key={c.key} c={c} fixingKey={fixingKey} repairing={repairing} fixCheck={fixCheck} />)}</div></div>;
      })}
    </div>}
  </div>;
}

function deliveryIssuesAr(codes: string[] = []) {
  const m: Record<string,string> = { no_units: "لا توجد قطع", reclean_open: "مرتجع مفتوح", label_issue: "مشكلة مارك/ليبل", qc_missing: "قطع غير معتمدة QC", no_driver: "بلا مندوب", unpaid: "غير مدفوع" };
  return codes.map((c) => m[c] ?? c).join("، ") || "غير جاهز";
}

const healthGroups = [
  { key: "readiness", titleKey: "system.group.readiness" },
  { key: "finance", titleKey: "system.group.finance" },
  { key: "operations", titleKey: "system.group.operations" },
  { key: "delivery", titleKey: "system.group.delivery" },
  { key: "quality", titleKey: "system.group.quality" },
  { key: "apdo", titleKey: "system.group.apdo" },
];
function groupForCheck(key: string) {
  if (["tenantReady", "settings", "employees", "services", "customers"].includes(key)) return "readiness";
  if (["cash", "chart", "cashBalanceIntegrity", "journal", "manualNoJournal", "cashClosing", "oldPayables", "financialAudit"].includes(key)) return "finance";
  if (["noPieces", "stuckOrders", "invoice"].includes(key)) return "operations";
  if (["pickups", "readyNoDriver", "deliveryReadiness", "driverLocation", "ordersNoLocation", "customersNoAddress"].includes(key)) return "delivery";
  if (["reclean", "qc", "labelIssues", "unpaid", "proof"].includes(key)) return "quality";
  return "apdo";
}
function readinessAr(k: string) { return ({ has_settings: "الإعدادات", has_branch: "الفرع", has_cash_account: "الخزنة", has_chart_accounts: "شجرة الحسابات", has_employee: "موظف نشط", has_catalog: "كتالوج الخدمات" } as Record<string,string>)[k] ?? k; }
function safeFixHref(href?: string | null) {
  if (!href) return "/system-health";
  // /ledger is owner-only. For actionable repairs, /accounting is available to owner/ops_manager.
  if (href === "/ledger" || href.startsWith("/ledger")) return "/accounting";
  return href;
}

function HealthCard({ c, fixingKey, repairing, fixCheck }: { c: Check; fixingKey: string | null; repairing: boolean; fixCheck: (key: string) => void }) {
  const { t } = useI18n();
  const cls = c.severity === "danger" ? "border-red-200 bg-red-50" : c.severity === "warn" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";
  const canAutoFix = ["cash", "chart", "settings", "employees", "cashBalanceIntegrity", "manualNoJournal", "journal", "pickups", "readyNoDriver", "driverLocation", "cashClosing", "financialAudit"].includes(c.key);
  return <Card className={cls}><CardContent className="p-4 space-y-3">
    <div className="flex items-center justify-between gap-2"><div className="font-black">{c.title}</div><Badge variant={c.severity === "danger" ? "destructive" : "secondary"}>{c.count}</Badge></div>
    <div className="text-xs text-muted-foreground">{c.fix}</div>
    {c.error && <div className="rounded-lg bg-white/70 border border-red-100 px-2 py-1 text-xs text-red-700 break-words">{t("system.readingError")} {c.error}</div>}
    {c.details?.length ? <div className="space-y-1">{c.details.map((d, i) => { const row = <div className="rounded-lg bg-white/70 border px-2 py-1 text-xs"><div className="font-bold">{d.label}</div>{d.sub && <div className="text-muted-foreground">{d.sub}</div>}</div>; return d.href ? <Link key={i} to={d.href as any}>{row}</Link> : <div key={i}>{row}</div>; })}</div> : null}
    <div className="flex gap-2 pt-1">{c.href && <Button asChild size="sm" variant="outline"><Link to={c.href as any}>{t("common.openFixLocation")}</Link></Button>}{canAutoFix && <Button size="sm" onClick={() => fixCheck(c.key)} disabled={fixingKey === c.key || repairing}>{fixingKey === c.key ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Wrench className="w-4 h-4 ms-1" />}{t("common.quickFix")}</Button>}</div>
  </CardContent></Card>;
}

function answerAr(s: string) {
  return ({ answered: "مكتمل", missing_branch: "ناقص", missing_cash_account: "ناقص", missing_journal: "ناقص", missing_report_bucket: "ناقص", missing_notification: "ناقص", not_applicable: "لا ينطبق", not_required: "غير مطلوب" } as Record<string, string>)[s] ?? s;
}

function Kpi({ title, value, tone }: { title: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "border-red-200 bg-red-50 text-red-800" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return <Card className={cls}><CardContent className="p-4"><div className="text-xs opacity-80">{title}</div><div className="text-3xl font-black mt-1">{value}</div></CardContent></Card>;
}
