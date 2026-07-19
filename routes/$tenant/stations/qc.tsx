import { createFileRoute } from "@tanstack/react-router";
import { QCStation } from "@/modules/laundry/stations/QCStation";

export const Route = createFileRoute("/$tenant/stations/qc")({
  component: QCStation,
});
