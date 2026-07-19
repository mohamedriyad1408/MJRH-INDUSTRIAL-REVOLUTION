import React, { useState, useEffect, useCallback } from"react";
import { supabase } from"@/integrations/supabase/client";
import { useAuth } from"@/core/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Textarea } from"@/components/ui/textarea";
import { Badge } from"@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from"@/components/ui/dialog";
import { ShieldCheck, FileText, Upload, Plus, Trash2, Loader2, ExternalLink, Building2, Clock, CheckCircle2, DollarSign } from"lucide-react";
import { fmtMoney, fmtDate } from"@/lib/format";
import { toast } from"sonner";

type LegalContract = {
 id: string;
 tenant_id: string;
 title: string;
 contract_type: string;
 counterparty: string;
 status: string;
 start_date: string | null;
 end_date: string | null;
 contract_value: number;
 document_url: string | null;
 notes: string | null;
 created_at: string;
};

const CONTRACT_TYPES: Record<string, string> = {
 saas_msa:"عقد ترخيص استخدام منظومة (SaaS MSA)",
 partner_agreement:"اتفاقية شراكة استراتيجية وتأسيس",
 vendor_contract:"عقد توريد معدات ومواد كيميائية",
 nda:"اتفاقية سرية وحفظ معلومات (NDA)",
 employment:"عقد عمل وتوظيف قيادي أو فني",
 ip_license:"ترخيص استخدام ملكية فكرية وتطوير",
 commercial_lease:"عقد إيجار تجاري لمقر المغسلة / الفرع",
 municipal_permit:"ترخيص وتصريح امتثال بلدي وبيئي",
 vehicle_license:"رخصة تسيير مركبة / أسطول النقل والندب",
 purchase_contract:"عقد شراء وتوريد أصول ومعدات تشغيلية",
 litigation_dispute:"منازعة قضائية أو مطالبة وتأمين قانوني",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
 active: { label:"ساري ونشط", color:"bg-emerald-600 text-white"},
 review: { label:"قيد المراجعة القانونية", color:"bg-amber-600 text-white"},
 draft: { label:"مسودة مبدئية", color:"bg-slate-700 text-slate-200"},
 expired: { label:"منتهي الصلاحية", color:"bg-red-600 text-white"},
 dispute_open: { label:"نزاع قضائي متداول", color:"bg-red-700 text-white font-black"},
 dispute_resolved: { label:"نزاع منتهي / تمت التسوية", color:"bg-blue-600 text-white font-bold"},
};

