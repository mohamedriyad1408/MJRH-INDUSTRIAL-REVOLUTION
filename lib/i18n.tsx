import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { internalTranslations } from "./i18n-internal";
import { publicLanguagePacks } from "./i18n-public-packs";

// Domain JSON imports
import arCommon from "../src/locales/ar/common.json";
import enCommon from "../src/locales/en/common.json";
import arNav from "../src/locales/ar/navigation.json";
import enNav from "../src/locales/en/navigation.json";
import arAccounting from "../src/locales/ar/accounting.json";
import enAccounting from "../src/locales/en/accounting.json";
import arToday from "../src/locales/ar/today.json";
import enToday from "../src/locales/en/today.json";
import arReports from "../src/locales/ar/reports.json";
import enReports from "../src/locales/en/reports.json";
import arOrders from "../src/locales/ar/orders.json";
import enOrders from "../src/locales/en/orders.json";
import arStaff from "../src/locales/ar/staff.json";
import enStaff from "../src/locales/en/staff.json";
import arCustomer from "../src/locales/ar/customer.json";
import enCustomer from "../src/locales/en/customer.json";
import arCustomers from "../src/locales/ar/customers.json";
import enCustomers from "../src/locales/en/customers.json";
import arServices from "../src/locales/ar/services.json";
import enServices from "../src/locales/en/services.json";
import arBranches from "../src/locales/ar/branches.json";
import enBranches from "../src/locales/en/branches.json";
import arInventory from "../src/locales/ar/inventory.json";
import enInventory from "../src/locales/en/inventory.json";
import arOps from "../src/locales/ar/ops.json";
import enOps from "../src/locales/en/ops.json";
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
import arLedger from "../src/locales/ar/ledger.json";
import enLedger from "../src/locales/en/ledger.json";
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
import arDailyOps from "../src/locales/ar/daily-ops.json";
import enDailyOps from "../src/locales/en/daily-ops.json";
import arDashboard from "../src/locales/ar/dashboard.json";
import enDashboard from "../src/locales/en/dashboard.json";
import arOperations from "../src/locales/ar/operations.json";
import enOperations from "../src/locales/en/operations.json";
import arErrors from "../src/locales/ar/errors.json";
import enErrors from "../src/locales/en/errors.json";
import arStations from "../src/locales/ar/stations.json";
import enStations from "../src/locales/en/stations.json";
import arOnlineQueue from "../src/locales/ar/online-queue.json";
import enOnlineQueue from "../src/locales/en/online-queue.json";
import arDelivery from "../src/locales/ar/delivery.json";
import enDelivery from "../src/locales/en/delivery.json";

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

// 1. Initial Domain JSON Merge
const domains: any = {
  common: { ar: arCommon, en: enCommon },
  navigation: { ar: arNav, en: enNav },
  accounting: { ar: arAccounting, en: enAccounting },
  today: { ar: arToday, en: enToday },
  reports: { ar: arReports, en: enReports },
  orders: { ar: arOrders, en: enOrders },
  staff: { ar: arStaff, en: enStaff },
  customer: { ar: arCustomer, en: enCustomer },
  customers: { ar: arCustomers, en: enCustomers },
  services: { ar: arServices, en: enServices },
  branches: { ar: arBranches, en: enBranches },
  inventory: { ar: arInventory, en: enInventory },
  ops: { ar: arOps, en: enOps },
  search: { ar: arSearch, en: enSearch },
  attendance: { ar: arAttendance, en: enAttendance },
  scorecard: { ar: arScorecard, en: enScorecard },
  fairness: { ar: arFairness, en: enFairness },
  issues: { ar: arIssues, en: enIssues },
  settings: { ar: arSettings, en: enSettings },
  finance: { ar: arFinance, en: enFinance },
  ledger: { ar: arLedger, en: enLedger },
  driver: { ar: arDriver, en: enDriver },
  map: { ar: arMap, en: enMap },
  roles: { ar: arRoles, en: enRoles },
  subscriptions: { ar: arSubs, en: enSubs },
  "workflow-settings": { ar: arWFSettings, en: enWFSettings },
  "workflow-fields": { ar: arWFFields, en: enWFFields },
  track: { ar: arTrack, en: enTrack },
  landing: { ar: arLanding, en: enLanding },
  dailyOps: { ar: arDailyOps, en: enDailyOps },
  dashboard: { ar: arDashboard, en: enDashboard },
  operations: { ar: arOperations, en: enOperations },
  errors: { ar: arErrors, en: enErrors },
  stations: { ar: arStations, en: enStations },
  "online-queue": { ar: arOnlineQueue, en: enOnlineQueue },
  delivery: { ar: arDelivery, en: enDelivery },
};

Object.keys(domains).forEach((domain) => {
  if (domain === "navigation") {
     Object.assign(dict.ar, domains[domain].ar);
     Object.assign(dict.en, domains[domain].en);
  } else {
     Object.assign(dict.ar, flatten(domains[domain].ar, domain));
     Object.assign(dict.en, flatten(domains[domain].en, domain));
  }
});

// 2. Pre-assign other languages with English baseline
for (const lang of SUPPORTED_LANGUAGES.map((x) => x.code)) {
  if (lang !== "en" && lang !== "ar") {
    Object.assign(dict[lang], dict.en);
  }
}

// 3. Layer Public Packs on top
for (const lang of SUPPORTED_LANGUAGES.map((x) => x.code)) {
  Object.assign(dict[lang], publicLanguagePacks[lang] ?? {});
}

// 4. Final internalTranslations (last priority)
for (const lang of SUPPORTED_LANGUAGES.map((x) => x.code)) {
  Object.assign(dict[lang], internalTranslations[lang] ?? {});
}

export function translateForLanguage(language: LanguageCode, key: string, fallback?: string) {
  const localDict = dict[language] || {};
  const value = localDict[key] || localDict[key.toLowerCase()];
  
  if (value !== undefined && value !== "") return value;
  
  if (language === "ar") {
    return dict.ar[key] || dict.ar[key.toLowerCase()] || fallback || dict.en[key] || key;
  }
  if (language === "en") {
    return dict.en[key] || dict.en[key.toLowerCase()] || fallback || key;
  }

  // Chain: English -> Arabic -> Fallback -> Key
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
  const meta = SUPPORTED_LANGUAGES.find((code) => code.code === language) ?? SUPPORTED_LANGUAGES[0];

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
