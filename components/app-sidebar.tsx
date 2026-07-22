import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListOrdered, PlusCircle, Sparkles, Shirt, Package, Wind,
  Users, Tag, Settings, LogOut, Wallet, BriefcaseBusiness,
  CalendarDays, ShieldCheck, Clock, Inbox, Building2, Crown, PlayCircle,
  Truck, Headphones, Banknote, Navigation, Target, UserCircle, CalendarCheck,
  BarChart3, Boxes, HeartHandshake, ReceiptText, Calculator, BookOpenCheck,
  UsersRound, LockKeyhole, HelpCircle, Search, Smartphone, UserPlus, FileText, CreditCard
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; roles?: AppRole[] };

const adminGroups = [
  {
    label: "إدارة المنصة",
    items: [
      { title: "المشاريع", url: "/admin/tenants", icon: Building2 },
      { title: "كل المستخدمين", url: "/admin/users", icon: Crown },
      { title: "رسوم التشغيل", url: "/admin/platform-fees", icon: Banknote },
      { title: "الفواتير", url: "/admin/billing", icon: ReceiptText },
    ],
  },
];

const tenantGroups = [
  {
    label: "اللوحات الذكية",
    items: [
      { title: "مركز اليوم", url: "/today", icon: CalendarCheck },
      { title: "لوحة المالك", url: "/dashboard", icon: LayoutDashboard },
      { title: "التقارير", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "العمليات",
    items: [
      { title: "كل الطلبات", url: "/orders", icon: ListOrdered },
      { title: "طلب جديد", url: "/orders/new", icon: PlusCircle },
      { title: "طلبات أونلاين", url: "/online-queue", icon: Smartphone },
      { title: "التوصيل", url: "/delivery", icon: Truck },
    ],
  },
  {
    label: "الموظفون",
    items: [
      { title: "الحضور", url: "/staff/attendance", icon: Clock },
      { title: "الموردين", url: "/staff/suppliers", icon: UserPlus },
      { title: "كل الموظفين", url: "/staff", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "المالية والمحاسبة",
    items: [
      { title: "الحسابات", url: "/finance", icon: Wallet },
      { title: "المحاسبة", url: "/accounting", icon: Calculator },
      { title: "المخزون", url: "/inventory", icon: Boxes },
    ],
  },
  {
    label: "النظام",
    items: [
      { title: "الإعدادات", url: "/settings", icon: Settings },
      { title: "البحث", url: "/search", icon: Search },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles, user, signOut, isSuperAdmin, tenantId } = useAuth();
  const { dir, t } = useI18n();
  const { setOpenMobile } = useSidebar();
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    if (tenantId) {
      supabase.from("tenants").select("name,logo_url").eq("id", tenantId).maybeSingle().then(({ data }: any) => setTenant(data));
    }
  }, [tenantId]);

  const groups = isSuperAdmin ? [...adminGroups, ...tenantGroups] : tenantGroups;

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon" className="bg-white border-r border-slate-200">
      <SidebarHeader className="border-b border-slate-100 p-6 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-brand-blue/5 p-1.5 border border-brand-blue/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {tenant?.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover rounded-lg" /> : <img src="/mjrh-logo.png" alt="MJRH" className="w-full h-full object-contain" />}
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm truncate tracking-tight text-brand-blue uppercase">{tenant?.name || (isSuperAdmin ? "إدارة المنصة" : "MJRH")}</div>
            <div className="text-[10px] text-slate-400 font-bold truncate leading-tight uppercase tracking-widest">{isSuperAdmin ? "Super Admin" : "Tenant Cloud"}</div>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-white px-3 py-4">
        {groups.map((g) => (
          <SidebarGroup key={g.label} className="mb-6 last:mb-0">
            <SidebarGroupLabel className="text-slate-400 font-black px-4 py-2 uppercase tracking-widest text-[9px] mb-1">
              {t(`navGroup.${g.label}`, g.label)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {g.items.map((item) => {
                  const active = path === item.url || path.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={active} 
                        className={cn(
                          "rounded-xl h-10 transition-all duration-200 px-4",
                          active 
                            ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue hover:text-white" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-brand-blue font-bold"
                        )}
                      >
                        <Link to={item.url} className="flex items-center gap-3" onClick={() => setOpenMobile(false)}>
                          <item.icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-brand-blue")} />
                          <span className="truncate text-xs">{t(`nav.${item.url}`, item.title)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-4 bg-slate-50/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => signOut()} 
              className="rounded-xl h-10 text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold px-4 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs">{t("app.signOut", "خروج آمن")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
