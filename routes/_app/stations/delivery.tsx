import { createFileRoute } from "@tanstack/react-router";
import { StationPage } from "@/components/station-page";

export const Route = createFileRoute("/_app/stations/delivery")({
  head: () => ({ meta: [{ title: "المناديب" }] }),
  component: () => (
    <StationPage title="المناديب — تسليم الطلبات" station="delivery" incoming="ready" current="out_for_delivery" nextStatus="delivered" />
  ),
});
