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

export const Route = createFileRoute("/$tenant")({
  component: AppLayout,
});

const RESERVED_ROUTE_NAMES = ["today", "orders", "customers", "staff", "stations", "finance", "accounting", "ledger", "receivables", "cash-closing", "budgets", "inventory", "billing", "crm", "services", "branches", "settings", "help", "system-health", "daily-operations", "ops", "cs", "manager", "driver", "live-map", "reports", "executive", "pickups", "search", "scorecard", "attendance", "dashboard"];

function AppLayout() {
  const { session, user, loading, roles, isSuperAdmin, hasRole, signOut, tenantId } = useAuth();
  const { dir, t } = useI18n();
  const [tenantBrand, setTenantBrand] = useState<any>(null);
  const [setupGate, setSetupGate] = useState<{ loading: boolean; canEnter: boolean }>({ loading: true, canEnter: false });
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { tenant: tenantParam } = Route.useParams() as { tenant?: string };

  useEffect(() => {
    if (!loading && !session) nav({ to: "/login" });
  }, [loading, session, nav]);

  // Smart redirect: If someone visits root app routes like /today or /orders without tenant slug
  useEffect(() => {
    if (tenantParam && RESERVED_ROUTE_NAMES.includes(tenantParam)) {
      if (user) {
        supabase.from("user_roles").select("role, tenant_id, tenants(slug)").eq("user_id", user.id).then(({ data }: any) => {
          const rows = data || [];
          const slug = rows.find((r: any) => r.tenants?.slug)?.tenants?.slug || "dry-tech";
          const targetPath = `/${slug}${path}`;
          nav({ to: targetPath as any, replace: true });
        });
      } else if (!loading) {
        nav({ to: "/login" });
      }
    }
  }, [tenantParam, path, nav, user, loading]);

  useEffect(() => {
    if (tenantParam) {
      supabase.from("tenants").select("id,name,slug,logo_url,public_url,business_type,is_active").eq("slug", tenantParam).maybeSingle().then(({ data }: any) => {
        setTenantBrand(data ?? null);
      });
    } else if (tenantId) {
      supabase.from("tenants").select("id,name,slug,logo_url,public_url,business_type,is_active").eq("id", tenantId).maybeSingle().then(({ data }: any) => {
        setTenantBrand(data ?? null);
      });
    } else {
      setTenantBrand(null);
    }
  }, [tenantParam, tenantId]);

  // Super admin: لو دخل على صفحة تشغيل وهو ليس عضو في tenant، حوّله لـ /admin/tenants
  useEffect(() => {
    if (!loading && session && isSuperAdmin && !path.includes("/admin") && !tenantParam) {
      nav({ to: "/admin/tenants" as any });
    }
  }, [loading, session, isSuperAdmin, path, nav, tenantParam]);

  // MJRH Core Platform Gate:
  // No user can enter the operating platform before the mandatory setup wizard
  // finishes generating the configuration-driven OS.
  useEffect(() => {
    if (loading || !session) return;
    const currentTenantId = tenantBrand?.id || tenantId;
    if (!currentTenantId) {
      setSetupGate({ loading: false, canEnter: path.includes("/onboarding") });
      return;
    }
    if (path.includes("/onboarding")) {
      setSetupGate({ loading: false, canEnter: true });
      return;
    }
    setSetupGate({ loading: true, canEnter: false });
    supabase.rpc("can_enter_platform", { _tenant_id: currentTenantId }).then(async ({ data, error }: any) => {
      if (error) {
        const { data: onboarding } = await supabase.from("tenant_onboarding").select("is_completed").eq("tenant_id", currentTenantId).maybeSingle();
        const canEnter = Boolean(onboarding?.is_completed);
        setSetupGate({ loading: false, canEnter });
        if (!canEnter && tenantParam) nav({ to: `/${tenantParam}/onboarding` as any, replace: true });
        return;
      }
      const canEnter = Boolean(data);
      setSetupGate({ loading: false, canEnter });
      if (!canEnter && tenantParam) nav({ to: `/${tenantParam}/onboarding` as any, replace: true });
    });
  }, [loading, session, tenantBrand?.id, tenantId, path, tenantParam, nav]);

  // Guard employee/courier deep links: non-managers should only access their operational page.
  useEffect(() => {
    if (loading || !session || !roles.length || isSuperAdmin) return;
    if (!path.includes("/onboarding") && !setupGate.canEnter) return;
    const isManager = hasRole("owner", "ops_manager", "cs_manager");
    if (isManager) return;

    if (hasRole("courier")) {
      if (!path.includes("/driver")) nav({ to: `${tenantParam ? `/${tenantParam}` : ""}/driver` as any });
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
            const allowed = ["/orders", "/customers", "/stations/reception", "/search"];
            if (!allowed.some((x) => path.includes(x))) nav({ to: `${tenantParam ? `/${tenantParam}` : ""}/orders/new` as any });
            return;
          }
          const stationPath = data?.station === "drying_assembly" ? "/stations/drying-assembly" : data?.station ? `/stations/${data.station}` : null;
          const target = data?.job_role === "driver" ? "/driver" : stationPath;
          if (target && !path.includes(target)) nav({ to: `${tenantParam ? `/${tenantParam}` : ""}${target}` as any });
        });
    }
  }, [loading, session, roles.length, isSuperAdmin, hasRole, path, nav, user, tenantParam, setupGate.canEnter]);

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

  if (!path.includes("/onboarding") && setupGate.loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!path.includes("/onboarding") && !setupGate.canEnter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4" dir={dir}>
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-amber-200 bg-amber-50/40 shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center border border-amber-200">
            <Hourglass className="w-7 h-7 text-amber-700" />
          </div>
          <h1 className="text-xl font-extrabold text-amber-950">Setup Wizard Required</h1>
          <p className="text-sm text-amber-900 font-medium">
            لا يمكن دخول المنصة قبل انتهاء معالج إعداد MJRH Core Platform. كل شيء يجب أن يولد من configuration أولاً.
          </p>
          <Button className="w-full font-bold" onClick={() => tenantParam && nav({ to: `/${tenantParam}/onboarding` as any, replace: true })}>فتح معالج الإعداد</Button>
        </Card>
      </div>
    );
  }

  // إيقاف تفعيل المنظمة من مدير المنصة (Super Admin)
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
          <header className="app-topbar flex items-center px-3 md:px-6 gap-2 md:gap-3 sticky top-0 z-30 min-w-0">
            <SidebarTrigger />
            <div className="flex items-center gap-2 min-w-0 flex-1"><div className="brand-orb h-9 w-9 md:h-11 md:w-11 rounded-2xl bg-white p-0.5 shadow-sm shrink-0 border border-slate-200 overflow-hidden">{tenantBrand?.logo_url ? <img src={tenantBrand.logo_url} className="h-full w-full rounded-xl object-cover" /> : <img src="/mjrh-logo.png" alt="MJRH" className="h-full w-full rounded-xl object-contain" />}</div><div className="min-w-0 hidden sm:block"><div className="font-black text-sm truncate">{tenantBrand?.name ?? "MJRH"}</div><div className="text-[10px] text-muted-foreground truncate">{tenantBrand?.public_url ?? t("app.tagline")}</div></div></div>
            <div className="hidden md:block min-w-0"><UnifiedSearch /></div>
            <div className="shrink-0"><LanguageSwitcher compact /></div>
            <div className="shrink-0"><NotificationCenter /></div>
            <div className="hidden md:block"><AttendanceWidget /></div>
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
