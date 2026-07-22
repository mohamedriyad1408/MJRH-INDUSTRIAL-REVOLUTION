import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/landing")({
  head: () => ({ meta: [{ title: "MJRH - Laundry OS" }] }),
});
