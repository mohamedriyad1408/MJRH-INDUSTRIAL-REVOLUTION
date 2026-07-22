import { buildOrderIssues, OrderIssuePanel, OrderTimeline, returnTypeAr, returnStatusAr } from "@/components/order-timeline";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Camera, CheckCircle2, AlertTriangle, Printer, Scale, RotateCcw, ArrowRight, CreditCard, Send, Trash2, Upload, Image as ImageIcon, History, MapPin, ShieldCheck, Truck, Shirt, UserCircle } from "lucide-react";
import { PrintInvoiceButton } from "@/components/print-invoice";
import { StatusBadge } from "@/components/status-dot";
import type { StatusLevel } from "@/components/status-dot";
import { autoAssignIroningPieces } from "@/lib/ironing-assignment";
import { interpolate, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/orders/$id")({
  head: () => ({ meta: [{ title: "Order Detail - MJRH" }] }),
  component: OrderDetailPage,
});

const GARMENT_TYPES = ["shirt", "blouse", "pants", "jacket", "suit", "abaya", "dress", "tshirt", "skirt", "coat", "other"];
const COMPLEXITY: Record<string, number> = {
  "tshirt": 1, "shirt": 2, "blouse": 2, "pants": 2, "skirt": 2, "abaya": 3, "jacket": 3, "coat": 4, "suit": 5, "dress": 8, "other": 1,
};

function isShirtLikeName(name: string) { return /قميص|بلوز|shirt|blouse/i.test(name); }
function complexityForName(name: string) { return COMPLEXITY[name] ?? (isShirtLikeName(name) ? 2 : 1); }

function statusLevel(s: string): StatusLevel {
  if (["delivered", "ready"].includes(s)) return "ok";
  if (["packing", "ironing"].includes(s)) return "attention";
  if (s === "cancelled") return "urgent";
  return "waiting";
}

type Service = { id: string; name: string; service_type: string; unit_price: number };
type InvoiceItem = { id?: string; service_item_id?: string | null; name: string; service_type: string; qty: number; unit_price: number };

