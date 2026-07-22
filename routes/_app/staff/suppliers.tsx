import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/staff/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers - MJRH" }] }),
});
