import { createFileRoute } from "@tanstack/react-router";
import { StationPage } from "@/components/station-page";
import { useI18n } from "@/lib/i18n";


export function DeliveryStation() {
  const { t } = useI18n();
  return <StationPage title={t("station.delivery.title")} station="delivery" incoming="ready" current="out_for_delivery" nextStatus="delivered" />;
}
