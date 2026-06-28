export type ServiceType = "cleaning" | "ironing" | "both" | string;
export type ReceptionNextStatus = "cleaning" | "ironing" | "packing";

export function getReceptionNextStatus(serviceTypes: ServiceType[]): ReceptionNextStatus {
  const normalized = serviceTypes.map((x) => String(x));
  if (normalized.some((x) => x === "cleaning" || x === "both")) return "cleaning";
  if (normalized.some((x) => x === "ironing")) return "ironing";
  return "packing";
}

export function unitStageForReceptionMove(serviceType: ServiceType, nextStatus: ReceptionNextStatus) {
  if (nextStatus === "ironing" && ["ironing", "cleaning", "both"].includes(String(serviceType))) return "ironing";
  if (nextStatus === "cleaning" && ["cleaning", "both"].includes(String(serviceType))) return "cleaning";
  return nextStatus;
}

export function shouldKeepDeliveredOrderClosedForCustomerReturn() {
  return true;
}
