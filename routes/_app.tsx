import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2, Hourglass, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AttendanceWidget } from "@/components/attendance-widget";
import { NotificationCenter } from "@/components/notification-center";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, user, loading, roles, isSuperAdmin, hasRole, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) nav({ to: "/login" });
  }, [loading, session, nav]);

  // Super admin: لو دخل على صفحة تشغيل وهو ليس عضو في tenant، حوّله لـ /admin/tenants
  useEffect(() => {
    if (!loading && session && isSuperAdmin && !path.startsWith("/admin")) {
      nav({ to: "/admin/tenants" });
    }
  }, [loading, session, isSuperAdmin, path, nav]);



  // Guard employee/courier deep links: non-managers should only access their operational page.
  useEffect(() => {
    if (loading || !session || !roles.length || isSuperAdmin) return;
    const isManager = hasRole("owner", "ops_manager", "cs_manager");
    if (isManager) return;

    if (hasRole("courier")) {
      if (!path.startsWith("/driver")) nav({ to: "/driver" });
      return;
    }

    if (hasRole("employee") && user) {
      (supabase as any)
        .from("employees")
        .select("id,station,job_role,profile_id,email")
        .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()
        .then(async ({ data }: any) => {
          if (data?.id && !data.profile_id) {
            await (supabase as any).from("employees").update({ profile_id: user.id }).eq("id", data.id);
          }
          if (data?.station === "reception") {
            const allowed = ["/orders", "/customers", "/stations/reception"];
            if (!allowed.some((x) => path.startsWith(x))) nav({ to: "/orders/new" });
            return;
          }
          const target = data?.job_role === "driver" ? "/driver" : data?.station ? `/stations/${data.station}` : null;
          if (target && !path.startsWith(target)) nav({ to: target as any });
        });
    }
  }, [loading, session, roles.length, isSuperAdmin, hasRole, path, nav, user]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  // مستخدم بدون أي دور (لم يُفعَّل بعد من المالك أو الـ super admin)
  if (!roles.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Hourglass className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">بانتظار التفعيل</h1>
          <p className="text-sm text-muted-foreground">
            تم إنشاء حسابك بنجاح. يجب على مالك المغسلة أو مدير المنصة تعيين دورك للوصول إلى النظام.
          </p>
          <Button variant="outline" onClick={() => signOut()}><LogOut className="w-4 h-4 ms-1" /> خروج</Button>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="font-bold text-sm">Dry Tech — نظام إدارة المغاسل</div>
            <NotificationCenter />
            <AttendanceWidget />
          </header>
          <main className="flex-1 p-4 md:p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
