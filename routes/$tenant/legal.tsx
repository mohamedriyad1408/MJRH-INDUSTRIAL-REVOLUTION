import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/core/auth/useAuth";
import { LegalDepartmentView } from "@/components/legal-department-view";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/$tenant/legal")({
  head: () => ({ meta: [{ title: "الشؤون القانونية والعقود والتراخيص للمغسلة - MJRH" }] }),
  component: TenantLegalPage,
});

function TenantLegalPage() {
  const { tenantId, hasRole } = useAuth();
  const { t } = useI18n();

  if (!hasRole("owner", "ops_manager")) {
    return <Card className="p-8 text-center text-muted-foreground">صلاحية مالك المغسلة أو مدير التشغيل فقط.</Card>;
  }

  if (!tenantId) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-teal-400" /></div>;
  }

  return <LegalDepartmentView isSuperAdmin={false} />;
}
