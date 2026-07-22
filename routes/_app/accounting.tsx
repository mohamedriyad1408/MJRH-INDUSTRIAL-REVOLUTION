import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/accounting")({
  head: () => ({ meta: [{ title: "Accounting - MJRH" }] }),
});
