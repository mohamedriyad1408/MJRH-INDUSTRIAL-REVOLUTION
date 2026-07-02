import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$tenant/pickups/")({
  beforeLoad: () => { throw redirect({ to: "/$tenant/orders/new" as any, search: { delivery: true } as any }); },
});
