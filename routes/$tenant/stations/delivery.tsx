import { createFileRoute } from "@tanstack/react-router";
import { DeliveryStation } from "@/modules/laundry/stations/DeliveryStation";

export const Route = createFileRoute("/$tenant/stations/delivery")({
  component: DeliveryStation,
});
