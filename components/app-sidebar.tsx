import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListOrdered, PlusCircle, Sparkles, Shirt, Package, Wind,
  Users, Tag, Settings, LogOut, Wallet, BriefcaseBusiness,
  CalendarDays, ShieldCheck, Clock, Inbox, Building2, Crown, PlayCircle,
  Truck, Headphones, Banknote, Navigation, Target, UserCircle, CalendarCheck,
  BarChart3, Boxes, HeartHandshake, ReceiptText, Calculator, BookOpenCheck,
  UsersRound, LockKeyhole, HelpCircle, Search,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; roles?: AppRole[] };

const adminGroups = [
  {
    label: "إدارة المنصة",
    items: [
      { title: "المغاسل", url: "/admin/tenants", icon: Building2 },
      { title: "كل المستخدمين", url: "/admin/users", icon: Crown },
      { title: "رسوم تشغيل المنصة", url: "/admin/platform-fees", icon: Banknote },
      { title: "فواتير SaaS", url: "/admin/billing", icon: ReceiptText },
    ],
  },
];

const tenantGroups = [
  {
    label: "اللوحات",
    items: [
      { title: "البحث", url: "/search", icon: Search },
      { title: "تشغيل اليوم", url: "/daily-operations", icon: PlayCircle },
      { title: "مركز اليوم", url: "/today", icon: CalendarCheck },
      { title: "لوحة المالك", url: "/dashboard", icon: LayoutDashboard },
      { title: "التنفيذيين", url: "/executive", icon: BarChart3 },
      { title: "لوحة التشغيل", url: "/ops", icon: ShieldCheck },
      { title: "خدمة العملاء", url: "/cs", icon: Headphones },
      { title: "خريطة المراقبة", url: "/live-map", icon: Navigation },
      { title: "التقارير", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "الطلبات",
    items: [
      { title: "كل الطلبات", url: "/orders", icon: ListOrdered },
      { title: "طلب جديد", url: "/orders/new", icon: PlusCircle },
    ],
  },
  {
    label: "محطات العمل",
    items: [
      { title: "الاستقبال", url: "/stations/reception", icon: Inbox },
      { title: "التنظيف", url: "/stations/cleaning", icon: Sparkles },
      { title: "الكي", url: "/stations/ironing", icon: Shirt },
      { title: "التغليف", url: "/stations/packing", icon: Package },
      { title: "الجودة", url: "/stations/qc", icon: ShieldCheck },
      { title: "المناديب", url: "/stations/delivery", icon: Truck },
    ],
  },
  {
    label: "الموظفون",
    items: [
      { title: "الحضور", url: "/staff/attendance", icon: Clock },
      { title: "التقييم", url: "/staff/scorecard", icon: Target },
      { title: "قائمة الموظفين", url: "/staff", icon: BriefcaseBusiness },
      { title: "جدول العمل", url: "/staff/schedule", icon: Clock },
    ],
  },
  {
    label: "المالية والتشغيل",
    items: [
      { title: "الحسابات", url: "/finance", icon: Wallet },
      { title: "المحاسبة", url: "/accounting", icon: Calculator },
      { title: "القيود", url: "/ledger", icon: BookOpenCheck },
      { title: "فحص النظام", url: "/system-health", icon: ShieldCheck },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { title: "العملاء", url: "/customers", icon: Users },
      { title: "الخدمات", url: "/services", icon: Tag },
      { title: "الإعدادات", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles, user, signOut, isSuperAdmin } = useAuth();
  const { dir, t } = useI18n();
  const { setOpenMobile } = useSidebar();

  const groups = isSuperAdmin ? [...adminGroups, ...tenantGroups] : tenantGroups;

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-xs border border-sidebar-border flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/mjrh-logo.png" alt="MJRH" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm truncate tracking-tight text-slate-900">MJRH STABLE</div>
            <div className="text-[10px] opacity-70 truncate">{user?.email}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{t(`navGroup.${g.label}`, g.label)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = path === item.url || path.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2" onClick={() => setOpenMobile(false)}>
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span>{t(`nav.${item.url}`, item.title)}</span>
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
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <LogOut className="w-4 h-4" /><span>{t("app.signOut", "Sign Out")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
