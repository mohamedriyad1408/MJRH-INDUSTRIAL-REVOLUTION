export const BASE_CONTINUOUS_SLOTS = [
  "اليوم 08:00 - 10:00 صباحاً",
  "اليوم 10:00 - 12:00 ظهراً",
  "اليوم 12:00 - 02:00 مساءً",
  "اليوم 02:00 - 04:00 مساءً",
  "اليوم 04:00 - 06:00 مساءً",
  "اليوم 06:00 - 08:00 مساءً",
  "اليوم 08:00 - 10:00 مساءً",
  "غداً 08:00 - 10:00 صباحاً",
  "غداً 10:00 - 12:00 ظهراً",
  "غداً 12:00 - 02:00 مساءً",
  "غداً 02:00 - 04:00 مساءً",
  "غداً 04:00 - 06:00 مساءً",
  "غداً 06:00 - 08:00 مساءً",
  "غداً 08:00 - 10:00 مساءً",
];

export type SlotPressureInfo = {
  slot: string;
  count: number;
  level: "normal" | "normal_peak" | "medium" | "severe";
  label: string;
  badge: string;
  disabled: boolean;
  colorClass: string;
  bgClass: string;
};

/**
 * Dynamic Surge & Scheduling Density Algorithm
 * Evaluates real active order density on any given 2-hour scheduling window.
 * Rules:
 *  - count <= 3: Normal density (انسيابي)
 *  - count 4 or 5: Normal Peak (ذروة عادية 🟡)
 *  - count 6 or 7: Medium Peak (ذروة متوسطة 🟠)
 *  - count > 7: Severe Peak (ذروة شديدة 🔴 - ممتلئ تماماً، ويتم إغلاق الموعد إجباريًا)
 */
export function calculateSlotPressure(orders: any[], slotName: string): SlotPressureInfo {
  // Count real active orders assigned to this slot
  const activeInSlot = (orders || []).filter((o: any) => {
    if (!o || ["delivered", "cancelled"].includes(o?.status)) return false;
    const pSlot = o.pickup_slot || o.pickup_status;
    const dSlot = o.delivery_slot;
    const notes = o.notes || "";
    return pSlot === slotName || dSlot === slotName || notes.includes(slotName);
  }).length;

  const totalLoad = activeInSlot;

  if (totalLoad > 7) {
    return {
      slot: slotName,
      count: totalLoad,
      level: "severe",
      label: "🔴 ذروة شديدة - الموعد ممتلئ تماماً (يرجى اختيار موعد آخر)",
      badge: "ممتلئ (غير متاح)",
      disabled: true,
      colorClass: "text-red-700 font-black",
      bgClass: "bg-red-50 border-red-300",
    };
  }

  if (totalLoad >= 6) {
    return {
      slot: slotName,
      count: totalLoad,
      level: "medium",
      label: "🟠 ذروة متوسطة (ضغط تشغيلي مرتفع في هذا التوقيت)",
      badge: "ذروة متوسطة",
      disabled: false,
      colorClass: "text-orange-700 font-bold",
      bgClass: "bg-orange-50 border-orange-300",
    };
  }

  if (totalLoad >= 4) {
    return {
      slot: slotName,
      count: totalLoad,
      level: "normal_peak",
      label: "🟡 ذروة عادية (كثافة طلبات متوسطة)",
      badge: "ذروة عادية",
      disabled: false,
      colorClass: "text-amber-700 font-bold",
      bgClass: "bg-amber-50 border-amber-300",
    };
  }

  return {
    slot: slotName,
    count: totalLoad,
    level: "normal",
    label: "🟢 متاح (توقيت انسيابي وسريع للاستلام والتسليم)",
    badge: "متاح وسريع",
    disabled: false,
    colorClass: "text-emerald-700 font-semibold",
    bgClass: "bg-emerald-50/60 border-emerald-200",
  };
}

export function getSurgeReportData(orders: any[]) {
  const slots = BASE_CONTINUOUS_SLOTS.map((s) => calculateSlotPressure(orders, s));
  const normalCount = slots.filter((s) => s.level === "normal").length;
  const normalPeakCount = slots.filter((s) => s.level === "normal_peak").length;
  const mediumPeakCount = slots.filter((s) => s.level === "medium").length;
  const severePeakCount = slots.filter((s) => s.level === "severe").length;

  return {
    slots,
    normalCount,
    normalPeakCount,
    mediumPeakCount,
    severePeakCount,
  };
}
