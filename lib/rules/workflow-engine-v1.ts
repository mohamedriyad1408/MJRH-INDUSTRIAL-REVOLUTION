import { supabase } from "@/integrations/supabase/client";

/* ==========================================
 * 1. GARMENT TYPE ENGINE
 * ========================================== */
export type GarmentProfile = {
  code: string;
  nameKey: string;
  need_wash: boolean;
  need_dry: boolean;
  need_iron: boolean;
  need_dry_clean: boolean;
  need_qc: boolean;
  need_packaging: boolean;
  target_sla_mins: number;
  max_sla_mins: number;
};

export const GARMENT_PROFILES: Record<string, GarmentProfile> = {
  shirt: { code: "shirt", nameKey: "garment.shirt", need_wash: true, need_dry: true, need_iron: true, need_dry_clean: false, need_qc: true, need_packaging: true, target_sla_mins: 180, max_sla_mins: 360 },
  suit_blazer: { code: "suit_blazer", nameKey: "garment.suit_blazer", need_wash: false, need_dry: false, need_iron: true, need_dry_clean: true, need_qc: true, need_packaging: true, target_sla_mins: 240, max_sla_mins: 480 },
  suit_pants: { code: "suit_pants", nameKey: "garment.suit_pants", need_wash: false, need_dry: false, need_iron: true, need_dry_clean: true, need_qc: true, need_packaging: true, target_sla_mins: 240, max_sla_mins: 480 },
  dress: { code: "dress", nameKey: "garment.dress", need_wash: true, need_dry: true, need_iron: true, need_dry_clean: false, need_qc: true, need_packaging: true, target_sla_mins: 240, max_sla_mins: 480 },
  blanket: { code: "blanket", nameKey: "garment.blanket", need_wash: true, need_dry: true, need_iron: false, need_dry_clean: false, need_qc: true, need_packaging: true, target_sla_mins: 360, max_sla_mins: 720 },
  carpet: { code: "carpet", nameKey: "garment.carpet", need_wash: true, need_dry: true, need_iron: false, need_dry_clean: false, need_qc: true, need_packaging: true, target_sla_mins: 480, max_sla_mins: 960 },
};

/* ==========================================
 * 2. SUIT MANAGEMENT (GARMENT SET)
 * ========================================== */
export type GarmentSetInfo = {
  setId: string;
  setName: string;
  totalPieces: number;
  pieces: { id: string; qrCode: string; name: string; profileCode: string }[];
};

export function generateGarmentSet(orderId: string, setType: "suit_2pc" | "suit_3pc"): GarmentSetInfo {
  const setId = `set-${Math.random().toString(36).substring(2, 9)}`;
  const prefix = `QR-${orderId.substring(0, 4)}-${setId.substring(4, 8)}`;
  if (setType === "suit_2pc") {
    return {
      setId,
      setName: "بدلة رجالي قطعتين (Suit 2-Piece)",
      totalPieces: 2,
      pieces: [
        { id: `${setId}-1`, qrCode: `${prefix}-P1`, name: "بليزر بدلة", profileCode: "suit_blazer" },
        { id: `${setId}-2`, qrCode: `${prefix}-P2`, name: "بنطلون بدلة", profileCode: "suit_pants" },
      ],
    };
  }
  return {
    setId,
    setName: "بدلة رجالي 3 قطع (Suit 3-Piece)",
    totalPieces: 3,
    pieces: [
      { id: `${setId}-1`, qrCode: `${prefix}-P1`, name: "بليزر بدلة", profileCode: "suit_blazer" },
      { id: `${setId}-2`, qrCode: `${prefix}-P2`, name: "بنطلون بدلة", profileCode: "suit_pants" },
      { id: `${setId}-3`, qrCode: `${prefix}-P3`, name: "فيست بدلة", profileCode: "suit_blazer" },
    ],
  };
}

/* ==========================================
 * 3. QC WORKFLOW ENGINE
 * ========================================== */
export type QcRejectDestination = "return_to_wash" | "return_to_iron" | "return_to_packaging" | "supervisor_review" | "hold";

export async function submitQcRejection(params: {
  unitId: string;
  destination: QcRejectDestination;
  reason: string;
  notes: string;
  employeeId: string;
  reworkCount: number;
}) {
  if (!params.reason || params.reason.trim().length < 3) {
    throw new Error("لا يمكن رفض القطعة في الجودة بدون تسجيل سبب صريح.");
  }
  const targetStage = params.destination === "return_to_wash" ? "cleaning" : params.destination === "return_to_iron" ? "ironing" : params.destination === "return_to_packaging" ? "packing" : "qc_hold";
  
  const { error } = await supabase.from("service_units").update({
    current_stage: targetStage,
    needs_reclean: params.destination === "return_to_wash",
    reclean_reason: `${params.reason} — ${params.notes}`,
    reclean_reported_at: new Date().toISOString(),
  }).eq("id", params.unitId);
  if (error) throw error;

  await recordAuditLog(params.employeeId, `qc_reject_${params.destination}`, { unitId: params.unitId, rework: params.reworkCount }, { stage: targetStage, reason: params.reason }, params.notes);
  return true;
}

