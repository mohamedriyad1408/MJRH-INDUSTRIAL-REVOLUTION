import { Link, useRouterState } from "@tanstack/react-router";
import {
 LayoutDashboard, ListOrdered, PlusCircle, Sparkles, Shirt, Package, Wind,
 Users, Tag, Settings, LogOut, Wallet, BriefcaseBusiness,
 CalendarDays, ShieldCheck, Clock, Inbox, Building2, Crown, PlayCircle,
 Truck, Headphones, Banknote, Navigation, Target, UserCircle, CalendarCheck,
 BarChart3, Boxes, HeartHandshake, ReceiptText, Calculator, BookOpenCheck,
 UsersRound, LockKeyhole, HelpCircle, Search, AlertTriangle, ClipboardCheck, Tags,
 Megaphone, TrendingUp, Workflow, Store, Shield, Activity, Layers, Loader2, Rocket
} from "lucide-react";
import {
 Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
 SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const iconRegistry: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, CalendarCheck, Search, Settings, HelpCircle, ListOrdered, PlusCircle,
  Users, HeartHandshake, Tag, Boxes, Building2, Layers, ShieldCheck, PlayCircle,
  AlertTriangle, Inbox, Truck, Navigation, Wallet, Calculator, BookOpenCheck,
  UsersRound, LockKeyhole, Target, BarChart3, BriefcaseBusiness, Clock, Banknote,
  CalendarDays, ClipboardCheck, Sparkles, Wind, Shirt, Package, Headphones, Tags,
  Megaphone, TrendingUp, Workflow, Store, Shield, Activity,
};

function iconFor(name?: string | null) {
  return name && iconRegistry[name] ? iconRegistry[name] : LayoutDashboard;
}

const legacyTenantGroups = [
 {
 label: "الرئيسية",
 items: [
 { title: "مركز اليوم", url: "/today", icon: CalendarCheck },
 { title: "تشغيل اليوم", url: "/daily-operations", icon: PlayCircle },
 { title: "لوحة المالك", url: "/dashboard", icon: LayoutDashboard },
 { title: "لوحة التشغيل", url: "/ops", icon: ShieldCheck },
 { title: "الخريطة والفريق", url: "/live-map", icon: Navigation },
 { title: "التقارير والذكاء", url: "/reports", icon: BarChart3 },
 ],
 },
 {
 label: "التشغيل والمحطات",
 items: [
 { title: "الاستقبال", url: "/stations/reception", icon: ClipboardCheck },
 { title: "الفرز والتصنيف", url: "/stations/sorting", icon: Tags },
 { title: "التشغيل والغسيل", url: "/stations/cleaning", icon: Sparkles },
 { title: "التجفيف والتجميع", url: "/stations/drying-assembly", icon: Wind },
 { title: "الكي والمكابس", url: "/stations/ironing", icon: Shirt },
 { title: "التغليف والشحن", url: "/stations/packing", icon: Package },
 { title: "الجودة QC", url: "/stations/qc", icon: ShieldCheck },
 { title: "سلامة النظام APDO", url: "/system-health", icon: ShieldCheck },
 ],
 },
 {
 label: "العملاء والمبيعات",
 items: [
 { title: "عملية جديدة", url: "/orders/new", icon: PlusCircle },
 { title: "كل العمليات", url: "/orders", icon: ListOrdered },
 { title: "العملاء", url: "/customers", icon: Users },
 { title: "CRM والولاء", url: "/crm", icon: HeartHandshake },
 { title: "كتالوج الخدمات", url: "/services", icon: Tag },
 { title: "المواقع والفروع", url: "/branches", icon: Building2 },
 { title: "المخزون", url: "/inventory", icon: Boxes },
 ],
 },
 {
 label: "المالية والإدارة",
 items: [
 { title: "المالية", url: "/finance", icon: Wallet },
 { title: "المحاسبة والخزنة", url: "/accounting", icon: Calculator },
 { title: "القيود", url: "/ledger", icon: BookOpenCheck },
 { title: "الذمم", url: "/receivables", icon: UsersRound },
 { title: "إقفال الخزنة", url: "/cash-closing", icon: LockKeyhole },
 { title: "الموظفون", url: "/staff", icon: BriefcaseBusiness },
 { title: "الإعدادات", url: "/settings", icon: Settings },
 { title: "الدليل", url: "/help", icon: HelpCircle },
 ],
 },
];

