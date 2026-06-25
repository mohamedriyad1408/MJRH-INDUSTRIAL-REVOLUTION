import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: AppHomeRedirect,
});

function AppHomeRedirect() {
  const { loading, isSuperAdmin, hasRole } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (isSuperAdmin) return void nav({ to: "/admin/tenants" });
    if (hasRole("owner", "ops_manager", "cs_manager")) return void nav({ to: "/today" });
    if (hasRole("courier")) return void nav({ to: "/driver" });
    if (hasRole("employee")) return void nav({ to: "/dashboard" });
    nav({ to: "/login" });
  }, [loading, isSuperAdmin, hasRole, nav]);

  return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
}
