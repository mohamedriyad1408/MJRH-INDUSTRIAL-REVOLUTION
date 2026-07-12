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

const adminGroups: { label: string; items: NavItem[] }[] = [
 {
 label: "نظرة عامة",
 items: [
 { title: "لوحة المنصة", url: "/admin", icon: Crown },
 { title: "المشاريع والمستأجرون", url: "/admin/tenants", icon: Building2 },
 { title: "قوالب سير العمل", url: "/admin/templates", icon: Store, roles: ["owner"] },
 { title: "Workflow Builder v2", url: "/admin/workflow-builder", icon: Workflow, roles: ["owner"] },
 { title: "منصة البناء الموحدة", url: "/admin/platform-builder", icon: Sparkles, roles: ["owner"] },
 { title: "المستخدمون", url: "/admin/users", icon: Users },
 ],
 },
 {
 label: "بناء المنصة",
 items: [
 { title: "Input Builder", url: "/admin/input-builder", icon: Boxes, roles: ["owner"] },
 { title: "Output Builder", url: "/admin/report-builder", icon: BarChart3, roles: ["owner"] },
 ],
 },
 {
 label: "النمو والتشغيل",
 items: [
 { title: "خطة العمل SaaS", url: "/admin/business-plan", icon: TrendingUp },
 { title: "تطوير الأعمال", url: "/admin/biz-dev", icon: BriefcaseBusiness },
 { title: "التسويق GTM", url: "/admin/marketing-plan", icon: Megaphone },
 { title: "نجاح العملاء", url: "/admin/customer-success", icon: Headphones },
 { title: "المستثمرون", url: "/admin/investor-relations", icon: ShieldCheck },
 ],
 },
 {
 label: "المالية والمراقبة",
 items: [
 { title: "رسوم المنصة", url: "/admin/platform-fees", icon: Banknote },
 { title: "فواتير SaaS", url: "/admin/billing", icon: ReceiptText },
 { title: "مرصد التعثرات", url: "/admin/telemetry", icon: AlertTriangle },
 { title: "الشؤون القانونية", url: "/admin/legal", icon: ShieldCheck },
 ],
 },
];

