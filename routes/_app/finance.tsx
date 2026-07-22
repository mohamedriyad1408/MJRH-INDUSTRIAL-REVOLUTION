import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/finance")({
  head: () => ({ meta: [{ title: "Finance - MJRH" }] }),
});
