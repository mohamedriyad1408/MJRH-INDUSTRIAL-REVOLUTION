import { describe, expect, it } from "vitest";
import { translateForLanguage, type LanguageCode } from "../lib/i18n";

const nonEnglishCommercial: LanguageCode[] = ["fr", "it", "es", "de", "zh", "ja", "pt"];

const criticalNavKeys = [
  "navGroup.اللوحات",
  "navGroup.الطلبات",
  "navGroup.محطات العمل",
  "navGroup.الموظفون",
  "navGroup.المالية والتشغيل",
  "navGroup.الإدارة",
  "nav./daily-operations",
  "nav./today",
  "nav./dashboard",
  "nav./ops",
  "nav./cs",
  "nav./driver",
  "nav./live-map",
  "nav./reports",
  "nav./orders",
  "nav./orders/new",
  "nav./stations/reception",
  "nav./stations/cleaning",
  "nav./stations/drying-assembly",
  "nav./stations/ironing",
  "nav./stations/packing",
  "nav./stations/qc",
  "nav./stations/delivery",
  "nav./finance",
  "nav./accounting",
  "nav./ledger",
  "nav./system-health",
  "nav./cash-closing",
  "nav./customers",
  "nav./services",
  "nav./settings",
  "nav./help",
];

const criticalExperienceKeys = [
  "landing.heroTitle",
  "track.title",
  "customer.title",
  "system.title",
  "station.reception.title",
  "station.cleaning.titleManager",
  "station.assembly.title",
  "station.ironing.managerTitle",
  "station.packing.title",
  "station.qc.title",
  "map.title",
  "finance.title",
  "accounting.title",
  "ledger.title",
  "cashClosing.title",
  "reports.title",
  "help.title",
];

describe("critical localization guardrails", () => {
  it("keeps every critical sidebar label Arabic in Arabic mode", () => {
    for (const key of criticalNavKeys) {
      const ar = translateForLanguage("ar", key);
      const en = translateForLanguage("en", key);
      expect(ar, key).not.toBe(key);
      expect(ar, key).not.toBe(en);
      expect(/[\u0600-\u06FF]/.test(ar), key).toBe(true);
    }
  });

  it("prevents commercial languages from silently rendering mostly English for critical labels", () => {
    const keys = [...criticalNavKeys, ...criticalExperienceKeys];
    for (const lang of nonEnglishCommercial) {
      let sameAsEnglish = 0;
      for (const key of keys) {
        const value = translateForLanguage(lang, key);
        const en = translateForLanguage("en", key);
        expect(value, `${lang}:${key}`).not.toBe(key);
        expect(/[\u0600-\u06FF]/.test(value), `${lang}:${key} should not be Arabic fallback`).toBe(false);
        if (value === en) sameAsEnglish++;
      }
      // Some terms are legitimate cognates or brand/technical labels (Administration, CRM, QC, APDO),
      // but a language pack must not be mostly English.
      expect(sameAsEnglish / keys.length, `${lang} English-like ratio`).toBeLessThan(0.25);
    }
  });

  it("keeps English explicitly English where selected", () => {
    expect(translateForLanguage("en", "nav./system-health")).toBe("System health");
    expect(translateForLanguage("en", "finance.title")).toBe("Finance and accounts");
  });
});
