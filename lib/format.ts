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
  return ({ received: t("status.order.received", "تم الاستلام"), cleaning: t("status.order.cleaning", "تنظيف"), ironing: t("status.order.ironing", "كي"), packing: t("status.order.packing", "تغليف"), ready: t("status.order.ready", "جاهز للتسليم"), out_for_delivery: t("status.order.out_for_delivery", "خرج للتسليم"), delivered: t("status.order.delivered", "تم التسليم"), cancelled: t("status.order.cancelled", "ملغي") } as Record<string,string>)[s] ?? s;
}

export const PAYMENT_STATUS_AR: Record<string, string> = {
  paid: "مدفوع",
  unpaid: "غير مدفوع",
};

export function paymentStatusLabel(s: string, t: any) {
  return ({ paid: t("status.payment.paid", "مدفوع"), unpaid: t("status.payment.unpaid", "غير مدفوع") } as Record<string,string>)[s] ?? s;
}

export const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: "نقدي",
  instapay: "InstaPay",
  cod_cash: "دفع عند الاستلام - نقدي",
  cod_instapay: "دفع عند الاستلام - InstaPay",
};

export function paymentMethodLabel(s: string, t: any) {
  return ({ cash: t("method.cash", "نقدي"), instapay: t("method.instapay", "InstaPay"), cod_cash: t("method.cod_cash", "دفع عند الاستلام - نقدي"), cod_instapay: t("method.cod_instapay", "دفع عند الاستلام - InstaPay") } as Record<string,string>)[s] ?? s;
}

export const ORDER_TYPE_AR: Record<string, string> = {
  walk_in: "داخلي",
  delivery: "توصيل",
};

export function orderTypeLabel(s: string, t: any) {
  return ({ walk_in: t("type.walk_in", "داخلي"), delivery: t("type.delivery", "توصيل") } as Record<string,string>)[s] ?? s;
}

export const SERVICE_TYPE_AR: Record<string, string> = {
  cleaning: "تنظيف",
  ironing: "كي",
  both: "تنظيف وكي",
};

export function serviceTypeLabel(s: string, t: any) {
  return ({ cleaning: t("services.typeCleaning", "تنظيف"), ironing: t("services.typeIroning", "كي"), both: t("services.typeBoth", "تنظيف وكي") } as Record<string,string>)[s] ?? s;
}
