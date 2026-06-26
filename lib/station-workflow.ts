import { supabase } from "@/integrations/supabase/client";

type OrderStatus = "received" | "cleaning" | "ironing" | "packing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

type Unit = {
  id: string;
  service_type: string;
  current_stage: string | null;
  needs_reclean: boolean | null;
  ironing_completed_at?: string | null;
  status?: string | null;
  label_status?: string | null;
  assembly_checked_at?: string | null;
};

export async function validateOrderMove(orderId: string, to: OrderStatus) {
  const { data: order, error: oErr } = await (supabase as any)
    .from("orders")
    .select("id,order_number,status,payment_status,payment_method,assigned_driver_employee_id")
    .eq("id", orderId)
    .single();
  if (oErr) return { ok: false, message: oErr.message };

  const { data: rawUnits, error: uErr } = await (supabase as any)
    .from("service_units")
    .select("id,service_type,current_stage,needs_reclean,ironing_completed_at,status,label_status,assembly_checked_at")
    .eq("order_id", orderId);
  if (uErr) return { ok: false, message: uErr.message };

  const units = ((rawUnits ?? []) as Unit[]).filter((u) => u.status !== "cancelled" && u.current_stage !== "cancelled");
  const reclean = units.filter((u) => u.needs_reclean);

  if (["cleaning", "ironing", "packing", "ready"].includes(to) && units.length === 0) {
    return { ok: false, message: "لا يمكن تشغيل طلب بلا قطع. افتح الطلب وسجل القطع أولًا." };
  }

  if (reclean.length && ["ironing", "packing", "ready", "out_for_delivery", "delivered"].includes(to)) {
    return { ok: false, message: `يوجد ${reclean.length} قطعة مرتجع غسيل. يجب إنهاء المرتجعات أولًا.` };
  }

  const labelIssues = units.filter((u) => u.label_status && u.label_status !== "labeled");
  if (labelIssues.length && ["packing", "ready", "out_for_delivery", "delivered"].includes(to)) {
    return { ok: false, message: `يوجد ${labelIssues.length} قطعة بمشكلة مارك/ليبل. يجب حلها في محطة التجفيف والتجميع أولًا.` };
  }

  if (to === "ironing") {
    const notCleaned = units.filter((u) => ["both", "cleaning"].includes(u.service_type) && u.current_stage !== "cleaning_done");
    if (notCleaned.length) return { ok: false, message: `يوجد ${notCleaned.length} قطعة لم يتم تأكيد تنظيفها بعد.` };
  }

  if (to === "packing") {
    const notAssembled = units.filter((u) => ["both", "cleaning"].includes(u.service_type) && ["cleaning", "cleaning_done", "drying_assembly"].includes(String(u.current_stage ?? "")));
    if (notAssembled.length) return { ok: false, message: `يوجد ${notAssembled.length} قطعة لم تمر بالتجفيف والتجميع بعد.` };
    const notIroned = units.filter((u) => ["both", "ironing"].includes(u.service_type) && !u.ironing_completed_at && u.current_stage !== "ironing_done" && u.current_stage !== "qc_passed");
    if (notIroned.length) return { ok: false, message: `يوجد ${notIroned.length} قطعة لم يتم تأكيد كيها بعد.` };
  }

  if (to === "ready") {
    const notChecked = units.filter((u) => u.current_stage !== "qc_passed");
    if (notChecked.length) return { ok: false, message: `يوجد ${notChecked.length} قطعة لم تعتمد من الجودة. افتح محطة الجودة أولًا.` };
  }

  if (to === "out_for_delivery") {
    if (!order.assigned_driver_employee_id) return { ok: false, message: "لا يمكن خروج الطلب للتسليم قبل تعيين مندوب." };
  }

  if (to === "delivered") {
    if (order.payment_status !== "paid") return { ok: false, message: "لا يمكن تسليم الطلب قبل تسجيل الدفع أو التحصيل." };
  }

  return { ok: true, message: "" };
}
