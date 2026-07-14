import { describe, expect, it } from "vitest";
import { evaluatePayment, tipForCourier } from "../lib/rules/payment";

describe("payment rules", () => {
  it("marks exact payment as matched", () => {
    expect(evaluatePayment(1010, 1010)).toEqual({ status: "matched", overpayment: 0, paidEnough: true });
  });

  it("turns overpayment into courier tip", () => {
    expect(evaluatePayment(1010, 1085)).toEqual({ status: "overpaid", overpayment: 75, paidEnough: true });
    expect(tipForCourier(1050, 1085)).toBe(35);
  });

  it("marks low payment as underpaid", () => {
    expect(evaluatePayment(1000, 900)).toEqual({ status: "underpaid", overpayment: 0, paidEnough: false });
  });
});
