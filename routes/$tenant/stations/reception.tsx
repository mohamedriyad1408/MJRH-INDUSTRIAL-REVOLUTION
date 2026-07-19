import { createFileRoute } from "@tanstack/react-router";
import { ReceptionStation } from "@/modules/laundry/stations/ReceptionStation";

export const Route = createFileRoute("/$tenant/stations/reception")({
  component: ReceptionStation,
});
