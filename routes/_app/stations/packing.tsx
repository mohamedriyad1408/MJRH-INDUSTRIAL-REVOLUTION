import { createFileRoute } from "@tanstack/react-router";
import { StationBoard } from "@/components/station-board";

export const Route = createFileRoute("/_app/stations/packing")({
  head: () => ({ meta: [{ title: "محطة التغليف" }] }),
  component: () => <StationBoard title="محطة التغليف" station="packing" incoming="ironing" current="packing" nextStatus="ready" />,
});
