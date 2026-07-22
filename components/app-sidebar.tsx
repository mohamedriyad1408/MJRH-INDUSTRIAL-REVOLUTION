import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListOrdered, PlusCircle, Sparkles, Shirt, Package, Wind,
  Users, Tag, Settings, LogOut, Wallet, BriefcaseBusiness,
  CalendarDays, ShieldCheck, Clock, Inbox, Building2, Crown, PlayCircle,
  Truck, Headphones, Banknote, Navigation, Target, UserCircle, CalendarCheck,
  BarChart3, Boxes, HeartHandshake, ReceiptText, Calculator, BookOpenCheck,
  UsersRound, LockKeyhole, HelpCircle, Search, Smartphone,
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
      { title: "المشاريع", url: "/admin/tenants", icon: Building2 },
      { title: "كل المستخدمين", url: "/admin/users", icon: Crown },
      { title: "رسوم التشغيل", url: "/admin/platform-fees", icon: Banknote },
      { title: "الفواتير", url: "/admin/billing", icon: ReceiptText },
    ],
  },
];

const tenantGroups = [
  {
    label: "اللوحات",
    items: [
      { title: "مركز اليوم", url: "/today", icon: CalendarCheck },
      { title: "التشغيل اليومي", url: "/daily-operations", icon: PlayCircle },
      { title: "لوحة المالك", url: "/dashboard", icon: LayoutDashboard },
      { title: "التشغيل", url: "/ops", icon: ShieldCheck },
      { title: "خدمة العملاء", url: "/cs", icon: Headphones },
      { title: "التقارير", url: "/reports", icon: BarChart3 },
      { title: "البحث", url: "/search", icon: Search },
    ],
  },
  {
    label: "الطلبات",
    items: [
      { title: "كل الطلبات", url: "/orders", icon: ListOrdered },
      { title: "طلب جديد", url: "/orders/new", icon: PlusCircle },
      { title: "طلبات أونلاين", url: "/online-queue", icon: Smartphone },
      { title: "توصيل الطلبات", url: "/delivery", icon: Truck },
    ],
  },
  {
    label: "محطات العمل",
    items: [
      { title: "الاستقبال", url: "/stations/reception", icon: Inbox },
      { title: "التنظيف", url: "/stations/cleaning", icon: Sparkles },
      { title: "التجفيف", url: "/stations/drying-assembly", icon: Wind },
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
      { title: "كل الموظفين", url: "/staff", icon: BriefcaseBusiness },
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
    <Sidebar data-mjrh-stable-id="STABLE_SIDEBAR_999" side={dir === "rtl" ? "right" : "left"} collapsible="icon" className="bg-white border-r border-slate-200">
      <SidebarHeader className="border-b border-slate-100 p-5 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 p-1 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            {tenant?.logo_url ? <img src={tenant.logo_url} className="w-full h-full object-cover rounded-lg" /> : <img src="/mjrh-logo.png" alt="MJRH" className="w-full h-full object-contain" />}
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm truncate tracking-tight text-slate-900">{tenant?.name || (isSuperAdmin ? "إدارة المنصة" : "MJRH")} - VER:STABLE</div>
            <div className="text-[10px] text-slate-400 font-bold truncate">{user?.email}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-slate-400 font-black px-4 py-2 uppercase tracking-widest text-[9px] opacity-70">
              {t(`navGroup.${g.label}`, g.label)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = path === item.url || path.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} className={active ? "bg-teal-50 text-teal-700 font-bold border-r-4 border-teal-500 rounded-none" : "text-slate-600 hover:bg-slate-50"}>
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-2" onClick={() => setOpenMobile(false)}>
                          <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-teal-600" : "text-slate-400"}`} />
                          <span className="truncate">{t(`nav.${item.url}`, item.title)}</span>
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
      <SidebarFooter className="border-t border-slate-100 p-4 bg-slate-50/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="w-4 h-4" /><span>{t("app.signOut", "Sign Out")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
