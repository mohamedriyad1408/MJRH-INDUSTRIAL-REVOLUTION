import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListOrdered, PlusCircle, Sparkles, Shirt, Package,
  Users, Tag, Settings, LogOut, Wallet, BriefcaseBusiness,
  CalendarDays, ShieldCheck, Clock, Inbox, Building2, Crown,
  Truck, Headphones, Banknote, Navigation, Target, UserCircle,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/hooks/use-auth";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; roles?: AppRole[] };

const adminGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "إدارة المنصة",
    items: [
      { title: "المغاسل", url: "/admin/tenants", icon: Building2 },
      { title: "كل المستخدمين", url: "/admin/users", icon: Crown },
      { title: "رسوم تشغيل المنصة", url: "/admin/platform-fees", icon: Banknote },
    ],
  },
];

const tenantGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "اللوحات",
    items: [
      { title: "لوحة المالك", url: "/dashboard", icon: LayoutDashboard, roles: ["owner"] },
      { title: "لوحة التشغيل", url: "/ops", icon: ShieldCheck, roles: ["ops_manager", "owner"] },
      { title: "خدمة العملاء", url: "/cs", icon: Headphones, roles: ["cs_manager", "owner"] },
      { title: "لوحة المدير", url: "/manager", icon: ShieldCheck, roles: ["cs_manager", "ops_manager", "owner"] },
      { title: "لوحة السائق", url: "/driver", icon: Truck, roles: ["courier", "owner", "ops_manager"] },
      { title: "خريطة المراقبة الحية", url: "/live-map", icon: Navigation, roles: ["owner", "ops_manager"] },
    ],
  },
  {
    label: "الطلبات",
    items: [
      { title: "كل الطلبات", url: "/orders", icon: ListOrdered },
      { title: "طلب جديد", url: "/orders/new", icon: PlusCircle, roles: ["cs_manager", "owner"] },
    ],
  },
  {
    label: "محطات العمل",
    items: [
      { title: "الاستقبال", url: "/stations/reception", icon: Inbox, roles: ["cs_manager", "ops_manager", "owner", "employee"] },
      { title: "التنظيف", url: "/stations/cleaning", icon: Sparkles, roles: ["ops_manager", "owner", "employee"] },
      { title: "الكي", url: "/stations/ironing", icon: Shirt, roles: ["ops_manager", "owner", "employee"] },
      { title: "التغليف", url: "/stations/packing", icon: Package, roles: ["ops_manager", "owner", "employee"] },
      { title: "المناديب", url: "/stations/delivery", icon: Truck, roles: ["ops_manager", "owner", "employee", "courier"] },
    ],
  },
  {
    label: "الموظفون",
    items: [
      { title: "إدارة المستخدمين", url: "/staff/users", icon: Crown, roles: ["owner"] },
      { title: "كل الموظفين", url: "/staff", icon: BriefcaseBusiness, roles: ["cs_manager", "ops_manager", "owner"] },
      { title: "جدول العمل", url: "/staff/schedule", icon: Clock, roles: ["cs_manager", "ops_manager", "owner"] },
      { title: "الإجازات والعطلات", url: "/staff/leaves", icon: CalendarDays, roles: ["cs_manager", "ops_manager", "owner"] },
      { title: "الطلبات والسلف", url: "/staff/requests", icon: Inbox, roles: ["cs_manager", "ops_manager", "owner"] },
      { title: "الرواتب اليومية", url: "/staff/salaries", icon: Banknote, roles: ["owner"] },
      { title: "رواتب فنيي الكي", url: "/staff/ironing-payroll", icon: Shirt, roles: ["owner"] },
    ],
  },
  {
    label: "المالية",
    items: [
      { title: "الحسابات", url: "/finance", icon: Wallet, roles: ["owner", "cs_manager", "ops_manager"] },
      { title: "الميزانيات", url: "/budgets", icon: Target, roles: ["owner"] },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { title: "العملاء", url: "/customers", icon: Users, roles: ["cs_manager", "owner"] },
      { title: "كتالوج الخدمات", url: "/services", icon: Tag, roles: ["cs_manager", "owner"] },
      { title: "نقاط التشغيل", url: "/branches", icon: Building2, roles: ["owner"] },
      { title: "الإعدادات", url: "/settings", icon: Settings, roles: ["owner"] },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles, hasRole, user, signOut, isSuperAdmin } = useAuth();
  const { setOpenMobile } = useSidebar();
  const groups = isSuperAdmin ? adminGroups : tenantGroups;

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-glow flex items-center justify-center shrink-0">
            <Shirt className="w-5 h-5 text-sidebar" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">MJRH</div>
            <div className="text-xs opacity-70 truncate">{user?.email}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => {
          const visible = g.items.filter((i) => !i.roles || hasRole(...i.roles));
          if (!visible.length) return null;
          return (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
                    const active = path === item.url || path.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={item.url} className="flex items-center gap-2" onClick={() => setOpenMobile(false)}>
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="px-2 pb-2 text-xs opacity-70">
          {roles.length ? `الدور: ${roles.map(roleAr).join("، ")}` : "بدون دور"}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/customer-portal" target="_blank" className="flex items-center gap-2 text-teal-600" onClick={() => setOpenMobile(false)}>
                <UserCircle className="w-4 h-4" /><span>بوابة العميل</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <LogOut className="w-4 h-4" /><span>خروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function roleAr(r: AppRole) {
  return ({ super_admin: "مدير المنصة", owner: "مالك", cs_manager: "خدمة عملاء", ops_manager: "تشغيل", employee: "موظف", customer: "عميل", courier: "مندوب" } as Record<AppRole, string>)[r] ?? r;
}
