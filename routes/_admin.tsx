import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { session, loading, isSuperAdmin, signOut } = useAuth();
  const { dir, t } = useI18n();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !session) nav({ to: "/login" });
    else if (!loading && session && !isSuperAdmin) nav({ to: "/" });
  }, [loading, session, isSuperAdmin, nav]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4" dir={dir}>
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-red-200 bg-red-50/40 shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center border border-red-200">
            <LogOut className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-extrabold text-red-900">صلاحية إدارة المنصة فقط</h1>
          <p className="text-sm text-red-800 font-medium">هذه اللوحة مخصصة لمدير المنصة (Super Admin) فقط.</p>
          <Button variant="destructive" className="w-full font-bold" onClick={() => signOut()}>تسجيل الخروج</Button>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir={dir}>
        <AppSidebar />
        <div className="app-shell flex-1 flex flex-col min-w-0">
          <header className="app-topbar flex items-center px-4 md:px-6 gap-3 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm shrink-0 border border-slate-200 overflow-hidden">
                <img src="/mjrh-logo.png" alt="MJRH" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm truncate text-slate-900">إدارة منصة MJRH</div>
                <div className="text-[10px] text-muted-foreground truncate">Super Admin Control Center</div>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="hidden sm:flex font-black text-xs border-red-300 bg-red-50 text-red-700 hover:bg-red-100 shadow-2xs">
              <Link to="/admin/telemetry">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping me-1.5 inline-block" />
                <span>مرصد التعثرات والمشاكل</span>
              </Link>
            </Button>
            <LanguageSwitcher compact />
          </header>
          <main className="app-main flex-1 p-4 md:p-7">
            <Outlet />
            <footer className="app-footer mt-8 mb-6 rounded-3xl border backdrop-blur p-4 text-center text-xs text-slate-600 flex flex-col items-center gap-1.5" dir="ltr">
              <div className="flex items-center justify-center gap-2">
                <img src="/mjrh-logo.png" alt="MJRH" className="h-5 w-5 object-contain" />
                <span className="font-black tracking-wide whitespace-nowrap text-slate-900 text-sm">© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION</span>
              </div>
              <div className="font-semibold whitespace-nowrap text-slate-500">BY MUHAMMAD RIYAD</div>
            </footer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
