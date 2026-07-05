import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
 Megaphone, Target, TrendingUp, DollarSign, Award, CheckCircle2,
 Sparkles, BarChart3, Presentation, Users, Loader2, Plus, Trash2,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/marketing-plan")({
 head: () => ({ meta: [{ title: "خطة التسويق والنمو GTM - MJRH" }] }),
 component: MarketingPlanDepartmentPage,
});

type MarketingCampaign = {
 id: string;
 campaign_name: string;
 channel: string;
 allocated_budget: number;
 spent_budget: number;
 leads_generated: number;
 conversions: number;
 status: string;
 notes: string | null;
 created_at: string;
};

function MarketingPlanDepartmentPage() {
 const { t, dir } = useI18n();
 const [loading, setLoading] = useState(true);
 const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
 const [openModal, setOpenModal] = useState(false);
 const [saving, setSaving] = useState(false);
 const [form, setForm] = useState({
 campaign_name: "",
 channel: "field_sales",
 allocated_budget: "100000",
 spent_budget: "25000",
 leads_generated: "15",
 conversions: "3",
 status: "active",
 notes: ""
 });

 const loadAll = useCallback(async () => {
 setLoading(true);
 try {
 const { data, error } = await supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false });
 if (error) throw error;
 setCampaigns((data ?? []) as MarketingCampaign[]);
 } catch (e: any) {
 console.error(e);
 toast.error("فشل تحميل بيانات التسويق: " + (e?.message || ""));
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => { loadAll(); }, [loadAll]);

 async function handleCreateCampaign() {
 if (!form.campaign_name.trim()) {
 return toast.error("أدخل اسم الحملة أو القناة التسويقية");
 }
 setSaving(true);
 try {
 const { error } = await supabase.from("marketing_campaigns").insert({
 campaign_name: form.campaign_name.trim(),
 channel: form.channel,
 allocated_budget: Number(form.allocated_budget || 0),
 spent_budget: Number(form.spent_budget || 0),
 leads_generated: Number(form.leads_generated || 0),
 conversions: Number(form.conversions || 0),
 status: form.status,
 notes: form.notes || null
 });
 if (error) throw error;
 toast.success("تم إضافة الحملة التسويقية بنجاح");
 setOpenModal(false);
 setForm({
 campaign_name: "",
 channel: "field_sales",
 allocated_budget: "100000",
 spent_budget: "25000",
 leads_generated: "15",
 conversions: "3",
 status: "active",
 notes: ""
 });
 loadAll();
 } catch (err: any) {
 toast.error("خطأ في حفظ الحملة: " + (err?.message || ""));
 } finally {
 setSaving(false);
 }
 }

 async function handleDeleteCampaign(id: string) {
 if (!confirm("هل أنت متأكد من حذف هذه الحملة؟")) return;
 const { error } = await supabase.from("marketing_campaigns").delete().eq("id", id);
 if (error) toast.error("خطأ في الحذف: " + error.message);
 else {
 toast.success("تم الحذف بنجاح");
 loadAll();
 }
 }

 function channelBadge(channel: string) {
 if (channel === "field_sales") return <Badge className="bg-amber-600 text-white font-black text-xs">مبيعات ميدانية (Field Sales)</Badge>;
 if (channel === "trade_show") return <Badge className="bg-blue-600 text-white font-black text-xs">معارض ومؤتمرات (Trade Show)</Badge>;
 if (channel === "vendor_referral") return <Badge className="bg-teal-600 text-white font-black text-xs">شراكات موردين (Referral)</Badge>;
 return <Badge className="bg-purple-600 text-white font-black text-xs">تسويق رقمي (Digital)</Badge>;
 }

 const totalAllocated = campaigns.reduce((sum, c) => sum + Number(c.allocated_budget || 0), 0);
 const totalSpent = campaigns.reduce((sum, c) => sum + Number(c.spent_budget || 0), 0);
 const totalLeads = campaigns.reduce((sum, c) => sum + Number(c.leads_generated || 0), 0);
 const totalConversions = campaigns.reduce((sum, c) => sum + Number(c.conversions || 0), 0);
 const avgCac = totalConversions > 0 ? Math.round(totalSpent / totalConversions) : 0;

 return (<div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" dir={dir}>
 {/* Header */}
 <div className="rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 text-white p-6 shadow-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black mb-2">
 <Megaphone className="w-4 h-4" /> إدارة التسويق والعلامة التجارية (Marketing & Brand GTM Department)
 </div>
 <h1 className="text-2xl md:text-3xl font-black">استراتيجية صناعة الفئة الجديدة وخطة النمو التجاري GTM</h1>
 <p className="text-xs md:text-sm text-amber-100/80 mt-1 font-bold">
 قيادة التموضع الاستراتيجي للمنظومة كمنصة ذكاء تشغيلي (Operational Intelligence Platform - OIP)، وإدارة قنوات اكتساب المغاسل المشتركة وتحقيق استرداد التكلفة في 3 أشهر.
 </p>
 </div>
 <div className="flex gap-2">
 <Button size="sm" onClick={() => setOpenModal(true)} className="rounded-xl font-black text-xs bg-amber-600 hover:bg-amber-700 text-white">
 <Plus className="w-4 h-4 ms-1" /> إضافة حملة / قناة تسويقية جديدة
 </Button>
 <Button size="sm" variant="secondary" onClick={loadAll} disabled={loading} className="rounded-xl font-bold text-xs">
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث البيانات"}
 </Button>
 </div>
 </div>

 {/* Brand Manifesto & Category Creation */}
 <Card className="rounded-3xl border-2 border-amber-500/40 shadow-xl bg-gradient-to-br from-white via-slate-50 to-amber-50/20">
 <CardHeader className="border-b pb-4">
 <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
 <Sparkles className="w-6 h-6 text-amber-600" />
 <span>فلسفة العلامة التجارية وصناعة الفئة الجديدة (Category Creation Manifesto)</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 space-y-4">
 <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-white/10 space-y-3">
 <div className="text-sm md:text-base font-black text-amber-300 leading-relaxed italic">
 "We are not building software for laundries. Commercial laundry is simply the first industry capable of validating our operational engine under real-world complexity... MJRH is building the next layer of software: Operational Intelligence (OIP)."
 </div>
 <div className="text-xs text-slate-300 font-bold leading-relaxed">
 نحن لا نبيع مجرد برنامج محاسبة أو نقطة بيع (POS) تقليدية؛ نحن نؤسس لبنية تحتية تشغيلية سحابية تمنح المصانع والمغاسل الذكية نفس القوة الخوارزمية وأدوات الحوكمة التي تتمتع بها البنوك والشركات العالمية الكبرى.
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
 <div className="p-4 rounded-2xl border bg-white shadow-2xs space-y-1">
 <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 text-amber-700">
 <Target className="w-4 h-4" /> التموضع التنافسي الفريد
 </div>
 <p className="text-xs text-slate-600 font-bold">
 التركيز على حوكمة التشغيل الفعلي في المحطات العشر بدلاً من مجرد إدارة البيانات السطحية في المكاتب.
 </p>
 </div>

 <div className="p-4 rounded-2xl border bg-white shadow-2xs space-y-1">
 <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 text-teal-700">
 <TrendingUp className="w-4 h-4" /> تأثير الشبكة التشغيلية
 </div>
 <p className="text-xs text-slate-600 font-bold">
 كل حركة إنتاج وفاتورة يتم إنجازها تثري قاعدة البيانات الذكية، مما يحسن توقعات الطلب والتنبؤ بالأعطال.
 </p>
 </div>

 <div className="p-4 rounded-2xl border bg-white shadow-2xs space-y-1">
 <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 text-blue-700">
 <Award className="w-4 h-4" /> زيادة تكلفة الاستبدال
 </div>
 <p className="text-xs text-slate-600 font-bold">
 الارتباط العميق بيوميات العمال والفنيين يجعل استبدال المنظومة لاحقاً أمراً شبه مستحيل، مما يرفع نسبة الاحتفاظ (GRR/NRR).
 </p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Marketing Budget & CAC Overview Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">إجمالي الميزانية المخصصة</div>
 <div className="text-2xl font-black mt-1 font-mono text-slate-900">{fmtMoney(totalAllocated)}</div>
 <div className="text-[11px] text-muted-foreground mt-1">المخصص الكلي للحملات والأنشطة</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">إجمالي الإنفاق الفعلي</div>
 <div className="text-2xl font-black mt-1 font-mono text-amber-700">{fmtMoney(totalSpent)}</div>
 <div className="text-[11px] text-muted-foreground mt-1">معدل الحرق التسويقي المباشر</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">العملاء المكتسبون (Conversions)</div>
 <div className="text-2xl font-black mt-1 font-mono text-emerald-700">{totalConversions} <span className="text-xs font-normal">مغسلة</span></div>
 <div className="text-[11px] text-muted-foreground mt-1">من إجمالي {totalLeads} طلب اهتمام واستعلام</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">متوسط تكلفة الاكتساب الفعلية (CAC)</div>
 <div className="text-2xl font-black mt-1 font-mono text-blue-700">{fmtMoney(avgCac)}</div>
 <div className="text-[11px] text-muted-foreground mt-1">المستهدف المعتمد: ~15,000 ج.م</div>
 </Card>
 </div>

 {/* Marketing Campaigns Table */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="pb-3 border-b">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <Presentation className="w-5 h-5 text-amber-600" />
 <span>جدول أداء الحملات وقنوات التسويق (Marketing Campaigns & Attribution)</span>
 </CardTitle>
 <Button size="sm" onClick={() => setOpenModal(true)} className="rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white">
 <Plus className="w-4 h-4 ms-1" /> إضافة حملة جديدة
 </Button>
 </div>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 {loading ? (<div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" /></div>) : campaigns.length === 0 ? (<div className="py-12 text-center text-slate-400 font-bold">لا توجد حملات مسجلة حالياً</div>) : (<table className="w-full text-sm">
 <thead className="bg-slate-50 border-y text-slate-700 text-xs font-black">
 <tr>
 <th className="p-3 text-start">اسم الحملة / النشاط التسويقي</th>
 <th className="p-3 text-center">القناة (Channel)</th>
 <th className="p-3 text-end">الميزانية المخصصة</th>
 <th className="p-3 text-end">الإنفاق الفعلي</th>
 <th className="p-3 text-center">الاستعلامات (Leads)</th>
 <th className="p-3 text-center">التعاقدات (Conversions)</th>
 <th className="p-3 text-center">الحالة</th>
 <th className="p-3 text-center">الإجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y font-medium text-xs">
 {campaigns.map((c) => (<tr key={c.id} className="hover:bg-slate-50 transition">
 <td className="p-3 font-black text-slate-900">
 <div>{c.campaign_name}</div>
 {c.notes && <div className="text-[11px] text-slate-500 font-normal mt-0.5">{c.notes}</div>}
 </td>
 <td className="p-3 text-center">{channelBadge(c.channel)}</td>
 <td className="p-3 text-end font-mono text-slate-700">{fmtMoney(Number(c.allocated_budget))}</td>
 <td className="p-3 text-end font-mono font-bold text-amber-800">{fmtMoney(Number(c.spent_budget))}</td>
 <td className="p-3 text-center font-mono font-bold">{c.leads_generated}</td>
 <td className="p-3 text-center font-mono font-black text-emerald-700">{c.conversions}</td>
 <td className="p-3 text-center">
 <Badge variant={c.status === "active" ? "default" : "outline"} className={c.status === "active" ? "bg-emerald-600 text-white" : ""}>
 {c.status === "active" ? "نشط" : c.status === "completed" ? "مكتمل" : "مخطط"}
 </Badge>
 </td>
 <td className="p-3 text-center">
 <Button size="sm" variant="outline" onClick={() => handleDeleteCampaign(c.id)} className="text-red-600 border-red-200 hover:bg-red-50">
 <Trash2 className="w-3.5 h-3.5" />
 </Button>
 </td>
 </tr>))}
 </tbody>
 </table>)}
 </CardContent>
 </Card>

 {/* Dialog Modal for Marketing Campaign Data Entry */}
 <Dialog open={openModal} onOpenChange={setOpenModal}>
 <DialogContent className="max-w-md rounded-3xl p-6 space-y-4" dir="rtl">
 <DialogHeader>
 <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
 <Megaphone className="w-5 h-5 text-amber-600" />
 <span>إضافة حملة أو نشاط تسويقي جديد</span>
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-3 text-xs">
 <div className="space-y-1">
 <Label className="font-bold">اسم الحملة / النشاط التسويقي:</Label>
 <Input value={form.campaign_name} onChange={e => setForm({...form, campaign_name: e.target.value})} placeholder="مثال: رعاية معرض فندقي..." className="h-9 rounded-xl" />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">القناة التسويقية:</Label>
 <Select value={form.channel} onValueChange={val => setForm({...form, channel: val})}>
 <SelectTrigger className="h-9 rounded-xl font-bold"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="field_sales">مبيعات ميدانية وعروض</SelectItem>
 <SelectItem value="trade_show">معارض ومؤتمرات صناعية</SelectItem>
 <SelectItem value="vendor_referral">شراكات موردين ومعدات</SelectItem>
 <SelectItem value="digital">تسويق رقمي ومحتوى</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1">
 <Label className="font-bold">حالة الحملة:</Label>
 <Select value={form.status} onValueChange={val => setForm({...form, status: val})}>
 <SelectTrigger className="h-9 rounded-xl font-bold"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="active">نشط (Active)</SelectItem>
 <SelectItem value="planned">مخطط (Planned)</SelectItem>
 <SelectItem value="completed">مكتمل (Completed)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">الميزانية المخصصة (ج.م):</Label>
 <Input type="number" value={form.allocated_budget} onChange={e => setForm({...form, allocated_budget: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 <div className="space-y-1">
 <Label className="font-bold">الإنفاق الفعلي حتى الآن (ج.م):</Label>
 <Input type="number" value={form.spent_budget} onChange={e => setForm({...form, spent_budget: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">عدد الاستعلامات (Leads):</Label>
 <Input type="number" value={form.leads_generated} onChange={e => setForm({...form, leads_generated: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 <div className="space-y-1">
 <Label className="font-bold">عدد التعاقدات (Conversions):</Label>
 <Input type="number" value={form.conversions} onChange={e => setForm({...form, conversions: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="font-bold">ملاحظات إضافية:</Label>
 <Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="تفاصيل ونتائج الحملة..." className="rounded-xl" />
 </div>
 </div>

 <DialogFooter className="flex gap-2 justify-end pt-2 border-t">
 <Button variant="outline" onClick={() => setOpenModal(false)} className="rounded-xl font-bold">إلغاء</Button>
 <Button onClick={handleCreateCampaign} disabled={saving} className="rounded-xl font-black bg-amber-600 hover:bg-amber-700 text-white">
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الحملة في قاعدة البيانات"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>);
}
