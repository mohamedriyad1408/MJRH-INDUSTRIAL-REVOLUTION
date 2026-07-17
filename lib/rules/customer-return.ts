export type CustomerReturnType = "reclean" | "reiron" | "repair" | "refund" | "other";

export function initialCustomerReturnStage(type: CustomerReturnType) {
  if (type === "reclean") return { status: "in_cleaning", stage: "customer_return_cleaning" };
  if (type === "reiron") return { status: "in_ironing", stage: "ironing" };
  if (type === "repair") return { status: "open", stage: "customer_return_repair" };
  return { status: "open", stage: "customer_return_review" };
}

export function customerReturnShouldReopenOriginalOrder() {
  return false;
}
