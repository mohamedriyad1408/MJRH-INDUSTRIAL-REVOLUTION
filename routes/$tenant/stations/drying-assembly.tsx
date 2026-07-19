import { createFileRoute } from "@tanstack/react-router";
import { DryingAssemblyStation } from "@/modules/laundry/stations/DryingAssemblyStation";

export const Route = createFileRoute("/$tenant/stations/drying-assembly")({
  component: DryingAssemblyStation,
});
