// ── Multi-Currency Support ──────────────────────────────────────────
export type CurrencyCode = "EGP" | "USD" | "EUR" | "SAR" | "AED" | "QAR" | "KWD" | "BHD";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  /** Locale used for number formatting */
  locale: string;
  /** Where to place the symbol */
  position: "before" | "after";
  /** Default display label (Arabic) */
  labelAr: string;
  /** Default display label (English) */
  labelEn: string;
  /** Fraction digits for display */
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  EGP: { code: "EGP", symbol: "ج.م", locale: "ar-EG", position: "after", labelAr: "جنيه مصري", labelEn: "Egyptian Pound", decimals: 2 },
  USD: { code: "USD", symbol: "$", locale: "en-US", position: "before", labelAr: "دولار أمريكي", labelEn: "US Dollar", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", locale: "de-DE", position: "before", labelAr: "يورو", labelEn: "Euro", decimals: 2 },
  SAR: { code: "SAR", symbol: "ر.س", locale: "ar-SA", position: "after", labelAr: "ريال سعودي", labelEn: "Saudi Riyal", decimals: 2 },
  AED: { code: "AED", symbol: "د.إ", locale: "ar-AE", position: "after", labelAr: "درهم إماراتي", labelEn: "UAE Dirham", decimals: 2 },
  QAR: { code: "QAR", symbol: "ر.ق", locale: "ar-QA", position: "after", labelAr: "ريال قطري", labelEn: "Qatari Riyal", decimals: 2 },
  KWD: { code: "KWD", symbol: "د.ك", locale: "ar-KW", position: "after", labelAr: "دينار كويتي", labelEn: "Kuwaiti Dinar", decimals: 3 },
  BHD: { code: "BHD", symbol: "د.ب", locale: "ar-BH", position: "after", labelAr: "دينار بحريني", labelEn: "Bahraini Dinar", decimals: 3 },
};

/** Get the short currency label (e.g., "جنيه", "$", "ر.س") */
export function currencyLabel(code: CurrencyCode | string | undefined, lang?: string): string {
  const cfg = CURRENCIES[(code || "EGP").toUpperCase() as CurrencyCode];
  if (!cfg) return code || "EGP";
  return lang === "en" || lang === "en-US" ? cfg.labelEn : cfg.labelAr;
}

/** Get currency symbol */
export function currencySymbol(code: CurrencyCode | string | undefined): string {
  const cfg = CURRENCIES[(code || "EGP").toUpperCase() as CurrencyCode];
  return cfg?.symbol || code || "";
}

/**
 * Format a monetary value with proper currency symbol and locale.
 * Backward-compatible: if `currency` is a plain string like "جنيه", it's used as-is.
 */
export function fmtMoney(n: number | string | null | undefined, currency?: string) {
  const v = Number(n ?? 0);
  const code = (currency || "EGP").toUpperCase() as CurrencyCode;
  const cfg = CURRENCIES[code];

  if (cfg) {
    const hasFractions = cfg.decimals > 0 || Math.abs(v % 1) > 0.001;
    const formatted = v.toLocaleString(cfg.locale, {
      minimumFractionDigits: hasFractions ? cfg.decimals : 0,
      maximumFractionDigits: cfg.decimals,
    });
    return cfg.position === "before" ? `${cfg.symbol}${formatted}` : `${formatted} ${cfg.symbol}`;
  }

  // Backward compatibility: plain string label
  const hasFractions = Math.abs(v % 1) > 0.001;
  const formatted = v.toLocaleString("en-US", {
    minimumFractionDigits: hasFractions ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency || "جنيه"}`;
}

/** Format money using short label (for i18n contexts) */
export function fmtMoneyShort(n: number | string | null | undefined, currencyCode?: string, lang?: string): string {
  const label = currencyLabel(currencyCode, lang);
  return fmtMoney(n, currencyCode || label);
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
