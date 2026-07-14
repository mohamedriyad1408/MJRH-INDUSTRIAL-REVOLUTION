import { describe, expect, it } from "vitest";
import { customerReturnShouldReopenOriginalOrder, initialCustomerReturnStage } from "../lib/rules/customer-return";

describe("customer returns after delivery", () => {
  it("routes reclean returns to cleaning without reopening original order", () => {
    expect(initialCustomerReturnStage("reclean")).toEqual({ status: "in_cleaning", stage: "customer_return_cleaning" });
    expect(customerReturnShouldReopenOriginalOrder()).toBe(false);
  });

  it("routes reiron returns directly to ironing", () => {
    expect(initialCustomerReturnStage("reiron")).toEqual({ status: "in_ironing", stage: "ironing" });
  });
});
