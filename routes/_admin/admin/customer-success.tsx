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
 Headphones, Layers, CheckCircle2, AlertTriangle, Clock,
 Users, Loader2, Plus, Trash2, HeartHandshake, ShieldAlert,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/customer-success")({
 head: () => ({ meta: [{ title: "نجاح العملاء والتجهيز - MJRH" }] }),
 component: CustomerSuccessDepartmentPage,
});

type OnboardingProject = {
 id: string;
 account_name: string;
 stage: string;
 progress_pct: number;
 assigned_engineer: string;
 target_live_date: string | null;
 notes: string | null;
 created_at: string;
};

type HealthScore = {
 id: string;
 account_name: string;
 health_score: number;
 status: string;
 last_qbr_date: string | null;
 next_check_date: string | null;
 account_manager: string;
 notes: string | null;
 created_at: string;
};

function CustomerSuccessDepartmentPage() {
 const { t, dir } = useI18n();
 const [loading, setLoading] = useState(true);
 const [projects, setProjects] = useState<OnboardingProject[]>([]);
 const [healthRows, setHealthRows] = useState<HealthScore[]>([]);
 
 // Modals state
 const [openProjectModal, setOpenProjectModal] = useState(false);
 const [openHealthModal, setOpenHealthModal] = useState(false);
 const [saving, setSaving] = useState(false);

 // Forms state
 const [projectForm, setProjectForm] = useState({
 account_name: "",
 stage: "setup",
 progress_pct: "25",
 assigned_engineer: "م. أحمد مهندس التأسيس",
 target_live_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
 notes: ""
 });

 const [healthForm, setHealthForm] = useState({
 account_name: "",
 health_score: "92",
 status: "healthy",
 account_manager: "م. عمر مدير نجاح العملاء",
 last_qbr_date: new Date().toISOString().slice(0, 10),
 next_check_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
 notes: ""
 });

 const loadAll = useCallback(async () => {
 setLoading(true);
 try {
 const [projRes, healthRes] = await Promise.all([
 supabase.from("tenant_onboarding_projects").select("*").order("created_at", { ascending: false }),
 supabase.from("tenant_health_scores").select("*").order("created_at", { ascending: false }),
 ]);
 setProjects((projRes.data ?? []) as OnboardingProject[]);
 setHealthRows((healthRes.data ?? []) as HealthScore[]);
 } catch (e: any) {
 console.error(e);
 toast.error("فصل تحميل بيانات نجاح العملاء: " + (e?.message || ""));
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => { loadAll(); }, [loadAll]);

 async function handleCreateProject() {
 if (!projectForm.account_name.trim()) {
 return toast.error("أدخل اسم المغسلة أو الحساب");
 }
 setSaving(true);
 try {
 const { error } = await supabase.from("tenant_onboarding_projects").insert({
 account_name: projectForm.account_name.trim(),
 stage: projectForm.stage,
 progress_pct: Number(projectForm.progress_pct || 0),
 assigned_engineer: projectForm.assigned_engineer.trim(),
 target_live_date: projectForm.target_live_date || null,
 notes: projectForm.notes || null
 });
 if (error) throw error;
 toast.success("تم إضافة مشروع التجهيز بنجاح");
 setOpenProjectModal(false);
 setProjectForm({
 account_name: "",
 stage: "setup",
 progress_pct: "25",
 assigned_engineer: "م. أحمد مهندس التأسيس",
 target_live_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
 notes: ""
 });
 loadAll();
 } catch (err: any) {
 toast.error("خطأ في حفظ المشروع: " + (err?.message || ""));
 } finally {
 setSaving(false);
 }
 }

 async function handleCreateHealth() {
 if (!healthForm.account_name.trim()) {
 return toast.error("أدخل اسم المغسلة أو الحساب");
 }
 setSaving(true);
 try {
 const { error } = await supabase.from("tenant_health_scores").insert({
 account_name: healthForm.account_name.trim(),
 health_score: Number(healthForm.health_score || 90),
 status: healthForm.status,
 account_manager: healthForm.account_manager.trim(),
 last_qbr_date: healthForm.last_qbr_date || null,
 next_check_date: healthForm.next_check_date || null,
 notes: healthForm.notes || null
 });
 if (error) throw error;
 toast.success("تم تسجيل تقييم الصحة التشغيلية بنجاح");
 setOpenHealthModal(false);
 setHealthForm({
 account_name: "",
 health_score: "92",
 status: "healthy",
 account_manager: "م. عمر مدير نجاح العملاء",
 last_qbr_date: new Date().toISOString().slice(0, 10),
 next_check_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
 notes: ""
 });
 loadAll();
 } catch (err: any) {
 toast.error("خطأ في حفظ التقييم: " + (err?.message || ""));
 } finally {
 setSaving(false);
 }
 }

 async function handleDeleteProject(id: string) {
 if (!confirm("هل أنت متأكد من حذف هذا المشروع؟")) return;
 const { error } = await supabase.from("tenant_onboarding_projects").delete().eq("id", id);
 if (error) toast.error("خطأ في الحذف: " + error.message);
 else { toast.success("تم الحذف بنجاح"); loadAll(); }
 }

 async function handleDeleteHealth(id: string) {
 if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
 const { error } = await supabase.from("tenant_health_scores").delete().eq("id", id);
 if (error) toast.error("خطأ في الحذف: " + error.message);
 else { toast.success("تم الحذف بنجاح"); loadAll(); }
 }

 function stageBadge(stage: string) {
 if (stage === "setup") return <Badge className="bg-amber-600 text-white font-black text-xs">إعداد الحساب والنطاق</Badge>;
 if (stage === "hardware") return <Badge className="bg-blue-600 text-white font-black text-xs">نشر الأجهزة والباركود</Badge>;
 if (stage === "catalog_sync") return <Badge className="bg-purple-600 text-white font-black text-xs">مزامنة الكتالوج المزدوج</Badge>;
 if (stage === "training") return <Badge className="bg-teal-600 text-white font-black text-xs">تدريب الطاقم الميداني</Badge>;
 return <Badge className="bg-emerald-600 text-white font-black text-xs">تشغيل حي ومكتمل</Badge>;
 }

 function healthBadge(status: string) {
 if (status === "healthy") return <Badge className="bg-emerald-600 text-white font-black text-xs">صحي ومستقر</Badge>;
 if (status === "at_risk") return <Badge className="bg-amber-600 text-white font-black text-xs">معرض للمخاطر</Badge>;
 return <Badge className="bg-red-600 text-white font-black text-xs">إنذار ارتداد (Churn Risk)</Badge>;
 }

 const avgHealth = healthRows.length > 0 ? Math.round(healthRows.reduce((sum, h) => sum + Number(h.health_score || 0), 0) / healthRows.length) : 0;
 const activeProjectsCount = projects.filter(p => p.stage !== "live").length;

 return (<div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" dir={dir}>
 {/* Header */}
 <div className="rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 text-white p-6 shadow-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
 <div>
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-black mb-2">
 <Headphones className="w-4 h-4" /> إدارة نجاح العملاء، التجهيز، والدعم الفني (Customer Success Department)
 </div>
 <h1 className="text-2xl md:text-3xl font-black">نشر المنشآت ومراقبة الصحة التشغيلية للمستأجرين</h1>
 <p className="text-xs md:text-sm text-teal-100/80 mt-1 font-bold">
 إدارة مشاريع تأسيس المغاسل الجديدة في 3 أيام عمل، رصد مؤشرات صحة التشغيل اللحظية، ومنع ارتداد الحسابات (Zero Churn Engineering).
 </p>
 </div>
 <Button size="sm" variant="secondary" onClick={loadAll} disabled={loading} className="rounded-xl font-bold text-xs">
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث البيانات"}
 </Button>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">مشاريع التجهيز الجارية</div>
 <div className="text-2xl font-black mt-1 font-mono text-slate-900">{activeProjectsCount} <span className="text-xs font-normal">مشروع</span></div>
 <div className="text-[11px] text-muted-foreground mt-1">مغاسل قيد الإعداد الفني والتدريب</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">متوسط الصحة التشغيلية</div>
 <div className="text-2xl font-black mt-1 font-mono text-emerald-700">{avgHealth} <span className="text-xs font-normal">/ 100</span></div>
 <div className="text-[11px] text-muted-foreground mt-1">معدل الاستقرار والمطابقة للعملاء</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">الحسابات المعرضة للمخاطر</div>
 <div className="text-2xl font-black mt-1 font-mono text-amber-600">{healthRows.filter(h => h.status !== "healthy").length} <span className="text-xs font-normal">حساب</span></div>
 <div className="text-[11px] text-muted-foreground mt-1">تتطلب تدخلاً ومراجعة فنية استباقية</div>
 </Card>
 <Card className="p-4 rounded-2xl border bg-card shadow-xs">
 <div className="text-xs text-muted-foreground font-bold">زمن التجهيز المعياري</div>
 <div className="text-2xl font-black mt-1 font-mono text-blue-700">3.0 <span className="text-xs font-normal">أيام عمل</span></div>
 <div className="text-[11px] text-muted-foreground mt-1">المستهدف المعتمد لإطلاق المغسلة</div>
 </Card>
 </div>

 {/* Section 1: Tenant Onboarding Projects */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="pb-3 border-b">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <Layers className="w-5 h-5 text-teal-600" />
 <span>جدول مشاريع إعداد وتأسيس المغاسل الجديدة (Implementation & Onboarding Projects)</span>
 </CardTitle>
 <Button size="sm" onClick={() => setOpenProjectModal(true)} className="rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white">
 <Plus className="w-4 h-4 ms-1" /> إضافة مشروع تجهيز جديد
 </Button>
 </div>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 {loading ? (<div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div>) : projects.length === 0 ? (<div className="py-12 text-center text-slate-400 font-bold">لا توجد مشاريع تجهيز حالية</div>) : (<table className="w-full text-sm">
 <thead className="bg-slate-50 border-y text-slate-700 text-xs font-black">
 <tr>
 <th className="p-3 text-start">اسم المغسلة / المنشأة</th>
 <th className="p-3 text-center">مرحلة التأسيس</th>
 <th className="p-3 text-center">نسبة الإنجاز %</th>
 <th className="p-3 text-start">المهندس المسؤول</th>
 <th className="p-3 text-center">تاريخ الإطلاق المستهدف</th>
 <th className="p-3 text-center">الإجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y font-medium text-xs">
 {projects.map((p) => (<tr key={p.id} className="hover:bg-slate-50 transition">
 <td className="p-3 font-black text-slate-900">
 <div>{p.account_name}</div>
 {p.notes && <div className="text-[11px] text-slate-500 font-normal mt-0.5">{p.notes}</div>}
 </td>
 <td className="p-3 text-center">{stageBadge(p.stage)}</td>
 <td className="p-3 text-center">
 <div className="flex items-center justify-center gap-2">
 <span className="font-mono text-xs font-bold w-10 text-end">{p.progress_pct}%</span>
 <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden border">
 <div className="h-full bg-teal-600 rounded-full" style={{ width: `${Math.min(100, p.progress_pct)}%` }} />
 </div>
 </div>
 </td>
 <td className="p-3 text-slate-700 font-bold">{p.assigned_engineer}</td>
 <td className="p-3 text-center font-mono text-slate-600">{p.target_live_date || "—"}</td>
 <td className="p-3 text-center">
 <Button size="sm" variant="outline" onClick={() => handleDeleteProject(p.id)} className="text-red-600 border-red-200 hover:bg-red-50">
 <Trash2 className="w-3.5 h-3.5" />
 </Button>
 </td>
 </tr>))}
 </tbody>
 </table>)}
 </CardContent>
 </Card>

 {/* Section 2: Tenant Health Scores & QBRs */}
 <Card className="rounded-3xl shadow-sm border">
 <CardHeader className="pb-3 border-b">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <CardTitle className="text-base font-black flex items-center gap-2">
 <HeartHandshake className="w-5 h-5 text-emerald-600" />
 <span>مرصد الصحة التشغيلية ومؤشر الاحتفاظ بالحسابات (Tenant Health & QBR Tracker)</span>
 </CardTitle>
 <Button size="sm" onClick={() => setOpenHealthModal(true)} className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
 <Plus className="w-4 h-4 ms-1" /> تسجيل فحص صحة تشغيلية جديد
 </Button>
 </div>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 {loading ? (<div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" /></div>) : healthRows.length === 0 ? (<div className="py-12 text-center text-slate-400 font-bold">لا توجد سجلات تقييم صحة حالياً</div>) : (<table className="w-full text-sm">
 <thead className="bg-slate-50 border-y text-slate-700 text-xs font-black">
 <tr>
 <th className="p-3 text-start">اسم الحساب / المغسلة</th>
 <th className="p-3 text-center">مؤشر الصحة (0-100)</th>
 <th className="p-3 text-center">حالة الحساب</th>
 <th className="p-3 text-start">مدير نجاح العملاء</th>
 <th className="p-3 text-center">آخر فحص QBR</th>
 <th className="p-3 text-center">المراجعة القادمة</th>
 <th className="p-3 text-center">الإجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y font-medium text-xs">
 {healthRows.map((h) => (<tr key={h.id} className="hover:bg-slate-50 transition">
 <td className="p-3 font-black text-slate-900">
 <div>{h.account_name}</div>
 {h.notes && <div className="text-[11px] text-slate-500 font-normal mt-0.5">{h.notes}</div>}
 </td>
 <td className="p-3 text-center">
 <div className="flex items-center justify-center gap-2">
 <span className={`font-mono text-xs font-black w-8 text-end ${Number(h.health_score) >= 90 ? "text-emerald-700" : Number(h.health_score) >= 70 ? "text-amber-600" : "text-red-600"}`}>
 {h.health_score}
 </span>
 <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden border">
 <div className={`h-full rounded-full ${Number(h.health_score) >= 90 ? "bg-emerald-500" : Number(h.health_score) >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, Number(h.health_score))}%` }} />
 </div>
 </div>
 </td>
 <td className="p-3 text-center">{healthBadge(h.status)}</td>
 <td className="p-3 text-slate-700 font-bold">{h.account_manager}</td>
 <td className="p-3 text-center font-mono text-slate-600">{h.last_qbr_date || "—"}</td>
 <td className="p-3 text-center font-mono text-slate-600">{h.next_check_date || "—"}</td>
 <td className="p-3 text-center">
 <Button size="sm" variant="outline" onClick={() => handleDeleteHealth(h.id)} className="text-red-600 border-red-200 hover:bg-red-50">
 <Trash2 className="w-3.5 h-3.5" />
 </Button>
 </td>
 </tr>))}
 </tbody>
 </table>)}
 </CardContent>
 </Card>

 {/* Project Modal */}
 <Dialog open={openProjectModal} onOpenChange={setOpenProjectModal}>
 <DialogContent className="max-w-md rounded-3xl p-6 space-y-4" dir="rtl">
 <DialogHeader>
 <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
 <Layers className="w-5 h-5 text-teal-600" />
 <span>إضافة مشروع تجهيز وإعداد لمغسلة جديدة</span>
 </DialogTitle>
 </DialogHeader>
 <div className="space-y-3 text-xs">
 <div className="space-y-1">
 <Label className="font-bold">اسم المغسلة / المشروع:</Label>
 <Input value={projectForm.account_name} onChange={e => setProjectForm({...projectForm, account_name: e.target.value})} placeholder="مثال: مغسلة النيل..." className="h-9 rounded-xl" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">مرحلة التأسيس:</Label>
 <Select value={projectForm.stage} onValueChange={val => setProjectForm({...projectForm, stage: val})}>
 <SelectTrigger className="h-9 rounded-xl font-bold"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="setup">إعداد الحساب والنطاق</SelectItem>
 <SelectItem value="hardware">نشر الأجهزة والباركود</SelectItem>
 <SelectItem value="catalog_sync">مزامنة الكتالوج المزدوج</SelectItem>
 <SelectItem value="training">تدريب الطاقم الميداني</SelectItem>
 <SelectItem value="live">تشغيل حي ومكتمل</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1">
 <Label className="font-bold">نسبة الإنجاز %:</Label>
 <Input type="number" value={projectForm.progress_pct} onChange={e => setProjectForm({...projectForm, progress_pct: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">المهندس المسؤول:</Label>
 <Input value={projectForm.assigned_engineer} onChange={e => setProjectForm({...projectForm, assigned_engineer: e.target.value})} className="h-9 rounded-xl" />
 </div>
 <div className="space-y-1">
 <Label className="font-bold">تاريخ الإطلاق المستهدف:</Label>
 <Input type="date" value={projectForm.target_live_date} onChange={e => setProjectForm({...projectForm, target_live_date: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 </div>
 <div className="space-y-1">
 <Label className="font-bold">ملاحظات التأسيس:</Label>
 <Textarea rows={2} value={projectForm.notes} onChange={e => setProjectForm({...projectForm, notes: e.target.value})} placeholder="حالة تركيب الأجهزة وتدريب الطاقم..." className="rounded-xl" />
 </div>
 </div>
 <DialogFooter className="flex gap-2 justify-end pt-2 border-t">
 <Button variant="outline" onClick={() => setOpenProjectModal(false)} className="rounded-xl font-bold">إلغاء</Button>
 <Button onClick={handleCreateProject} disabled={saving} className="rounded-xl font-black bg-teal-600 hover:bg-teal-700 text-white">
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ مشروع التجهيز"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Health Score Modal */}
 <Dialog open={openHealthModal} onOpenChange={setOpenHealthModal}>
 <DialogContent className="max-w-md rounded-3xl p-6 space-y-4" dir="rtl">
 <DialogHeader>
 <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
 <HeartHandshake className="w-5 h-5 text-emerald-600" />
 <span>تسجيل تقييم صحة تشغيلية وفحص QBR جديد</span>
 </DialogTitle>
 </DialogHeader>
 <div className="space-y-3 text-xs">
 <div className="space-y-1">
 <Label className="font-bold">اسم الحساب / المغسلة:</Label>
 <Input value={healthForm.account_name} onChange={e => setHealthForm({...healthForm, account_name: e.target.value})} placeholder="مثال: مغسلة الجيزة..." className="h-9 rounded-xl" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">مؤشر الصحة (0-100):</Label>
 <Input type="number" value={healthForm.health_score} onChange={e => setHealthForm({...healthForm, health_score: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 <div className="space-y-1">
 <Label className="font-bold">حالة الحساب:</Label>
 <Select value={healthForm.status} onValueChange={val => setHealthForm({...healthForm, status: val})}>
 <SelectTrigger className="h-9 rounded-xl font-bold"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="healthy">صحي ومستقر (Healthy)</SelectItem>
 <SelectItem value="at_risk">معرض للمخاطر (At Risk)</SelectItem>
 <SelectItem value="churn_warning">إنذار ارتداد (Churn Risk)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="font-bold">مدير نجاح العملاء:</Label>
 <Input value={healthForm.account_manager} onChange={e => setHealthForm({...healthForm, account_manager: e.target.value})} className="h-9 rounded-xl" />
 </div>
 <div className="space-y-1">
 <Label className="font-bold">تاريخ فحص QBR:</Label>
 <Input type="date" value={healthForm.last_qbr_date} onChange={e => setHealthForm({...healthForm, last_qbr_date: e.target.value})} className="h-9 rounded-xl font-mono" />
 </div>
 </div>
 <div className="space-y-1">
 <Label className="font-bold">ملاحظات التقييم والتوصيات:</Label>
 <Textarea rows={2} value={healthForm.notes} onChange={e => setHealthForm({...healthForm, notes: e.target.value})} placeholder="ملخص نتائج مراجعة الأداء الربع سنوية..." className="rounded-xl" />
 </div>
 </div>
 <DialogFooter className="flex gap-2 justify-end pt-2 border-t">
 <Button variant="outline" onClick={() => setOpenHealthModal(false)} className="rounded-xl font-bold">إلغاء</Button>
 <Button onClick={handleCreateHealth} disabled={saving} className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white">
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التقييم التشغيلي"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>);
}
