import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/core/auth/useAuth";
import { TenantMarketingAnalyticsTab } from "@/components/tenant-marketing-analytics-tab";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/$tenant/marketing")({
  head: () => ({ meta: [{ title: "البيانات التسويقية وأوقات الذروة - MJRH" }] }),
  component: TenantMarketingPage,
});

function TenantMarketingPage() {
  const { tenantId } = useAuth();

  if (!tenantId) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-teal-400" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-2 md:p-4">
      <TenantMarketingAnalyticsTab tenantId={tenantId} />
    </div>
  );
}
