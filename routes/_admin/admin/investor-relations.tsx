import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 ShieldCheck, Award, TrendingUp, DollarSign, Clock, Layers, FileText,
 Download, ExternalLink, CheckCircle2, LockKeyhole, PieChart, Users,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/investor-relations")({
 head: () => ({ meta: [{ title: "شؤون المستثمرين والتقييم الفني - MJRH" }] }),
 component: InvestorRelationsDepartmentPage,
});

function InvestorRelationsDepartmentPage() {
 const { t, dir } = useI18n();

 function openDoc(filename: string, title: string) {
 toast.success(`جاري عرض وحفظ الوثيقة المعتمدة: ${title}`);
 window.open(`/docs/${filename}`, "_blank");
 }

 return (<div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" dir={dir}>
 {/* Header */}
 <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 text-white p-6 shadow-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-black mb-2">
 <ShieldCheck className="w-4 h-4" /> غرفة شؤون المستثمرين والتقييم الفني (Investor Relations & Governance)
 </div>
 <h1 className="text-2xl md:text-3xl font-black">غرفة البيانات الاستثمارية وتثمين الأكواد والملكية الفكرية</h1>
 <p className="text-xs md:text-sm text-purple-100/80 mt-1 font-bold">
 مرجعية متكاملة للمستثمر الفني والمالي: تفاصيل التقييم الاستبدالي للأكواد (4.46 مليون ج.م)، أصول الملكية الفكرية، هيكل جولة Pre-Seed، ومستودع وثائق الطرح الرسمية.
 </p>
 </div>
 </div>

 {/* Codebase Valuation Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-md space-y-2">
 <div className="flex justify-between items-start">
 <Badge className="bg-emerald-600 text-white font-black">المنظور الهندسي الفني</Badge>
 <Clock className="w-6 h-6 text-emerald-600" />
 </div>
 <div className="text-sm font-bold text-slate-500">التكلفة الاستبدالية (Replacement Cost)</div>
 <div className="text-3xl font-black font-mono text-slate-900">4,460,000 <span className="text-sm font-bold">ج.م</span></div>
 <p className="text-xs text-slate-600 font-bold mt-2 leading-relaxed">
 تمثل التكلفة الحقيقية لـ 4,200 ساعة عمل هندسية متخصصة (Cloud Architecture, Senior Vite/React, Domain Workflow, QA DevOps) لبناء النظام من الصفر.
 </p>
 </Card>

 <Card className="rounded-3xl border-2 border-purple-500/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-md space-y-2">
 <div className="flex justify-between items-start">
 <Badge className="bg-purple-600 text-white font-black">منظور الملكية الفكرية IP</Badge>
 <Award className="w-6 h-6 text-purple-600" />
 </div>
 <div className="text-sm font-bold text-slate-500">تثمين المحركات الـ 5 الاحتكارية</div>
 <div className="text-3xl font-black font-mono text-slate-900">4,400,000 <span className="text-sm font-bold">ج.م</span></div>
 <p className="text-xs text-slate-600 font-bold mt-2 leading-relaxed">
 القيمة العادلة لمحركات: (الحوكمة الهجينة v2.6، الجدولة وكثافة الذروة، الفرز المزدوج للكتالوج، الدفاتر المزدوجة وإقفال الخزن الآلي، وتحليلات مبيعات الأصناف).
 </p>
 </Card>

 <Card className="rounded-3xl border-2 border-blue-500/50 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-md space-y-2">
 <div className="flex justify-between items-start">
 <Badge className="bg-blue-600 text-white font-black">المنظور التجاري والمالي</Badge>
 <TrendingUp className="w-6 h-6 text-blue-600" />
 </div>
 <div className="text-sm font-bold text-slate-500">التقييم التجاري العادل (2.5x ARR)</div>
 <div className="text-3xl font-black font-mono text-slate-900">4,500,000 <span className="text-sm font-bold">ج.م+</span></div>
 <p className="text-xs text-slate-600 font-bold mt-2 leading-relaxed">
 جاهزية فورية لضم 50 مغسلة بإيراد سنوي متوقع 1.8M ARR، مما يبرر تقييم 4.5 مليون إلى 5.2 مليون كحد أدنى موضوعي قبل التوسع الإقليمي.
 </p>
 </Card>
 </div>

 {/* Replacement Cost Breakdown Table */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="pb-3 border-b">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <Clock className="w-5 h-5 text-emerald-600" />
 <span>جدول تفصيلي لساعات الهندسة البرمجية والتكلفة الاستبدالية (4,200 Engineering Hours)</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-slate-50 border-y text-slate-700 text-xs font-black">
 <tr>
 <th className="p-3 text-start">الدور الهندسي التخصصي</th>
 <th className="p-3 text-start">المخرجات الفنية المحققة في منظومة MJRH</th>
 <th className="p-3 text-center">الساعات الهندسية</th>
 <th className="p-3 text-center">متوسط التكلفة/ساعة</th>
 <th className="p-3 text-end">القيمة التقديرية (ج.م)</th>
 </tr>
 </thead>
 <tbody className="divide-y font-medium text-xs">
 <tr>
 <td className="p-3 font-black text-slate-900">Cloud & Database Architect</td>
 <td className="p-3 text-slate-600">تصميم قواعد PostgreSQL، سياسات RLS، الدوال السحابية RPCs، وجداول الدفاتر المزدوجة المحاسبية.</td>
 <td className="p-3 text-center font-mono">1,200 ساعة</td>
 <td className="p-3 text-center font-mono">1,200 ج.م</td>
 <td className="p-3 text-end font-mono font-bold text-emerald-700">1,440,000 ج.م</td>
 </tr>
 <tr>
 <td className="p-3 font-black text-slate-900">Senior Vite/React Engineers</td>
 <td className="p-3 text-slate-600">بناء الواجهات SPA، المحطات العشر المتسلسلة، شاشات POS Touch المزدوجة، وتوافق اللمس.</td>
 <td className="p-3 text-center font-mono">1,600 ساعة</td>
 <td className="p-3 text-center font-mono">1,000 ج.م</td>
 <td className="p-3 text-end font-mono font-bold text-emerald-700">1,600,000 ج.م</td>
 </tr>
 <tr>
 <td className="p-3 font-black text-slate-900">Domain & Workflow Architect</td>
 <td className="p-3 text-slate-600">هندسة دورة العمل المتسلسلة، مبدأ الفاعل v2.6، الاستثناءات، ومحرك الجدولة وكثافة الذروة.</td>
 <td className="p-3 text-center font-mono">800 ساعة</td>
 <td className="p-3 text-center font-mono">1,100 ج.م</td>
 <td className="p-3 text-end font-mono font-bold text-emerald-700">880,000 ج.م</td>
 </tr>
 <tr>
 <td className="p-3 font-black text-slate-900">QA Automation & DevOps</td>
 <td className="p-3 text-slate-600">إعداد النشر المستمر Vercel CI/CD، اختبارات Vitest/Playwright E2E، وحماية التزامن والأداء.</td>
 <td className="p-3 text-center font-mono">600 ساعة</td>
 <td className="p-3 text-center font-mono">900 ج.م</td>
 <td className="p-3 text-end font-mono font-bold text-emerald-700">540,000 ج.م</td>
 </tr>
 <tr className="bg-slate-100/80 font-black text-slate-900">
 <td className="p-3" colSpan={2}>الإجمالي العام للتكلفة الاستبدالية (Total Replacement Valuation)</td>
 <td className="p-3 text-center font-mono">4,200 ساعة</td>
 <td className="p-3 text-center">—</td>
 <td className="p-3 text-end font-mono text-base text-emerald-800">4,460,000 ج.م</td>
 </tr>
 </tbody>
 </table>
 </CardContent>
 </Card>

 {/* Pre-Seed Financing & Capital Allocation */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <Card className="rounded-3xl shadow-sm border bg-gradient-to-br from-slate-900 to-slate-950 text-white flex flex-col justify-between">
 <CardHeader className="border-b border-white/10 pb-4">
 <CardTitle className="text-lg font-black flex items-center justify-between">
 <span className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-400" /> هيكل جولة التمويل الحالية (Pre-Seed Financing Round)</span>
 <Badge className="bg-blue-600 text-white font-black text-xs">Target: 3M EGP</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-center font-bold">
 <div className="flex justify-between items-center p-3 rounded-2xl bg-white/10 border border-white/10">
 <span className="text-slate-300 text-xs">تقييم الشركة قبل الضخ (Pre-Money Valuation):</span>
 <span className="text-xl font-black font-mono text-teal-400">15,000,000 ج.م</span>
 </div>
 <div className="flex justify-between items-center p-3 rounded-2xl bg-white/10 border border-white/10">
 <span className="text-slate-300 text-xs">المبلغ المستهدف ضخه (Target Capital Raise):</span>
 <span className="text-xl font-black font-mono text-blue-400">3,000,000 ج.م</span>
 </div>
 <div className="flex justify-between items-center p-3 rounded-2xl bg-white/10 border border-white/10">
 <span className="text-slate-300 text-xs">تقييم الشركة بعد الضخ (Post-Money Valuation):</span>
 <span className="text-xl font-black font-mono text-emerald-400">18,000,000 ج.م</span>
 </div>
 <div className="flex justify-between items-center p-3 rounded-2xl bg-white/10 border border-white/10">
 <span className="text-slate-300 text-xs">نسبة الأسهم المعروضة (Equity Offered):</span>
 <span className="text-xl font-black font-mono text-amber-400">حتى 16.7%</span>
 </div>
 </CardContent>
 </Card>

 <Card className="rounded-3xl shadow-sm border flex flex-col justify-between">
 <CardHeader className="border-b pb-3">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <PieChart className="w-5 h-5 text-purple-600" />
 <span>توزيع استخدام أموال الجولة (Capital Allocation Plan)</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-4 space-y-2.5 flex-1 flex flex-col justify-center">
 {[
 ["التوسع التجاري ومبيعات الشركات (Commercial & Sales Expansion)", "35%", "bg-teal-600"],
 ["تطوير الذكاء الاصطناعي التشغيلي (Product Enhancement & AI)", "20%", "bg-blue-600"],
 ["تجهيز المغاسل ونجاح العملاء (Customer Success & Implementation)", "15%", "bg-emerald-600"],
 ["البنية التحتية السحابية والأمن (Cloud Infrastructure & Security)", "10%", "bg-purple-600"],
 ["التسويق وبناء العلامة التجارية (Marketing & Brand Development)", "10%", "bg-amber-600"],
 ["العمليات الإدارية والتشغيل الداخلي (Operations & Administration)", "5%", "bg-slate-600"],
 ["الشؤون القانونية والحوكمة والامتثال (Legal, Compliance & Governance)", "5%", "bg-rose-600"],
 ].map(([label, pct, color], idx) => (<div key={idx} className="flex items-center justify-between p-2 rounded-xl border bg-slate-50 text-xs font-bold">
 <span className="text-slate-800 truncate">{label}</span>
 <Badge className={`${color} text-white font-mono font-black text-xs px-2`}>{pct}</Badge>
 </div>))}
 </CardContent>
 </Card>
 </div>

 {/* Official Prospectus Document Repository */}
 <Card className="rounded-3xl shadow-sm border border-purple-200 bg-purple-50/20">
 <CardHeader className="pb-3 border-b">
 <CardTitle className="text-lg font-black text-purple-950 flex items-center gap-2">
 <FileText className="w-6 h-6 text-purple-600" />
 <span>مستودع الوثائق ومستندات الطرح الرسمية المعتمدة (Official Prospectus Repository)</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="p-5 rounded-2xl bg-white border-2 border-purple-300 shadow-sm flex flex-col justify-between space-y-4">
 <div className="space-y-2">
 <Badge className="bg-purple-600 text-white font-black text-[10px]">وثيقة رقم 1 (Confidential v1.0)</Badge>
 <div className="font-black text-base text-slate-900">منفستو التأسيس ومستند الطرح الرسمي</div>
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 الوثيقة الاستثمارية الكاملة (Investment Memorandum) المشتملة على المنفستو، فرص السوق، ميزة المنافسة، ونموذج العمل.
 </p>
 </div>
 <Button onClick={() => openDoc("06_OFFICIAL_INVESTMENT_MEMORANDUM_V1.md", "المنفستو ومستند الطرح الرسمي")} className="w-full rounded-xl font-black bg-purple-600 hover:bg-purple-700 text-white">
 <Download className="w-4 h-4 ms-2" /> عرض وتحميل الوثيقة المعتمدة
 </Button>
 </div>

 <div className="p-5 rounded-2xl bg-white border-2 border-emerald-300 shadow-sm flex flex-col justify-between space-y-4">
 <div className="space-y-2">
 <Badge className="bg-emerald-600 text-white font-black text-[10px]">وثيقة رقم 2 (Valuation Report)</Badge>
 <div className="font-black text-base text-slate-900">تقرير التثمين الفني والتقييم المالي للأكواد</div>
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 تقرير التقييم الشامل بقيمة 4.5 مليون ج.م (التكلفة الاستبدالية 4,200 ساعة + تثمين المحركات الـ 5 الاحتكارية).
 </p>
 </div>
 <Button onClick={() => openDoc("05_CODEBASE_VALUATION_AND_IP_APPRAISAL_4M.md", "تقرير التثمين الفني للأكواد 4.5M")} className="w-full rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white">
 <Download className="w-4 h-4 ms-2" /> عرض وتحميل تقرير التقييم
 </Button>
 </div>

 <div className="p-5 rounded-2xl bg-white border-2 border-blue-300 shadow-sm flex flex-col justify-between space-y-4">
 <div className="space-y-2">
 <Badge className="bg-blue-600 text-white font-black text-[10px]">وثيقة رقم 3 (Prospectus v2.6)</Badge>
 <div className="font-black text-base text-slate-900">وثيقة طرح المستثمر الفني والمالي (v2.6 Hybrid)</div>
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 الشرح الهندسي التفصيلي للمحطات العشر المتسلسلة، مبدأ الفاعل، الدفاتر المزدوجة، وحوكمة الأمان السيبراني RLS.
 </p>
 </div>
 <Button onClick={() => openDoc("04_INVESTOR_TECHNICAL_FINANCIAL_PROSPECTUS_V2.6.md", "وثيقة طرح المستثمر الفني والمالي")} className="w-full rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white">
 <Download className="w-4 h-4 ms-2" /> عرض وتحميل وثيقة الطرح
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>);
}
