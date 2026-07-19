import { createFileRoute } from "@tanstack/react-router";
import { IroningStation } from "@/modules/laundry/stations/IroningStation";

export const Route = createFileRoute("/$tenant/stations/ironing")({
  component: IroningStation,
});