export function AppSidebar() {
 const path = useRouterState({ select: (r) => r.location.pathname });
 const { user, signOut, isSuperAdmin, hasRole } = useAuth();
 const { dir, t } = useI18n();
 const { setOpenMobile } = useSidebar();

 const tenantSlug = path.split("/")[1] || "dry-tech";
 const isLegacyTenant = tenantSlug === "dry-tech" || tenantSlug === "laundry-showcase";
 
 // V4 Sovereign Lens: Dynamic Navigation from the Cockpit Engine
 const { data: cockpit, isLoading } = useQuery<any>({
   queryKey: ["personal-cockpit", user?.id, tenantSlug],
   queryFn: async () => {
     if (isLegacyTenant) return null; // Don't even hit V4 for legacy
     const { data, error } = await supabase.rpc('rpc_get_personal_cockpit');
     if (error) throw error;
     return data;
   },
   enabled: !!user && !isLegacyTenant,
 });

 if (isLoading) {
    return (
      <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
        <div className="flex flex-col items-center justify-center h-full bg-[#020617] text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{t("common.loading", "Loading Sovereign DNA...")}</span>
        </div>
      </Sidebar>
    );
 }

 // Logic to render sidebar groups
 const renderGroups = () => {
    if (isLegacyTenant) {
        return legacyTenantGroups.map((group) => (
            <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-4">
                    {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {group.items.map((item) => {
                            const targetUrl = `/${tenantSlug}${item.url}`;
                            const isActive = path === targetUrl || path.startsWith(targetUrl + "/");
                            return (
                                <SidebarMenuItem key={item.url}>
                                    <SidebarMenuButton asChild isActive={isActive}>
                                        <Link to={targetUrl as any} className="flex items-center gap-2 font-bold text-slate-300" onClick={() => setOpenMobile(false)}>
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        ));
    }

    if (!cockpit || !cockpit.navigation || cockpit.navigation.length === 0) {
        return (
            <div className="flex items-center justify-center p-6">
                <Link to={`/${tenantSlug}/onboarding` as any} onClick={() => setOpenMobile(false)}>
                    <SidebarMenuButton className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-xl justify-center gap-2">
                        <Rocket className="w-5 h-5" />
                        <span>تأسيس مشروع جديد</span>
                    </SidebarMenuButton>
                </Link>
            </div>
        );
    }

    return cockpit.navigation.map((group: any) => (
        <SidebarGroup key={group.group}>
          <SidebarGroupLabel className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-4">
            {t(`navGroup.${group.group}`, group.group)}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item: any) => {
                const Icon = iconFor(item.icon);
                const targetUrl = !item.url.startsWith("/admin") ? `/${tenantSlug}${item.url}` : item.url;
                const isActive = path === targetUrl || path.startsWith(targetUrl + "/");

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={targetUrl as any} className="flex items-center gap-2 font-bold text-slate-300" onClick={() => setOpenMobile(false)}>
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
    ));
 };

 return (
  <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
    <SidebarHeader className="border-b border-slate-800 p-4 bg-[#020617]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-red-900/20">
          {isLegacyTenant ? "D" : (cockpit?.identity?.name?.charAt(0) || 'M')}
        </div>
        <div className="min-w-0">
          <div className="font-black text-sm truncate tracking-tight text-white flex items-center gap-1">
            <span>{isLegacyTenant ? "Dry Tech" : (cockpit?.identity?.name || 'MJRH V4')}</span>
          </div>
          <div className="text-[10px] text-slate-500 truncate font-mono">
            {isLegacyTenant ? "urn:mjrh:dry-tech" : cockpit?.identity?.urn}
          </div>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent className="bg-[#020617]">
      {renderGroups()}

      {isSuperAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-4">Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path.includes("/admin")}>
                  <Link to="/admin" className="flex items-center gap-2 font-bold text-teal-400" onClick={() => setOpenMobile(false)}>
                    <ShieldCheck className="w-4 h-4" />
                    <span>إدارة المنصة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </SidebarContent>

    <SidebarFooter className="border-t border-slate-800 p-2 bg-[#020617]">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <a href={`/customer-portal?tenant=${tenantSlug}`} target="_blank" className="flex items-center gap-2 text-teal-600 font-black text-xs uppercase" onClick={() => setOpenMobile(false)}>
              <UserCircle className="w-4 h-4" /><span>{t("app.portal")}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => signOut()} className="font-bold text-red-600 hover:text-red-700">
            <LogOut className="w-4 h-4" /><span>{t("app.signOut")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
 );
}
