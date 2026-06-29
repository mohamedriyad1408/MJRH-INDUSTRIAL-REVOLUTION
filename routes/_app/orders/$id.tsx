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
import { Loader2, Plus, Camera, CheckCircle2, AlertTriangle, Printer, Scale, RotateCcw, ArrowRight, CreditCard, Send, Trash2, Upload, Image as ImageIcon, History, MapPin, ShieldCheck, Truck, Shirt } from "lucide-react";
import { PrintInvoiceButton } from "@/components/print-invoice";
import { StatusBadge } from "@/components/status-dot";
import type { StatusLevel } from "@/components/status-dot";
import { autoAssignIroningPieces } from "@/lib/ironing-assignment";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/orders/$id")({
  head: () => ({ meta: [{ title: "تفاصيل الطلب - MJRH" }] }),
  component: OrderDetailPage,
});

const GARMENT_TYPES = ["قميص", "بلوزة", "بنطلون", "جاكيت", "بدلة", "عباية", "فستان", "تيشيرت", "جيبة", "معطف", "أخرى"];
const COMPLEXITY: Record<string, number> = {
  "تيشيرت": 1, "قميص": 2, "بلوزة": 2, "بنطلون": 2, "جيبة": 2, "عباية": 3, "جاكيت": 3, "معطف": 4, "بدلة": 5, "فستان": 8, "أخرى": 1,
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
      (supabase as any)
        .from("service_units")
        .select("*,employees:assigned_ironing_employee_id(full_name)")
        .eq("order_id", id)
        .order("unit_number"),
      supabase.from("service_items").select("id,name,service_type,unit_price").eq("is_active", true).order("name"),
      (supabase as any).from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: true }),
      (supabase as any).from("pickup_requests").select("*,employees:driver_employee_id(full_name)").eq("converted_order_id", id).order("created_at", { ascending: true }),
      (supabase as any).from("order_cancellations").select("*").eq("order_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("qc_checks").select("*,service_units(label_code,name)").eq("order_id", id).order("checked_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
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
      relatedIds.length ? (supabase as any).from("operation_events").select("*,cash_accounts(name),journal_entries(description,source_type,status)").in("source_id", relatedIds).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      (supabase as any).from("order_attachments").select("*").eq("order_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("cash_transactions").select("*,cash_accounts(name,account_type)").eq("source_id", id).order("happened_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("journal_entries").select("*,journal_lines(*,chart_accounts(code,name,account_type))").eq("source_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("customer_messages").select("*").eq("order_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("employee_financial_ledger").select("*,employees(full_name)").eq("source_id", id).order("entry_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from("customer_returns").select("*,service_units(label_code,name,photo_url)").eq("order_id", id).order("created_at", { ascending: true }).then((r: any) => r).catch(() => ({ data: [] })),
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
    const reason = prompt("سبب إلغاء هذا البند من الفاتورة؟");
    if (reason === null) return;
    if (reason.trim().length < 3) return toast.error("لا يمكن إلغاء بند بدون سبب واضح");
    const amount = Number(row.qty) * Number(row.unit_price);
    if (row.id) {
      await (supabase as any).from("order_cancellations").insert({ order_id: id, order_item_id: row.id, cancel_type: "invoice_item", reason: reason.trim(), amount_delta: amount, cancelled_by: user?.id, tenant_id: order?.tenant_id });
      await (supabase as any).from("service_units").update({ status: "cancelled", current_stage: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason.trim(), cancelled_by: user?.id }).eq("order_item_id", row.id);
      const { error } = await supabase.from("order_items").delete().eq("id", row.id);
      if (error) return toast.error(error.message);
    }
    const next = invoiceItems.filter((_, i) => i !== idx);
    setInvoiceItems(next);
    const totals = invoiceTotals(next);
    await (supabase as any).from("orders").update({ subtotal: totals.subtotal, total: totals.total, invoice_finalized_at: null }).eq("id", id);
    toast.success("تم إلغاء البند وتسجيل السبب");
    load();
  }

  async function saveInvoiceChanges() {
    if (!invoiceItems.length) return toast.error("الفاتورة لا تحتوي على بنود");
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
          await (supabase as any).from("service_units").insert(newUnits);
        }
      }
    }
    const totals = invoiceTotals();
    const { error } = await (supabase as any).from("orders").update({ subtotal: totals.subtotal, total: totals.total, invoice_finalized_at: null }).eq("id", id);
    setInvoiceSaving(false);
    if (error) toast.error(error.message); else { toast.success("تم حفظ تعديلات الفاتورة"); load(); }
  }

  async function updateUnitService(unit: ServiceUnit, serviceType: string) {
    const { error } = await (supabase as any).from("service_units").update({ service_type: serviceType, current_stage: serviceType === "both" ? "cleaning" : unit.current_stage }).eq("id", unit.id);
    if (error) toast.error(error.message); else { toast.success("تم تعديل خدمة القطعة"); load(); }
  }

  async function finalizeAndNotify() {
    await saveInvoiceChanges();
    const totals = invoiceTotals();
    const { error } = await (supabase as any).from("orders").update({ invoice_finalized_at: new Date().toISOString(), customer_notified_at: new Date().toISOString(), total: totals.total, subtotal: totals.subtotal }).eq("id", id);
    if (error) return toast.error(error.message);
    const phone = (order.customers?.phone ?? "").replace(/\D/g, "");
    const msg = `فاتورتك النهائية من Dry Tech لطلب #${order.order_number}: ${Math.round(totals.total)} ج. رابط التتبع: ${location.origin}/track/${order.public_token}`;
    if (phone.length >= 11) window.open(`https://wa.me/2${phone.startsWith("0") ? phone.slice(1) : phone}?text=${encodeURIComponent(msg)}`, "_blank");
    await (supabase as any).rpc("record_operation_event", { _process_key: "invoice_finalized", _process_name: "اعتماد فاتورة", _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: null, _report_bucket: "orders/reports", _requires_notification: phone.length >= 11, _data: { tenant_id: order.tenant_id, order_number: order.order_number, total: totals.total, customer_phone: phone }, _output: { cash_impact: false, journal_required: false, appears_in_report: true, notification_prepared: phone.length >= 11 } }).then(() => null);
    toast.success("تم تأكيد الفاتورة وتجهيز إشعار العميل");
    load();
  }

  async function addUnit() {
    if (!form.garment_type) return;
    setAddingUnit(true);
    const { error } = await (supabase as any)
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
    await (supabase as any).rpc("record_operation_event", { _process_key: "service_unit_added", _process_name: "إضافة قطعة للطلب", _source_type: "order", _source_id: id, _branch_id: order?.branch_id ?? null, _cash_account_id: null, _report_bucket: "orders/production", _requires_notification: false, _data: { tenant_id: order?.tenant_id, garment_type: form.garment_type, order_number: order?.order_number }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null);
    toast.success("تمت إضافة القطعة");
    setForm({ garment_type: "قميص", color: "", notes: "" });
    load();
  }

  async function uploadPhoto(unit: ServiceUnit, file: File) {
    setUploading(unit.id);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `orders/${id}/pieces/${unit.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("unit-media").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(null); return toast.error(error.message); }
    const { data } = supabase.storage.from("unit-media").getPublicUrl(path);
    const { error: uErr } = await (supabase as any).from("service_units").update({ photo_url: data.publicUrl }).eq("id", unit.id);
    setUploading(null);
    if (uErr) return toast.error(uErr.message);
    toast.success("تم حفظ صورة القطعة");
    load();
  }

  async function markReclean(unit: ServiceUnit) {
    const reason = prompt("سبب رجوع القطعة للتنظيف؟", unit.reclean_reason ?? "");
    if (reason === null) return;
    const { error } = await (supabase as any).from("service_units").update({
      needs_reclean: true,
      reclean_reason: reason || "مرتجع تنظيف",
      reclean_reported_by: user?.id,
      reclean_reported_at: new Date().toISOString(),
    }).eq("id", unit.id);
    if (error) toast.error(error.message); else { await (supabase as any).rpc("record_operation_event", { _process_key: "piece_reclean_reported", _process_name: "تسجيل مرتجع تنظيف", _source_type: "service_unit", _source_id: unit.id, _branch_id: order?.branch_id ?? null, _cash_account_id: null, _report_bucket: "quality/reports", _requires_notification: true, _data: { tenant_id: order?.tenant_id, order_id: id, reason: reason || "مرتجع تنظيف", label_code: unit.label_code }, _output: { cash_impact: false, journal_required: false, appears_in_report: true } }).then(() => null); toast.success("تم تسجيل مرتجع التنظيف"); load(); }
  }

  async function resolveReclean(unit: ServiceUnit) {
    const { error } = await (supabase as any).from("service_units").update({
      needs_reclean: false,
      reclean_resolved_at: new Date().toISOString(),
    }).eq("id", unit.id);
    if (error) toast.error(error.message); else { toast.success("تم إنهاء مرتجع التنظيف"); load(); }
  }

  async function assignIroning() {
    setAssigning(true);
    try {
      const r = await autoAssignIroningPieces(id);
      toast.success(r.assigned ? `تم توزيع ${r.assigned} قطعة على فنيي الكي` : "لا توجد قطع كي غير موزعة");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر توزيع الكي");
    } finally {
      setAssigning(false);
    }
  }


  async function togglePayment() {
    const next = order.payment_status === "paid" ? "unpaid" : "paid";
    let cashAccountId: string | null = null;
    if (next === "paid") {
      const { data: safe } = await (supabase as any).from("cash_accounts").select("id").eq("branch_id", order.branch_id).eq("is_active", true).order("created_at").limit(1).maybeSingle();
      cashAccountId = safe?.id ?? null;
    }
    const { error } = await supabase.from("orders").update({ payment_status: next }).eq("id", id);
    if (!error) await (supabase as any).rpc("record_operation_event", { _process_key: next === "paid" ? "payment_recorded" : "payment_marked_unpaid", _process_name: next === "paid" ? "تسجيل تحصيل طلب" : "جعل الطلب آجل", _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: cashAccountId, _report_bucket: "finance/receivables", _requires_notification: false, _data: { tenant_id: order.tenant_id, order_number: order.order_number, amount: Number(order.total ?? 0), payment_method: order.payment_method }, _output: { cash_impact: next === "paid", journal_required: next === "paid", appears_in_report: true } }).then(() => null);
    if (error) toast.error(error.message); else { toast.success(next === "paid" ? "تم تسجيل الدفع" : "تم جعل الطلب آجل"); load(); }
  }

  async function uploadPaymentProof(file: File) {
    if (!file) return;
    setProofUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `orders/${id}/instapay-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setProofUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
    const { error: uErr } = await (supabase as any).from("orders").update({
      payment_proof_url: data.publicUrl,
      payment_proof_uploaded_at: new Date().toISOString(),
      payment_proof_uploaded_by: user?.id,
      payment_status: "paid",
    }).eq("id", id);
    setProofUploading(false);
    if (uErr) return toast.error(uErr.message);
    await (supabase as any).rpc("record_operation_event", { _process_key: "payment_proof_uploaded", _process_name: "رفع إيصال دفع", _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: null, _report_bucket: "finance/payment-review", _requires_notification: true, _data: { tenant_id: order.tenant_id, order_number: order.order_number, amount: Number(order.total ?? 0), proof_url: data.publicUrl }, _output: { cash_impact: true, journal_required: true, appears_in_report: true } }).then(() => null);
    toast.success("تم حفظ صورة تحويل InstaPay وتسجيل الدفع");
    load();
  }

  async function registerCustomerReturn(unit: ServiceUnit) {
    if (!hasRole("owner", "ops_manager", "cs_manager")) return toast.error("تسجيل مرتجع العميل للإدارة وخدمة العملاء فقط");
    const typeRaw = prompt("نوع المرتجع؟ اكتب: تنظيف أو كي أو تصليح أو أخرى", "تنظيف");
    if (typeRaw === null) return;
    const t = typeRaw.trim();
    const returnType = /كي/.test(t) ? "reiron" : /تصليح|repair/.test(t) ? "repair" : /اخرى|أخرى|other/.test(t) ? "other" : "reclean";
    const reason = prompt("سبب المرتجع من العميل؟");
    if (reason === null) return;
    if (reason.trim().length < 3) return toast.error("سبب المرتجع مطلوب");
    const { error } = await (supabase as any).rpc("register_customer_return", {
      _order_id: id,
      _service_unit_id: unit.id,
      _return_type: returnType,
      _reason: reason.trim(),
      _photo_url: null,
      _billable: false,
      _amount: 0,
    });
    if (error) toast.error(error.message); else { toast.success("تم تسجيل مرتجع العميل وربطه بالقطعة والمحطات"); load(); }
  }

  async function completeCustomerReturn(row: any) {
    const note = prompt("ملاحظات إغلاق المرتجع؟", "تم الحل والتسليم للعميل");
    if (note === null) return;
    const { error } = await (supabase as any).rpc("complete_customer_return", { _return_id: row.id, _notes: note });
    if (error) toast.error(error.message); else { toast.success("تم إغلاق مرتجع العميل"); load(); }
  }

  async function cancelOrder() {
    if (!hasRole("owner")) return toast.error("إلغاء الطلب بالكامل للمالك فقط");
    const reason = prompt("سبب إلغاء الطلب بالكامل؟");
    if (reason === null) return;
    if (reason.trim().length < 3) return toast.error("لا يمكن إلغاء الطلب بدون سبب واضح");
    const { error } = await (supabase as any).rpc("cancel_order_with_reason", { _order_id: id, _reason: reason.trim() });
    if (!error) await (supabase as any).rpc("record_operation_event", { _process_key: "order_cancelled", _process_name: "إلغاء طلب", _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: null, _report_bucket: "orders/reports", _requires_notification: true, _data: { tenant_id: order.tenant_id, order_number: order.order_number, reason: reason.trim(), total: Number(order.total ?? 0) }, _output: { cash_impact: false, journal_required: Number(order.total ?? 0) > 0, appears_in_report: true } }).then(() => null);
    if (error) toast.error(error.message); else { toast.success("تم إلغاء الطلب وتسجيل السبب"); load(); }
  }

  async function overrideCloseOrder() {
    if (!hasRole("owner", "ops_manager")) return toast.error("صلاحية مدير التشغيل أو المالك فقط");
    const reason = prompt("سبب إغلاق الطلب بتجاوز التحقق؟", "رقم هاتف العميل غير مكتمل / تسليم مؤكد يدوياً");
    if (reason === null) return;
    const { error } = await supabase.from("orders").update({ status: "delivered", payment_status: "paid", notes: `${order.notes ?? ""}\n[OVERRIDE DELIVERY] ${reason}`.trim() }).eq("id", id);
    if (!error) {
      await supabase.from("order_status_history").insert({ order_id: id, from_status: order.status, to_status: "delivered", changed_by: user?.id, notes: `إغلاق بتجاوز التحقق: ${reason}` });
      await (supabase as any).rpc("record_operation_event", { _process_key: "order_delivered_override", _process_name: "تسليم طلب بتجاوز", _source_type: "order", _source_id: id, _branch_id: order.branch_id ?? null, _cash_account_id: null, _report_bucket: "orders/delivery", _requires_notification: true, _data: { tenant_id: order.tenant_id, order_number: order.order_number, reason }, _output: { cash_impact: order.payment_status !== "paid", journal_required: order.payment_status !== "paid", appears_in_report: true } }).then(() => null);
      toast.success("تم إغلاق الطلب بتجاوز التحقق");
      load();
    } else toast.error(error.message);
  }

  function printLabels() {
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>Labels</title><style>
      @page{size:50mm 30mm;margin:2mm} body{font-family:Arial,sans-serif;margin:0;color:#111}.label{width:46mm;height:26mm;border:1px dashed #999;margin:1mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;text-align:center}.code{font-size:18px;font-weight:900}.name{font-size:13px;font-weight:700}.meta{font-size:10px;color:#444}
    </style></head><body>${units.map((u) => `<div class="label"><div class="code">${u.label_code}</div><div class="name">${u.name}</div><div class="meta">طلب #${order.order_number} — ${order.customers?.full_name ?? ""}</div></div>`).join("")}</body></html>`;
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return toast.error("المتصفح منع فتح نافذة الطباعة");
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!order) return <div className="p-8 text-center text-muted-foreground">{t("order.notFound")}</div>;

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
            <h1 className="text-2xl font-bold">{t("order.orderNo", "طلب #{order}").replace("{order}", String(order.order_number))}</h1>
            <p className="text-sm text-muted-foreground">{order.customers?.full_name} · {order.customers?.phone}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintInvoiceButton order={{ ...order, customers: order.customers, order_items: order.order_items ?? [] }} />
          <Button variant={order.payment_status === "paid" ? "default" : "outline"} onClick={togglePayment} className={order.payment_status === "paid" ? "bg-emerald-600" : ""}>
            {order.payment_status === "paid" ? t("order.paid") : t("order.recordPayment")}
          </Button>
          {(order.payment_method === "instapay" || order.payment_method === "cod_instapay") && canEdit && (
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPaymentProof(e.target.files[0])} />
              <Button type="button" variant={order.payment_proof_url ? "default" : "outline"} disabled={proofUploading} asChild>
                <span>{proofUploading ? <Loader2 className="w-4 h-4 animate-spin ms-1" /> : <Upload className="w-4 h-4 ms-1" />} {t("order.instapayProof")}</span>
              </Button>
            </label>
          )}
          {order.payment_proof_url && <Button asChild variant="outline"><a href={order.payment_proof_url} target="_blank" rel="noreferrer"><ImageIcon className="w-4 h-4 ms-1" /> {t("order.viewReceipt")}</a></Button>}
          {hasRole("owner") && order.status !== "cancelled" && <Button variant="destructive" onClick={cancelOrder}>{t("order.cancelWithReason")}</Button>}
          {hasRole("owner", "ops_manager") && order.status !== "delivered" && order.status !== "cancelled" && <Button variant="destructive" onClick={overrideCloseOrder}>{t("order.overrideClose")}</Button>}
          <Button variant="outline" onClick={printLabels} disabled={!units.length}><Printer className="w-4 h-4 ms-1" /> {t("order.printLabels")}</Button>
          {canEdit && <Button onClick={assignIroning} disabled={assigning || !units.length}><Scale className="w-4 h-4 ms-1" /> {assigning ? t("order.assigning") : t("order.assignIroning")}</Button>}
          <StatusBadge level={statusLevel(order.status)} label={t(`track.step.${order.status}`, order.status)} />
        </div>
      </div>

      <OrderIssuePanel issues={issueList} />

      <div className="grid md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("order.piecesCount")}</div><div className="text-xl font-black">{pieceCount}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("order.shirtsCount")}</div><div className="text-xl font-black">{shirtCount}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("order.piecesValue")}</div><div className="text-xl font-black">{invoiceValue.toLocaleString()} {t("common.egp")}</div></CardContent></Card>
        <Card className={recleanUnits.length ? "border-amber-300 bg-amber-50" : ""}><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("order.recleanCount")}</div><div className="text-xl font-black">{recleanUnits.length}</div></CardContent></Card>
      </div>

      <OrderTimeline order={order} units={units} historyRows={historyRows} pickupRows={pickupRows} cancelRows={cancelRows} qcRows={qcRows} operationRows={operationRows} attachmentRows={attachmentRows} cashRows={cashRows} journalRows={journalRows} messageRows={messageRows} employeeLedgerRows={employeeLedgerRows} customerReturnRows={customerReturnRows} />

      {customerReturnRows.length > 0 && <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><RotateCcw className="w-4 h-4 text-amber-600" /> {t("order.customerReturnsTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {customerReturnRows.map((r) => <div key={r.id} className={`rounded-xl border p-3 text-sm ${r.status === "resolved" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><b>{r.service_units?.label_code}</b> — {r.service_units?.name} · {returnTypeAr(r.return_type, t)} · {returnStatusAr(r.status, t)}</div>
              {r.status !== "resolved" && <Button size="sm" onClick={() => completeCustomerReturn(r)}>{t("order.closeReturn")}</Button>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{t("order.reason")}: {r.reason}</div>
          </div>)}
        </CardContent>
      </Card>}


      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-teal-600" /> {t("order.invoiceEditTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {canEdit && <div className="flex gap-2">
            <Select onValueChange={addInvoiceService}>
              <SelectTrigger><SelectValue placeholder={t("order.addInvoiceItem")} /></SelectTrigger>
              <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {Number(s.unit_price).toLocaleString()} {t("common.egp")}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={saveInvoiceChanges} disabled={invoiceSaving}>{invoiceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={finalizeAndNotify}><Send className="w-4 h-4 ms-1" /> {t("order.finalizeNotify")}</Button>
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
          <div className="rounded-xl bg-muted p-3 flex justify-between font-black"><span>{t("order.finalTotal")}</span><span>{invoiceTotals().total.toLocaleString()} {t("common.egp")}</span></div>
          {order.invoice_finalized_at && <Badge className="bg-emerald-600">{t("order.invoiceConfirmed")}</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Printer className="w-4 h-4 text-teal-600" /> {t("order.unitsTitle")} ({units.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {units.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("order.noUnits")}</p>}
          {units.map((u) => (
            <div key={u.id} className="grid md:grid-cols-[88px_1fr_auto] gap-3 p-3 border rounded-xl bg-card">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <Camera className="w-7 h-7 text-muted-foreground" />}
                </div>
                {canEdit && <label className="text-xs text-teal-700 cursor-pointer underline">
                  {uploading === u.id ? t("order.uploading") : t("order.photo")}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(u, e.target.files[0])} />
                </label>}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-lg">{u.label_code}</span>
                  <Badge variant="outline">{u.name}</Badge>
                  {u.is_shirt_like && <Badge className="bg-blue-600">{t("order.shirtLike")}</Badge>}
                  {u.needs_reclean && <Badge className="bg-amber-500"><RotateCcw className="w-3 h-3 ms-1" /> {t("order.recleanBadge")}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.attributes?.color ? `${t("order.color")}: ${u.attributes.color} · ` : ""}
                  {t("order.estimatedValue")}: {Number(u.line_value ?? 0).toLocaleString()} {t("common.egp")} · {t("order.effort")} ×{u.complexity_factor}
                </div>
                {canEdit && <div className="max-w-xs"><Select value={u.service_type} onValueChange={(v) => updateUnitService(u, v)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ironing">{t("stage.ironing")}</SelectItem><SelectItem value="both">{t("common.cleanIron")}</SelectItem><SelectItem value="cleaning">{t("common.repair")}</SelectItem></SelectContent></Select></div>}
                <div className="text-xs text-muted-foreground">
                  {t("order.ironingTech")}: <b>{u.employees?.full_name ?? t("order.notAssignedYet")}</b>
                </div>
                {u.customer_notes && <div className="text-xs text-amber-700">📝 {u.customer_notes}</div>}
                {u.needs_reclean && <div className="text-xs text-amber-700">{t("order.recleanReason")}: {u.reclean_reason} · {t("order.returnToSameTech")}</div>}
              </div>
              {canOperate && <div className="flex md:flex-col gap-2 justify-end">
                {order.status === "delivered" ? <Button size="sm" variant="outline" onClick={() => registerCustomerReturn(u)}><RotateCcw className="w-3 h-3 ms-1" /> {t("order.customerReturn")}</Button> : <Button size="sm" variant="outline" onClick={() => markReclean(u)}><AlertTriangle className="w-3 h-3 ms-1" /> {t("order.reclean")}</Button>}
                {u.needs_reclean && <Button size="sm" onClick={() => resolveReclean(u)}><CheckCircle2 className="w-3 h-3 ms-1" /> {t("order.cleaned")}</Button>}
              </div>}
            </div>
          ))}

          {canEdit && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-bold">{t("order.manualPiece")}</p>
              <div className="grid md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("order.pieceType")}</label>
                  <Select value={form.garment_type} onValueChange={(v) => setForm((f) => ({ ...f, garment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GARMENT_TYPES.map((item) => {
                      const label = item === "قميص" ? t("station.ironing.shirtLike") : item === "بلوزة" ? t("station.ironing.myShirts") : item === "بنطلون" ? "Pants" : item === "جاكيت" ? "Jacket" : item === "بدلة" ? "Suit" : item === "عباية" ? "Abaya" : item === "فستان" ? "Dress" : item === "تيشيرت" ? "T-shirt" : item === "جيبة" ? "Skirt" : item === "معطف" ? "Coat" : t("common.other");
                      return <SelectItem key={item} value={item}>{label}</SelectItem>;
                    })}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("order.color")}</label>
                  <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder={t("order.colorPlaceholder")} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("order.notes")}</label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={1} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("order.manualPieceHint")}</span>
                <Button onClick={addUnit} disabled={addingUnit} size="sm">
                  {addingUnit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ms-1" /> {t("order.addPiece")}</>}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



type OrderIssue = { title: string; detail: string; action: string; href?: string; tone: "red" | "amber" | "blue"; units?: ServiceUnit[] };

function buildOrderIssues(order: any, units: ServiceUnit[], pickups: any[], qcs: any[]): OrderIssue[] {
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

function OrderIssuePanel({ issues }: { issues: OrderIssue[] }) {
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
            {x.units.slice(0, 4).map((u) => <div key={u.id} className="flex items-center gap-1 rounded-lg bg-white/70 border px-2 py-1 text-[11px]">
              {u.photo_url && <img src={u.photo_url} className="w-6 h-6 rounded object-cover" />}
              <span className="font-bold">{u.label_code}</span><span>{u.name}</span>
            </div>)}
            {x.units.length > 4 && <span className="text-[11px] opacity-70">+{x.units.length - 4}</span>}
          </div> : null}
          <div className="text-xs font-bold mt-2">{t("order.nextStep")}: {x.action}</div>
        </div>;
        return x.href ? <Link key={i} to={x.href as any}>{body}</Link> : <div key={i}>{body}</div>;
      })}
    </CardContent>
  </Card>;
}

function returnTypeAr(t: string, fn: any) { return ({ reclean: fn("return.type.reclean", "إعادة تنظيف"), reiron: fn("return.type.reiron", "إعادة كي"), repair: fn("return.type.repair", "تصليح"), refund: fn("return.type.refund", "رد مبلغ"), other: fn("return.type.other", "أخرى") } as Record<string,string>)[t] ?? t; }
function returnStatusAr(s: string, fn: any) { return ({ open: fn("return.status.open", "مفتوح"), in_cleaning: fn("return.status.in_cleaning", "في التنظيف"), in_ironing: fn("return.status.in_ironing", "في الكي"), in_packing: fn("return.status.in_packing", "في التغليف"), in_qc: fn("return.status.in_qc", "في الجودة"), ready_for_delivery: fn("return.status.ready_for_delivery", "جاهز للتسليم"), resolved: fn("return.status.resolved", "مغلق"), cancelled: fn("return.status.cancelled", "ملغي") } as Record<string,string>)[s] ?? s; }

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

function OrderTimeline({
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