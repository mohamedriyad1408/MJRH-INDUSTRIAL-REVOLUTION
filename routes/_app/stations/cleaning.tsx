import { createFileRoute } from "@tanstack/react-router";
import { StationBoard } from "@/components/station-board";

export const Route = createFileRoute("/_app/stations/cleaning")({
  head: () => ({ meta: [{ title: "محطة التنظيف" }] }),
  component: () => <StationBoard title="محطة التنظيف" station="cleaning" incoming="received" current="cleaning" nextStatus="ironing" />,
});
