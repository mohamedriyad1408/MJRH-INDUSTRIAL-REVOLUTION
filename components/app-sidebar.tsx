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
import { useAuth } from "@/core/auth/useAuth";
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

export function AppSidebar() {
 const path = useRouterState({ select: (r) => r.location.pathname });
 const { user, signOut, isSuperAdmin } = useAuth();
 const { dir, t } = useI18n();
 const { setOpenMobile } = useSidebar();

 const legacyTenantGroups = [
  {
  label: t("common.الرئيسية"),
  items: [
  { title: t("common.مركز_اليوم"), url: "/today", icon: CalendarCheck },
  { title: t("common.لوحة_المالك"), url: "/dashboard", icon: LayoutDashboard },
  ],
  },
  {
  label: t("common.التشغيل"),
  items: [
  { title: t("common.كل_العمليات"), url: "/orders", icon: ListOrdered },
  { title: t("common.العملاء"), url: "/customers", icon: Users },
  ],
  }
 ];

 const tenantSlug = path.split("/")[1] || "dry-tech";
 const isLegacyTenant = tenantSlug === "dry-tech" || tenantSlug === "laundry-showcase" || tenantSlug === "dry-tech-reference";
 
 const { data: cockpit, isLoading } = useQuery<any>({
   queryKey: ["personal-cockpit", user?.id, tenantSlug],
   queryFn: async () => {
     if (isLegacyTenant) return null;
     const { data, error } = await supabase.rpc('rpc_get_personal_cockpit');
     if (error) throw error;
     return data;
   },
   enabled: !!user && !isLegacyTenant,
 });

 if (isLoading) return <Sidebar side={dir === "rtl" ? "right" : "left"}><div className="p-4 flex items-center justify-center h-full bg-[#020617]"><Loader2 className="animate-spin text-red-600" /></div></Sidebar>;

 return (
  <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
    <SidebarHeader className="border-b border-slate-800 p-4 bg-[#020617]">
      <div className="flex items-center gap-3 text-white">
        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-xl shadow-lg shadow-red-900/20">
          {isLegacyTenant ? "D" : (cockpit?.identity?.name?.charAt(0) || 'M')}
        </div>
        <div className="min-w-0">
           <div className="font-black text-sm truncate tracking-tight">{isLegacyTenant ? "Dry Tech" : (cockpit?.identity?.name || "MJRH V4")}</div>
           <div className="text-[10px] opacity-50 font-mono truncate">{isLegacyTenant ? "urn:mjrh:dry-tech" : cockpit?.identity?.urn}</div>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent className="bg-[#020617]">
      {isLegacyTenant ? legacyTenantGroups.map(g => (
        <SidebarGroup key={g.label}>
          <SidebarGroupLabel className="text-slate-500 font-bold uppercase text-[10px] tracking-widest px-4">{g.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
                {g.items.map(it => {
                    const targetUrl = `/${tenantSlug}${it.url}`;
                    const isActive = path === targetUrl || path.startsWith(targetUrl + "/");
                    return (
                        <SidebarMenuItem key={it.url}>
                            <SidebarMenuButton asChild isActive={isActive}>
                                <Link to={targetUrl as any} className="flex items-center gap-2 text-slate-300 font-bold" onClick={() => setOpenMobile(false)}>
                                    <it.icon className="w-4 h-4" /><span>{it.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )) : (cockpit?.navigation || []).map((group: any) => (
        <SidebarGroup key={group.group}>
          <SidebarGroupLabel className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-4">{group.group}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item: any) => {
                const Icon = iconRegistry[item.icon] || LayoutDashboard;
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
      ))}

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
