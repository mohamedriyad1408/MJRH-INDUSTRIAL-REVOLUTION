export type PaymentVerification = "matched" | "overpaid" | "underpaid";

export function evaluatePayment(total: number, paid: number): { status: PaymentVerification; overpayment: number; paidEnough: boolean } {
  const required = Math.max(0, Number(total || 0));
  const actual = Math.max(0, Number(paid || 0));
  const overpayment = Math.max(0, Number((actual - required).toFixed(2)));
  if (actual < required) return { status: "underpaid", overpayment: 0, paidEnough: false };
  if (overpayment > 0) return { status: "overpaid", overpayment, paidEnough: true };
  return { status: "matched", overpayment: 0, paidEnough: true };
}

export function tipForCourier(total: number, paid: number) {
  return evaluatePayment(total, paid).overpayment;
}
