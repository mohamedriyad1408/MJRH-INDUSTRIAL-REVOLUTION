import { createFileRoute } from "@tanstack/react-router";
import { StationPage } from "@/components/station-page";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/stations/delivery")({
  head: () => ({ meta: [{ title: "المناديب" }] }),
  component: DeliveryStation,
});

function DeliveryStation() {
  const { t } = useI18n();
  return <StationPage title={t("stations.delivery.title")} station="delivery" incoming="ready" current="out_for_delivery" nextStatus="delivered" />;
}
