import { createFileRoute } from "@tanstack/react-router";
import { StationBoard } from "@/components/station-board";

export const Route = createFileRoute("/_app/stations/ironing")({
  head: () => ({ meta: [{ title: "محطة الكي" }] }),
  component: () => <StationBoard title="محطة الكي" station="ironing" incoming="cleaning" current="ironing" nextStatus="packing" />,
});
