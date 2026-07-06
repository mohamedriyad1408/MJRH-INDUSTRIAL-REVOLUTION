import { Link, useRouterState } from "@tanstack/react-router";
import {
 LayoutDashboard, ListOrdered, PlusCircle, Sparkles, Shirt, Package, Wind,
 Users, Tag, Settings, LogOut, Wallet, BriefcaseBusiness,
 CalendarDays, ShieldCheck, Clock, Inbox, Building2, Crown, PlayCircle,
 Truck, Headphones, Banknote, Navigation, Target, UserCircle, CalendarCheck,
 BarChart3, Boxes, HeartHandshake, ReceiptText, Calculator, BookOpenCheck,
 UsersRound, LockKeyhole, HelpCircle, Search, AlertTriangle, ClipboardCheck, Tags,
 Megaphone, TrendingUp,
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

const adminGroups: { label: string; items: NavItem[] }[] = [
 {
 label: "إدارة المالك والتنفيذيين (Vorstand)",
 items: [
 { title: "ملخص مقر الشركة", url: "/admin", icon: Crown },
 { title: "خطة العمل واقتصاديات SaaS", url: "/admin/business-plan", icon: TrendingUp },
 { title: "شؤون المستثمرين والتقييم الفني", url: "/admin/investor-relations", icon: ShieldCheck },
 ],
 },
 {
 label: "إدارة المبيعات وتطوير الأعمال (Vertrieb)",
 items: [
 { title: "تطوير الأعمال ومبيعات B2B", url: "/admin/biz-dev", icon: BriefcaseBusiness },
 { title: "المغاسل والمستأجرون", url: "/admin/tenants", icon: Building2 },
 ],
 },
 {
 label: "إدارة التسويق والتحليل (Marketing)",
 items: [
 { title: "خطة التسويق والنمو GTM", url: "/admin/marketing-plan", icon: Megaphone },
 ],
 },
 {
 label: "إدارة خدمة ورعاية العملاء (Kundenservice)",
 items: [
 { title: "نجاح العملاء ونشر المنشآت", url: "/admin/customer-success", icon: Headphones },
 ],
 },
 {
 label: "الشؤون القانونية والمنازعات (Rechtsabteilung)",
 items: [
 { title: "الشؤون القانونية والعقود", url: "/admin/legal", icon: ShieldCheck },
 ],
 },
 {
 label: "الموظفون (Personalwesen)",
 items: [
 { title: "كل المستخدمين والصلاحيات", url: "/admin/users", icon: Users },
 ],
 },
 {
 label: "المالية والتشغيل (Finanzwesen)",
 items: [
 { title: "رسوم تشغيل المنصة", url: "/admin/platform-fees", icon: Banknote },
 { title: "فواتير SaaS والاشتراكات", url: "/admin/billing", icon: ReceiptText },
 { title: "مرصد المشاكل والتعثرات", url: "/admin/telemetry", icon: AlertTriangle },
 ],
 },
];

const tenantGroups: { label: string; items: NavItem[] }[] = [
 {
 label: "إدارة المالك والتنفيذيين (Vorstand)",
 items: [
 { title: "لوحة المالك العامة", url: "/dashboard", icon: LayoutDashboard, roles: ["owner"] },
 { title: "لوحة المديرين التنفيذيين CEO", url: "/executive", icon: BarChart3, roles: ["owner"] },
 { title: "فيديو ديمو النظام وعروض البيع", url: "/demo", icon: PlayCircle, roles: ["owner", "ops_manager", "cs_manager", "employee"] },
 ],
 },
 {
 label: "التشغيل اليومي والمحطات (Betriebsleitung)",
 items: [
 { title: "لوحة مدير التشغيل COO", url: "/ops", icon: ShieldCheck, roles: ["ops_manager", "owner"] },
 { title: "مركز اليوم التشغيلي", url: "/today", icon: CalendarCheck, roles: ["owner", "ops_manager", "cs_manager"] },
 { title: "تشغيل اليوم المفصل", url: "/daily-operations", icon: PlayCircle, roles: ["owner", "ops_manager", "cs_manager"] },
 { title: "الاستقبال ومطابقة الفواتير", url: "/stations/reception", icon: ClipboardCheck, roles: ["cs_manager", "ops_manager", "owner", "employee", "receptionist"] },
 { title: "الفرز والتصنيف وإصدار المارك", url: "/stations/sorting", icon: Tags, roles: ["ops_manager", "owner", "employee", "sorter"] },
 { title: "التنظيف والغسيل والمعالجة", url: "/stations/cleaning", icon: Sparkles, roles: ["ops_manager", "owner", "employee", "cleaning_tech"] },
 { title: "التجفيف والتجميع والفرز", url: "/stations/drying-assembly", icon: Wind, roles: ["ops_manager", "owner", "employee", "assembly_tech"] },
 { title: "الكي بالبخار والمكابس", url: "/stations/ironing", icon: Shirt, roles: ["ops_manager", "owner", "employee", "ironing_tech"] },
 { title: "التغليف وتجهيز الشحنات", url: "/stations/packing", icon: Package, roles: ["ops_manager", "owner", "employee", "packer"] },
 { title: "فحص الجودة والمطابقة QC", url: "/stations/qc", icon: ShieldCheck, roles: ["ops_manager", "owner", "employee", "qc_tech"] },
 { title: "فحص سلامة النظام (APDO)", url: "/system-health", icon: ShieldCheck, roles: ["owner", "ops_manager"] },
 { title: "مرصد التعثرات (Telemetry)", url: "/issues", icon: AlertTriangle, roles: ["owner", "ops_manager", "cs_manager"] },
 ],
 },
 {
 label: "إدارة المبيعات وتطوير الأعمال (Vertrieb)",
 items: [
 { title: "إنشاء فاتورة طلب جديد", url: "/orders/new", icon: PlusCircle, roles: ["cs_manager", "owner"] },
 { title: "كل الطلبات والفواتير", url: "/orders", icon: ListOrdered, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "البحث الموحد والنتائج", url: "/search", icon: Search, roles: ["owner", "ops_manager", "cs_manager", "employee", "courier"] },
 { title: "العملاء", url: "/customers", icon: Users, roles: ["cs_manager", "owner"] },
 { title: "CRM والولاء", url: "/crm", icon: HeartHandshake, roles: ["cs_manager", "ops_manager", "owner"] },
 ],
 },
 {
 label: "إدارة التسويق والتحليل (Marketing)",
 items: [
 { title: "البيانات التسويقية وأوقات الذروة", url: "/marketing", icon: TrendingUp, roles: ["owner", "ops_manager", "cs_manager"] },
 { title: "التقارير والذكاء التشغيلي", url: "/reports", icon: BarChart3, roles: ["owner", "ops_manager", "cs_manager"] },
 { title: "كتالوج الخدمات والأصناف", url: "/services", icon: Tag, roles: ["cs_manager", "owner"] },
 ],
 },
 {
 label: "إدارة خدمة ورعاية العملاء (Kundenservice)",
 items: [
 { title: "لوحة مدير خدمة العملاء", url: "/cs", icon: Headphones, roles: ["cs_manager", "owner"] },
 { title: "خدمة العملاء والدعم", url: "/stations/cs", icon: Headphones, roles: ["cs_manager", "ops_manager", "owner", "employee", "cs_rep"] },
 { title: "استلام الطلبات والندب", url: "/stations/intake", icon: Inbox, roles: ["cs_manager", "ops_manager", "owner", "employee", "intake_rep"] },
 { title: "رعاية العملاء والتعويضات", url: "/customer-care", icon: HeartHandshake, roles: ["owner", "cs_manager", "ops_manager"] },
 ],
 },
 {
 label: "إدارة حركة النقل والأسطول (Logistik)",
 items: [
 { title: "خريطة المراقبة والمناديب", url: "/live-map", icon: Navigation, roles: ["owner", "ops_manager"] },
 { title: "لوحة السائق الخاصة", url: "/driver", icon: Truck, roles: ["courier", "owner", "ops_manager"] },
 { title: "التوصيل والندب الخارجي", url: "/stations/delivery", icon: Truck, roles: ["ops_manager", "owner", "employee", "courier"] },
 ],
 },
 {
 label: "إدارة المخازن والمخزون (Lager)",
 items: [
 { title: "المخزون والمعدات والخامات", url: "/inventory", icon: Boxes, roles: ["owner", "ops_manager"] },
 { title: "إدارة الفروع ونقاط التشغيل", url: "/branches", icon: Building2, roles: ["owner"] },
 ],
 },
 {
 label: "الشؤون القانونية والمنازعات (Rechtsabteilung)",
 items: [
 { title: "الشؤون القانونية والعقود", url: "/legal", icon: ShieldCheck, roles: ["owner", "ops_manager"] },
 ],
 },
 {
 label: "الموظفون (Personalwesen)",
 items: [
 { title: "الحضور والانصراف (Mawared HR)", url: "/staff/attendance", icon: Clock, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "تقييم الأداء واستمارة 6 (Scorecard)", url: "/staff/scorecard", icon: Target, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "إدارة المستخدمين وتأكيد WhatsApp", url: "/staff/users", icon: Crown, roles: ["owner"] },
 { title: "كل الموظفين", url: "/staff", icon: BriefcaseBusiness, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "جدول العمل", url: "/staff/schedule", icon: Clock, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "الإجازات والعطلات", url: "/staff/leaves", icon: CalendarDays, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "الطلبات والسلف", url: "/staff/requests", icon: Inbox, roles: ["cs_manager", "ops_manager", "owner"] },
 { title: "الرواتب اليومية", url: "/staff/salaries", icon: Banknote, roles: ["owner"] },
 { title: "رواتب فنيي الكي", url: "/staff/ironing-payroll", icon: Shirt, roles: ["owner"] },
 ],
 },
 {
 label: "المالية والتشغيل (Finanzwesen)",
 items: [
 { title: "الحسابات العامة", url: "/finance", icon: Wallet, roles: ["owner", "cs_manager", "ops_manager"] },
 { title: "المحاسبة والخزنة", url: "/accounting", icon: Calculator, roles: ["owner", "ops_manager"] },
 { title: "دفتر القيود والتقارير", url: "/ledger", icon: BookOpenCheck, roles: ["owner"] },
 { title: "ذمم العملاء", url: "/receivables", icon: UsersRound, roles: ["owner", "cs_manager", "ops_manager"] },
 { title: "إقفال الخزنة", url: "/cash-closing", icon: LockKeyhole, roles: ["owner", "ops_manager"] },
 { title: "الميزانيات", url: "/budgets", icon: Target, roles: ["owner"] },
 { title: "اشتراك المنصة", url: "/billing", icon: ReceiptText, roles: ["owner"] },
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
 const groups = isSuperAdmin ? adminGroups : tenantGroups;
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
 if (item.roles && !hasRole(...item.roles)) return false;
 return true;
 }

 return (<Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
 <SidebarHeader className="border-b border-sidebar-border p-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-xs border border-sidebar-border flex items-center justify-center shrink-0 overflow-hidden">
 <img src="/mjrh-logo.png" alt="MJRH" className="w-full h-full object-contain" />
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
