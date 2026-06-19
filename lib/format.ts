export function fmtMoney(n: number | string | null | undefined, currency = "ج.م") {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
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

export const PAYMENT_STATUS_AR: Record<string, string> = {
  paid: "مدفوع",
  unpaid: "غير مدفوع",
};

export const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: "نقدي",
  instapay: "InstaPay",
  cod_cash: "دفع عند الاستلام - نقدي",
  cod_instapay: "دفع عند الاستلام - InstaPay",
};

export const ORDER_TYPE_AR: Record<string, string> = {
  walk_in: "داخلي",
  delivery: "توصيل",
};

export const SERVICE_TYPE_AR: Record<string, string> = {
  cleaning: "تنظيف",
  ironing: "كي",
  both: "تنظيف وكي",
};
