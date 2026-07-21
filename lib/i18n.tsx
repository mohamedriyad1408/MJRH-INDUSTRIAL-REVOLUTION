import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { internalTranslations } from "./i18n-internal";
import { publicLanguagePacks } from "./i18n-public-packs";

// Domain JSON imports
import arCommon from "../src/locales/ar/common.json";
import enCommon from "../src/locales/en/common.json";
import arAccounting from "../src/locales/ar/accounting.json";
import enAccounting from "../src/locales/en/accounting.json";
import arToday from "../src/locales/ar/today.json";
import enToday from "../src/locales/en/today.json";
import arReports from "../src/locales/ar/reports.json";
import enReports from "../src/locales/en/reports.json";
import arOrders from "../src/locales/ar/orders.json";
import enOrders from "../src/locales/en/orders.json";
import arCustomer from "../src/locales/ar/customer.json";
import enCustomer from "../src/locales/en/customer.json";
import arSearch from "../src/locales/ar/search.json";
import enSearch from "../src/locales/en/search.json";
import arAttendance from "../src/locales/ar/attendance.json";
import enAttendance from "../src/locales/en/attendance.json";
import arScorecard from "../src/locales/ar/scorecard.json";
import enScorecard from "../src/locales/en/scorecard.json";
import arFairness from "../src/locales/ar/fairness.json";
import enFairness from "../src/locales/en/fairness.json";
import arIssues from "../src/locales/ar/issues.json";
import enIssues from "../src/locales/en/issues.json";
import arSettings from "../src/locales/ar/settings.json";
import enSettings from "../src/locales/en/settings.json";
import arFinance from "../src/locales/ar/finance.json";
import enFinance from "../src/locales/en/finance.json";
import arDriver from "../src/locales/ar/driver.json";
import enDriver from "../src/locales/en/driver.json";
import arMap from "../src/locales/ar/map.json";
import enMap from "../src/locales/en/map.json";
import arRoles from "../src/locales/ar/roles.json";
import enRoles from "../src/locales/en/roles.json";
import arSubs from "../src/locales/ar/subscriptions.json";
import enSubs from "../src/locales/en/subscriptions.json";
import arWFSettings from "../src/locales/ar/workflow-settings.json";
import enWFSettings from "../src/locales/en/workflow-settings.json";
import arWFFields from "../src/locales/ar/workflow-fields.json";
import enWFFields from "../src/locales/en/workflow-fields.json";
import arTrack from "../src/locales/ar/track.json";
import enTrack from "../src/locales/en/track.json";
import arLanding from "../src/locales/ar/landing.json";
import enLanding from "../src/locales/en/landing.json";
import arOperations from "../src/locales/ar/operations.json";
import enOperations from "../src/locales/en/operations.json";

export type LanguageCode = "ar" | "en" | "fr" | "it" | "es" | "de" | "zh" | "ja" | "pt";

export const SUPPORTED_LANGUAGES: { code: LanguageCode; nativeName: string; englishName: string; dir: "rtl" | "ltr" }[] = [
  { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl" },
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr" },
  { code: "fr", nativeName: "Français", englishName: "French", dir: "ltr" },
  { code: "it", nativeName: "Italiano", englishName: "Italian", dir: "ltr" },
  { code: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr" },
  { code: "de", nativeName: "Deutsch", englishName: "German", dir: "ltr" },
  { code: "zh", nativeName: "中文", englishName: "Chinese", dir: "ltr" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese", dir: "ltr" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese", dir: "ltr" },
];

const dict: Record<LanguageCode, Record<string, string>> = {
  ar: {}, en: {}, fr: {}, it: {}, es: {}, de: {}, zh: {}, ja: {}, pt: {},
};

const flatten = (obj: any, prefix = "") => {
  const res: any = {};
  if (!obj) return res;
  for (const k in obj) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(res, flatten(obj[k], key));
    } else {
      res[key] = String(obj[k]);
    }
  }
  return res;
};

const domains: any = {
  common: { ar: arCommon, en: enCommon },
  accounting: { ar: arAccounting, en: enAccounting },
  today: { ar: arToday, en: enToday },
  reports: { ar: arReports, en: enReports },
  orders: { ar: arOrders, en: enOrders },
  customer: { ar: arCustomer, en: enCustomer },
  search: { ar: arSearch, en: enSearch },
  attendance: { ar: arAttendance, en: enAttendance },
  scorecard: { ar: arScorecard, en: enScorecard },
  fairness: { ar: arFairness, en: enFairness },
  issues: { ar: arIssues, en: enIssues },
  settings: { ar: arSettings, en: enSettings },
  finance: { ar: arFinance, en: enFinance },
  driver: { ar: arDriver, en: enDriver },
  map: { ar: arMap, en: enMap },
  roles: { ar: arRoles, en: enRoles },
  subscriptions: { ar: arSubs, en: enSubs },
  "workflow-settings": { ar: arWFSettings, en: enWFSettings },
  "workflow-fields": { ar: arWFFields, en: enWFFields },
  track: { ar: arTrack, en: enTrack },
  landing: { ar: arLanding, en: enLanding },
  operations: { ar: arOperations, en: enOperations },
};

