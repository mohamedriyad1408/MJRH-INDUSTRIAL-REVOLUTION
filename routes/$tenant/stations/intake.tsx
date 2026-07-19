import { createFileRoute } from "@tanstack/react-router";
import { IntakeStation } from "@/modules/laundry/stations/IntakeStation";

export const Route = createFileRoute("/$tenant/stations/intake")({
  component: IntakeStation,
});
