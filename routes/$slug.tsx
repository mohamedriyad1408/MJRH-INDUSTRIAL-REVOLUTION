import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$slug")({
  head: () => ({ meta: [{ title: "Project Entry - MJRH" }] }),
});
