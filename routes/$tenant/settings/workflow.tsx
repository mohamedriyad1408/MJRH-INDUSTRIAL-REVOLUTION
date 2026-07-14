import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$tenant/settings/workflow")({
  component: WorkflowLayout,
});

function WorkflowLayout() {
  return <Outlet />;
}
