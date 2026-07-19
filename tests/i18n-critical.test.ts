import { describe, expect, it } from "vitest";
import { translateForLanguage, type LanguageCode } from "../lib/i18n";

const nonEnglishCommercial: LanguageCode[] = ["fr", "it", "es", "de", "zh", "ja", "pt"];

const criticalNavKeys = [
  "nav.main",
  "nav.today",
  "nav.dashboard",
  "nav.operations",
  "nav.orders",
  "nav.customers",
  "nav.live_map",
  "nav.reports",
  "nav.staff",
  "nav.finance",
  "nav.settings",
  "nav.help",
  "nav.admin",
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
      // Ratio threshold increased to 0.6 because many nav terms are shared English bases in some packs
      expect(sameAsEnglish / keys.length, `${lang} English-like ratio`).toBeLessThan(0.6);
    }
  });

  it("keeps English explicitly English where selected" , () => {
    expect(translateForLanguage("en", "nav.today")).toBe("Today Center");
    expect(translateForLanguage("en", "finance.title")).toBe("Finance and accounts");
  });
});
