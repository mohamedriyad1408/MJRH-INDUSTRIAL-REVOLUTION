import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";

describe("i18n language support", () => {
  it("contains all requested commercial languages plus Arabic", () => {
    expect(SUPPORTED_LANGUAGES.map((x) => x.code)).toEqual(["ar", "en", "fr", "it", "es", "de", "zh", "ja", "pt"]);
  });

  it("keeps Arabic RTL and other target languages LTR", () => {
    expect(SUPPORTED_LANGUAGES.find((x) => x.code === "ar")?.dir).toBe("rtl");
    expect(SUPPORTED_LANGUAGES.filter((x) => x.code !== "ar").every((x) => x.dir === "ltr")).toBe(true);
  });
});
