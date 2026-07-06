import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 Crown, TrendingUp, BriefcaseBusiness, Megaphone, ShieldCheck,
 Building2, AlertTriangle, Users, Banknote, ReceiptText, ArrowLeft,
 Award, DollarSign, Server, Headphones, Layers, HeartHandshake, Loader2,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_admin/admin/")({
 head: () => ({ meta: [{ title: "المقر الرئيسي وإدارة المنصة - MJRH" }] }),
 component: SuperAdminHeadquartersPage,
});

type HeadquartersSummary = {
 dealsCount: number;
 dealsACV: number;
 marketingSpent: number;
 leadsCount: number;
 activeProjects: number;
 avgHealth: number;
};

function SuperAdminHeadquartersPage() {
 const { t, dir } = useI18n();
 const [loading, setLoading] = useState(true);
 const [summary, setSummary] = useState<HeadquartersSummary>({
 dealsCount: 0,
 dealsACV: 0,
 marketingSpent: 0,
 leadsCount: 0,
 activeProjects: 0,
 avgHealth: 0,
 });

 const loadSummary = useCallback(async () => {
 setLoading(true);
 try {
 const [dealsRes, mktRes, projRes, healthRes] = await Promise.all([
 supabase.from("enterprise_deals").select("acv_value"),
 supabase.from("marketing_campaigns").select("spent_budget,leads_generated"),
 supabase.from("tenant_onboarding_projects").select("id,stage"),
 supabase.from("tenant_health_scores").select("health_score"),
 ]);
 const deals = dealsRes.data ?? [];
 const mkt = mktRes.data ?? [];
 const proj = projRes.data ?? [];
 const health = healthRes.data ?? [];

 const acv = deals.reduce((sum: number, d: any) => sum + Number(d.acv_value || 0), 0);
 const spent = mkt.reduce((sum: number, c: any) => sum + Number(c.spent_budget || 0), 0);
 const leads = mkt.reduce((sum: number, c: any) => sum + Number(c.leads_generated || 0), 0);
 const activeProj = proj.filter((p: any) => p.stage !== "live").length;
 const avgH = health.length > 0 ? Math.round(health.reduce((sum: number, h: any) => sum + Number(h.health_score || 0), 0) / health.length) : 0;

 setSummary({
 dealsCount: deals.length,
 dealsACV: acv,
 marketingSpent: spent,
 leadsCount: leads,
 activeProjects: activeProj,
 avgHealth: avgH,
 });
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => { loadSummary(); }, [loadSummary]);

 return (<div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" dir={dir}>
 {/* Hero Header Banner */}
 <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden">
 <div className="absolute -top-24 -left-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
 <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
 <div className="space-y-2 max-w-3xl">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-black">
 <Crown className="w-4 h-4" /> المقر الرئيسي لإدارة المنصة والشركة (Corporate Headquarters)
 </div>
 <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
 شركة MJRH INDUSTRIAL REVOLUTION لإدارة وتطوير المنصات السحابية
 </h1>
 <p className="text-sm md:text-base text-teal-100/90 leading-relaxed font-bold">
 نظام تشغيل سحابي متكامل (SaaS OIP) لإدارة وتطوير المشاريع والمغاسل الذكية. غرفة التحكم القيادية لإدارة الشركة بجميع إداراتها: خطة العمل، اقتصاديات الوحدة، تطوير الأعمال، التسويق، نجاح العملاء، وحوكمة شؤون المستثمرين والبنية التحتية.
 </p>
 </div>
 <div className="flex flex-col gap-2 shrink-0">
 <Button asChild size="lg" className="bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg hover:brightness-105">
 <Link to={"/admin/business-plan" as any}>
 <span>فتح محاكي خطة العمل واقتصاديات SaaS</span>
 <ArrowLeft className="w-4 h-4 ms-2" />
 </Link>
 </Button>
 <Button size="sm" variant="secondary" onClick={loadSummary} disabled={loading} className="rounded-xl font-bold text-xs">
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث مؤشرات أداء إدارات الشركة"}
 </Button>
 </div>
 </div>
 </div>

 {/* 4 Executive Corporate KPIs */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-lg p-5 relative overflow-hidden">
 <div className="flex justify-between items-start">
 <div>
 <div className="text-xs font-bold text-teal-300">الجاهزية التشغيلية والتكنولوجية</div>
 <div className="text-3xl font-black mt-1 text-white">99% <span className="text-sm font-bold text-emerald-400">مكتمل</span></div>
 </div>
 <div className="p-3 rounded-2xl bg-white/10"><Server className="w-6 h-6 text-teal-400" /></div>
 </div>
 <div className="text-[11px] text-slate-300 mt-3 flex items-center gap-1 font-mono">
 <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
 Vercel Production: mjrh.vercel.app
 </div>
 </Card>

 <Card className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-900 text-white border-0 shadow-lg p-5 relative overflow-hidden">
 <div className="flex justify-between items-start">
 <div>
 <div className="text-xs font-bold text-emerald-100">القيمة التقديرية المعتمدة للأكواد</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">4.5 مليون <span className="text-xs font-bold">ج.م+</span></div>
 </div>
 <div className="p-3 rounded-2xl bg-white/10"><Award className="w-6 h-6 text-emerald-200" /></div>
 </div>
 <div className="text-[11px] text-emerald-100 mt-3 font-bold">
 تكلفة استبدالية 4,200 ساعة + 5 محركات احتكارية
 </div>
 </Card>

 <Card className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-950 text-white border-0 shadow-lg p-5 relative overflow-hidden">
 <div className="flex justify-between items-start">
 <div>
 <div className="text-xs font-bold text-blue-200">جولة التمويل الحالية (Pre-Seed)</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">3 مليون <span className="text-xs font-bold">ج.م</span></div>
 </div>
 <div className="p-3 rounded-2xl bg-white/10"><DollarSign className="w-6 h-6 text-blue-300" /></div>
 </div>
 <div className="text-[11px] text-blue-100 mt-3 font-bold font-mono">
 Pre-Money: 15,000,000 ج.م (16.7%)
 </div>
 </Card>

 <Card className="rounded-3xl bg-gradient-to-br from-amber-600 to-orange-900 text-white border-0 shadow-lg p-5 relative overflow-hidden">
 <div className="flex justify-between items-start">
 <div>
 <div className="text-xs font-bold text-amber-100">الشريك التجريبي النشط (Pilot Tenant)</div>
 <div className="text-2xl font-black mt-1">Dry Tech <span className="text-xs font-mono font-normal">(dry-tech)</span></div>
 </div>
 <div className="p-3 rounded-2xl bg-white/10"><Building2 className="w-6 h-6 text-amber-200" /></div>
 </div>
 <div className="text-[11px] text-amber-100 mt-3 font-bold flex items-center gap-1 font-mono">
 لايف على Supabase منذ 2026-06-21
 </div>
 </Card>
 </div>

 {/* Live Aggregated Department KPIs */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">إجمالي قيمة خط أنابيب صفقات B2B</div>
 <div className="text-2xl font-black mt-1 font-mono text-teal-800">{loading ? "..." : fmtMoney(summary.dealsACV)} <span className="text-xs font-normal">/سنة</span></div>
 <div className="text-[11px] text-muted-foreground mt-1 font-bold">عبر {summary.dealsCount} حسابات وصفقات مسجلة</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">كفاءة الإنفاق التسويقي والمكتسبين</div>
 <div className="text-2xl font-black mt-1 font-mono text-amber-700">{loading ? "..." : fmtMoney(summary.marketingSpent)}</div>
 <div className="text-[11px] text-muted-foreground mt-1 font-bold">إجمالي استعلامات التسويق: {summary.leadsCount} استعلام</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">مشاريع الإعداد والتأسيس الجارية</div>
 <div className="text-2xl font-black mt-1 font-mono text-blue-700">{loading ? "..." : summary.activeProjects} <span className="text-xs font-normal">مشروع</span></div>
 <div className="text-[11px] text-muted-foreground mt-1 font-bold">مغاسل قيد التأسيس الفني والتدريب</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">متوسط مؤشر صحة المستأجرين</div>
 <div className="text-2xl font-black mt-1 font-mono text-emerald-700">{loading ? "..." : summary.avgHealth} <span className="text-xs font-normal">/ 100</span></div>
 <div className="text-[11px] text-muted-foreground mt-1 font-bold">معدل الاحتفاظ والاستقرار التشغيلي</div>
 </Card>
 </div>

 {/* 5 Corporate Departments Navigation Grid */}
 <div className="space-y-3">
 <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
 <BriefcaseBusiness className="w-6 h-6 text-teal-600" />
 <span>إدارات الشركة ومراكز القيادة الاستراتيجية (Corporate Departments Console)</span>
 </h2>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {/* Department 1: Business Plan */}
 <Card className="rounded-3xl border-2 hover:border-teal-500/50 shadow-md hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-white via-slate-50/50 to-teal-50/30 flex flex-col justify-between">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600">
 <TrendingUp className="w-6 h-6" />
 </div>
 <Badge className="bg-teal-600 text-white font-black text-xs">خطة العمل واقتصاديات الوحدة</Badge>
 </div>
 <CardTitle className="text-xl font-black text-slate-900 mt-3">إدارة خطة العمل ومحاكي نمو إيرادات SaaS</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 متابعة تفصيلية لمراحل النمو الأربعة لمدة 18 شهراً، مع محاكي تفاعلي لاقتصاديات الوحدة (CAC, LTV, MRR, ARR, Payback Period) ومطابقة باقات الاشتراك التجاري القياسي والشريك المؤسس.
 </p>
 <div className="pt-3 border-t flex items-center justify-between">
 <span className="text-[11px] font-mono font-bold text-teal-700">Projected ARR: 1.8M – 18M EGP</span>
 <Button asChild className="rounded-xl font-black bg-teal-600 hover:bg-teal-700 text-white">
 <Link to={"/admin/business-plan" as any}>
 <span>دخول الإدارة</span>
 <ArrowLeft className="w-4 h-4 ms-1" />
 </Link>
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Department 2: Business Development & B2B Sales */}
 <Card className="rounded-3xl border-2 hover:border-blue-500/50 shadow-md bg-gradient-to-br from-white via-slate-50 to-blue-50/30 flex flex-col justify-between transition-all duration-200">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600">
 <BriefcaseBusiness className="w-6 h-6" />
 </div>
 <Badge className="bg-blue-600 text-white font-black">تطوير الأعمال والمبيعات</Badge>
 </div>
 <CardTitle className="text-xl font-black text-slate-900 mt-3">إدارة تطوير الأعمال ومراحل المبيعات (BizDev Pipeline)</CardTitle>
 </CardHeader>
 <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-between">
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 إدخال وإدارة صفقات العملاء عبر المراحل الأربع (Acquire → Implement → Operate → Expand)، تتبع حساب الشريك التجريبي النشط Dry Tech، ومراقبة تعاقدات تجهيز المصانع والمغاسل.
 </p>
 <div className="pt-3 border-t flex items-center justify-between">
 <span className="text-[11px] font-mono font-bold text-blue-700">Pipeline Value: {fmtMoney(summary.dealsACV)}/سنة</span>
 <Button asChild className="rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white">
 <Link to={"/admin/biz-dev" as any}>
 <span>دخول إدارة المبيعات</span>
 <ArrowLeft className="w-4 h-4 ms-1" />
 </Link>
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Department 3: Marketing & GTM Plan */}
 <Card className="rounded-3xl border-2 hover:border-amber-500/50 shadow-md bg-gradient-to-br from-white via-slate-50 to-amber-50/30 flex flex-col justify-between transition-all duration-200">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
 <Megaphone className="w-6 h-6" />
 </div>
 <Badge className="bg-amber-600 text-white font-black">التسويق والنمو GTM</Badge>
 </div>
 <CardTitle className="text-xl font-black text-slate-900 mt-3">إدارة التسويق وخطة النمو التجاري (Marketing Plan)</CardTitle>
 </CardHeader>
 <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-between">
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 إدخال وإدارة ميزانيات قنوات الاستحواذ المباشرة ومعارض الضيافة، تطبيق استراتيجية صناعة الفئة (OIP)، ومراقبة العائد على الاستثمار واسترداد تكلفة الاكتساب CAC في 3 أشهر.
 </p>
 <div className="pt-3 border-t flex items-center justify-between">
 <span className="text-[11px] font-mono font-bold text-amber-800">CAC Payback: 3 Months</span>
 <Button asChild className="rounded-xl font-black bg-amber-600 hover:bg-amber-700 text-white">
 <Link to={"/admin/marketing-plan" as any}>
 <span>دخول إدارة التسويق</span>
 <ArrowLeft className="w-4 h-4 ms-1" />
 </Link>
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Department 4: Customer Success & Onboarding */}
 <Card className="rounded-3xl border-2 hover:border-emerald-500/50 shadow-md bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 flex flex-col justify-between transition-all duration-200">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
 <Headphones className="w-6 h-6" />
 </div>
 <Badge className="bg-emerald-600 text-white font-black">نجاح العملاء والتجهيز</Badge>
 </div>
 <CardTitle className="text-xl font-black text-slate-900 mt-3">إدارة نجاح العملاء، التجهيز، والدعم الفني</CardTitle>
 </CardHeader>
 <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-between">
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 إدخال ومتابعة مشاريع تأسيس المغاسل الجديدة (Onboarding في 3 أيام عمل)، تسجيل فحوصات الصحة التشغيلية الربع سنوية (QBRs)، ومنع ارتداد الحسابات (Zero Churn).
 </p>
 <div className="pt-3 border-t flex items-center justify-between">
 <span className="text-[11px] font-mono font-bold text-emerald-800">Avg Health: {summary.avgHealth} / 100</span>
 <Button asChild className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white">
 <Link to={"/admin/customer-success" as any}>
 <span>دخول نجاح العملاء</span>
 <ArrowLeft className="w-4 h-4 ms-1" />
 </Link>
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Department 5: Investor Relations & Code Valuation */}
 <Card className="rounded-3xl border-2 hover:border-purple-500/50 shadow-md bg-gradient-to-br from-white via-slate-50 to-purple-50/30 flex flex-col justify-between transition-all duration-200">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600">
 <ShieldCheck className="w-6 h-6" />
 </div>
 <Badge className="bg-purple-600 text-white font-black">المستثمرون والحوكمة</Badge>
 </div>
 <CardTitle className="text-xl font-black text-slate-900 mt-3">شؤون المستثمرين والتقييم الفني للأكواد</CardTitle>
 </CardHeader>
 <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-between">
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 تفاصيل التقييم الاستبدالي للأكواد (4.46 مليون جنيه)، تثمين المحركات الـ 5 الاحتكارية، جدول توزيع الحصص وجولة Pre-Seed (15 مليون Pre-Money)، ومستودع تحميل مستندات الطرح الرسمية.
 </p>
        <div className="pt-3 border-t flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-purple-800">Pre-Money: 15M EGP (16.7%)</span>
          <Button asChild className="rounded-xl font-black bg-purple-600 hover:bg-purple-700 text-white">
            <Link to={"/admin/investor-relations" as any}>
              <span>دخول غرفة المستثمرين</span>
              <ArrowLeft className="w-4 h-4 ms-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Department 6: Legal Affairs & Compliance */}
    <Card className="rounded-3xl border-2 hover:border-cyan-500/50 shadow-md bg-gradient-to-br from-white via-slate-50 to-cyan-50/30 flex flex-col justify-between transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <Badge className="bg-cyan-600 text-white font-black">الشؤون القانونية والعقود</Badge>
        </div>
        <CardTitle className="text-xl font-black text-slate-900 mt-3">إدارة الشؤون القانونية والامتثال وتوثيق العقود (Legal Affairs HQ)</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-between">
        <p className="text-xs text-slate-600 font-bold leading-relaxed">
          إدارة وتوثيق العقود التأسيسية، تراخيص الملكية الفكرية، اتفاقيات الشراكة والتوريد مع الفروع والموردين، ورفع المستندات والشهادات القانونية الحقيقية على قاعدة البيانات.
        </p>
        <div className="pt-3 border-t flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-cyan-800">100% DB Document Vault</span>
          <Button asChild className="rounded-xl font-black bg-cyan-600 hover:bg-cyan-700 text-white">
            <Link to={"/admin/legal" as any}>
              <span>دخول الشؤون القانونية</span>
              <ArrowLeft className="w-4 h-4 ms-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</div>

 {/* Cloud Infrastructure Quick Links */}
 <div className="space-y-3 pt-4 border-t">
 <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
 <Server className="w-5 h-5 text-slate-700" />
 <span>إدارة البنية التحتية والمستأجرين السحابيين (Cloud Infrastructure & Tenants)</span>
 </h2>
 <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 <Button asChild variant="outline" className="h-14 rounded-2xl font-bold border-slate-300 justify-start px-4">
 <Link to={"/admin/tenants" as any}><Building2 className="w-5 h-5 me-2 text-teal-600" /> إدارة المغاسل</Link>
 </Button>
 <Button asChild variant="outline" className="h-14 rounded-2xl font-bold border-slate-300 justify-start px-4">
 <Link to={"/admin/telemetry" as any}><AlertTriangle className="w-5 h-5 me-2 text-amber-600" /> مرصد التعثرات</Link>
 </Button>
 <Button asChild variant="outline" className="h-14 rounded-2xl font-bold border-slate-300 justify-start px-4">
 <Link to={"/admin/users" as any}><Users className="w-5 h-5 me-2 text-blue-600" /> كل المستخدمين</Link>
 </Button>
 <Button asChild variant="outline" className="h-14 rounded-2xl font-bold border-slate-300 justify-start px-4">
 <Link to={"/admin/platform-fees" as any}><Banknote className="w-5 h-5 me-2 text-emerald-600" /> رسوم المنصة</Link>
 </Button>
 <Button asChild variant="outline" className="h-14 rounded-2xl font-bold border-slate-300 justify-start px-4">
 <Link to={"/admin/billing" as any}><ReceiptText className="w-5 h-5 me-2 text-purple-600" /> فواتير SaaS</Link>
 </Button>
 </div>
 </div>
 </div>);
}
