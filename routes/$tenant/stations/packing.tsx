import { createFileRoute } from "@tanstack/react-router";
import { PackingStation } from "@/modules/laundry/stations/PackingStation";

export const Route = createFileRoute("/$tenant/stations/packing")({
  component: PackingStation,
});
