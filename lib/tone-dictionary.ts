/**
 * MJRH V2 — Tone Dictionary (Sprint 0)
 * Human language layer. Components pull strings from here instead of
 * hardcoding technical phrasing. Per-tenant overrides come from
 * tenant_vertical_config.tone_dictionary and are merged on top of these.
 */

export const DEFAULT_TONE_AR = {
  // Alerts / Anti-leakage
  late_orders_one: "عميل واحد ينتظرك الآن",
  late_orders_many: "{count} عملاء ينتظرونك الآن",
  rework_rate: "{n} من كل 100 قطعة تحتاج جهداً إضافياً",
  stuck_unit: "قطعة في طلب #{order} محتاجة انتباه — متأخرة عن المعتاد",
  lost_customer: "{count} عملاء لم يعودوا منذ شهر — كانوا منتظمين",
  performance_drop: "ملاحظة: إنتاجية محطة {stage} أقل من المعتاد اليوم",

  // Daily digest
  tasks_completed: "أنجزت {count} مهمة اليوم 🎉",
  tasks_completed_team: "الفريق أنجز {count} مهمة اليوم",
  performance_top: "أنت ضمن أفضل {pct}% هذا الأسبوع",
  daily_net: "صافي اليوم: {amount} ج",
  pieces_ready: "{count} قطعة جاهزة للتسليم",

  // Next task
  next_task_title: "المهمة التالية",
  next_task_scan_in: "Scan لبدء العمل",
  next_task_scan_out: "Scan لإنهاء وتسليم للمحطة التالية",
  next_task_empty: "لا توجد مهام في الانتظار — أحسنت! ✅",

  // Status labels
  status_on_time: "في الموعد",
  status_attention: "قريب من الموعد",
  status_urgent: "متأخر",
  status_waiting: "في الانتظار",

  // Achievements
  achv_record_day: "{name} أنجز {count} قطعة اليوم — أعلى رقم هذا الأسبوع!",
  achv_speed_improve: "متوسط وقتك في المحطة تحسّن {pct}% عن الأسبوع الماضي",
} as const;

export type ToneKey = keyof typeof DEFAULT_TONE_AR;

/** Merge tenant-specific overrides on top of the default dictionary */
export function getToneDictionary(tenantOverrides?: Record<string, string>) {
  return { ...DEFAULT_TONE_AR, ...(tenantOverrides ?? {}) };
}

/** Replace {placeholders} in a tone string with actual values */
export function tone(
  dict: Record<string, string>,
  key: ToneKey,
  vars: Record<string, string | number> = {}
): string {
  let str = dict[key] ?? DEFAULT_TONE_AR[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
  }
  return str;
}
