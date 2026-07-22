import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/customer-portal")({
  head: () => ({ meta: [{ title: "Customer Portal - MJRH" }] }),
});
