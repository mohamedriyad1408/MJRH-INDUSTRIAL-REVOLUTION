export function fmtMoney(n: number | string | null | undefined, currency = "جنيه") {
  const v = Number(n ?? 0);
  const hasFractions = Math.abs(v % 1) > 0.001;
  const formatted = v.toLocaleString("en-US", {
    minimumFractionDigits: hasFractions ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function fmtDate(d: string | Date | null | undefined, locale = "ar-EG") {
  if (!d) return "—";
  return new Date(d).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

export const ORDER_STATUS_AR: Record<string, string> = {
  received: "تم الاستلام",
  cleaning: "تنظيف",
  ironing: "كي",
  packing: "تغليف",
  ready: "جاهز للتسليم",
  out_for_delivery: "خرج للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export function orderStatusLabel(s: string, t: any) {
  return ({ received: t("common.status.order.received", "تم الاستلام"), cleaning: t("common.status.order.cleaning", "تنظيف"), ironing: t("common.status.order.ironing", "كي"), packing: t("common.status.order.packing", "تغليف"), ready: t("common.status.order.ready", "جاهز للتسليم"), out_for_delivery: t("common.status.order.out_for_delivery", "خرج للتسليم"), delivered: t("common.status.order.delivered", "تم التسليم"), cancelled: t("common.status.order.cancelled", "ملغي") } as Record<string,string>)[s] ?? s;
}

export const PAYMENT_STATUS_AR: Record<string, string> = {
  paid: "مدفوع",
  unpaid: "غير مدفوع",
};

export function paymentStatusLabel(s: string, t: any) {
  return ({ paid: t("common.status.payment.paid", "مدفوع"), unpaid: t("common.status.payment.unpaid", "غير مدفوع") } as Record<string,string>)[s] ?? s;
}

export const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: "نقدي",
  instapay: "InstaPay",
  cod_cash: "دفع عند الاستلام - نقدي",
  cod_instapay: "دفع عند الاستلام - InstaPay",
};

export function paymentMethodLabel(s: string, t: any) {
  return ({ cash: t("common.method.cash", "نقدي"), instapay: t("common.method.instapay", "InstaPay"), cod_cash: t("common.method.cod_cash", "دفع عند الاستلام - نقدي"), cod_instapay: t("common.method.cod_instapay", "دفع عند الاستلام - InstaPay") } as Record<string,string>)[s] ?? s;
}

export const ORDER_TYPE_AR: Record<string, string> = {
  walk_in: "داخلي",
  delivery: "توصيل",
};

export function orderTypeLabel(s: string, t: any) {
  return ({ walk_in: t("common.type.walk_in", "داخلي"), delivery: t("common.type.delivery", "توصيل") } as Record<string,string>)[s] ?? s;
}

export const SERVICE_TYPE_AR: Record<string, string> = {
  cleaning: "تنظيف",
  ironing: "كي",
  both: "تنظيف وكي",
};

export function serviceTypeLabel(s: string, t: any) {
  return ({ cleaning: t("common.services.typeCleaning", "تنظيف"), ironing: t("common.services.typeIroning", "كي"), both: t("common.services.typeBoth", "تنظيف وكي") } as Record<string,string>)[s] ?? s;
}
