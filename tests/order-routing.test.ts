import { describe, expect, it } from "vitest";
import { getReceptionNextStatus, unitStageForReceptionMove, shouldKeepDeliveredOrderClosedForCustomerReturn } from "../lib/rules/order-routing";

describe("order routing rules", () => {
  it("routes ironing-only orders directly to ironing", () => {
    expect(getReceptionNextStatus(["ironing"])).toBe("ironing");
    expect(unitStageForReceptionMove("ironing", "ironing")).toBe("ironing");
  });

  it("routes cleaning or both orders to cleaning first", () => {
    expect(getReceptionNextStatus(["both", "ironing"])).toBe("cleaning");
    expect(getReceptionNextStatus(["cleaning"])).toBe("cleaning");
  });

  it("keeps delivered order closed when a customer return is opened", () => {
    expect(shouldKeepDeliveredOrderClosedForCustomerReturn()).toBe(true);
  });
});
