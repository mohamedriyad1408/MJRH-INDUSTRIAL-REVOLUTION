import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES, translateForLanguage } from "../lib/i18n";

describe("i18n language support", () => {
  it("contains all requested commercial languages plus Arabic", () => {
    expect(SUPPORTED_LANGUAGES.map((x) => x.code)).toEqual(["ar", "en", "fr", "it", "es", "de", "zh", "ja", "pt"]);
  });

  it("keeps Arabic RTL and other target languages LTR", () => {
    expect(SUPPORTED_LANGUAGES.find((x) => x.code === "ar")?.dir).toBe("rtl");
    expect(SUPPORTED_LANGUAGES.filter((x) => x.code !== "ar").every((x) => x.dir === "ltr")).toBe(true);
  });

  it("keeps the sidebar Arabic when Arabic is selected", () => {
    expect(translateForLanguage("ar", "nav./system-health", "فحص النظام")).toBe("فحص النظام");
    expect(translateForLanguage("ar", "navGroup.المالية والتشغيل", "المالية والتشغيل")).toBe("المالية والتشغيل");
    expect(translateForLanguage("ar", "role.owner", "مالك")).toBe("مالك");
  });

  it("translates sidebar navigation for the requested foreign languages", () => {
    expect(translateForLanguage("en", "nav./orders")).toBe("All orders");
    expect(translateForLanguage("fr", "nav./orders")).toBe("Toutes les commandes");
    expect(translateForLanguage("it", "nav./orders")).toBe("Tutti gli ordini");
    expect(translateForLanguage("es", "nav./orders")).toBe("Todos los pedidos");
    expect(translateForLanguage("de", "nav./orders")).toBe("Alle Aufträge");
    expect(translateForLanguage("zh", "nav./orders")).toBe("所有订单");
    expect(translateForLanguage("ja", "nav./orders")).toBe("すべての注文");
    expect(translateForLanguage("pt", "nav./orders")).toBe("Todos os pedidos");
  });

  it("does not silently fall back to English for non-English commercial languages", () => {
    const nonEnglish = ["fr", "it", "es", "de", "zh", "ja", "pt"] as const;
    for (const lang of nonEnglish) {
      expect(translateForLanguage(lang, "landing.heroTitle")).not.toBe(translateForLanguage("en", "landing.heroTitle"));
      expect(translateForLanguage(lang, "system.title")).not.toBe(translateForLanguage("en", "system.title"));
      expect(translateForLanguage(lang, "station.qc.title")).not.toBe(translateForLanguage("en", "station.qc.title"));
      expect(translateForLanguage(lang, "map.title")).not.toBe(translateForLanguage("en", "map.title"));
    }
  });

  it("uses Arabic component fallback before English in Arabic mode", () => {
    expect(translateForLanguage("ar", "missing.key", "نص عربي")).toBe("نص عربي");
    expect(translateForLanguage("en", "missing.key", "نص عربي")).toBe("نص عربي");
  });
});
