import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2, Hourglass, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AttendanceWidget } from "@/components/attendance-widget";
import { NotificationCenter } from "@/components/notification-center";
import { MobileWorkDock } from "@/components/mobile-work-dock";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UnifiedSearch } from "@/components/unified-search";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, user, loading, roles, isSuperAdmin, hasRole, signOut, tenantId } = useAuth();
  const { dir, t } = useI18n();
  const [tenantBrand, setTenantBrand] = useState<any>(null);
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) nav({ to: "/login" });
  }, [loading, session, nav]);

  useEffect(() => {
    if (!tenantId) { setTenantBrand(null); return; }
    supabase.from("tenants").select("name,logo_url,public_url,business_type,is_active").eq("id", tenantId).maybeSingle().then(({ data }: any) => setTenantBrand(data ?? null));
  }, [tenantId]);

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
      supabase
        .from("employees")
        .select("id,station,job_role,profile_id,email")
        .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()
        .then(async ({ data }: any) => {
          if (data?.id && !data.profile_id) {
            await supabase.from("employees").update({ profile_id: user.id }).eq("id", data.id);
          }
          if (data?.station === "reception") {
            const allowed = ["/orders", "/customers", "/stations/reception"];
            if (!allowed.some((x) => path.startsWith(x))) nav({ to: "/orders/new" });
            return;
          }
          const stationPath = data?.station === "drying_assembly" ? "/stations/drying-assembly" : data?.station ? `/stations/${data.station}` : null;
          const target = data?.job_role === "driver" ? "/driver" : stationPath;
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
          <h1 className="text-xl font-bold">{t("waiting.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("waiting.body")}
          </p>
          <Button variant="outline" onClick={() => signOut()}><LogOut className="w-4 h-4 ms-1" /> {t("app.signOut")}</Button>
        </Card>
      </div>
    );
  }

  // إيقاف تفعيل المغسلة من مدير المنصة (Super Admin)
  if (tenantBrand && tenantBrand.is_active === false && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4" dir={dir}>
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-red-200 bg-red-50/40 shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center border border-red-200">
            <LogOut className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-extrabold text-red-900">{t("tenant.suspended.title", "تم إيقاف تفعيل حساب المغسلة")}</h1>
          <p className="text-sm text-red-800 font-medium">
            {t("tenant.suspended.body", "حساب هذه المغسلة موقوف حالياً من قِبل إدارة المنصة (Super Admin). يرجى التواصل مع الدعم الفني أو إدارة المنصة لإعادة التفعيل.")}
          </p>
          <Button variant="destructive" className="w-full font-bold" onClick={() => signOut()}><LogOut className="w-4 h-4 ms-1" /> {t("app.signOut", "تسجيل الخروج")}</Button>
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
            <div className="flex items-center gap-2 min-w-0 flex-1"><div className="brand-orb h-11 w-11 rounded-2xl bg-white p-0.5 shadow-sm shrink-0 border border-slate-200 overflow-hidden">{tenantBrand?.logo_url ? <img src={tenantBrand.logo_url} className="h-full w-full rounded-xl object-cover" /> : <img src="/mjrh-logo.png" alt="MJRH" className="h-full w-full rounded-xl object-contain" />}</div><div className="min-w-0"><div className="font-black text-sm truncate">{tenantBrand?.name ?? "MJRH"}</div><div className="text-[10px] text-muted-foreground truncate">{tenantBrand?.public_url ?? t("app.tagline")}</div></div></div>
            <UnifiedSearch />
            <LanguageSwitcher compact />
            <NotificationCenter />
            <AttendanceWidget />
          </header>
          <main className="app-main flex-1 p-4 md:p-7">
            <Outlet />
            <footer className="app-footer mt-8 mb-24 md:mb-0 rounded-3xl border backdrop-blur p-4 text-center text-xs text-slate-600 flex flex-col items-center gap-1.5" dir="ltr">
              <div className="flex items-center justify-center gap-2">
                <img src="/mjrh-logo.png" alt="MJRH" className="h-6 w-6 object-contain" />
                <span className="font-black tracking-wide whitespace-nowrap text-slate-900 text-sm">© {new Date().getFullYear()} MJRH INDUSTRIAL REVOLUTION</span>
              </div>
              <div className="font-semibold whitespace-nowrap text-slate-500">BY MUHAMMAD RIYAD</div>
              <a href="tel:+201130804784" className="inline-block whitespace-nowrap text-slate-500 hover:text-teal-700 font-mono">+20 113 080 4784</a>
            </footer>
          </main>
          <MobileWorkDock />
        </div>
      </div>
    </SidebarProvider>
  );
}
