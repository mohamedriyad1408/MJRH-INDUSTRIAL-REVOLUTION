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

export function AppSidebar() {
 const path = useRouterState({ select: (r) => r.location.pathname });
 const { user, signOut, isSuperAdmin } = useAuth();
 const { dir, t } = useI18n();
 const { setOpenMobile } = useSidebar();
 
 // V4 Sovereign Lens: Dynamic Navigation from the Cockpit Engine
 const { data: cockpit, isLoading } = useQuery({
   queryKey: ["personal-cockpit", user?.id],
   queryFn: async () => {
     const { data, error } = await supabase.rpc('rpc_get_personal_cockpit');
     if (error) throw error;
     return data;
   },
   enabled: !!user,
 });

 const tenantSlug = cockpit?.identity?.urn?.replace('urn:mjrh:', '').replace(/_/g, '-') || "dry-tech";

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

 // Setup State / Missing Navigation
 if (!cockpit || !cockpit.navigation || cockpit.navigation.length === 0) {
    return (
      <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
        <SidebarHeader className="border-b border-slate-800 p-4 bg-[#020617]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-xl">M</div>
            <div className="font-black text-sm text-white">MJRH V4</div>
          </div>
        </SidebarHeader>
        <SidebarContent className="bg-[#020617] flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="text-xs text-slate-500 italic mb-4">No Sovereign Routes Detected</div>
            <Link to="/onboarding" onClick={() => setOpenMobile(false)}>
              <SidebarMenuButton className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-xl justify-center gap-2">
                <Rocket className="w-5 h-5" />
                <span>تأسيس مشروع جديد</span>
              </SidebarMenuButton>
            </Link>
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-slate-800 p-2 bg-[#020617]">
          <SidebarMenuButton onClick={() => signOut()} className="font-bold text-red-600 hover:text-red-700">
            <LogOut className="w-4 h-4" /><span>{t("app.signOut")}</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
    );
 }

 return (
  <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
    <SidebarHeader className="border-b border-slate-800 p-4 bg-[#020617]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-red-900/20">
          {cockpit.identity?.name?.charAt(0) || 'M'}
        </div>
        <div className="min-w-0">
          <div className="font-black text-sm truncate tracking-tight text-white flex items-center gap-1">
            <span>{cockpit.identity?.name || 'MJRH V4'}</span>
          </div>
          <div className="text-[10px] text-slate-500 truncate font-mono">{cockpit.identity?.urn}</div>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent className="bg-[#020617]">
      {cockpit.navigation.map((group: any) => (
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
      ))}

      {/* Super Admin Escape Hatch */}
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