const tenantGroups: { label: string; items: NavItem[] }[] = [
 {
 label: "الرئيسية",
 items: [
 { title: "مركز اليوم", url: "/today", icon: CalendarCheck, roles: ["owner", "ops_manager", "cs_manager"] },
 { title: "تشغيل اليوم", url: "/daily-operations", icon: PlayCircle, roles: ["owner", "ops_manager", "cs_manager"] },
 { title: "لوحة المالك", url: "/dashboard", icon: LayoutDashboard, roles: ["owner"] },
 { title: "لوحة التشغيل", url: "/ops", icon: ShieldCheck, roles: ["ops_manager", "owner"] },
 { title: "لوحة التنفيذيين", url: "/executive", icon: BarChart3, roles: ["owner"] },
 { title: "البحث الموحد", url: "/search", icon: Search, roles: ["owner", "ops_manager", "cs_manager", "employee", "courier"] },
 { title: "الخريطة والفريق", url: "/live-map", icon: Navigation, roles: ["owner", "ops_manager"] },
 { title: "التقارير والذكاء", url: "/reports", icon: BarChart3, roles: ["owner", "ops_manager", "cs_manager"] },
 ],
 },
 {
 label: "التشغيل والمحطات",
 items: [
 { title: "الاستقبال", url: "/stations/reception", icon: ClipboardCheck, roles: ["cs_manager", "ops_manager", "owner", "employee", "receptionist"] },
 { title: "الفرز والتصنيف", url: "/stations/sorting", icon: Tags, roles: ["ops_manager", "owner", "employee", "sorter"] },
 { title: "التشغيل والغسيل", url: "/stations/cleaning", icon: Sparkles, roles: ["ops_manager", "owner", "employee", "cleaning_tech"] },
 { title: "التجفيف والتجميع", url: "/stations/drying-assembly", icon: Wind, roles: ["ops_manager", "owner", "employee", "assembly_tech"] },
 { title: "الكي والمكابس", url: "/stations/ironing", icon: Shirt, roles: ["ops_manager", "owner", "employee", "ironing_tech"] },
 { title: "التغليف والشحن", url: "/stations/packing", icon: Package, roles: ["ops_manager", "owner", "employee", "packer"] },
 { title: "الجودة QC", url: "/stations/qc", icon: ShieldCheck, roles: ["ops_manager", "owner", "employee", "qc_tech"] },
 { title: "خدمة العملاء", url: "/stations/cs", icon: Headphones, roles: ["cs_manager", "ops_manager", "owner", "employee", "cs_rep"] },
 { title: "الاستلام", url: "/stations/intake", icon: Inbox, roles: ["cs_manager", "ops_manager", "owner", "employee", "intake_rep"] },
 { title: "التوصيل", url: "/stations/delivery", icon: Truck, roles: ["ops_manager", "owner", "employee", "courier"] },
 { title: "السائق", url: "/driver", icon: Truck, roles: ["courier", "owner", "ops_manager"] },
 { title: "سلامة النظام APDO", url: "/system-health", icon: ShieldCheck, roles: ["owner", "ops_manager"] },
 { title: "التعثرات", url: "/issues", icon: AlertTriangle, roles: ["owner", "ops_manager", "cs_manager"] },
 ],
 },
 {
 label: "العملاء والمبيعات",
 items: [
 { title: "عملية جديدة", url: "/orders/new", icon: PlusCircle, roles: ["cs_manager", "owner"] },
 { title: "كل العمليات", url: "/orders", icon: ListOrdered, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "العملاء", url: "/customers", icon: Users, roles: ["cs_manager", "owner"] },
 { title: "CRM والولاء", url: "/crm", icon: HeartHandshake, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "رعاية العملاء", url: "/customer-care", icon: HeartHandshake, roles: ["owner", "cs_manager", "ops_manager"] },
 { title: "التسويق", url: "/marketing", icon: TrendingUp, roles: ["owner", "ops_manager", "cs_manager"] },
 { title: "كتالوج الخدمات", url: "/services", icon: Tag, roles: ["cs_manager", "owner"] },
 { title: "المواقع والفروع", url: "/branches", icon: Building2, roles: ["owner"] },
 { title: "المخزون", url: "/inventory", icon: Boxes, roles: ["owner", "ops_manager"] },
 ],
 },
 {
 label: "المالية والإدارة",
 items: [
 { title: "المالية", url: "/finance", icon: Wallet, roles: ["owner", "cs_manager", "ops_manager"] },
 { title: "المحاسبة والخزنة", url: "/accounting", icon: Calculator, roles: ["owner", "ops_manager"] },
 { title: "القيود", url: "/ledger", icon: BookOpenCheck, roles: ["owner"] },
 { title: "الذمم", url: "/receivables", icon: UsersRound, roles: ["owner", "cs_manager", "ops_manager"] },
 { title: "إقفال الخزنة", url: "/cash-closing", icon: LockKeyhole, roles: ["owner", "ops_manager"] },
 { title: "الميزانيات", url: "/budgets", icon: Target, roles: ["owner"] },
 { title: "الموظفون", url: "/staff", icon: BriefcaseBusiness, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "الحضور", url: "/staff/attendance", icon: Clock, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "الأداء", url: "/staff/scorecard", icon: Target, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "الطلبات والسلف", url: "/staff/requests", icon: Inbox, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "الرواتب", url: "/staff/salaries", icon: Banknote, roles: ["owner"] },
 { title: "رواتب الكي", url: "/staff/ironing-payroll", icon: Shirt, roles: ["owner"] },
 { title: "الجدول والإجازات", url: "/staff/schedule", icon: CalendarDays, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "المستخدمون", url: "/staff/users", icon: Crown, roles: ["owner"] },
 { title: "الاشتراك والفواتير", url: "/billing", icon: ReceiptText, roles: ["owner"] },
 { title: "اشتراكات العملاء", url: "/subscriptions", icon: Package, roles: ["owner", "cs_manager", "ops_manager"] },
 { title: "التوازن التشغيلي", url: "/staff/fairness", icon: Activity, roles: ["owner", "ops_manager"] },
 { title: "معالج التفعيل", url: "/onboarding", icon: Sparkles, roles: ["owner"] },
 { title: "مراحل العمل", url: "/settings/workflow", icon: Workflow, roles: ["owner"] },
 { title: "سوق القوالب", url: "/marketplace", icon: Store, roles: ["owner"] },
 { title: "الأدوار والصلاحيات", url: "/settings/roles", icon: Shield, roles: ["owner"] },
 { title: "الشؤون القانونية", url: "/legal", icon: ShieldCheck, roles: ["owner", "ops_manager"] },
 { title: "الإعدادات", url: "/settings", icon: Settings, roles: ["owner"] },
 { title: "الدليل", url: "/help", icon: HelpCircle, roles: ["owner", "ops_manager", "cs_manager", "employee", "courier"] },
 ],
 },
];
export function AppSidebar() {
 const path = useRouterState({ select: (r) => r.location.pathname });
 const { roles, hasRole, user, signOut, isSuperAdmin, tenantId } = useAuth();
 const { dir, t } = useI18n();
 const { setOpenMobile } = useSidebar();
 const [employeeStation, setEmployeeStation] = useState<string | null>(null);
 const [employeeJobRole, setEmployeeJobRole] = useState<string | null>(null);
 const [dynamicStages, setDynamicStages] = useState<{ name: string; name_en: string; slug: string; icon: string; color: string; stage_order: number }[]>([]);
  const [workflowVersion, setWorkflowVersion] = useState<string>("v1");
  const [v2Stages, setV2Stages] = useState<{ name: string; name_en: string; slug: string; icon: string; color: string; stage_order: number; id: string }[]>([]);
  const [coreNavItems, setCoreNavItems] = useState<any[]>([]);
  const [actorPermissions, setActorPermissions] = useState<Set<string>>(new Set());

 const tenantSlug = path.startsWith("/admin") ? null : (path.split("/")[1] && !["customer-portal", "login", "landing", "privacy", "terms", "admin"].includes(path.split("/")[1]) ? path.split("/")[1] : "dry-tech");

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

 // Fetch dynamic workflow stages for tenant (generic platform) + workflow version
 useEffect(() => {
   if (!tenantId) return;
   supabase
     .from("core_navigation_items")
     .select("department_key,item_key,label_ar,label_en,route,icon,required_roles,sort_order,is_active,source_asset_id,source_ownership_level")
     .eq("tenant_id", tenantId)
     .eq("is_active", true)
     .order("sort_order")
     .then(({ data }: any) => setCoreNavItems(Array.isArray(data) ? data : []));

   if (user) {
     supabase
       .rpc("get_actor_permissions", { _tenant_id: tenantId, _actor_user_id: user.id })
       .then(({ data }: any) => setActorPermissions(new Set((Array.isArray(data) ? data : []).map((p: any) => p.permission_key).filter(Boolean))));
   }

   // Get tenant workflow version
   supabase.from("tenants").select("workflow_engine_version, business_type").eq("id", tenantId).maybeSingle().then(({ data }: any) => {
     if (data) {
       setWorkflowVersion(data.workflow_engine_version || "v1");
     }
   });

   // Old workflow_stages (v1) via RPC
   supabase.rpc("get_workflow_stages", { _tenant_id: tenantId }).then(({ data }: any) => {
     if (data && Array.isArray(data)) {
       setDynamicStages(data);
     }
   });

   // New v2 stages: fetch from workflow_definitions where tenant_id = tenantId or template for industry
   supabase.from("workflow_definitions").select("id").eq("tenant_id", tenantId).eq("is_active", true).limit(1).maybeSingle().then(async ({ data: wf }: any) => {
     let workflowId = wf?.id;
     if (!workflowId) {
       // Fallback to template based on tenant business_type
       const { data: tenantData } = await supabase.from("tenants").select("business_type").eq("id", tenantId).single();
       const industry = (tenantData as any)?.business_type === "hotel" ? "hospitality" : (tenantData as any)?.business_type === "restaurant" ? "food_chain" : "generic";
       const { data: template } = await supabase.from("workflow_definitions").select("id").eq("is_template", true).eq("industry", industry as any).limit(1).maybeSingle();
       if (template) workflowId = template.id;
     }
     if (workflowId) {
       supabase.from("workflow_stages_v2").select("id, name_ar, name_en, slug, icon, color, stage_order").eq("workflow_id", workflowId).order("stage_order").then(({ data }: any) => {
         if (data) setV2Stages(data.map((s: any) => ({ name: s.name_ar, name_en: s.name_en, slug: s.slug, icon: s.icon, color: s.color, stage_order: s.stage_order, id: s.id })));
       });
     }
   });
 }, [tenantId, user]);

 const baseGroups = isSuperAdmin ? adminGroups : tenantGroups;
 // Sidebar is generated from Core configuration when the setup wizard has produced it.
 const groups = (() => {
   if (!isSuperAdmin && coreNavItems.length > 0) {
     const labels: Record<string, string> = {
       main: "الرئيسية",
       commerce: "العمليات والمبيعات",
       customers: "العملاء والعلاقات",
       catalog: "الخدمات والأصول",
       operations: "التشغيل",
       field: "التوصيل والعمل الميداني",
       finance: "المالية والإدارة",
       reports: "التقارير والذكاء",
       people: "الفريق والموارد",
       admin: "الإعدادات والدعم",
       laundry_operations: "تشغيل Laundry Template",
       owner_dashboard: "لوحة المالك",
       customer_service: "خدمة العملاء",
       accounting: "الحسابات",
       sales: "المبيعات",
       marketing: "التسويق",
       hr: "الموارد البشرية",
       legal: "الشؤون القانونية",
       administration: "الإدارة",
     };
     const uniqueCoreNavItems = Array.from(
       coreNavItems.reduce((acc: Map<string, any>, item: any) => {
         const key = item.route || item.item_key;
         const existing = acc.get(key);
         // Prefer capability/template/core asset-generated records over older compatibility records.
         if (!existing || (!existing.source_asset_id && item.source_asset_id)) acc.set(key, item);
         return acc;
       }, new Map<string, any>()).values()
     ).sort((a: any, b: any) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
     const byDepartment = uniqueCoreNavItems.reduce((acc: Record<string, any[]>, item: any) => {
       const key = item.department_key || "core";
       acc[key] = acc[key] || [];
       acc[key].push(item);
       return acc;
     }, {});
     return Object.entries(byDepartment).map(([departmentKey, items]) => ({
       label: labels[departmentKey] || departmentKey,
       items: items.map((item: any) => ({
         title: item.label_ar || item.label_en || item.item_key,
         url: item.route,
         icon: iconFor(item.icon),
         roles: item.required_roles || ["owner", "ops_manager", "cs_manager", "employee"],
         required_permissions: item.required_permissions || [],
       })),
     }));
   }
   // Inject dynamic stages — with v2 awareness
   // For v2 tenants, hide legacy laundry stations and show only work-orders + v2 stages
   if (!isSuperAdmin && workflowVersion === "v2") {
     const v2Items: NavItem[] = v2Stages.length > 0 ? v2Stages.map(s => ({
       title: s.name,
       url: `/stations/${s.slug}`,
       icon: Workflow,
       roles: ["owner","ops_manager","cs_manager","employee"]
     })) : [];

     // Also add work-orders as main for v2
     const workOrdersItem: NavItem = { title: "طلبات العمل العامة", url: "/work-orders", icon: Layers, roles: ["owner","ops_manager","cs_manager","employee"] };

     return baseGroups.map(g => {
       if (g.label === "التشغيل والمحطات") {
         // For v2, replace all legacy laundry stations with work-orders + v2 stages + generic tools
         return {
           label: g.label,
           items: [
             workOrdersItem,
             ...v2Items,
             { title: "الخريطة والفريق", url: "/live-map", icon: Navigation, roles: ["owner", "ops_manager"] },
             { title: "سلامة النظام APDO", url: "/system-health", icon: ShieldCheck, roles: ["owner", "ops_manager"] },
             { title: "التعثرات", url: "/issues", icon: AlertTriangle, roles: ["owner", "ops_manager", "cs_manager"] },
           ]
         };
       }
       if (g.label === "العملاء والمبيعات") {
         // For v2, hide laundry-specific items like عملية جديدة (orders/new) which is v1, keep customers, CRM etc, but add work-orders link already in previous group
         return {
           ...g,
           items: g.items.filter(it => !(["/orders/new", "/orders", "/services", "/branches", "/inventory"].includes(it.url)))
             .concat([
               { title: "العملاء", url: "/customers", icon: Users, roles: ["cs_manager", "owner"] },
               { title: "CRM والولاء", url: "/crm", icon: HeartHandshake, roles: ["cs_manager", "ops_manager", "owner"] },
             ])
         };
       }
       return g;
     });
   }

   if (isSuperAdmin || dynamicStages.length === 0) return baseGroups;
   const staticSlugs = new Set(["reception","sorting","cleaning","drying-assembly","ironing","packing","qc","cs","intake","delivery"]);
   const customStages = dynamicStages.filter(s => !staticSlugs.has(s.slug));
   if (customStages.length === 0) return baseGroups;
   const dynamicItems: NavItem[] = customStages.map(s => ({
     title: s.name,
     url: `/stations/${s.slug}`,
     icon: Workflow,
     roles: ["owner","ops_manager","cs_manager","employee"]
   }));
   return baseGroups.map(g => {
     if (g.label === "التشغيل والمحطات") {
       return { ...g, items: [...g.items, ...dynamicItems] };
     }
     return g;
   });
 })();
 const isManager = hasRole("owner", "ops_manager", "cs_manager");
 const stationUrl = employeeStation === "drying_assembly" ? "/stations/drying-assembly" : employeeStation ? `/stations/${employeeStation}` : null;

 function isVisible(item: NavItem) {
 if (!isSuperAdmin && hasRole("employee") && !isManager) {
 if (item.url === "/search") return true;
 if (["reception", "cs", "intake", "sorting"].includes(String(employeeStation))) {
 return ["/orders", "/orders/new", "/customers", "/stations/cs", "/stations/intake", "/stations/reception", "/stations/sorting", "/search"].includes(item.url);
 }
 if (item.url === "/driver") return employeeJobRole === "driver";
 if (item.url.startsWith("/stations/")) return item.url === stationUrl;
 return false;
 }
 if (!isSuperAdmin && hasRole("courier") && !isManager) {
 if (item.url === "/search") return true;
 return item.url === "/driver";
 }
 const requiredPermissions = (item as any).required_permissions || (item as any).requiredPermissions || [];
 if (!isSuperAdmin && Array.isArray(requiredPermissions) && requiredPermissions.length > 0) {
   if (!requiredPermissions.every((permission: string) => actorPermissions.has(permission))) return false;
 }
 if (item.roles && !hasRole(...item.roles)) return false;
 return true;
 }

 return (<Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
 <SidebarHeader className="border-b border-sidebar-border p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-xs border border-sidebar-border flex items-center justify-center shrink-0 overflow-hidden">
 <img src="/mjrh-logo.png" alt="MJRH" className="w-full h-full object-contain logo-animated" />
 </div>
 <div className="min-w-0">
 <div className="font-black text-sm truncate tracking-tight text-slate-900 flex items-center gap-1">
 <span>MJRH</span>
 <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded-md font-mono">v2.6 Hybrid</span>
 </div>
 <div className="text-xs opacity-70 truncate">{user?.email}</div>
 </div>
 </div>
 </SidebarHeader>
 <SidebarContent>
 {groups.map((g) => {
 const visible = g.items.filter(isVisible);
 if (!visible.length) return null;
 return (<SidebarGroup key={g.label}>
 <SidebarGroupLabel>{t(`navGroup.${g.label}`, g.label)}</SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu>
 {visible.map((item) => {
 const targetUrl = tenantSlug && !isSuperAdmin && !item.url.startsWith("/admin") ? `/${tenantSlug}${item.url}` : item.url;
 const active = path === targetUrl || path.startsWith(targetUrl + "/");
 return (<SidebarMenuItem key={item.url}>
 <SidebarMenuButton asChild isActive={active}>
 <Link to={targetUrl as any} className="flex items-center gap-2 font-bold" onClick={() => setOpenMobile(false)}>
 <item.icon className="w-4 h-4 shrink-0" />
 <span>{t(`nav.${item.url}`, item.title)}</span>
 </Link>
 </SidebarMenuButton>
 </SidebarMenuItem>);
 })}
 </SidebarMenu>
 </SidebarGroupContent>
 </SidebarGroup>);
 })}
 </SidebarContent>
 <SidebarFooter className="border-t border-sidebar-border p-2">
 <div className="px-2 pb-2 text-xs opacity-70 font-semibold">
 {roles.length ? `${t("common.role")}: ${roles.map((r) => t(`role.${r}`, roleAr(r))).join(dir === "rtl" ? "، " : ", ")}` : t("common.noRole")}
 </div>
 <SidebarMenu>
 <SidebarMenuItem>
 <SidebarMenuButton asChild>
 <a href={`/customer-portal?tenant=${tenantSlug || "dry-tech"}`} target="_blank" className="flex items-center gap-2 text-teal-600 font-bold" onClick={() => setOpenMobile(false)}>
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

function roleAr(r: AppRole) {
 return ({ super_admin: "مدير المنصة", owner: "مالك", cs_manager: "خدمة عملاء", ops_manager: "تشغيل", employee: "موظف", customer: "عميل", courier: "مندوب" } as Record<AppRole, string>)[r] ?? r;
}
