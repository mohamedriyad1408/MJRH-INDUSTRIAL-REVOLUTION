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
  ar: {},
  en: {},
  fr: {},
  it: {},
  es: {},
  de: {},
  zh: {},
  ja: {},
  pt: {},
};

const flatten = (obj: any, prefix = "") => {
  const res: any = {};
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

// Merge all JSON domains
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
};

Object.keys(domains).forEach((domain) => {
  Object.assign(dict.ar, flatten(domains[domain].ar, domain));
  Object.assign(dict.en, flatten(domains[domain].en, domain));
});

const navEnglishBase: Record<string, string> = {
  "nav.main": "Main",
  "nav.today": "Today Center",
  "nav.dashboard": "Owner Dashboard",
  "nav.operations": "Operations",
  "nav.orders": "All Orders",
  "nav.customers": "Customers",
  "nav.live_map": "Live Map",
  "nav.reports": "Reports & BI",
  "nav.staff": "Staff",
  "nav.finance": "Finance",
  "nav.settings": "Settings",
  "nav.help": "Help Center",
  "nav.admin": "Admin Panel",
};

const navArabicBase: Record<string, string> = {
  "nav.main": "الرئيسية",
  "nav.today": "مركز اليوم",
  "nav.dashboard": "لوحة المالك",
  "nav.operations": "التشغيل",
  "nav.orders": "كل العمليات",
  "nav.customers": "العملاء",
  "nav.live_map": "خريطة المراقبة",
  "nav.reports": "التقارير والذكاء",
  "nav.staff": "الموظفون",
  "nav.finance": "المالية",
  "nav.settings": "الإعدادات",
  "nav.help": "دليل الاستخدام",
  "nav.admin": "إدارة المنصة",
};

Object.assign(dict.ar, navArabicBase);
Object.assign(dict.en, navEnglishBase);

// Base app translations
Object.assign(dict.ar, {
  "common.language": "اللغة",
  "common.loading": "جاري التحميل",
  "common.save": "حفظ",
  "common.open": "فتح",
  "common.back": "عودة",
  "common.egp": "ج.م",
  "app.tagline": "منظومة تشغيل المشاريع التشغيلية",
  "app.portal": "بوابة العميل",
  "app.signOut": "خروج",
});

Object.assign(dict.en, {
  "common.language": "Language",
  "common.loading": "Loading",
  "common.save": "Save",
  "common.open": "Open",
  "common.back": "Back",
  "common.egp": "EGP",
  "app.tagline": "Industrial Operations OS",
  "app.portal": "Customer Portal",
  "app.signOut": "Sign Out",
});

// Load other packs
for (const lang of SUPPORTED_LANGUAGES.map((x) => x.code)) {
  Object.assign(dict[lang], publicLanguagePacks[lang] ?? {});
  Object.assign(dict[lang], internalTranslations[lang] ?? {});
}

export function translateForLanguage(language: LanguageCode, key: string, fallback?: string) {
  const local = dict[language]?.[key];
  if (local !== undefined && local !== "") return local;
  
  // Try finding by lowercase key
  const lowerKey = key.toLowerCase();
  if (dict[language]?.[lowerKey]) return dict[language][lowerKey];

  if (language === "en") return dict.en?.[key] ?? fallback ?? key;
  if (language === "ar") return fallback ?? dict.ar?.[key] ?? dict.en?.[key] ?? key;
  
  return dict[language]?.[key] || dict.en?.[key] || dict.ar?.[key] || fallback || key;
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
