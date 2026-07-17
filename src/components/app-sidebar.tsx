import { Link, useRouterState } from "@tanstack/react-router";
import {
 LayoutDashboard, ListOrdered, PlusCircle, Sparkles, Shirt, Package, Wind,
 Users, Tag, Settings, LogOut, Wallet, BriefcaseBusiness,
 CalendarDays, ShieldCheck, Clock, Inbox, Building2, Crown, PlayCircle,
 Truck, Headphones, Banknote, Navigation, Target, UserCircle, CalendarCheck,
 BarChart3, Boxes, HeartHandshake, ReceiptText, Calculator, BookOpenCheck,
 UsersRound, LockKeyhole, HelpCircle, Search, AlertTriangle, ClipboardCheck, Tags,
 Megaphone, TrendingUp, Workflow, Store, Shield, Activity, Layers,
} from "lucide-react";
import {
 Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
 SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; roles?: any[] };

const iconRegistry: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, CalendarCheck, Search, Settings, HelpCircle, ListOrdered, PlusCircle,
  Users, HeartHandshake, Tag, Boxes, Building2, Layers, ShieldCheck, PlayCircle,
  AlertTriangle, Inbox, Truck, Navigation, Wallet, Calculator, BookOpenCheck,
  UsersRound, LockKeyhole, Target, BarChart3, BriefcaseBusiness, Clock, Banknote,
  CalendarDays, ClipboardCheck, Sparkles, Wind, Shirt, Package, Headphones,
};

function iconFor(name?: string | null) {
  return name && iconRegistry[name] ? iconRegistry[name] : LayoutDashboard;
}

export function AppSidebar() {
 const path = useRouterState({ select: (r) => r.location.pathname });
 const { user, signOut, isSuperAdmin, tenantId } = useAuth();
 const { dir, t } = useI18n();
 const { setOpenMobile } = useSidebar();
 
 // V4 Sovereign State
 const [cockpit, setCockpit] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   if (!user) return;
   
   // V4 Lens Gateway: Fetches dynamic navigation based on L2 mandates and L4 state
   supabase.rpc('rpc_get_personal_cockpit').then(({ data, error }: any) => {
     if (!error && data) {
       setCockpit(data);
     }
     setLoading(false);
   });
 }, [user]);

 // Resolve the slug from the path or the cockpit identity
 const tenantSlug = cockpit?.identity?.urn?.replace('urn:mjrh:', '').replace(/_/g, '-') || "dry-tech";

 return (<Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
 <SidebarHeader className="border-b border-slate-800 p-4 bg-[#020617]">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-red-900/20">
   {cockpit?.identity?.name?.charAt(0) || 'M'}
 </div>
 <div className="min-w-0">
 <div className="font-black text-sm truncate tracking-tight text-white flex items-center gap-1">
 <span>{cockpit?.identity?.name || 'MJRH V4'}</span>
 </div>
 <div className="text-[10px] text-slate-500 truncate font-mono">{cockpit?.identity?.urn}</div>
 </div>
 </div>
 </SidebarHeader>
 <SidebarContent className="bg-[#020617]">
    <SidebarGroup>
      <SidebarGroupLabel className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-4">{t("navGroup.نظرة عامة")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={path.includes("/dashboard")}>
              <Link to={`/${tenantSlug}/dashboard` as any} className="flex items-center gap-2 font-bold text-slate-300">
                <LayoutDashboard className="w-4 h-4" />
                <span>{t("nav./dashboard", "Dashboard")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isSuperAdmin && (
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path.includes("/admin")}>
                <Link to="/admin" className="flex items-center gap-2 font-bold text-teal-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t("navGroup.إدارة المنصة", "Platform Admin")}</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>

    {/* Dynamic Work Areas from V4 Pulse Engine */}
    <SidebarGroup>
        <SidebarGroupLabel className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-4">{t("navGroup.التشغيل والمحطات")}</SidebarGroupLabel>
        <SidebarGroupContent>
            <SidebarMenu>
                {cockpit?.tasks?.length > 0 ? (
                    cockpit.tasks.slice(0, 5).map((task: any) => (
                        <SidebarMenuItem key={task.id}>
                            <SidebarMenuButton asChild>
                                <Link to={`/${tenantSlug}/stations/${task.status.toLowerCase()}` as any} className="flex items-center gap-2 font-bold text-slate-300">
                                    <Activity className="w-4 h-4 text-red-500" />
                                    <span>{task.activity_name}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))
                ) : (
                    <div className="px-6 py-2 text-[10px] text-slate-600 italic">No Active Pulses</div>
                )}
            </SidebarMenu>
        </SidebarGroupContent>
    </SidebarGroup>
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
 </Sidebar>);
}