export function LegalDepartmentView({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
 const { tenantId } = useAuth();
 const [contracts, setContracts] = useState<LegalContract[]>([]);
 const [loading, setLoading] = useState(true);
 const [openAdd, setOpenAdd] = useState(false);
 const [saving, setSaving] = useState(false);
 const [uploading, setUploading] = useState(false);

 // Form State
 const [title, setTitle] = useState("");
 const [contractType, setContractType] = useState(isSuperAdmin ?"saas_msa":"commercial_lease");
 const [counterparty, setCounterparty] = useState("");
 const [status, setStatus] = useState("active");
 const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
 const [endDate, setEndDate] = useState("2027-06-01");
 const [contractValue, setContractValue] = useState("30000");
 const [documentUrl, setDocumentUrl] = useState("");
 const [notes, setNotes] = useState("");

 const loadContracts = useCallback(async () => {
 setLoading(true);
 try {
 let query = supabase.from("legal_contracts").select("*").order("created_at", { ascending: false });
 if (!isSuperAdmin && tenantId) {
 query = query.eq("tenant_id", tenantId);
 }
 const { data, error } = await query;
 if (error) throw error;
 setContracts((data ?? []) as LegalContract[]);
 } catch (err: any) {
 toast.error("فشل تحميل العقود القانونية:"+ (err.message ||""));
 } finally {
 setLoading(false);
 }
 }, [tenantId, isSuperAdmin]);

 useEffect(() => {
 loadContracts();
 }, [loadContracts]);

 async function handleFileUpload(file: File) {
 if (!file) return;
 setUploading(true);
 try {
 const ext = file.name.split(".").pop() ||"pdf";
 const path =`contracts/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
 const { error } = await supabase.storage.from("legal-documents").upload(path, file, { upsert: true, contentType: file.type });
 if (error) throw error;
 const { data } = supabase.storage.from("legal-documents").getPublicUrl(path);
 setDocumentUrl(data.publicUrl);
 toast.success("تم رفع المستند القانوني وتوثيقه بنجاح");
 } catch (err: any) {
 toast.error("فشل رفع المستند:"+ (err.message ||""));
 } finally {
 setUploading(false);
 }
 }

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!title.trim() || !counterparty.trim()) {
 return toast.error("عنوان العقد والطرف الثاني مطلوبان إلزاميًا");
 }
 setSaving(true);
 try {
 const payload: any = {
 tenant_id: tenantId ||"c0ea27c7-138e-4d12-b732-6981bddb4c97",
 title: title.trim(),
 contract_type: contractType,
 counterparty: counterparty.trim(),
 status,
 start_date: startDate || null,
 end_date: endDate || null,
 contract_value: Number(contractValue || 0),
 document_url: documentUrl || null,
 notes: notes.trim() || null,
 };

 const { error } = await supabase.from("legal_contracts").insert(payload);
 if (error) throw error;
 toast.success("تم تسجيل العقد القانوني وتوثيق الملف في النظام بنجاح");
 setOpenAdd(false);
 setTitle(""); setCounterparty(""); setDocumentUrl(""); setNotes("");
 loadContracts();
 } catch (err: any) {
 toast.error("فشل حفظ العقد:"+ (err.message ||""));
 } finally {
 setSaving(false);
 }
 }

 async function handleDelete(id: string) {
 if (!confirm("هل أنت متأكد من حذف هذا العقد القانوني من النظام؟")) return;
 const { error } = await supabase.from("legal_contracts").delete().eq("id", id);
 if (error) toast.error("خطأ في الحذف:"+ error.message);
 else {
 toast.success("تم حذف العقد بنجاح");
 loadContracts();
 }
 }

 // KPIs aggregated from actual DB records
 const totalContracts = contracts.length;
 const activeContracts = contracts.filter((c) => c.status ==="active").length;
 const reviewContracts = contracts.filter((c) => c.status ==="review").length;
 const totalValue = contracts.reduce((sum, c) => sum + Number(c.contract_value || 0), 0);

 return (
 <div className="space-y-6 max-w-7xl mx-auto p-2 md:p-6 text-slate-100">
 {/* Header Banner */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-700 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shrink-0">
 <ShieldCheck className="w-7 h-7 text-slate-950"/>
 </div>
 <div>
 <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
 <span>{isSuperAdmin ?"الشؤون القانونية والامتثال والعقود للشركة الأم":"الشؤون القانونية والعقود والتراخيص للمغسلة"}</span>
 <Badge variant="outline"className="border-teal-500 text-teal-400 text-xs font-mono">100% DB Vault</Badge>
 </h1>
 <p className="text-xs md:text-sm text-slate-400 mt-1">
 {isSuperAdmin
 ?"إدارة العقود التأسيسية، تراخيص الملكية الفكرية، واتفاقيات الخدمة SaaS MSA مع المستأجرين والشركاء مع التوثيق السحابي للملفات."
 :"إدارة عقود الإيجار التجارية، تصاريح الامتثال البلدي، عقود الموظفين، واتفاقيات توريد المعدات والمواد الكيميائية للفرع."}
 </p>
 </div>
 </div>

 <Dialog open={openAdd} onOpenChange={setOpenAdd}>
 <DialogTrigger asChild>
 <Button className="bg-teal-600 hover:bg-teal-500 font-bold gap-2 text-xs md:text-sm shadow-lg">
 <Plus className="w-4 h-4"/>
 <span>إضافة عقد أو مستند قانوني ورفع ملف</span>
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-xl bg-slate-900 border-slate-700 text-slate-100 max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
 <FileText className="w-5 h-5 text-teal-400"/>
 <span>إضافة وتوثيق عقد قانوني جديد في النظام</span>
 </DialogTitle>
 </DialogHeader>
 <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs md:text-sm">
 <div className="space-y-1.5">
 <Label className="font-bold text-slate-300">عنوان العقد أو المستند القانوني:</Label>
 <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: عقد إيجار فرع التجمع الخامس أو عقد ترخيص SaaS"className="bg-slate-950 border-slate-700 text-white"required />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="font-bold text-slate-300">تصنيف العقد القانوني:</Label>
 <Select value={contractType} onValueChange={setContractType}>
 <SelectTrigger className="bg-slate-950 border-slate-700 text-white"><SelectValue /></SelectTrigger>
 <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs">
 {Object.entries(CONTRACT_TYPES).map(([k, v]) => (
 <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="font-bold text-slate-300">الطرف الثاني (المتعاقد / الشريك):</Label>
 <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="مثال: شركة العقارات أو مورد المعدات"className="bg-slate-950 border-slate-700 text-white"required />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div className="space-y-1.5">
 <Label className="font-bold text-slate-300">حالة العقد:</Label>
 <Select value={status} onValueChange={setStatus}>
 <SelectTrigger className="bg-slate-950 border-slate-700 text-white"><SelectValue /></SelectTrigger>
 <SelectContent className="bg-slate-900 border-slate-700 text-white text-xs">
 <SelectItem value="active"className="text-xs">ساري ونشط</SelectItem>
 <SelectItem value="review"className="text-xs">قيد المراجعة القانونية</SelectItem>
 <SelectItem value="draft"className="text-xs">مسودة مبدئية</SelectItem>
 <SelectItem value="expired"className="text-xs">منتهي الصلاحية</SelectItem>
 <SelectItem value="dispute_open"className="text-xs font-bold text-red-400">نزاع قضائي متداول</SelectItem>
 <SelectItem value="dispute_resolved"className="text-xs font-bold text-blue-400">نزاع منتهي / تمت التسوية</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="font-bold text-slate-300">تاريخ البدء:</Label>
 <Input type="date"value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-950 border-slate-700 text-white text-xs"/>
 </div>

 <div className="space-y-1.5">
 <Label className="font-bold text-slate-300">تاريخ الانتهاء / التجديد:</Label>
 <Input type="date"value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-950 border-slate-700 text-white text-xs"/>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="font-bold text-slate-300">القيمة التعاقدية (بالجنيه المصري EGP):</Label>
 <Input type="number"value={contractValue} onChange={(e) => setContractValue(e.target.value)} placeholder="0.00"className="bg-slate-950 border-slate-700 text-white font-mono"/>
 </div>

 {/* File Upload Section */}
 <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-teal-500/50">
 <Label className="font-bold text-teal-400 block">رفع ملف العقد أو الشهادة القانونية (PDF / الصور):</Label>
 <div className="flex items-center gap-3">
 <label className="cursor-pointer">
 <input type="file"accept=".pdf,image/*"className="hidden"onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
 <span className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-lg border border-slate-600 text-xs">
 {uploading ? <Loader2 className="w-4 h-4 animate-spin text-teal-400"/> : <Upload className="w-4 h-4 text-teal-400"/>}
 <span>{uploading ?"جاري رفع الملف...":"اختر ملف المستند من جهازك"}</span>
 </span>
 </label>
 <Input value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="أو الصق رابط الملف مباشرة هنا..."className="bg-slate-900 border-slate-700 text-white text-xs flex-1 font-mono"/>
 </div>
 {documentUrl && (
 <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
 <CheckCircle2 className="w-3.5 h-3.5"/>
 <span>تم توثيق رابط الملف المرفق جاهز للحفظ</span>
 </div>
)}
 </div>

 <div className="space-y-1.5">
 <Label className="font-bold text-slate-300">ملاحظات وبنود إضافية (أو التزامات الملكية الفكرية):</Label>
 <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اكتب أي شروط خاصة أو التزامات تجديد..."className="bg-slate-950 border-slate-700 text-white text-xs h-20"/>
 </div>

 <DialogFooter className="gap-2 pt-3 border-t border-slate-800">
 <Button type="button"variant="ghost"onClick={() => setOpenAdd(false)} disabled={saving} className="text-xs">إلغاء</Button>
 <Button type="submit"disabled={saving || uploading} className="bg-teal-600 hover:bg-teal-500 font-bold text-xs gap-1.5">
 {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4"/>}
 <span>حفظ وتوثيق العقد في النظام</span>
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>

 {/* Scorecard KPIs */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <Card className="bg-slate-900 border-slate-700 shadow-md">
 <CardContent className="p-4 space-y-1">
 <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
 <span>إجمالي العقود والمستندات</span>
 <FileText className="w-4 h-4 text-teal-400"/>
 </div>
 <div className="text-2xl font-black text-white font-mono">{totalContracts}</div>
 <div className="text-[11px] text-slate-400 font-semibold">مسجل وموثق بقاعدة البيانات</div>
 </CardContent>
 </Card>

 <Card className="bg-slate-900 border-slate-700 shadow-md">
 <CardContent className="p-4 space-y-1">
 <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
 <span>العقود السارية والنشطة</span>
 <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
 </div>
 <div className="text-2xl font-black text-emerald-400 font-mono">{activeContracts}</div>
 <div className="text-[11px] text-emerald-300 font-bold">عقود ومواثيق معتمدة</div>
 </CardContent>
 </Card>

 <Card className="bg-slate-900 border-slate-700 shadow-md">
 <CardContent className="p-4 space-y-1">
 <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
 <span>عقود قيد المراجعة القانونية</span>
 <Clock className="w-4 h-4 text-amber-400"/>
 </div>
 <div className="text-2xl font-black text-amber-400 font-mono">{reviewContracts}</div>
 <div className="text-[11px] text-amber-300 font-bold">تطلب اعتماد الإدارة</div>
 </CardContent>
 </Card>

 <Card className="bg-slate-900 border-slate-700 shadow-md">
 <CardContent className="p-4 space-y-1">
 <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
 <span>إجمالي القيم التعاقدية</span>
 <DollarSign className="w-4 h-4 text-blue-400"/>
 </div>
 <div className="text-xl md:text-2xl font-black text-blue-400 font-mono">{fmtMoney(totalValue)}</div>
 <div className="text-[11px] text-slate-400 font-semibold">تراكمي التزامات العقود</div>
 </CardContent>
 </Card>
 </div>

 {/* Main Table Card */}
 <Card className="bg-slate-900 border-slate-700 shadow-2xl">
 <CardHeader className="border-b border-slate-800 bg-slate-950/60 p-4 md:p-6">
 <CardTitle className="text-base md:text-lg font-bold text-white flex items-center justify-between">
 <span>سجل العقود والمواثيق القانونية الموثقة في المنظومة</span>
 <Badge variant="outline"className="border-teal-500 text-teal-400 text-xs">إدارة حوكمة الشركات</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-4 md:p-6 overflow-x-auto">
 {loading ? (
 <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-teal-400"/></div>
) : contracts.length === 0 ? (
 <div className="text-center py-12 text-slate-500 font-bold space-y-2">
 <p>لا توجد عقود قانونية مسجلة بعد.</p>
 <p className="text-xs">اضغط على زر"إضافة عقد أو مستند قانوني"بالأعلى لتسجيل أول عقد في النظام.</p>
 </div>
) : (
 <table className="w-full text-right border-collapse text-xs md:text-sm">
 <thead>
 <tr className="border-b border-slate-700 bg-slate-950 text-teal-400">
 <th className="p-3 font-bold">العنوان والمستند</th>
 <th className="p-3 font-bold">التصنيف</th>
 <th className="p-3 font-bold">الطرف الثاني</th>
 <th className="p-3 font-bold">الحالة</th>
 <th className="p-3 font-bold">الفترة الزمنية</th>
 <th className="p-3 font-bold">القيمة التعاقدية</th>
 <th className="p-3 font-bold text-center">الملف المرفق</th>
 <th className="p-3 font-bold text-center">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800 text-slate-200">
 {contracts.map((c) => {
 const st = STATUS_MAP[c.status] || STATUS_MAP.active;
 return (
 <tr key={c.id} className="hover:bg-slate-800/40 transition">
 <td className="p-3">
 <div className="font-bold text-white">{c.title}</div>
 {c.notes && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{c.notes}</div>}
 </td>
 <td className="p-3 text-xs font-semibold text-slate-300">{CONTRACT_TYPES[c.contract_type] || c.contract_type}</td>
 <td className="p-3 font-bold text-amber-300">{c.counterparty}</td>
 <td className="p-3"><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${st.color}`}>{st.label}</span></td>
 <td className="p-3 text-xs font-mono text-slate-400">
 {c.start_date ? fmtDate(c.start_date) :"—"} {c.end_date ? fmtDate(c.end_date) :"—"}
 </td>
 <td className="p-3 font-mono font-bold text-teal-400">{fmtMoney(c.contract_value)}</td>
 <td className="p-3 text-center">
 {c.document_url ? (
 <a href={c.document_url} target="_blank"rel="noopener noreferrer">
 <Button variant="outline"size="sm"className="border-teal-500/60 text-teal-300 bg-teal-950/40 hover:bg-teal-900/60 text-xs font-bold gap-1">
 <ExternalLink className="w-3.5 h-3.5"/>
 <span>عرض الملف</span>
 </Button>
 </a>
) : (
 <span className="text-slate-500 text-xs font-semibold">بدون مرفق</span>
)}
 </td>
 <td className="p-3 text-center">
 <Button variant="ghost"size="sm"onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 hover:bg-red-950/40">
 <Trash2 className="w-4 h-4"/>
 </Button>
 </td>
 </tr>
);
 })}
 </tbody>
 </table>
)}
 </CardContent>
 </Card>
 </div>
);
}
