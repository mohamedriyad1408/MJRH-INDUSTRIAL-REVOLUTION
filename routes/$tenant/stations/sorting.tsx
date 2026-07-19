import { createFileRoute } from "@tanstack/react-router";
import { SortingStation } from "@/modules/laundry/stations/SortingStation";

export const Route = createFileRoute("/$tenant/stations/sorting")({
  component: SortingStation,
});
