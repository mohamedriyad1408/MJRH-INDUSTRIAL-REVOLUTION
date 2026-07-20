import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/pickups/new")({
  beforeLoad: () => { throw redirect({ to: "/orders/new", search: { delivery: true } as any }); },
});
