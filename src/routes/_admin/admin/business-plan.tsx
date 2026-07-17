import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
 TrendingUp, DollarSign, Calculator, Award, CheckCircle2,
 Clock, Sparkles, Building2, Layers, BarChart3, HelpCircle,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_admin/admin/business-plan")({
 head: () => ({ meta: [{ title: "خطة العمل واقتصاديات SaaS - MJRH" }] }),
 component: BusinessPlanDepartmentPage,
});

function BusinessPlanDepartmentPage() {
 const { t, dir } = useI18n();
 const [laundryCount, setLaundryCount] = useState<number>(10);
 const [tierMix, setTierMix] = useState<"standard" | "founding" | "mixed">("mixed");

 // Pricing constants from official memorandum
 const standardOnboarding = 30000;
 const standardMRR = 15000;
 const foundingOnboarding = 15000;
 const foundingMRR = 10000;

 // Calculate based on mix
 const avgOnboarding = tierMix === "standard" ? standardOnboarding : tierMix === "founding" ? foundingOnboarding : 22500;
 const avgMRR = tierMix === "standard" ? standardMRR : tierMix === "founding" ? foundingMRR : 12500;

 const totalMRR = laundryCount * avgMRR;
 const totalARR = totalMRR * 12;
 const totalOnboardingCash = laundryCount * avgOnboarding;
 const cac = 15000; // EGP ~$1,200 modeled
 const paybackMonths = Math.round((cac / avgMRR) * 10) / 10;
 const ltv3Years = avgMRR * 36;
 const ltvCacRatio = Math.round((ltv3Years / cac) * 10) / 10;

 return (<div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" dir={dir}>
 {/* Header */}
 <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white p-6 shadow-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-black mb-2">
 <TrendingUp className="w-4 h-4" /> إدارة خطة العمل واقتصاديات الوحدة (Business Plan Department)
 </div>
 <h1 className="text-2xl md:text-3xl font-black">خطة العمل الاستراتيجية ومحاكي نمو إيرادات SaaS</h1>
 <p className="text-xs md:text-sm text-teal-100/80 mt-1 font-bold">
 محاكاة حية لاقتصاديات الوحدة (MRR, ARR, CAC, LTV) وتتبع تنفيذ المراحل الأربع لخطة الـ 18 شهراً المعتمدة في وثيقة الطرح.
 </p>
 </div>
 </div>

 {/* Interactive SaaS Growth Simulator */}
 <Card className="rounded-3xl border-2 border-teal-500/30 shadow-xl bg-gradient-to-br from-white via-slate-50 to-teal-50/20">
 <CardHeader className="border-b pb-4">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
 <Calculator className="w-6 h-6 text-teal-600" />
 <span>محاكي نمو الإيرادات المتكررة واقتصاديات الوحدة (SaaS Growth Simulator)</span>
 </CardTitle>
 <Badge className="bg-teal-600 text-white font-black px-3 py-1 text-xs">
 Gross Margin: 88% Modeled
 </Badge>
 </div>
 </CardHeader>
 <CardContent className="p-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-100/80 p-4 rounded-2xl border">
 <div className="space-y-2">
 <Label className="text-sm font-black text-slate-900">
 1. حدد عدد المغاسل المشتركة النشطة (Active Laundry Tenants): <span className="text-teal-700 font-mono text-lg">{laundryCount} مغسلة</span>
 </Label>
 <input
 type="range"
 min="1"
 max="150"
 value={laundryCount}
 onChange={(e) => setLaundryCount(Number(e.target.value))}
 className="w-full h-3 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
 />
 <div className="flex justify-between text-[11px] font-mono font-bold text-slate-500">
 <span>1 مغسلة (Pilot)</span>
 <span>10 مغاسل (Phase 1)</span>
 <span>50 مغسلة (Phase 2)</span>
 <span>150 مغسلة (Phase 4)</span>
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-sm font-black text-slate-900">2. اختر مزيج باقات الاشتراك (Commercial Package Mix):</Label>
 <Select value={tierMix} onValueChange={(v: any) => setTierMix(v)}>
 <SelectTrigger className="h-11 bg-white font-bold text-xs rounded-xl border-slate-300"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="standard" className="font-bold text-xs">الباقة القياسية (Standard: 30K ج.م إعداد + 15K ج.م/شهرياً)</SelectItem>
 <SelectItem value="founding" className="font-bold text-xs">باقة الشريك المؤسس (Founding Partner: 15K ج.م إعداد + 10K ج.م/شهرياً)</SelectItem>
 <SelectItem value="mixed" className="font-bold text-xs">المتوسط المرجح للمزيج (Average Mix: 22.5K ج.م إعداد + 12.5K ج.م/شهرياً)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Simulation Output Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-700 to-slate-900 text-white shadow-md">
 <div className="text-xs text-teal-200 font-bold"> الإيراد الشهري المتكرر (MRR)</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">{fmtMoney(totalMRR)}</div>
 <div className="text-[10px] text-teal-100 mt-2">متوسط إيراد المغسلة: {fmtMoney(avgMRR)}/ش</div>
 </div>

 <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md">
 <div className="text-xs text-emerald-100 font-bold"> الإيراد السنوي المتكرر (ARR)</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">{fmtMoney(totalARR)}</div>
 <div className="text-[10px] text-emerald-100 mt-2">مضاعف التقييم السحابي: ~2.5x - 3x</div>
 </div>

 <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-950 text-white shadow-md">
 <div className="text-xs text-blue-200 font-bold"> سيولة الإعداد والتشغيل (Onboarding Cash)</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">{fmtMoney(totalOnboardingCash)}</div>
 <div className="text-[10px] text-blue-100 mt-2">تغطي وتسترد تكاليف الاكتساب فوراً</div>
 </div>

 <div className="p-4 rounded-2xl bg-white border-2 border-teal-500 text-slate-900 shadow-md">
 <div className="text-xs text-slate-500 font-bold"> نسبة الحصيلة للتكلفة (LTV / CAC Ratio)</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono text-teal-700">{ltvCacRatio}x <span className="text-xs font-normal">ضعف</span></div>
 <div className="text-[10px] text-slate-600 mt-2 font-bold">استرداد الاكتساب في {paybackMonths} أشهر</div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* 18-Month Pre-Seed Execution Roadmap */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="pb-4 border-b">
 <CardTitle className="text-lg font-black flex items-center gap-2">
 <Layers className="w-5 h-5 text-teal-600" />
 <span>خطة التنفيذ التجاري ومراحل النمو الأربعة (18-Month Pre-Seed Roadmap)</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 space-y-2 relative">
 <Badge className="bg-emerald-600 text-white font-black text-[10px] mb-1">المرحلة الحالية (Active)</Badge>
 <div className="font-black text-base text-slate-900">المرحلة 1: 0–10 عملاء</div>
 <div className="text-xs text-slate-600 font-bold leading-relaxed">
 التحقق التجاري، التفوق التشغيلي، بناء قصص النجاح، وحسابات الشركاء.
 </div>
 <div className="pt-2 border-t text-[11px] font-mono font-bold text-emerald-800">
 تم تحقيق: 1 Pilot (Dry Tech)
 </div>
 </div>

 <div className="p-4 rounded-2xl border bg-slate-50 space-y-2">
 <Badge variant="outline" className="text-[10px] mb-1">الهدف التالي (Next Target)</Badge>
 <div className="font-black text-base text-slate-900">المرحلة 2: 10–50 عميلاً</div>
 <div className="text-xs text-slate-600 font-bold leading-relaxed">
 نمو الإيراد المتكرر، توحيد العمليات، تحسين المبيعات، والتوسع التشغيلي.
 </div>
 <div className="pt-2 border-t text-[11px] font-mono font-bold text-slate-600">
 التردد: 1.8M ARR
 </div>
 </div>

 <div className="p-4 rounded-2xl border bg-slate-50 space-y-2">
 <Badge variant="outline" className="text-[10px] mb-1">التوسع المؤسسي (Scale)</Badge>
 <div className="font-black text-base text-slate-900">المرحلة 3: 50–150 عميلاً</div>
 <div className="text-xs text-slate-600 font-bold leading-relaxed">
 التوسع الإقليمي، عقود الشركات الكبرى، وخدمات الذكاء التشغيلي وأتمتة AI.
 </div>
 <div className="pt-2 border-t text-[11px] font-mono font-bold text-slate-600">
 التردد: 5.4M ARR
 </div>
 </div>

 <div className="p-4 rounded-2xl border bg-slate-50 space-y-2">
 <Badge variant="outline" className="text-[10px] mb-1">قيادة الفئة (Leadership)</Badge>
 <div className="font-black text-base text-slate-900">المرحلة 4: 150+ عميلاً</div>
 <div className="text-xs text-slate-600 font-bold leading-relaxed">
 التشغيل الدولي متعدد الدول، منظومة الشركاء، وحزم صناعات تشغيلية جديدة.
 </div>
 <div className="pt-2 border-t text-[11px] font-mono font-bold text-slate-600">
 التردد: 18M+ ARR
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Core SaaS Performance Indicators Table */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="pb-3">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <BarChart3 className="w-5 h-5 text-teal-600" />
 <span>مؤشرات أداء SaaS المحورية المعتمدة للإدارة العليا (Core SaaS KPIs)</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-slate-50 border-y text-slate-700 text-xs font-black">
 <tr>
 <th className="p-3 text-start">المؤشر المحوري (SaaS KPI)</th>
 <th className="p-3 text-start">التعريف الاستراتيجي في MJRH</th>
 <th className="p-3 text-end">القيمة المستهدفة / المحاكية</th>
 </tr>
 </thead>
 <tbody className="divide-y font-medium text-xs">
 <tr>
 <td className="p-3 font-black text-slate-900">Monthly Recurring Revenue (MRR)</td>
 <td className="p-3 text-slate-600">الإيراد الشهري المتكرر الناتج عن اشتراكات المغاسل والمشاريع السحابية.</td>
 <td className="p-3 text-end font-mono font-bold text-teal-700">{fmtMoney(totalMRR)}</td>
 </tr>
 <tr>
 <td className="p-3 font-black text-slate-900">Annual Recurring Revenue (ARR)</td>
 <td className="p-3 text-slate-600">الإيراد السنوي المتكرر (MRR × 12) وهو المحرك الأساسي لتقييم الشركة في جولات التمويل.</td>
 <td className="p-3 text-end font-mono font-bold text-emerald-700">{fmtMoney(totalARR)}</td>
 </tr>
 <tr>
 <td className="p-3 font-black text-slate-900">Customer Acquisition Cost (CAC)</td>
 <td className="p-3 text-slate-600">تكلفة اكتساب العميل التجاري (تسويق، مبيعات ميدانية، وعروض توضيحية).</td>
 <td className="p-3 text-end font-mono font-bold text-slate-800">~15,000 ج.م ($1,200)</td>
 </tr>
 <tr>
 <td className="p-3 font-black text-slate-900">Payback Period</td>
 <td className="p-3 text-slate-600">المدة الزمنية بالشهور لاسترداد التكلفة التسويقية للاكتساب عبر اشتراك العميل.</td>
 <td className="p-3 text-end font-mono font-bold text-blue-700">~3.0 أشهر (فوري عبر الإعداد)</td>
 </tr>
 <tr>
 <td className="p-3 font-black text-slate-900">Gross Margin</td>
 <td className="p-3 text-slate-600">هامش الربح الإجمالي بعد خصم التكاليف السحابية المباشرة (Supabase/Vercel).</td>
 <td className="p-3 text-end font-mono font-bold text-purple-700">88% (مستهدف معتمد)</td>
 </tr>
 <tr>
 <td className="p-3 font-black text-slate-900">Customer Lifetime Value (LTV)</td>
 <td className="p-3 text-slate-600">إجمالي الحصيلة المالية المتوقعة من العميل على مدار عمر الاشتراك (3 سنوات نموذجية).</td>
 <td className="p-3 text-end font-mono font-bold text-teal-800">{fmtMoney(ltv3Years)}</td>
 </tr>
 </tbody>
 </table>
 </CardContent>
 </Card>
 </div>);
}
