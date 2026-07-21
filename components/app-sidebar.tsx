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
    label: "Platform Admin",
    items: [
      { title: "Tenants", url: "/admin/tenants", icon: Building2 },
      { title: "All Users", url: "/admin/users", icon: Crown },
      { title: "Platform Fees", url: "/admin/platform-fees", icon: Banknote },
      { title: "SaaS Billing", url: "/admin/billing", icon: ReceiptText },
    ],
  },
];

const tenantGroups = [
  {
    label: "Dashboards",
    items: [
      { title: "Search", url: "/search", icon: Search },
      { title: "Daily Ops", url: "/daily-operations", icon: PlayCircle },
      { title: "Today Center", url: "/today", icon: CalendarCheck },
      { title: "Owner Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Executive", url: "/executive", icon: BarChart3 },
      { title: "Operations", url: "/ops", icon: ShieldCheck },
      { title: "Customer Service", url: "/cs", icon: Headphones },
      { title: "Live Map", url: "/live-map", icon: Navigation },
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Orders",
    items: [
      { title: "All Orders", url: "/orders", icon: ListOrdered },
      { title: "New Order", url: "/orders/new", icon: PlusCircle },
    ],
  },
  {
    label: "Workstations",
    items: [
      { title: "Reception", url: "/stations/reception", icon: Inbox },
      { title: "Cleaning", url: "/stations/cleaning", icon: Sparkles },
      { title: "Ironing", url: "/stations/ironing", icon: Shirt },
      { title: "Packing", url: "/stations/packing", icon: Package },
      { title: "QC", url: "/stations/qc", icon: ShieldCheck },
      { title: "Delivery", url: "/stations/delivery", icon: Truck },
    ],
  },
  {
    label: "Employees",
    items: [
      { title: "Attendance", url: "/staff/attendance", icon: Clock },
      { title: "Scorecard", url: "/staff/scorecard", icon: Target },
      { title: "Staff List", url: "/staff", icon: BriefcaseBusiness },
      { title: "Work Schedule", url: "/staff/schedule", icon: Clock },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Accounts", url: "/finance", icon: Wallet },
      { title: "Accounting", url: "/accounting", icon: Calculator },
      { title: "Ledger", url: "/ledger", icon: BookOpenCheck },
      { title: "System Health", url: "/system-health", icon: ShieldCheck },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Service Catalog", url: "/services", icon: Tag },
      { title: "Settings", url: "/settings", icon: Settings },
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
