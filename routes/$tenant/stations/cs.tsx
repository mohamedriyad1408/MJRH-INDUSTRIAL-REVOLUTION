import { createFileRoute } from "@tanstack/react-router";
import { CSStation } from "@/modules/laundry/stations/CSStation";

export const Route = createFileRoute("/$tenant/stations/cs")({
  component: CSStation,
});
