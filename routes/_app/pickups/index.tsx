import { useI18n } from "@/lib/i18n";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/pickups/")({
  beforeLoad: () => { throw redirect({ to: "/orders/new", search: { delivery: true } as any }); },
});
