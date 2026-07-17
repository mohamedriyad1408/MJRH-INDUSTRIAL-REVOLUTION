import { createFileRoute } from "@tanstack/react-router";
import { LegalDepartmentView } from "@/components/legal-department-view";

export const Route = createFileRoute("/_admin/admin/legal")({
  head: () => ({ meta: [{ title: "الشؤون القانونية والامتثال والعقود للشركة - MJRH" }] }),
  component: SuperAdminLegalPage,
});

function SuperAdminLegalPage() {
  return <LegalDepartmentView isSuperAdmin={true} />;
}
