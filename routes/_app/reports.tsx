import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports - MJRH" }] }),
});