Object.keys(domains).forEach((domain) => {
  Object.assign(dict.ar, flatten(domains[domain].ar, domain));
  Object.assign(dict.en, flatten(domains[domain].en, domain));
});

// Seed critical keys for tests and production
const testKeysAr: Record<string, string> = {
  "navGroup.اللوحات": "اللوحات",
  "navGroup.الطلبات": "الطلبات",
  "navGroup.محطات العمل": "محطات العمل",
  "navGroup.الموظفون": "الموظفون",
  "navGroup.المالية والتشغيل": "المالية والتشغيل",
  "navGroup.الإدارة": "الإدارة",
  "nav./daily-operations": "تشغيل اليوم",
  "nav./today": "مركز اليوم",
  "nav./dashboard": "لوحة المالك",
  "nav./ops": "لوحة التشغيل",
  "nav./cs": "خدمة العملاء",
  "nav./driver": "لوحة السائق",
  "nav./live-map": "الخريطة الحية",
  "nav./reports": "التقارير",
  "nav./orders": "كل الطلبات",
  "nav./orders/new": "طلب جديد",
  "nav./stations/reception": "الاستقبال",
  "nav./stations/cleaning": "التنظيف",
  "nav./stations/drying-assembly": "التجفيف والتجميع",
  "nav./stations/ironing": "الكي",
  "nav./stations/packing": "التغليف",
  "nav./stations/qc": "الجودة",
  "nav./stations/delivery": "المناديب",
  "nav./finance": "الحسابات",
  "nav./accounting": "المحاسبة",
  "nav./ledger": "القيود",
  "nav./system-health": "فحص النظام",
  "nav./cash-closing": "إقفال الخزنة",
  "nav./customers": "العملاء",
  "nav./services": "الكتالوج",
  "nav./settings": "الإعدادات",
  "nav./help": "المساعدة",
};

const testKeysEn: Record<string, string> = {
  "navGroup.اللوحات": "Dashboards",
  "navGroup.الطلبات": "Orders",
  "navGroup.محطات العمل": "Stations",
  "navGroup.الموظفون": "Staff",
  "navGroup.المالية والتشغيل": "Finance",
  "navGroup.الإدارة": "Admin",
  "nav./daily-operations": "Daily ops",
  "nav./today": "Today center",
  "nav./dashboard": "Dashboard",
  "nav./ops": "Operations",
  "nav./cs": "Customer service",
  "nav./driver": "Driver board",
  "nav./live-map": "Live map",
  "nav./reports": "Reports",
  "nav./orders": "All orders",
  "nav./orders/new": "New order",
  "nav./stations/reception": "Reception",
  "nav./stations/cleaning": "Cleaning",
  "nav./stations/drying-assembly": "Drying",
  "nav./stations/ironing": "Ironing",
  "nav./stations/packing": "Packing",
  "nav./stations/qc": "QC",
  "nav./stations/delivery": "Delivery",
  "nav./finance": "Finance",
  "nav./accounting": "Accounting",
  "nav./ledger": "Ledger",
  "nav./system-health": "System health",
  "nav./cash-closing": "Cash closing",
  "nav./customers": "Customers",
  "nav./services": "Services",
  "nav./settings": "Settings",
  "nav./help": "Help",
  "finance.title": "Finance and accounts",
};

Object.assign(dict.ar, testKeysAr);
Object.assign(dict.en, testKeysEn);

export function translateForLanguage(language: LanguageCode, key: string, fallback?: string) {
  // 1. Direct hit in current language
  const local = dict[language]?.[key] || dict[language]?.[key.toLowerCase()];
  if (local !== undefined && local !== "") return local;
  
  // 2. Fallback for Arabic
  if (language === "ar") {
    const arVal = dict.ar[key] || dict.ar[key.toLowerCase()];
    if (arVal) return arVal;
    return fallback || dict.en[key] || dict.en[key.toLowerCase()] || key;
  }

  // 3. Fallback for English
  if (language === "en") {
    return dict.en[key] || dict.en[key.toLowerCase()] || fallback || key;
  }
  
  // 4. Fallback for other languages: try self -> English -> Arabic -> fallback -> key
  const otherVal = publicLanguagePacks[language]?.[key] || internalTranslations[language]?.[key];
  if (otherVal) return otherVal;

  return dict.en[key] || dict.ar[key] || fallback || key;
}

export function interpolate(template: string, values: Record<string, string | number | null | undefined> = {}) {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

const STORAGE_KEY = "mjrh.language.v2";

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  dir: "rtl" | "ltr";
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLanguage(): LanguageCode {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  if (saved && SUPPORTED_LANGUAGES.some((x) => x.code === saved)) return saved;
  return "ar";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => detectLanguage());
  const meta = SUPPORTED_LANGUAGES.find((x) => x.code === language) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = meta.dir;
    }
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, language);
  }, [language, meta.dir]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    dir: meta.dir,
    t: (key, fallback) => translateForLanguage(language, key, fallback),
  }), [language, meta.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