/* ==========================================
 * 4. PACKAGING & DELIVERY VALIDATION
 * ========================================== */
export type PackagingSummary = {
  expectedPieces: number;
  packedPieces: number;
  remainingPieces: number;
  missingUnits: { id: string; qrCode: string; name: string; stage: string }[];
  status: "complete" | "incomplete_order";
};

export function validatePackagingGate(units: { id: string; qr_code?: string; name: string; current_stage: string | null }[]): PackagingSummary {
  const active = units.filter((u) => u.current_stage !== "cancelled");
  const expectedPieces = active.length;
  const packedPieces = active.filter((u) => ["packing_done", "qc_passed", "ready", "out_for_delivery", "delivered"].includes(String(u.current_stage ?? ""))).length;
  const remainingPieces = expectedPieces - packedPieces;
  const missingUnits = active.filter((u) => !["packing_done", "qc_passed", "ready", "out_for_delivery", "delivered"].includes(String(u.current_stage ?? ""))).map((u) => ({ id: u.id, qrCode: u.qr_code ?? `QR-${u.id.substring(0,6)}`, name: u.name, stage: u.current_stage ?? "unknown" }));

  return {
    expectedPieces,
    packedPieces,
    remainingPieces,
    missingUnits,
    status: remainingPieces === 0 ? "complete" : "incomplete_order",
  };
}

export function validateDeliveryGate(summary: PackagingSummary, isManagerOverride: boolean): { ok: boolean; error?: string } {
  if (summary.status === "incomplete_order" && !isManagerOverride) {
    return { ok: false, error: `لا يمكن تسليم طلب ناقص (تم تغليف ${summary.packedPieces} من أصل ${summary.expectedPieces} قطع). يرجى مراجعة القطع الناقصة أو استخدام صلاحية المدير للإلزام.` };
  }
  return { ok: true };
}

/* ==========================================
 * 5. REWORK MODULE
 * ========================================== */
export async function createReworkOrder(originalOrderId: string, originalOrderNumber: number, reworkIndex: number, reason: string) {
  const reworkSuffix = `-R${reworkIndex}`;
  const notes = `إعادة تشغيل للطلب #${originalOrderNumber} — السبب: ${reason}`;
  
  // Clone order basic structure without modifying original order
  const { data: ord, error: fetchErr } = await supabase.from("orders").select("*").eq("id", originalOrderId).single();
  if (fetchErr) throw fetchErr;

  const { data: newOrd, error: insErr } = await supabase.from("orders").insert({
    tenant_id: ord.tenant_id,
    customer_id: ord.customer_id,
    branch_id: ord.branch_id,
    order_type: ord.order_type,
    status: "received",
    payment_status: "paid", // Rework is free/linked
    subtotal: 0, total: 0,
    notes,
  }).select().single();
  if (insErr) throw insErr;

  await recordAuditLog("system", "create_rework_order", { originalOrderId }, { reworkOrderId: newOrd.id, reworkCode: `${originalOrderNumber}${reworkSuffix}` }, reason);
  return { id: newOrd.id, reworkCode: `${originalOrderNumber}${reworkSuffix}` };
}

/* ==========================================
 * 6. SLA ENGINE
 * ========================================== */
export type SlaStatus = "Green" | "Yellow" | "Red";

export function calculateSlaStatus(createdAt: string, targetMins: number, maxMins: number): { elapsedMins: number; status: SlaStatus; color: string } {
  const elapsedMins = Math.round((Date.now() - new Date(createdAt).getTime()) / (60 * 1000));
  if (elapsedMins < targetMins) return { elapsedMins, status: "Green", color: "#10b981" };
  if (elapsedMins < maxMins) return { elapsedMins, status: "Yellow", color: "#f59e0b" };
  return { elapsedMins, status: "Red", color: "#ef4444" };
}

/* ==========================================
 * 7. AUDIT LOG ENGINE & CANCEL REASONS
 * ========================================== */
export async function recordAuditLog(actor: string, action: string, beforeState: any, afterState: any, reason: string) {
  const payload = { actor, action, before_state: beforeState, after_state: afterState, reason, logged_at: new Date().toISOString() };
  await supabase.from("notifications").insert({
    tenant_id: beforeState?.tenant_id ?? afterState?.tenant_id ?? null,
    title: `Audit Log: ${action}`,
    message: `المنفذ: ${actor} | السبب: ${reason}`,
    audience: ["owner"],
    tone: "blue",
  }).then(() => null);
  return payload;
}

export async function validateCancelReason(reasonCode: string, explanation: string) {
  if (!reasonCode || reasonCode.trim().length === 0) {
    throw new Error("لا يسمح النظام بإلغاء الطلب بدون تسجيل Reason Code صريح.");
  }
  if (explanation.trim().length < 3) {
    throw new Error("يرجى كتابة تفاصيل سبب الإلغاء بدقة.");
  }
  return true;
}
