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

const adminGroups: { label: string; items: NavItem[] }[] = [
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

const tenantGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "اللوحات",
    items: [
      { title: "البحث الموحد والنتائج", url: "/search", icon: Search, roles: ["owner", "ops_manager", "cs_manager", "employee", "courier"] },
      { title: "تشغيل اليوم", url: "/daily-operations", icon: PlayCircle, roles: ["owner", "ops_manager", "cs_manager"] },
      { title: "مركز اليوم", url: "/today", icon: CalendarCheck, roles: ["owner", "ops_manager", "cs_manager"] },
      { title: "لوحة المالك", url: "/dashboard", icon: LayoutDashboard, roles: ["owner"] },
      { title: "لوحة المديرين التنفيذيين", url: "/executive", icon: BarChart3, roles: ["owner"] },
      { title: "لوحة التشغيل", url: "/ops", icon: ShieldCheck, roles: ["ops_manager", "owner"] },
      { title: "خدمة العملاء", url: "/cs", icon: Headphones, roles: ["cs_manager", "owner"] },
      { title: "لوحة المدير", url: "/manager", icon: ShieldCheck, roles: ["cs_manager", "ops_manager", "owner"] },
      { title: "لوحة السائق", url: "/driver", icon: Truck, roles: ["courier", "owner", "ops_manager"] },
      { title: "خريطة المراقبة الحية", url: "/live-map", icon: Navigation, roles: ["owner", "ops_manager"] },
      { title: "التقارير والذكاء", url: "/reports", icon: BarChart3, roles: ["owner", "ops_manager", "cs_manager"] },
    ],
  },
  {
    label: "الطلبات",
    items: [
      { title: "كل الطلبات", url: "/orders", icon: ListOrdered, roles: ["cs_manager", "ops_manager", "owner"] },
      { title: "طلب جديد", url: "/orders/new", icon: PlusCircle, roles: ["cs_manager", "owner"] },
    ],
  },
  {
    label: "محطات العمل",
    items: [
      { title: "الاستقبال", url: "/stations/reception", icon: Inbox, roles: ["cs_manager", "ops_manager", "owner", "employee"] },
      { title: "التنظيف", url: "/stations/cleaning", icon: Sparkles, roles: ["ops_manager", "owner", "employee"] },
      { title: "التجفيف والتجميع", url: "/stations/drying-assembly", icon: Wind, roles: ["ops_manager", "owner", "employee"] },
      { title: "الكي", url: "/stations/ironing", icon: Shirt, roles: ["ops_manager", "owner", "employee"] },
      { title: "التغليف", url: "/stations/packing", icon: Package, roles: ["ops_manager", "owner", "employee"] },
      { title: "الجودة QC", url: "/stations/qc", icon: ShieldCheck, roles: ["ops_manager", "owner", "employee"] },
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
    label: "المالية والتشغيل",
    items: [
      { title: "الحسابات", url: "/finance", icon: Wallet, roles: ["owner", "cs_manager", "ops_manager"] },
      { title: "المحاسبة والخزنة", url: "/accounting", icon: Calculator, roles: ["owner", "ops_manager"] },
      { title: "القيود والتقارير", url: "/ledger", icon: BookOpenCheck, roles: ["owner"] },
      { title: "فحص النظام", url: "/system-health", icon: ShieldCheck, roles: ["owner", "ops_manager"] },
      { title: "ذمم العملاء", url: "/receivables", icon: UsersRound, roles: ["owner", "cs_manager", "ops_manager"] },
      { title: "إقفال الخزنة", url: "/cash-closing", icon: LockKeyhole, roles: ["owner", "ops_manager"] },
      { title: "الميزانيات", url: "/budgets", icon: Target, roles: ["owner"] },
      { title: "المخزون والمعدات", url: "/inventory", icon: Boxes, roles: ["owner", "ops_manager"] },
      { title: "اشتراك المنصة", url: "/billing", icon: ReceiptText, roles: ["owner"] },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { title: "العملاء", url: "/customers", icon: Users, roles: ["cs_manager", "owner"] },
      { title: "CRM والولاء", url: "/crm", icon: HeartHandshake, roles: ["cs_manager", "ops_manager", "owner"] },
      { title: "رعاية العملاء والتعويضات", url: "/customer-care", icon: HeartHandshake, roles: ["owner", "cs_manager", "ops_manager"] },
      { title: "كتالوج الخدمات", url: "/services", icon: Tag, roles: ["cs_manager", "owner"] },
      { title: "نقاط التشغيل", url: "/branches", icon: Building2, roles: ["owner"] },
      { title: "الإعدادات", url: "/settings", icon: Settings, roles: ["owner"] },
      { title: "دليل الاستخدام", url: "/help", icon: HelpCircle, roles: ["owner", "ops_manager", "cs_manager", "employee", "courier"] },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles, hasRole, user, signOut, isSuperAdmin } = useAuth();
  const { dir, t } = useI18n();
  const { setOpenMobile } = useSidebar();
  const [employeeStation, setEmployeeStation] = useState<string | null>(null);
  const [employeeJobRole, setEmployeeJobRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("employees")
      .select("id,station,job_role,profile_id,email")
      .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()
      .then(async ({ data }: any) => {
        setEmployeeStation(data?.station ?? null);
        setEmployeeJobRole(data?.job_role ?? null);
        if (data?.id && !data.profile_id) {
          await supabase.from("employees").update({ profile_id: user.id }).eq("id", data.id);
        }
      });
  }, [user]);
  const groups = isSuperAdmin ? adminGroups : tenantGroups;
  const isManager = hasRole("owner", "ops_manager", "cs_manager");
  const stationUrl = employeeStation === "drying_assembly" ? "/stations/drying-assembly" : employeeStation ? `/stations/${employeeStation}` : null;

  function isVisible(item: NavItem) {
    if (!isSuperAdmin && hasRole("employee") && !isManager) {
      if (item.url === "/search") return true;
      if (employeeStation === "reception") {
        return ["/orders", "/orders/new", "/customers", "/stations/reception", "/search"].includes(item.url);
      }
      if (item.url === "/driver") return employeeJobRole === "driver";
      if (item.url.startsWith("/stations/")) return item.url === stationUrl;
      return false;
    }
    if (!isSuperAdmin && hasRole("courier") && !isManager) {
      if (item.url === "/search") return true;
      return item.url === "/driver";
    }
    if (item.roles && !hasRole(...item.roles)) return false;
    return true;
  }

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-xs border border-sidebar-border flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/mjrh-logo.png" alt="MJRH" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm truncate tracking-tight text-slate-900">MJRH</div>
            <div className="text-xs opacity-70 truncate">{user?.email}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => {
          const visible = g.items.filter(isVisible);
          if (!visible.length) return null;
          return (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{t(`navGroup.${g.label}`, g.label)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
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
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="px-2 pb-2 text-xs opacity-70">
          {roles.length ? `${t("common.role")}: ${roles.map((r) => t(`role.${r}`, roleAr(r))).join(dir === "rtl" ? "، " : ", ")}` : t("common.noRole")}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/customer-portal" target="_blank" className="flex items-center gap-2 text-teal-600" onClick={() => setOpenMobile(false)}>
                <UserCircle className="w-4 h-4" /><span>{t("app.portal")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <LogOut className="w-4 h-4" /><span>{t("app.signOut")}</span>
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