type ServiceUnit = {
  id: string;
  unit_number: number;
  label_code: string;
  name: string;
  garment_type: string;
  service_type: string;
  unit_price: number;
  line_value: number;
  attributes?: Record<string, string>;
  status: string;
  current_stage: string;
  complexity_factor: number;
  is_shirt_like: boolean;
  photo_url?: string | null;
  customer_notes?: string | null;
  staff_notes?: string | null;
  assigned_ironing_employee_id?: string | null;
  ironing_completed_at?: string | null;
  needs_reclean: boolean;
  reclean_reason?: string | null;
  reclean_reported_at?: string | null;
  reclean_return_to_employee_id?: string | null;
  employees?: { full_name: string } | null;
};

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user, hasRole } = useAuth();
  const { t, dir } = useI18n();
  const [order, setOrder] = useState<any>(null);
  const [units, setUnits] = useState<ServiceUnit[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingUnit, setAddingUnit] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [form, setForm] = useState({ garment_type: "قميص", color: "", notes: "" });
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [pickupRows, setPickupRows] = useState<any[]>([]);
  const [cancelRows, setCancelRows] = useState<any[]>([]);
  const [qcRows, setQcRows] = useState<any[]>([]);
  const [operationRows, setOperationRows] = useState<any[]>([]);
  const [attachmentRows, setAttachmentRows] = useState<any[]>([]);
  const [cashRows, setCashRows] = useState<any[]>([]);
  const [journalRows, setJournalRows] = useState<any[]>([]);
  const [messageRows, setMessageRows] = useState<any[]>([]);
  const [employeeLedgerRows, setEmployeeLedgerRows] = useState<any[]>([]);
  const [customerReturnRows, setCustomerReturnRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ord }, { data: su }, { data: svcs }, { data: hist }, { data: pickups }, { data: cancels }, { data: qcs }] = await Promise.all([
      supabase.from("orders").select("*,customers(full_name,phone),order_items(*)").eq("id", id).single(),
      supabase
        .from("service_units")
        .select("*,employees:assigned_ironing_employee_id(full_name)")
        .eq("order_id", id)
        .order("unit_number"),
      supabase.from("service_items").select("id,name,service_type,unit_price").eq("is_active", true).order("name"),
      supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: true }),
      supabase.from("pickup_requests").select("*,employees:driver_employee_id(full_name)").eq("converted_order_id", id).order("created_at", { ascending: true }),
      supabase.from("order_cancellations").select("*").eq("order_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("qc_checks").select("*,service_units(label_code,name)").eq("order_id", id).order("checked_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
    ]);
    setOrder(ord);
    setInvoiceItems(((ord as any)?.order_items ?? []).map((it: any) => ({ id: it.id, service_item_id: it.service_item_id, name: it.name, service_type: it.service_type, qty: it.qty, unit_price: Number(it.unit_price ?? 0) })));
    setServices((svcs ?? []) as Service[]);
    setUnits((su ?? []) as ServiceUnit[]);
    setHistoryRows(hist ?? []);
    setPickupRows(pickups ?? []);
    setCancelRows(cancels ?? []);
    setQcRows(qcs ?? []);

    const relatedIds = [id, ...((su ?? []) as any[]).map((u: any) => u.id), ...((pickups ?? []) as any[]).map((p: any) => p.id)].filter(Boolean);
    const [ops, atts, cash, journals, messages, empLedger, customerReturns] = await Promise.all([
      relatedIds.length ? supabase.from("operation_events").select("*,cash_accounts(name),journal_entries(description,source_type,status)").in("source_id", relatedIds).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      supabase.from("order_attachments").select("*").eq("order_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("cash_transactions").select("*,cash_accounts(name,account_type)").eq("source_id", id).order("happened_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("journal_entries").select("*,journal_lines(*,chart_accounts(code,name,account_type))").eq("source_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("customer_messages").select("*").eq("order_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("employee_financial_ledger").select("*,employees(full_name)").eq("source_id", id).order("entry_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      supabase.from("customer_returns").select("*,service_units(label_code,name,photo_url)").eq("order_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
    ]);
    setOperationRows(ops.data ?? []);
    setAttachmentRows(atts.data ?? []);
    setCashRows(cash.data ?? []);
    setJournalRows(journals.data ?? []);
    setMessageRows(messages.data ?? []);
    setEmployeeLedgerRows(empLedger.data ?? []);
    setCustomerReturnRows(customerReturns.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function addInvoiceService(serviceId: string) {
    const svc = services.find((x) => x.id === serviceId);
    if (!svc) return;
    setInvoiceItems((rows) => [{ service_item_id: svc.id, name: svc.name, service_type: svc.service_type, qty: 1, unit_price: Number(svc.unit_price) }, ...rows]);
  }

  function invoiceTotals(rows = invoiceItems) {
    const subtotal = rows.reduce((sum, it) => sum + Number(it.qty) * Number(it.unit_price), 0);
    const total = subtotal + Number(order?.delivery_fee ?? 0) + Number(order?.urgent_fee_amount ?? order?.urgent_fee ?? 0) - Number(order?.discount_amount ?? 0) + Number(order?.tax_amount ?? 0);
    return { subtotal, total };
  }

  function updateInvoiceRow(idx: number, patch: Partial<InvoiceItem>) {
    setInvoiceItems((rows) => rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  async function deleteInvoiceRow(idx: number) {
    const row = invoiceItems[idx];
    const reason = prompt(t("orders.deleteInvoiceItemReason"));
    if (reason === null) return;
    if (reason.trim().length < 3) return toast.error(t("orders.errorReasonRequired"));
    const amount = Number(row.qty) * Number(row.unit_price);
    if (row.id) {
      await supabase.from("order_cancellations").insert({ order_id: id, order_item_id: row.id, cancel_type: "invoice_item", reason: reason.trim(), amount_delta: amount, cancelled_by: user?.id, tenant_id: order?.tenant_id });
      await supabase.from("service_units").update({ status: "cancelled", current_stage: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason.trim(), cancelled_by: user?.id }).eq("order_item_id", row.id);
      const { error } = await supabase.from("order_items").delete().eq("id", row.id);
      if (error) return toast.error(error.message);
    }
    const next = invoiceItems.filter((_, i) => i !== idx);
    setInvoiceItems(next);
    const totals = invoiceTotals(next);
    await supabase.from("orders").update({ subtotal: totals.subtotal, total: totals.total, invoice_finalized_at: null }).eq("id", id);
    toast.success(t("orders.itemCancelled", "تم إلغاء البند وتسجيل السبب"));
    load();
  }

  async function saveInvoiceChanges() {
    if (!invoiceItems.length) return toast.error(t("orders.errEmptyInvoice", "الفاتورة لا تحتوي على بنود"));
    setInvoiceSaving(true);
    for (const it of invoiceItems) {
      const payload = { order_id: id, service_item_id: it.service_item_id ?? null, name: it.name, service_type: it.service_type as any, qty: Math.max(1, Number(it.qty)), unit_price: Number(it.unit_price) };
      if (it.id) await supabase.from("order_items").update(payload).eq("id", it.id);
      else {
        const { data: inserted, error } = await supabase.from("order_items").insert(payload).select("id,name,qty,unit_price,service_type").single();
        if (!error && inserted) {
          const qty = Math.max(1, Number(inserted.qty ?? 1));
          const startNo = units.length + 1;
          const newUnits = Array.from({ length: qty }, (_, i) => ({ order_id: id, order_item_id: inserted.id, unit_number: startNo + i, name: inserted.name, garment_type: inserted.name, service_type: inserted.service_type, unit_price: Number(inserted.unit_price ?? 0), line_value: Number(inserted.unit_price ?? 0), complexity_factor: complexityForName(inserted.name), is_shirt_like: isShirtLikeName(inserted.name), status: order?.status ?? "received", current_stage: order?.status ?? "received", tenant_id: order?.tenant_id }));
          await supabase.from("service_units").insert(newUnits);
        }
      }
    }
    const totals = invoiceTotals();
    const { error } = await supabase.from("orders").update({ subtotal: totals.subtotal, total: totals.total, invoice_finalized_at: null }).eq("id", id);
    setInvoiceSaving(false);
    if (error) toast.error(error.message); else { toast.success(t("orders.invoiceSaved", "تم حفظ تعديلات الفاتورة")); load(); }
  }

  async function updateUnitService(unit: ServiceUnit, serviceType: string) {
    const { error } = await supabase.from("service_units").update({ service_type: serviceType, current_stage: serviceType === "both" ? "cleaning" : unit.current_stage }).eq("id", unit.id);
    if (error) toast.error(error.message); else { toast.success(t("orders.unitServiceUpdated", "تم تعديل خدمة القطعة")); load(); }
  }

  async function finalizeAndNotify() {
    await saveInvoiceChanges();
    const totals = invoiceTotals();
    const { error } = await supabase.from("orders").update({ invoice_finalized_at: new Date().toISOString(), customer_notified_at: new Date().toISOString(), total: totals.total, subtotal: totals.subtotal }).eq("id", id);
    if (error) return toast.error(error.message);
    const phone = (order.customers?.phone ?? "").replace(/\D/g, "");
    const msg = `${t("orders.finalInvoiceMsg", "فاتورتك النهائية من Dry Tech لطلب")} #${order.order_number}: ${Math.round(totals.total)} ج. رابط التتبع: ${location.origin}/track/${order.public_token}`;
    if (phone.length >= 11) window.open(`https://wa.me/2${phone.startsWith("0") ? phone.slice(1) : phone}?text=${encodeURIComponent(msg)}`, "_blank");
    await supabase.rpc("record_operation_event", { _process_key: "invoice_finalized", _process_name: t("orders.toastInvoiceFinalized"), _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: null, _report_bucket: "orders/reports", _requires_notification: phone.length >= 11, _data: { tenant_id: order.tenant_id, order_number: order.order_number, total: totals.total, customer_phone: phone }, _output: { cash_impact: false, journal_required: false, appears_in_report: true, notification_prepared: phone.length >= 11 } }).then(() => null);
    toast.success(t("orders.invoiceFinalized", "تم تأكيد الفاتورة وتجهيز إشعار العميل"));
    load();
  }

  async function addUnit() {
    if (!form.garment_type) return;
    setAddingUnit(true);
    const { error } = await supabase
      .from("service_units")
      .insert({
        order_id: id,
        name: form.garment_type,
        garment_type: form.garment_type,
        service_type: "both",
        unit_price: 0,
        line_value: 0,
        attributes: { color: form.color },
        complexity_factor: complexityForName(form.garment_type),
        is_shirt_like: isShirtLikeName(form.garment_type),
        customer_notes: form.notes || null,
        status: order?.status ?? "received",
        current_stage: order?.status ?? "received",
        tenant_id: order?.tenant_id,
      });
    setAddingUnit(false);
    if (error) return toast.error(error.message);
    await supabase.rpc("record_operation_event", { _process_key: "service_unit_added", _process_name: "إضافة قطعة للطلب", _source_type: "order", _source_id: id, _branch_id: order?.branch_id ?? null, _cash_account_id: null, _report_bucket: "orders/production", _requires_notification: false, _data: { tenant_id: order?.tenant_id, garment_type: form.garment_type, order_number: order?.order_number }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null);
    toast.success(t("orders.unitAdded", "تمت إضافة القطعة"));
    setForm({ garment_type: "shirt", color: "", notes: "" });
    load();
  }

  async function uploadPhoto(unit: ServiceUnit, file: File) {
    setUploading(unit.id);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `orders/${id}/pieces/${unit.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("unit-media").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(null); return toast.error(error.message); }
    const { data } = supabase.storage.from("unit-media").getPublicUrl(path);
    const { error: uErr } = await supabase.from("service_units").update({ photo_url: data.publicUrl }).eq("id", unit.id);
    setUploading(null);
    if (uErr) return toast.error(uErr.message);
    toast.success(t("orders.photoSaved", "تم حفظ صورة القطعة"));
    load();
  }

  async function markReclean(unit: ServiceUnit) {
    const reason = prompt(t("orders.recleanReasonPrompt", "سبب رجوع القطعة للتنظيف؟"), unit.reclean_reason ?? "");
    if (reason === null) return;
    const { error } = await supabase.from("service_units").update({
      needs_reclean: true,
      reclean_reason: reason || "مرتجع تنظيف",
      reclean_reported_by: user?.id,
      reclean_reported_at: new Date().toISOString(),
    }).eq("id", unit.id);
    if (error) toast.error(error.message); else { await supabase.rpc("record_operation_event", { _process_key: "piece_reclean_reported", _process_name: t("orders.toastRecleanReported"), _source_type: "service_unit", _source_id: unit.id, _branch_id: order?.branch_id ?? null, _cash_account_id: null, _report_bucket: "quality/reports", _requires_notification: true, _data: { tenant_id: order?.tenant_id, order_id: id, reason: reason || "مرتجع تنظيف", label_code: unit.label_code }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null); toast.success(t("orders.recleanReported", "تم تسجيل مرتجع التنظيف")); load(); }
  }

  async function resolveReclean(unit: ServiceUnit) {
    const { error } = await supabase.from("service_units").update({
      needs_reclean: false,
      reclean_resolved_at: new Date().toISOString(),
    }).eq("id", unit.id);
    if (error) toast.error(error.message); else { toast.success(t("orders.recleanResolved", "تم إنهاء مرتجع التنظيف")); load(); }
  }

  async function assignIroning() {
    setAssigning(true);
    try {
      const r = await autoAssignIroningPieces(id);
      toast.success(r.assigned ? interpolate(t("orders.ironingAssignedCount", "تم توزيع {count} قطعة على فنيي الكي"), { count: r.assigned }) : t("orders.noIroningUnassigned", "لا توجد قطع كي غير موزعة"));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("orders.errAssigningIroning", "تعذر توزيع الكي"));
    } finally {
      setAssigning(false);
    }
  }


  async function togglePayment() {
    const next = order.payment_status === "paid" ? "unpaid" : "paid";
    let cashAccountId: string | null = null;
    if (next === "paid") {
      const { data: safe } = await supabase.from("cash_accounts").select("id").eq("branch_id", order.branch_id).eq("is_active", true).order("created_at").limit(1).maybeSingle();
      cashAccountId = safe?.id ?? null;
    }
    const { error } = await supabase.from("orders").update({ payment_status: next }).eq("id", id);
    if (!error) await supabase.rpc("record_operation_event", { _process_key: next === "paid" ? "payment_recorded" : "payment_marked_unpaid", _process_name: next === "paid" ? "تسجيل تحصيل طلب" : "جعل الطلب آجل", _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: cashAccountId, _report_bucket: "finance/receivables", _requires_notification: false, _data: { tenant_id: order.tenant_id, order_number: order.order_number, amount: Number(order.total ?? 0), payment_method: order.payment_method }, _output: { cash_impact: next === "paid", journal_required: next === "paid", appears_in_report: true } }).then(() => null);
    if (error) toast.error(error.message); else { toast.success(next === "paid" ? t("orders.paymentRecorded") : t("orders.markedUnpaid")); load(); }
  }

  async function uploadPaymentProof(file: File) {
    if (!file) return;
    setProofUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `orders/${id}/instapay-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setProofUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
    const { error: uErr } = await supabase.from("orders").update({
      payment_proof_url: data.publicUrl,
      payment_proof_uploaded_at: new Date().toISOString(),
      payment_proof_uploaded_by: user?.id,
      payment_status: "paid",
    }).eq("id", id);
    setProofUploading(false);
    if (uErr) return toast.error(uErr.message);
    await supabase.rpc("record_operation_event", { _process_key: "payment_proof_uploaded", _process_name: "رفع إيصال دفع", _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: null, _report_bucket: "finance/payment-review", _requires_notification: true, _data: { tenant_id: order.tenant_id, order_number: order.order_number, amount: Number(order.total ?? 0), proof_url: data.publicUrl }, _output: { cash_impact: true, journal_required: true, appears_in_report: true } }).then(() => null);
    toast.success(t("orders.instapayProofSaved", "تم حفظ صورة تحويل InstaPay وتسجيل الدفع"));
    load();
  }

  async function registerCustomerReturn(unit: ServiceUnit) {
    if (!hasRole("owner", "ops_manager", "cs_manager")) return toast.error(t("orders.errAdminOnlyReturn", "تسجيل مرتجع العميل للإدارة وخدمة العملاء فقط"));
    const typeRaw = prompt(t("orders.returnTypePrompt", "نوع المرتجع؟ اكتب: تنظيف أو كي أو تصليح أو أخرى"), t("common.cleaning"));
    if (typeRaw === null) return;
    const tVal = typeRaw.trim();
    const returnType = /كي/.test(tVal) ? "reiron" : /تصليح|repair/.test(tVal) ? "repair" : /اخرى|أخرى|other/.test(tVal) ? "other" : "reclean";
    const reason = prompt(t("orders.returnReasonPrompt"));
    if (reason === null) return;
    if (reason.trim().length < 3) return toast.error(t("orders.errReasonRequired"));
    const { error } = await supabase.rpc("register_customer_return", {
      _order_id: id,
      _service_unit_id: unit.id,
      _return_type: returnType,
      _reason: reason.trim(),
      _photo_url: null,
      _billable: false,
      _amount: 0,
    });
    if (error) toast.error(error.message); else { toast.success(t("orders.returnRegistered", "تم تسجيل مرتجع العميل وربطه بالقطعة والمحطات")); load(); }
  }

  async function completeCustomerReturn(row: any) {
    const note = prompt(t("orders.closeReturnNotePrompt", "ملاحظات إغلاق المرتجع؟"), t("orders.closeReturnNoteDefault", "تم الحل والتسليم للعميل"));
    if (note === null) return;
    const { error } = await supabase.rpc("complete_customer_return", { _return_id: row.id, _notes: note });
    if (error) toast.error(error.message); else { toast.success(t("orders.returnClosed", "تم إغلاق مرتجع العميل")); load(); }
  }

  async function cancelOrder() {
    if (!hasRole("owner")) return toast.error(t("orders.errOwnerOnlyCancel", "إلغاء الطلب بالكامل للمالك فقط"));
    const reason = prompt(t("orders.cancelFullReasonPrompt", "سبب إلغاء الطلب بالكامل؟"));
    if (reason === null) return;
    if (reason.trim().length < 3) return toast.error(t("orders.errReasonRequired"));
    const { error } = await supabase.rpc("cancel_order_with_reason", { _order_id: id, _reason: reason.trim() });
    if (!error) await supabase.rpc("record_operation_event", { _process_key: "order_cancelled", _process_name: "إلغاء طلب", _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: null, _report_bucket: "orders/reports", _requires_notification: true, _data: { tenant_id: order.tenant_id, order_number: order.order_number, reason: reason.trim(), total: Number(order.total ?? 0) }, _output: { cash_impact: false, journal_required: Number(order.total ?? 0) > 0, appears_in_report: true } }).then(() => null);
    if (error) toast.error(error.message); else { toast.success(t("orders.orderCancelled", "تم إلغاء الطلب وتسجيل السبب")); load(); }
  }

  async function overrideCloseOrder() {
    if (!hasRole("owner", "ops_manager")) return toast.error(t("orders.errOpsOnlyOverride", "صلاحية مدير التشغيل أو المالك فقط"));
    const reason = prompt(t("orders.overrideCloseReasonPrompt", "سبب إغلاق الطلب بتجاوز التحقق؟"), t("orders.overrideCloseReasonDefault", "رقم هاتف العميل غير مكتمل / تسليم مؤكد يدوياً"));
    if (reason === null) return;
    const { error } = await supabase.from("orders").update({ status: "delivered", payment_status: "paid", notes: `${order.notes ?? ""}\n[OVERRIDE DELIVERY] ${reason}`.trim() }).eq("id", id);
    if (!error) {
      await supabase.from("order_status_history").insert({ order_id: id, from_status: order.status, to_status: "delivered", changed_by: user?.id, notes: `${t("orders.overrideClose")}: ${reason}` });
      await supabase.rpc("record_operation_event", { _process_key: "order_delivered_override", _process_name: t("orders.overrideClose"), _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: null, _report_bucket: "orders/delivery", _requires_notification: true, _data: { tenant_id: order.tenant_id, order_number: order.order_number, reason }, _output: { cash_impact: order.payment_status !== "paid", journal_required: order.payment_status !== "paid", appears_in_report: true } }).then(() => null);
      toast.success(t("orders.overrideCloseDone", "تم إغلاق الطلب بتجاوز التحقق"));
      load();
    } else toast.error(error.message);
  }

  function printLabels() {
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>Labels</title><style>
      @page{size:50mm 30mm;margin:2mm} body{font-family:Arial,sans-serif;margin:0;color:#111}.label{width:46mm;height:26mm;border:1px dashed #999;margin:1mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;text-align:center}.code{font-size:18px;font-weight:900}.name{font-size:13px;font-weight:700}.meta{font-size:10px;color:#444}
    </style></head><body>${units.map((u) => `<div class="label"><div class="code">${u.label_code}</div><div class="name">${u.name}</div><div class="meta">طلب #${order.order_number} — ${order.customers?.full_name ?? ""}</div></div>`).join("")}</body></html>`;
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return toast.error(t("orders.errorPrintBlocked"));
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!order) return <div className="p-8 text-center text-muted-foreground">{t("orders.notFound")}</div>;

  const canEdit = hasRole("cs_manager", "ops_manager", "owner");
  const canOperate = hasRole("ops_manager", "owner", "employee");
  const pieceCount = units.length;
  const shirtCount = units.filter((u) => u.is_shirt_like).length;
  const invoiceValue = units.reduce((s, u) => s + Number(u.line_value ?? 0), 0);
  const recleanUnits = units.filter((u) => u.needs_reclean);
  const issueList = buildOrderIssues(order, units, pickupRows, qcRows);

  return (
    <div className="space-y-5 max-w-4xl" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/orders"><ArrowRight className="w-4 h-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold">{t("orders.orderNo", "طلب #{order}").replace("{order}", String(order.order_number))}</h1>
            <p className="text-sm text-muted-foreground">{order.customers?.full_name} · {order.customers?.phone}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintInvoiceButton order={{ ...order, customers: order.customers, order_items: order.order_items ?? [] }} />
          <Button variant={order.payment_status === "paid" ? "default" : "outline"} onClick={togglePayment} className={order.payment_status === "paid" ? "bg-emerald-600" : ""}>
            {order.payment_status === "paid" ? t("orders.paid") : t("orders.recordPayment")}
          </Button>
          {(order.payment_method === "instapay" || order.payment_method === "cod_instapay") && canEdit && (
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPaymentProof(e.target.files[0])} />
              <Button type="button" variant={order.payment_proof_url ? "default" : "outline"} disabled={proofUploading} asChild>
                <span>{proofUploading ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Upload className="w-4 h-4 ms-1" />} {t("orders.instapayProof")}</span>
              </Button>
            </label>
          )}
          {order.payment_proof_url && <Button asChild variant="outline"><a href={order.payment_proof_url} target="_blank" rel="noreferrer"><ImageIcon className="w-4 h-4 ms-1" /> {t("orders.viewReceipt")}</a></Button>}
          {hasRole("owner") && order.status !== "cancelled" && <Button variant="destructive" onClick={cancelOrder}>{t("orders.cancelWithReason")}</Button>}
          {hasRole("owner", "ops_manager") && order.status !== "delivered" && order.status !== "cancelled" && <Button variant="destructive" onClick={overrideCloseOrder}>{t("orders.overrideClose")}</Button>}
          <Button variant="outline" onClick={printLabels} disabled={!units.length}><Printer className="w-4 h-4 ms-1" /> {t("orders.printLabels")}</Button>
          {canEdit && <Button onClick={assignIroning} disabled={assigning || !units.length}><Scale className="w-4 h-4 ms-1" /> {assigning ? t("orders.assigning") : t("orders.assignIroning")}</Button>}
          <StatusBadge level={statusLevel(order.status)} label={t(`track.step.${order.status}`, order.status)} />
        </div>
      </div>

      <OrderIssuePanel issues={issueList} />

      <div className="grid md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("orders.piecesCount")}</div><div className="text-xl font-black">{pieceCount}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("orders.shirtsCount")}</div><div className="text-xl font-black">{shirtCount}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("orders.piecesValue")}</div><div className="text-xl font-black">{invoiceValue.toLocaleString()} {t("common.egp")}</div></CardContent></Card>
        <Card className={recleanUnits.length ? "border-amber-300 bg-amber-50" : ""}><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("orders.recleanCount")}</div><div className="text-xl font-black">{recleanUnits.length}</div></CardContent></Card>
      </div>

      <OrderTimeline order={order} units={units} historyRows={historyRows} pickupRows={pickupRows} cancelRows={cancelRows} qcRows={qcRows} operationRows={operationRows} attachmentRows={attachmentRows} cashRows={cashRows} journalRows={journalRows} messageRows={messageRows} employeeLedgerRows={employeeLedgerRows} customerReturnRows={customerReturnRows} />

      {customerReturnRows.length > 0 && <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><RotateCcw className="w-4 h-4 text-amber-600" /> {t("orders.customerReturnsTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {customerReturnRows.map((r) => <div key={r.id} className={`rounded-xl border p-3 text-sm ${r.status === "resolved" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><b>{r.service_units?.label_code}</b> — {r.service_units?.name} · {returnTypeAr(r.return_type, t)} · {returnStatusAr(r.status, t)}</div>
              {r.status !== "resolved" && <Button size="sm" onClick={() => completeCustomerReturn(r)}>{t("orders.closeReturn")}</Button>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{t("orders.reason")}: {r.reason}</div>
          </div>)}
        </CardContent>
      </Card>}


      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-teal-600" /> {t("orders.invoiceEditTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {canEdit && <div className="flex gap-2">
            <Select onValueChange={addInvoiceService}>
              <SelectTrigger><SelectValue placeholder={t("orders.addInvoiceItem")} /></SelectTrigger>
              <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {Number(s.unit_price).toLocaleString()} {t("common.egp")}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={saveInvoiceChanges} disabled={invoiceSaving}>{invoiceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={finalizeAndNotify}><Send className="w-4 h-4 ms-1" /> {t("orders.finalizeNotify")}</Button>
          </div>}
          <div className="space-y-2">
            {invoiceItems.map((it, idx) => (
              <div key={it.id ?? idx} className="grid md:grid-cols-[1fr_80px_110px_90px_40px] gap-2 items-center rounded-xl border p-2">
                <Input value={it.name} disabled={!canEdit} onChange={(e) => updateInvoiceRow(idx, { name: e.target.value })} />
                <Input type="number" min={1} value={it.qty} disabled={!canEdit} onChange={(e) => updateInvoiceRow(idx, { qty: Math.max(1, Number(e.target.value)) })} />
                <Input type="number" value={it.unit_price} disabled={!canEdit} onChange={(e) => updateInvoiceRow(idx, { unit_price: Number(e.target.value) })} />
                <div className="font-black text-end">{(it.qty * it.unit_price).toLocaleString()} {t("common.egp")}</div>
                {canEdit && <Button size="icon" variant="ghost" onClick={() => deleteInvoiceRow(idx)}><Trash2 className="w-4 h-4 text-red-600" /></Button>}
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-muted p-3 flex justify-between font-black"><span>{t("orders.finalTotal")}</span><span>{invoiceTotals().total.toLocaleString()} {t("common.egp")}</span></div>
          {order.invoice_finalized_at && <Badge className="bg-emerald-600">{t("orders.invoiceConfirmed")}</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Printer className="w-4 h-4 text-teal-600" /> {t("orders.unitsTitle")} ({units.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {units.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("orders.noUnits")}</p>}
          {units.map((u) => (
            <div key={u.id} className="grid md:grid-cols-[88px_1fr_auto] gap-3 p-3 border rounded-xl bg-card">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <Camera className="w-7 h-7 text-muted-foreground" />}
                </div>
                {canEdit && <label className="text-xs text-teal-700 cursor-pointer underline">
                  {uploading === u.id ? t("orders.uploading") : t("orders.photo")}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(u, e.target.files[0])} />
                </label>}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-lg">{u.label_code}</span>
                  <Badge variant="outline">{u.name}</Badge>
                  {u.is_shirt_like && <Badge className="bg-blue-600">{t("orders.shirtLike")}</Badge>}
                  {u.needs_reclean && <Badge className="bg-amber-500"><RotateCcw className="w-3 h-3 ms-1" /> {t("orders.recleanBadge")}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.attributes?.color ? `${t("orders.color")}: ${u.attributes.color} · ` : ""}
                  {t("orders.estimatedValue")}: {Number(u.line_value ?? 0).toLocaleString()} {t("common.egp")} · {t("orders.effort")} ×{u.complexity_factor}
                </div>
                {canEdit && <div className="max-w-xs"><Select value={u.service_type} onValueChange={(v) => updateUnitService(u, v)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ironing">{t("stage.ironing")}</SelectItem><SelectItem value="both">{t("common.cleanIron")}</SelectItem><SelectItem value="cleaning">{t("common.repair")}</SelectItem></SelectContent></Select></div>}
                <div className="text-xs text-muted-foreground">
                  {t("orders.ironingTech")}: <b>{u.employees?.full_name ?? t("orders.notAssignedYet")}</b>
                </div>
                {u.customer_notes && <div className="text-xs text-amber-700">📝 {u.customer_notes}</div>}
                {u.needs_reclean && <div className="text-xs text-amber-700">{t("orders.recleanReason")}: {u.reclean_reason} · {t("orders.returnToSameTech")}</div>}
              </div>
              {canOperate && <div className="flex md:flex-col gap-2 justify-end">
                {order.status === "delivered" ? <Button size="sm" variant="outline" onClick={() => registerCustomerReturn(u)}><RotateCcw className="w-3 h-3 ms-1" /> {t("orders.customerReturn")}</Button> : <Button size="sm" variant="outline" onClick={() => markReclean(u)}><AlertTriangle className="w-3 h-3 ms-1" /> {t("orders.reclean")}</Button>}
                {u.needs_reclean && <Button size="sm" onClick={() => resolveReclean(u)}><CheckCircle2 className="w-3 h-3 ms-1" /> {t("orders.cleaned")}</Button>}
              </div>}
            </div>
          ))}

          {canEdit && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-bold">{t("orders.manualPiece")}</p>
              <div className="grid md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("orders.pieceType")}</label>
                  <Select value={form.garment_type} onValueChange={(v) => setForm((f) => ({ ...f, garment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GARMENT_TYPES.map((item) => {
                      return <SelectItem key={item} value={item}>{t(`garment.${item}`, item)}</SelectItem>;
                    })}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("orders.color")}</label>
                  <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder={t("orders.colorPlaceholder")} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("orders.notes")}</label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={1} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("orders.manualPieceHint")}</span>
                <Button onClick={addUnit} disabled={addingUnit} size="sm">
                  {addingUnit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ms-1" /> {t("orders.addPiece")}</>}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
