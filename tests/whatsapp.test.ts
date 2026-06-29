import { describe, expect, it } from "vitest";
import { normalizeEgyptPhoneForWhatsApp, whatsappLink } from "../lib/rules/whatsapp";

describe("whatsapp links", () => {
  it("normalizes Egyptian local phone numbers", () => {
    expect(normalizeEgyptPhoneForWhatsApp("01130804784")).toBe("201130804784");
    expect(normalizeEgyptPhoneForWhatsApp("+20 113 080 4784")).toBe("201130804784");
  });

  it("builds encoded wa.me links", () => {
    const link = whatsappLink("01130804784", "طلبك جاهز #22");
    expect(link).toContain("https://wa.me/201130804784?text=");
    expect(link).toContain("%D8%B7%D9%84%D8%A8%D9%83");
  });
});
