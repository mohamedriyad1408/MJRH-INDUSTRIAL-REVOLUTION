import { createFileRoute } from "@tanstack/react-router";
import { CleaningStation } from "@/modules/laundry/stations/CleaningStation";

export const Route = createFileRoute("/$tenant/stations/cleaning")({
  component: CleaningStation,
});
