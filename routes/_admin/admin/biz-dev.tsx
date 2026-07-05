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
 BriefcaseBusiness, Handshake, Target, Building2, Layers, CheckCircle2,
 Clock, ShieldCheck, TrendingUp, Sparkles, Loader2, Plus, Trash2,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/biz-dev")({
 head: () => ({ meta: [{ title: "تطوير الأعمال ومراحل المبيعات - MJRH" }] }),
 component: BizDevDepartmentPage,
});

type PilotStats = {
 totalOrders: number;
 deliveredOrders: number;
 totalGMV: number;
 activeServices: number;
};

type EnterpriseDeal = {
 id: string;
 account_name: string;
 facility_type: string;
 stage: string;
 package_tier: string;
 acv_value: number;
 expected_close_date: string | null;
 notes: string | null;
 created_at: string;
};

function BizDevDepartmentPage() {
 const { t, dir } = useI18n();
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState<PilotStats>({ totalOrders: 0, deliveredOrders: 0, totalGMV: 0, activeServices: 0 });
 const [deals, setDeals] = useState<EnterpriseDeal[]>([]);
 const [openModal, setOpenModal] = useState(false);
 const [saving, setSaving] = useState(false);
 const [form, setForm] = useState({
 account_name: "",
 facility_type: "مغسلة تجارية ذكية",
 stage: "acquire",
 package_tier: "standard",
 acv_value: "180000",
 expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
 notes: ""
 });

 const loadAll = useCallback(async () => {
 setLoading(true);
 try {
 const tenantId = "c0ea27c7-138e-4d12-b732-6981bddb4c97"; // Dry Tech UUID
 const [ordRes, svcRes, dealsRes] = await Promise.all([
 supabase.from("orders").select("total,status").eq("tenant_id", tenantId).neq("status", "cancelled"),
 supabase.from("service_items").select("id").eq("tenant_id", tenantId).eq("is_active", true),
 supabase.from("enterprise_deals").select("*").order("created_at", { ascending: false }),
 ]);
 const orders = ordRes.data ?? [];
 const gmv = orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
 const delivered = orders.filter((o: any) => o.status === "delivered").length;
 setStats({
 totalOrders: orders.length,
 deliveredOrders: delivered,
 totalGMV: gmv,
 activeServices: (svcRes.data ?? []).length,
 });
 setDeals((dealsRes.data ?? []) as EnterpriseDeal[]);
 } catch (e: any) {
 console.error(e);
 toast.error("فصل تحميل بيانات مبيعات B2B");
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => { loadAll(); }, [loadAll]);

 async function handleCreateDeal() {
 if (!form.account_name.trim()) {
 return toast.error("أدخل اسم المغسلة أو الحساب المؤسسي");
 }
 setSaving(true);
 try {
 const { error } = await supabase.from("enterprise_deals").insert({
 account_name: form.account_name.trim(),
 facility_type: form.facility_type.trim(),
 stage: form.stage,
 package_tier: form.package_tier,
 acv_value: Number(form.acv_value || 0),
 expected_close_date: form.expected_close_date || null,
 notes: form.notes || null
 });
 if (error) throw error;
 toast.success("تم إضافة الحساب المؤسسي بنجاح إلى خط أنابيب الصفقات");
 setOpenModal(false);
 setForm({
 account_name: "",
 facility_type: "مغسلة تجارية ذكية",
 stage: "acquire",
 package_tier: "standard",
 acv_value: "180000",
 expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
 notes: ""
 });
 loadAll();
 } catch (err: any) {
 toast.error("خطأ في حفظ الصفقة: " + (err?.message || ""));
 } finally {
 setSaving(false);
 }
 }

 async function handleDeleteDeal(id: string) {
 if (!confirm("هل أنت متأكد من حذف هذه الصفقة؟")) return;
 const { error } = await supabase.from("enterprise_deals").delete().eq("id", id);
 if (error) toast.error("خطأ في الحذف: " + error.message);
 else {
 toast.success("تم الحذف بنجاح");
 loadAll();
 }
 }

 function stageBadge(stage: string) {
 if (stage === "acquire") return <Badge className="bg-amber-600 text-white font-black text-xs">1. الاكتساب (Acquire)</Badge>;
 if (stage === "implement") return <Badge className="bg-blue-600 text-white font-black text-xs">2. التجهيز (Implement)</Badge>;
 if (stage === "operate") return <Badge className="bg-emerald-600 text-white font-black text-xs">3. التشغيل الحي (Operate)</Badge>;
 return <Badge className="bg-purple-600 text-white font-black text-xs">4. التوسع (Expand)</Badge>;
 }

 function tierLabel(tier: string) {
 if (tier === "founding") return "باقة الشريك المؤسس";
 if (tier === "enterprise") return "باقة المؤسسات الكبرى";
 return "الباقة القياسية";
 }

 const totalPipelineValue = deals.reduce((sum, d) => sum + Number(d.acv_value || 0), 0);

 return (<div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" dir={dir}>
 {/* Header */}
 <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 text-white p-6 shadow-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-black mb-2">
 <BriefcaseBusiness className="w-4 h-4" /> إدارة تطوير الأعمال ومبيعات الشركات (Business Development Department)
 </div>
 <h1 className="text-2xl md:text-3xl font-black">إدارة مراحل المبيعات B2B ومتابعة حسابات الشركاء</h1>
 <p className="text-xs md:text-sm text-blue-100/80 mt-1 font-bold">
 قيادة دورة حياة العميل التجارية عبر المراحل الأربع، مراقبة أداء شريك التصميم النشط (Dry Tech)، وإدارة خط أنابيب صفقات التجهيز المؤسسي للمغاسل.
 </p>
 </div>
 <div className="flex gap-2">
 <Button size="sm" onClick={() => setOpenModal(true)} className="rounded-xl font-black text-xs bg-blue-600 hover:bg-blue-700 text-white">
 <Plus className="w-4 h-4 ms-1" /> إضافة صفقة / حساب مؤسسي جديد
 </Button>
 <Button size="sm" variant="secondary" onClick={loadAll} disabled={loading} className="rounded-xl font-bold text-xs">
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث البيانات"}
 </Button>
 </div>
 </div>

 {/* The 4 Commercial Lifecycle Stages */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="rounded-3xl border-2 border-blue-500/40 bg-gradient-to-br from-white to-blue-50/30 p-5 shadow-sm space-y-3">
 <div className="flex justify-between items-start">
 <Badge className="bg-blue-600 text-white font-black text-xs">المرحلة 1: الاكتساب (Acquire)</Badge>
 <Target className="w-5 h-5 text-blue-600" />
 </div>
 <div className="font-black text-lg text-slate-900">استقطاب العملاء التجاريين</div>
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 استهداف أصحاب المغاسل عبر المعارض، الغرف التجارية، والمبيعات الميدانية، وتقديم عروض توضيحية لنظام الذكاء التشغيلي.
 </p>
 <div className="pt-2 border-t font-mono text-xs font-black text-blue-800">
 الصفقات المعلقة: {deals.filter(d => d.stage === "acquire").length} حساب
 </div>
 </Card>

 <Card className="rounded-3xl border-2 border-teal-500/40 bg-gradient-to-br from-white to-teal-50/30 p-5 shadow-sm space-y-3">
 <div className="flex justify-between items-start">
 <Badge className="bg-teal-600 text-white font-black text-xs">المرحلة 2: التجهيز (Implement)</Badge>
 <Layers className="w-5 h-5 text-teal-600" />
 </div>
 <div className="font-black text-lg text-slate-900">إعداد المصنع والمحطات</div>
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 تحصيل رسوم الإعداد، تخصيص المحطات العشر، تدريب الفنيين، وتفعيل الباركود المقاوم للحرارة.
 </p>
 <div className="pt-2 border-t font-mono text-xs font-black text-teal-800">
 جاري التجهيز: {deals.filter(d => d.stage === "implement").length} حساب
 </div>
 </Card>

 <Card className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-white to-emerald-50/30 p-5 shadow-sm space-y-3">
 <div className="flex justify-between items-start">
 <Badge className="bg-emerald-600 text-white font-black text-xs">المرحلة 3: التشغيل (Operate)</Badge>
 <Sparkles className="w-5 h-5 text-emerald-600" />
 </div>
 <div className="font-black text-lg text-slate-900">تبني دورة العمل الحية</div>
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 تشغيل المحركات: الإتمام الجماعي، عزل البقع، الدفاتر المزدوجة، إقفال الخزن اليومي، وتحصيل اشتراك SaaS.
 </p>
 <div className="pt-2 border-t font-mono text-xs font-black text-emerald-800">
 التشغيل الحي: {deals.filter(d => d.stage === "operate").length} حساب
 </div>
 </Card>

 <Card className="rounded-3xl border-2 border-purple-500/40 bg-gradient-to-br from-white to-purple-50/30 p-5 shadow-sm space-y-3">
 <div className="flex justify-between items-start">
 <Badge className="bg-purple-600 text-white font-black text-xs">المرحلة 4: التوسع (Expand)</Badge>
 <TrendingUp className="w-5 h-5 text-purple-600" />
 </div>
 <div className="font-black text-lg text-slate-900">توسع التراخيص والفروع</div>
 <p className="text-xs text-slate-600 font-bold leading-relaxed">
 إضافة فروع جديدة، الارتقاء لخدمات Enterprise، تفعيل وحدات الذكاء الاصطناعي AI، وزيادة متوسط إيراد الحساب.
 </p>
 <div className="pt-2 border-t font-mono text-xs font-black text-purple-800">
 حسابات التوسع: {deals.filter(d => d.stage === "expand").length} حساب
 </div>
 </Card>
 </div>

 {/* Active Design Partner Monitor */}
 <Card className="rounded-3xl border-2 border-amber-500/40 shadow-xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 text-white overflow-hidden">
 <CardHeader className="border-b border-white/10 pb-4">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="text-xs text-amber-300 font-mono font-bold uppercase tracking-wider mb-1">DESIGN PARTNER & PILOT VERIFICATION</div>
 <CardTitle className="text-xl font-black flex items-center gap-2">
 <Building2 className="w-6 h-6 text-amber-400" />
 <span>شريك التصميم التجريبي المعتمد: Dry Tech (tenant: dry-tech)</span>
 </CardTitle>
 </div>
 <Badge className="bg-emerald-500 text-slate-950 font-black px-3 py-1 text-xs flex items-center gap-1.5">
 <CheckCircle2 className="w-4 h-4" /> Live Reference Account — Supabase dngjfjrjddigqadlyain
 </Badge>
 </div>
 </CardHeader>
 <CardContent className="p-6">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
 <div className="text-xs text-amber-200 font-bold">إجمالي طلبات الشريك</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">{loading ? "..." : stats.totalOrders} <span className="text-xs font-normal">طلب</span></div>
 <div className="text-[10px] text-white/70 mt-1">مستبعد منها الطلبات الملغاة برمجياً</div>
 </div>

 <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
 <div className="text-xs text-emerald-200 font-bold">الطلبات المسلمة فعلياً</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">{loading ? "..." : stats.deliveredOrders} <span className="text-xs font-normal">طلب</span></div>
 <div className="text-[10px] text-white/70 mt-1">مكتملة التوصيل والتحصيل النقدى/الإلكتروني</div>
 </div>

 <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
 <div className="text-xs text-blue-200 font-bold">إجمالي الإيراد المثبت (GMV)</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">{loading ? "..." : fmtMoney(stats.totalGMV)}</div>
 <div className="text-[10px] text-white/70 mt-1">إيرادات أولية حقيقية وموثقة في التمهيد</div>
 </div>

 <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
 <div className="text-xs text-purple-200 font-bold">الأصناف النشطة بالكتالوج</div>
 <div className="text-2xl md:text-3xl font-black mt-1 font-mono">{loading ? "..." : stats.activeServices} <span className="text-xs font-normal">صنف</span></div>
 <div className="text-[10px] text-white/70 mt-1">مطابقة للمبوبات الـ 6 المعتمدة لـ POS Touch</div>
 </div>
 </div>

 <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-100 leading-relaxed font-bold">
 <span className="text-amber-300 font-black">الأهمية الاستراتيجية لشريك التصميم:</span> تم اعتماد Dry Tech كأول بيئة إثبات حية (Proving Ground) لاختبار وتدقيق محرك سير العمل ذو المحطات العشر المتسلسلة، وضبط إقفال الخزن والدفاتر المزدوجة تحت ضغط تشغيلي حقيقي، مما يجعل المنظومة جاهزة فوراً لضم 50+ مغسلة تجارية في المرحلة القادمة دون مخاطر تقنية.
 </div>
 </CardContent>
 </Card>

 {/* Enterprise Pipeline Table */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="pb-3 border-b">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <Handshake className="w-5 h-5 text-blue-600" />
 <span>خط أنابيب الصفقات والمغاسل المستهدفة (Enterprise Sales Pipeline) — إجمالي القيم: {fmtMoney(totalPipelineValue)}/سنة</span>
 </CardTitle>
 <Button size="sm" onClick={() => setOpenModal(true)} className="rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white">
 <Plus className="w-4 h-4 ms-1" /> إضافة صفقة جديدة
 </Button>
 </div>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 {loading ? (<div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></div>) : deals.length === 0 ? (<div className="py-12 text-center text-slate-400 font-bold">لا توجد صفقات مسجلة حالياً</div>) : (<table className="w-full text-sm">
 <thead className="bg-slate-50 border-y text-slate-700 text-xs font-black">
 <tr>
 <th className="p-3 text-start">اسم المغسلة / الحساب المؤسسي</th>
 <th className="p-3 text-start">نوع المنشأة</th>
 <th className="p-3 text-center">المرحلة التجارية (Stage)</th>
 <th className="p-3 text-center">باقة التعاقد</th>
 <th className="p-3 text-end">قيمة التعاقد السنوي (ACV)</th>
 <th className="p-3 text-center">التاريخ المتوقع للإغلاق</th>
 <th className="p-3 text-center">الإجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y font-medium text-xs">
 {deals.map((d) => (<tr key={d.id} className="hover:bg-slate-50 transition">
 <td className="p-3 font-black text-slate-900">
 <div>{d.account_name}</div>
 {d.notes && <div className="text-[11px] text-slate-500 font-normal mt-0.5">{d.notes}</div>}
 </td>
 <td className="p-3 text-slate-600 font-bold">{d.facility_type}</td>
 <td className="p-3 text-center">{stageBadge(d.stage)}</td>
 <td className="p-3 text-center"><Badge variant="outline">{tierLabel(d.package_tier)}</Badge></td>
 <td className="p-3 text-end font-mono font-bold text-teal-800">{fmtMoney(Number(d.acv_value))} / سنة</td>
 <td className="p-3 text-center font-mono text-slate-600">{d.expected_close_date || "—"}</td>
 <td className="p-3 text-center">
 <Button size="sm" variant="outline" onClick={() => handleDeleteDeal(d.id)} className="text-red-600 border-red-200 hover:bg-red-50">
 <Trash2 className="w-3.5 h-3.5" />
 </Button>
 </td>
 </tr>))}
 </tbody>
 </table>)}
 </CardContent>
 </Card>

 {/* Dialog Modal for Data Entry */}
 <Dialog open={openModal} onOpenChange={setOpenModal}>
 <DialogContent className="max-w-md rounded-3xl p-6 space-y-4" dir="rtl">
 <DialogHeader>
 <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
 <BriefcaseBusiness className="w-5 h-5 text-blue-600" />
 <span>إضافة حساب مؤسسي جديد إلى خط الصفقات</span>
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-3 text-xs">
 <div className="space-y-1">
 <Label className="font-bold">اسم المغسلة / المنشأة:</Label>
 <Input value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} placeholder="مثال: مغسلة الجيزة الكبرى..." className="h-9 rounded-xl" />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">نوع المنشأة:</Label>
 <Input value={form.facility_type} onChange={e => setForm({...form, facility_type: e.target.value})} placeholder="مغسلة تجارية..." className="h-9 rounded-xl" />
 </div>
 <div className="space-y-1">
 <Label className="font-bold">المرحلة التجارية:</Label>
 <Select value={form.stage} onValueChange={val => setForm({...form, stage: val})}>
 <SelectTrigger className="h-9 rounded-xl font-bold"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="acquire">1. الاكتساب (Acquire)</SelectItem>
 <SelectItem value="implement">2. التجهيز (Implement)</SelectItem>
 <SelectItem value="operate">3. التشغيل الحي (Operate)</SelectItem>
 <SelectItem value="expand">4. التوسع (Expand)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">باقة التعاقد:</Label>
 <Select value={form.package_tier} onValueChange={val => setForm({...form, package_tier: val})}>
 <SelectTrigger className="h-9 rounded-xl font-bold"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="standard">الباقة القياسية (15K/شهر)</SelectItem>
 <SelectItem value="founding">باقة الشريك المؤسس (10K/شهر)</SelectItem>
 <SelectItem value="enterprise">باقة المؤسسات الكبرى</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1">
 <Label className="font-bold">قيمة التعاقد السنوي (ACV ج.م):</Label>
 <Input type="number" value={form.acv_value} onChange={e => setForm({...form, acv_value: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="font-bold">التاريخ المتوقع للإغلاق:</Label>
 <Input type="date" value={form.expected_close_date} onChange={e => setForm({...form, expected_close_date: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>

 <div className="space-y-1">
 <Label className="font-bold">ملاحظات الصفقة / الشراكة:</Label>
 <Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="تفاصيل إضافية عن المفاوضات..." className="rounded-xl" />
 </div>
 </div>

 <DialogFooter className="flex gap-2 justify-end pt-2 border-t">
 <Button variant="outline" onClick={() => setOpenModal(false)} className="rounded-xl font-bold">إلغاء</Button>
 <Button onClick={handleCreateDeal} disabled={saving} className="rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white">
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الصفقة في قاعدة البيانات"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>);
}
